"use server";

import { revalidatePath } from "next/cache";
import { obterRanking, obterTemporadaAtiva } from "@/lib/dados";
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

// ---------------------------------------------------------------------------
// Temporadas
// ---------------------------------------------------------------------------

const DIA = /^\d{4}-\d{2}-\d{2}$/;

export async function salvarTemporada(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { sessao, supabase } = await clienteAdmin();
  const id = texto(formData, "id");
  const dados = { nome: texto(formData, "nome"), inicio: texto(formData, "inicio"), fim: texto(formData, "fim") };
  if (!ehUuid(id)) return { erro: "Temporada inválida." };
  if (!dados.nome) return { erro: "Dê um nome para a temporada." };
  if (!DIA.test(dados.inicio) || !DIA.test(dados.fim) || dados.fim < dados.inicio) return { erro: "Datas inválidas." };

  const { error } = await supabase.from("temporadas").update(dados).eq("id", id);
  if (error) return { erro: error.message };
  await supabase.from("log_admin").insert({ adm_id: sessao.usuario.id, acao: "editar_temporada", alvo: `temporadas:${id}`, depois: dados });
  revalidatePath("/", "layout");
  return { mensagem: "Temporada salva." };
}

/** Encerra a temporada ativa (posições finais pelo ranking de agora) e abre a próxima com os pontos resetados. */
export async function abrirNovaTemporada(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { supabase } = await clienteAdmin();
  const nome = texto(formData, "nome");
  const inicio = texto(formData, "inicio");
  const fim = texto(formData, "fim");
  if (!nome) return { erro: "Dê um nome para a nova temporada." };
  if (!DIA.test(inicio) || !DIA.test(fim) || fim < inicio) return { erro: "Datas inválidas." };
  if (formData.get("confirmar") !== "on") return { erro: "Marque a confirmação para continuar." };

  const atual = await obterTemporadaAtiva(supabase);
  const posicoes: Record<string, number> = {};
  if (atual) {
    const { classificados } = await obterRanking(supabase, atual.id);
    for (const l of classificados) if (l.posicao) posicoes[l.cla.id] = l.posicao;
  }

  const { error } = await supabase.rpc("nova_temporada", { p_nome: nome, p_inicio: inicio, p_fim: fim, p_posicoes: posicoes });
  if (error) return { erro: error.message };
  revalidatePath("/", "layout");
  return { mensagem: atual ? `${atual.nome} encerrada e ${nome} aberta.` : `${nome} aberta.` };
}

// ---------------------------------------------------------------------------
// Campeonatos
// ---------------------------------------------------------------------------

export async function salvarCampeonato(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { sessao, supabase } = await clienteAdmin();
  const id = texto(formData, "id");
  const dados = {
    nome: texto(formData, "nome"),
    data: texto(formData, "data") || null,
    descricao: texto(formData, "descricao").slice(0, 2000) || null,
  };
  if (dados.nome.length < 2 || dados.nome.length > 80) return { erro: "O nome precisa ter de 2 a 80 caracteres." };
  if (dados.data && !DIA.test(dados.data)) return { erro: "Data inválida." };

  let campeonatoId = id;
  if (id) {
    if (!ehUuid(id)) return { erro: "Campeonato inválido." };
    const { error } = await supabase.from("campeonatos").update(dados).eq("id", id);
    if (error) return { erro: error.message };
  } else {
    const { data, error } = await supabase.from("campeonatos").insert(dados).select("id").single();
    if (error) return { erro: error.message };
    campeonatoId = data.id;
  }
  await supabase.from("log_admin").insert({
    adm_id: sessao.usuario.id,
    acao: id ? "editar_campeonato" : "criar_campeonato",
    alvo: `campeonatos:${campeonatoId}`,
    depois: dados,
  });
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/campeonatos/${campeonatoId}`);
  return { mensagem: "Campeonato salvo." };
}

export async function excluirCampeonato(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { sessao, supabase } = await clienteAdmin();
  const id = texto(formData, "id");
  if (!ehUuid(id)) return { erro: "Campeonato inválido." };
  const { error } = await supabase.from("campeonatos").delete().eq("id", id);
  if (error) return { erro: error.message };
  await supabase.from("log_admin").insert({ adm_id: sessao.usuario.id, acao: "excluir_campeonato", alvo: `campeonatos:${id}` });
  revalidatePath("/", "layout");
  redirect("/admin/campeonatos");
}

export async function adicionarColocacao(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { sessao, supabase } = await clienteAdmin();
  const dados = {
    campeonato_id: texto(formData, "campeonato"),
    cla_id: texto(formData, "cla"),
    colocacao: Number(texto(formData, "colocacao")),
  };
  if (!ehUuid(dados.campeonato_id) || !ehUuid(dados.cla_id)) return { erro: "Escolha o clã." };
  if (!Number.isInteger(dados.colocacao) || dados.colocacao < 1 || dados.colocacao > 64) return { erro: "Colocação inválida." };
  const { error } = await supabase.from("titulos").insert(dados);
  if (error) return { erro: error.code === "23505" ? "Esse clã já tem uma colocação neste campeonato." : error.message };
  await supabase.from("log_admin").insert({
    adm_id: sessao.usuario.id,
    acao: "adicionar_colocacao",
    alvo: `campeonatos:${dados.campeonato_id}`,
    depois: dados,
  });
  revalidatePath("/", "layout");
  return { mensagem: "Colocação adicionada." };
}

export async function removerColocacao(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { sessao, supabase } = await clienteAdmin();
  const campeonato = texto(formData, "campeonato");
  const cla = texto(formData, "cla");
  const { error } = await supabase.from("titulos").delete().eq("campeonato_id", campeonato).eq("cla_id", cla);
  if (error) return { erro: error.message };
  await supabase.from("log_admin").insert({
    adm_id: sessao.usuario.id,
    acao: "remover_colocacao",
    alvo: `campeonatos:${campeonato}`,
    antes: { cla_id: cla },
  });
  revalidatePath("/", "layout");
  return { mensagem: "Colocação removida." };
}
