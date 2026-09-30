"use server";

import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

// As regras (quem pode o quê) ficam nas funções do banco; aqui só conferimos o login e repassamos.

export type EstadoCla = { erro?: string; mensagem?: string };

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

async function chamar(funcao: string, args: Record<string, unknown>, mensagem: string): Promise<EstadoCla> {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "Faça login para continuar." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc(funcao, args);
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { mensagem };
}

export async function pedirEntrada(_: EstadoCla, formData: FormData) {
  return chamar("pedir_entrada", { p_cla: texto(formData, "cla") }, "Pedido enviado ao líder do clã.");
}

export async function cancelarPedido(_: EstadoCla, formData: FormData) {
  return chamar("cancelar_pedido", { p_pedido: texto(formData, "pedido") }, "Pedido cancelado.");
}

export async function responderPedido(_: EstadoCla, formData: FormData) {
  const aceitar = formData.get("acao") === "aceitar";
  return chamar(
    "responder_pedido",
    { p_pedido: texto(formData, "pedido"), p_aceitar: aceitar },
    aceitar ? "Jogador aceito no clã." : "Pedido recusado.",
  );
}

export async function sairDoCla() {
  return chamar("sair_do_cla", {}, "Você saiu do clã.");
}

export async function removerMembro(_: EstadoCla, formData: FormData) {
  return chamar("remover_membro", { p_cla: texto(formData, "cla"), p_usuario: texto(formData, "usuario") }, "Membro removido.");
}

export async function nomearSublider(_: EstadoCla, formData: FormData) {
  const usuario = texto(formData, "usuario");
  return chamar("nomear_sublider", { p_usuario: usuario || null }, usuario ? "Sublíder nomeado." : "O clã ficou sem sublíder.");
}

export async function editarPerfilCla(_: EstadoCla, formData: FormData) {
  const redes = Object.fromEntries(
    (["discord", "instagram", "youtube"] as const).map((r) => [r, texto(formData, r)]).filter(([, v]) => v),
  );
  return chamar(
    "editar_perfil_cla",
    { p_cla: texto(formData, "cla"), p_logo: texto(formData, "logo") || null, p_bio: texto(formData, "bio"), p_redes: redes },
    "Perfil do clã salvo.",
  );
}
