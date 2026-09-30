"use server";

import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

/** Dos hashes informados, devolve os que já estão em algum resultado não rejeitado. */
export async function verificarPrints(hashes: string[]): Promise<string[]> {
  const validos = hashes.filter((h) => /^[0-9a-f]{64}$/.test(h)).slice(0, 20);
  if (validos.length === 0) return [];
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("prints")
    .select("hash, confronto:confrontos!inner(status)")
    .in("hash", validos)
    .neq("confronto.status", "rejeitado");
  return (data ?? []).map((p) => p.hash as string);
}

export type DadosEnvio = {
  claAdversario: string;
  data: string; // ISO
  partidasA: number;
  partidasB: number;
  rounds: { a: number; b: number }[];
  prints: { arquivo: string; hash: string; partida: number | null }[];
  observacao: string;
};

/** Grava o confronto. Todas as regras são conferidas de novo no banco (public.enviar_confronto). */
export async function enviarConfronto(dados: DadosEnvio): Promise<{ id?: string; erro?: string }> {
  const sessao = await obterSessao();
  if (!sessao?.podeEnviar) return { erro: "Só o líder ou o sublíder de um clã pode enviar resultados." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("enviar_confronto", {
    p_cla_adversario: dados.claAdversario,
    p_data: dados.data,
    p_partidas_a: dados.partidasA,
    p_partidas_b: dados.partidasB,
    p_rounds: dados.rounds,
    p_prints: dados.prints,
    p_observacao: dados.observacao.slice(0, 500),
  });
  if (error) return { erro: error.message };

  revalidatePath("/enviar");
  revalidatePath("/admin");
  return { id: data as string };
}
