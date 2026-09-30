"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehUuid } from "@/lib/uuid";

export type EstadoAdmin = { erro?: string; mensagem?: string };

async function clienteAdmin() {
  const sessao = await obterSessao();
  if (!sessao?.ehAdmin) throw new Error("Apenas o ADM pode fazer isso.");
  return { sessao, supabase: await criarClienteServidor() };
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

// ---------------------------------------------------------------------------
// Fila de aprovação
// ---------------------------------------------------------------------------

export async function aprovarConfronto(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { supabase } = await clienteAdmin();
  const { error } = await supabase.rpc("aprovar_confronto", { p_confronto: texto(formData, "id") });
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { mensagem: "Aprovado." };
}

export async function rejeitarConfronto(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { supabase } = await clienteAdmin();
  const motivo = texto(formData, "motivo");
  if (!motivo) return { erro: "Informe o motivo da rejeição." };
  const { error } = await supabase.rpc("rejeitar_confronto", { p_confronto: texto(formData, "id"), p_motivo: motivo });
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { mensagem: formData.get("anular") ? "Resultado anulado e pontos desfeitos." : "Rejeitado." };
}

export async function manterConfronto(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { supabase } = await clienteAdmin();
  const { error } = await supabase.rpc("manter_confronto", { p_confronto: texto(formData, "id") });
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { mensagem: "Resultado mantido." };
}

/** Corrige placar e rounds. Se já aprovado, o banco troca os pontos antigos pelos do placar novo. */
export async function corrigirConfronto(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { supabase } = await clienteAdmin();
  let rounds: unknown;
  try {
    rounds = JSON.parse(texto(formData, "rounds"));
  } catch {
    return { erro: "Rounds inválidos." };
  }
  const { error } = await supabase.rpc("corrigir_confronto", {
    p_confronto: texto(formData, "id"),
    p_partidas_a: Number(texto(formData, "partidas_a")),
    p_partidas_b: Number(texto(formData, "partidas_b")),
    p_rounds: rounds,
  });
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { mensagem: "Placar corrigido." };
}

// ---------------------------------------------------------------------------
// Clãs
// ---------------------------------------------------------------------------

// Tag vai na URL do perfil: sem espaço nem / ? # % &.
const TAG_VALIDA = /^[^\s/?#%&\\]{1,12}$/;

function url(valor: string): string | undefined {
  return /^https?:\/\/\S+$/.test(valor) ? valor : undefined;
}

export async function salvarCla(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { sessao, supabase } = await clienteAdmin();
  const id = texto(formData, "id");

  const nome = texto(formData, "nome");
  const tag = texto(formData, "tag");
  if (nome.length < 2 || nome.length > 60) return { erro: "O nome precisa ter de 2 a 60 caracteres." };
  if (!TAG_VALIDA.test(tag)) return { erro: "A tag precisa ter até 12 caracteres, sem espaços nem / ? # % &." };

  const redesInformadas = { discord: texto(formData, "discord"), instagram: texto(formData, "instagram"), youtube: texto(formData, "youtube") };
  for (const [rede, valor] of Object.entries(redesInformadas)) {
    if (valor && !url(valor)) return { erro: `O link do ${rede} precisa começar com https://` };
  }

  const dados = {
    nome,
    tag,
    fundado_em: texto(formData, "fundado_em") || null,
    bio: texto(formData, "bio").slice(0, 1000) || null,
    logo: texto(formData, "logo") || null,
    redes: Object.fromEntries(Object.entries(redesInformadas).filter(([, v]) => v)),
    ...(id ? { ativo: formData.get("ativo") === "on" } : {}),
  };

  let claId = id;
  let antes = null;
  if (id) {
    if (!ehUuid(id)) return { erro: "Clã inválido." };
    antes = (await supabase.from("clas").select("*").eq("id", id).maybeSingle()).data;
    const { error } = await supabase.from("clas").update(dados).eq("id", id);
    if (error) return { erro: error.code === "23505" ? "Já existe um clã com essa tag." : error.message };
  } else {
    const { data, error } = await supabase.from("clas").insert(dados).select("id").single();
    if (error) return { erro: error.code === "23505" ? "Já existe um clã com essa tag." : error.message };
    claId = data.id;
  }

  await supabase.from("log_admin").insert({
    adm_id: sessao.usuario.id,
    acao: id ? "editar_cla" : "criar_cla",
    alvo: `clas:${claId}`,
    antes,
    depois: dados,
  });

  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/clas/${claId}`);
  return { mensagem: "Clã salvo." };
}

async function idPorNick(supabase: Awaited<ReturnType<typeof criarClienteServidor>>, nick: string) {
  if (!nick) return { id: null };
  const { data } = await supabase
    .from("usuarios")
    .select("id")
    .ilike("nick", nick.replace(/[\\%_]/g, "\\$&"))
    .maybeSingle();
  return data ? { id: data.id as string } : { erro: `Nenhum jogador com o nick "${nick}". Ele precisa se cadastrar antes.` };
}

export async function definirLideranca(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { supabase } = await clienteAdmin();
  const lider = await idPorNick(supabase, texto(formData, "lider"));
  if (lider.erro) return { erro: lider.erro };
  const sublider = await idPorNick(supabase, texto(formData, "sublider"));
  if (sublider.erro) return { erro: sublider.erro };

  const { error } = await supabase.rpc("definir_lideranca", {
    p_cla: texto(formData, "cla"),
    p_lider: lider.id,
    p_sublider: sublider.id,
  });
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { mensagem: "Liderança atualizada." };
}

export async function removerMembro(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { supabase } = await clienteAdmin();
  const { error } = await supabase.rpc("remover_membro", {
    p_cla: texto(formData, "cla"),
    p_usuario: texto(formData, "usuario"),
  });
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { mensagem: "Membro removido." };
}
