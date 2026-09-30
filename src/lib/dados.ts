// Consultas de leitura usadas por várias páginas.
import type { SupabaseClient } from "@supabase/supabase-js";
import { montarRanking, type ConfrontoResumo, type Ranking } from "./ranking";
import type { ClaResumo, ConfrontoComClas, Temporada } from "./tipos";

export const SELECT_CONFRONTO = `id, data, status, partidas_a, partidas_b, conta_pontos, variacao, pontos_a_antes, pontos_b_antes,
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

export async function obterRanking(supabase: SupabaseClient, temporadaId: string): Promise<Ranking<ClaResumo>> {
  const [clas, pontos, confrontos] = await Promise.all([
    supabase.from("clas").select("id, nome, tag, logo").eq("ativo", true).overrideTypes<ClaResumo[], { merge: false }>(),
    supabase.from("pontos_temporada").select("cla_id, pontos").eq("temporada_id", temporadaId)
      .overrideTypes<{ cla_id: string; pontos: number }[], { merge: false }>(),
    // O Supabase devolve no máximo 1000 linhas por consulta; sobra folga para uma temporada de 25 clãs.
    supabase
      .from("confrontos")
      .select("cla_a_id, cla_b_id, partidas_a, partidas_b, data")
      .eq("temporada_id", temporadaId)
      .eq("status", "aprovado")
      .overrideTypes<ConfrontoResumo[], { merge: false }>(),
  ]);

  return montarRanking(
    garantir(clas),
    new Map(garantir(pontos).map((p) => [p.cla_id, p.pontos])),
    garantir(confrontos),
  );
}

export async function obterUltimosConfrontos(
  supabase: SupabaseClient,
  { limite, claId }: { limite: number; claId?: string },
): Promise<ConfrontoComClas[]> {
  let consulta = supabase.from("confrontos").select(SELECT_CONFRONTO).eq("status", "aprovado");
  if (claId) consulta = consulta.or(`cla_a_id.eq.${claId},cla_b_id.eq.${claId}`);
  return garantir(await consulta.order("data", { ascending: false }).limit(limite).overrideTypes<ConfrontoComClas[], { merge: false }>());
}
