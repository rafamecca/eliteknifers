// Consultas de leitura usadas por várias páginas.
import type { SupabaseClient } from "@supabase/supabase-js";
import { PRAZO_RESPOSTA_HORAS } from "./confronto";
import { calcularEloGeral, type ConfrontoParaElo } from "./elo";
import { montarRanking, type ConfrontoResumo, type Ranking } from "./ranking";
import type { ClaResumo, ConfrontoComClas, Temporada } from "./tipos";

export const SELECT_CONFRONTO = `id, data, enviado_em, status, resposta, contestacao_resolvida, partidas_a, partidas_b, conta_pontos, variacao, pontos_a_antes, pontos_b_antes,
  cla_a:clas!confrontos_cla_a_id_fkey(id, nome, tag, logo),
  cla_b:clas!confrontos_cla_b_id_fkey(id, nome, tag, logo)`;

/** Devolve os dados ou lança o erro do Supabase (cai no error.tsx). */
export function garantir<T>(resposta: { data: T | null; error: { message: string } | null }): T {
  if (resposta.error) throw new Error(resposta.error.message);
  return resposta.data as T;
}

export async function obterTemporadaAtiva(supabase: SupabaseClient): Promise<Temporada | null> {
  return garantir(
    await supabase.from("temporadas").select("id, nome, inicio, fim, ativa").eq("ativa", true).maybeSingle<Temporada>(),
  );
}

/** Busca todas as linhas, em lotes de 1000 (limite por consulta do Supabase). A consulta precisa ter ordem fixa. */
export async function buscarTodos<T>(
  lote: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const TAMANHO = 1000;
  const todos: T[] = [];
  for (let de = 0; ; de += TAMANHO) {
    const linhas = garantir(await lote(de, de + TAMANHO - 1));
    todos.push(...linhas);
    if (linhas.length < TAMANHO) return todos;
  }
}

/**
 * Ranking de uma temporada. Na temporada ativa só entram clãs ativos; nas encerradas, todos
 * (um clã desativado depois continua na tabela da temporada em que jogou).
 */
export async function obterRanking(
  supabase: SupabaseClient,
  temporadaId: string,
  { soAtivos = true }: { soAtivos?: boolean } = {},
): Promise<Ranking<ClaResumo>> {
  let consultaClas = supabase.from("clas").select("id, nome, tag, logo");
  if (soAtivos) consultaClas = consultaClas.eq("ativo", true);
  const [clas, pontos, confrontos] = await Promise.all([
    consultaClas.overrideTypes<ClaResumo[], { merge: false }>(),
    supabase.from("pontos_temporada").select("cla_id, pontos").eq("temporada_id", temporadaId)
      .overrideTypes<{ cla_id: string; pontos: number }[], { merge: false }>(),
    buscarTodos((de, ate) =>
      supabase
        .from("confrontos")
        .select("cla_a_id, cla_b_id, partidas_a, partidas_b, data")
        .eq("temporada_id", temporadaId)
        .eq("status", "aprovado")
        .order("id")
        .range(de, ate)
        .overrideTypes<ConfrontoResumo[], { merge: false }>(),
    ),
  ]);

  return montarRanking(garantir(clas), new Map(garantir(pontos).map((p) => [p.cla_id, p.pontos])), confrontos);
}

/** Ranking geral histórico: Elo que nunca reseta + totais de todas as temporadas (ESPECIFICACAO.md › Temporadas). */
export async function obterRankingGeral(supabase: SupabaseClient): Promise<Ranking<ClaResumo>> {
  const [clas, confrontos] = await Promise.all([
    supabase.from("clas").select("id, nome, tag, logo").eq("ativo", true).overrideTypes<ClaResumo[], { merge: false }>(),
    buscarTodos((de, ate) =>
      supabase
        .from("confrontos")
        .select("cla_a_id, cla_b_id, partidas_a, partidas_b, data, conta_pontos")
        .eq("status", "aprovado")
        .order("decidido_em")
        .order("id")
        .range(de, ate)
        .overrideTypes<(ConfrontoResumo & ConfrontoParaElo)[], { merge: false }>(),
    ),
  ]);
  return montarRanking(garantir(clas), calcularEloGeral(confrontos), confrontos);
}

export type TemporadaEncerrada = Temporada & {
  podio: { posicao: number; cla: ClaResumo }[];
};

/** Temporadas encerradas, da mais recente para a mais antiga, com os 3 primeiros colocados. */
export async function obterTemporadasEncerradas(supabase: SupabaseClient): Promise<TemporadaEncerrada[]> {
  const temporadas = garantir(
    await supabase
      .from("temporadas")
      .select("id, nome, inicio, fim, ativa, podio:pontos_temporada(posicao:posicao_final, cla:clas(id, nome, tag, logo))")
      .eq("ativa", false)
      .order("inicio", { ascending: false })
      .overrideTypes<(Temporada & { podio: { posicao: number | null; cla: ClaResumo }[] })[], { merge: false }>(),
  );
  return temporadas.map((t) => ({
    ...t,
    podio: t.podio
      .filter((p): p is { posicao: number; cla: ClaResumo } => p.posicao !== null && p.posicao <= 3)
      .sort((x, y) => x.posicao - y.posicao),
  }));
}

/** Temporadas em que o clã foi campeão (posição final 1). */
export async function obterTitulosDeTemporada(supabase: SupabaseClient, claId: string): Promise<Temporada[]> {
  const linhas = garantir(
    await supabase
      .from("pontos_temporada")
      .select("temporada:temporadas(id, nome, inicio, fim, ativa)")
      .eq("cla_id", claId)
      .eq("posicao_final", 1)
      .overrideTypes<{ temporada: Temporada }[], { merge: false }>(),
  );
  return linhas.map((l) => l.temporada).sort((x, y) => y.inicio.localeCompare(x.inicio));
}

export async function obterUltimosConfrontos(
  supabase: SupabaseClient,
  { limite, claId }: { limite: number; claId?: string },
): Promise<ConfrontoComClas[]> {
  let consulta = supabase.from("confrontos").select(SELECT_CONFRONTO).eq("status", "aprovado");
  if (claId) consulta = consulta.or(`cla_a_id.eq.${claId},cla_b_id.eq.${claId}`);
  return garantir(await consulta.order("data", { ascending: false }).limit(limite).overrideTypes<ConfrontoComClas[], { merge: false }>());
}

/** Início da janela de resposta: resultados enviados depois disso ainda podem ser respondidos. */
function limiteResposta(): string {
  return new Date(Date.now() - PRAZO_RESPOSTA_HORAS * 3600_000).toISOString();
}

/** Quantos resultados enviados contra o clã ainda esperam confirmação ou contestação. */
export async function contarPendencias(supabase: SupabaseClient, claId: string): Promise<number> {
  const { count } = await supabase
    .from("confrontos")
    .select("id", { count: "exact", head: true })
    .eq("cla_b_id", claId)
    .eq("resposta", "aguardando")
    .neq("status", "rejeitado")
    .gte("enviado_em", limiteResposta());
  return count ?? 0;
}

export async function obterAguardandoResposta(supabase: SupabaseClient, claId: string): Promise<ConfrontoComClas[]> {
  return garantir(
    await supabase
      .from("confrontos")
      .select(SELECT_CONFRONTO)
      .eq("cla_b_id", claId)
      .eq("resposta", "aguardando")
      .neq("status", "rejeitado")
      .gte("enviado_em", limiteResposta())
      .order("enviado_em", { ascending: true })
      .overrideTypes<ConfrontoComClas[], { merge: false }>(),
  );
}
