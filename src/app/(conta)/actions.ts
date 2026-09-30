"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string; mensagem?: string };

/** Só aceita caminhos internos ("/algo"), para não virar redirecionamento aberto. */
function destinoSeguro(valor: FormDataEntryValue | null): string {
  const s = typeof valor === "string" ? valor : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function entrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    if (error.code === "email_not_confirmed") return { erro: "Confirme seu e-mail pelo link que enviamos antes de entrar." };
    return { erro: "E-mail ou senha incorretos." };
  }

  revalidatePath("/", "layout");
  redirect(destinoSeguro(formData.get("proximo")));
}

export async function cadastrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const nick = String(formData.get("nick") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (nick.length < 2 || nick.length > 24) return { erro: "O nick precisa ter de 2 a 24 caracteres." };
  if (!email) return { erro: "Informe seu e-mail." };
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };

  const supabase = await criarClienteServidor();
  const { data: livre, error: erroNick } = await supabase.rpc("nick_disponivel", { p_nick: nick });
  if (erroNick) return { erro: "Não foi possível conferir o nick. Tente de novo." };
  if (!livre) return { erro: "Esse nick já está em uso." };

  const origem = process.env.NEXT_PUBLIC_SITE_URL ?? (await headers()).get("origin") ?? "";
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nick }, emailRedirectTo: `${origem}/auth/confirm` },
  });
  if (error) {
    if (error.code === "user_already_exists") return { erro: "Já existe uma conta com esse e-mail." };
    if (error.code === "weak_password") return { erro: "Senha fraca. Use letras e números." };
    return { erro: "Não foi possível criar a conta. Tente de novo." };
  }

  // Com confirmação de e-mail ligada (padrão do Supabase) ainda não há sessão.
  if (!data.session) {
    return { mensagem: `Conta criada! Enviamos um link de confirmação para ${email}.` };
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
