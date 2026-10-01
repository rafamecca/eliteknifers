// Elo por confronto — ESPECIFICACAO.md › Pontuação.
// Espelha public.calcular_variacao_elo (supabase/migrations). O banco é quem grava os
// pontos na aprovação; aqui serve para prévias na tela. Mudou um, mude o outro.

import { diaEmBrasilia } from "./formato";

export const PONTOS_INICIAIS = 1000;
export const K = 32;
export const MIN_PARTIDAS_PARA_PONTOS = 3;
export const MIN_CONFRONTOS_NO_RANKING = 3;
/** Cada clã: no máximo 3 confrontos valendo pontos por dia (horário de Brasília). */
export const MAX_CONFRONTOS_COM_PONTOS_POR_DIA = 3;

/** Chance esperada de A vencer B. */
export function chanceEsperada(pontosA: number, pontosB: number): number {
  return 1 / (1 + 10 ** ((pontosB - pontosA) / 400));
}

/** Multiplicador de margem: 1 + 0,5 × (diferença de partidas ÷ total). Empate = 1. */
export function multiplicadorMargem(partidasA: number, partidasB: number): number {
  if (partidasA === partidasB) return 1;
  return 1 + (0.5 * Math.abs(partidasA - partidasB)) / (partidasA + partidasB);
}

/** Arredonda para o inteiro mais próximo, com .5 se afastando do zero (igual ao round do Postgres). */
function arredondar(valor: number): number {
  return Math.sign(valor) * Math.round(Math.abs(valor));
}

/** Variação de pontos do clã A (o clã B recebe o mesmo valor com sinal invertido). */
export function variacaoElo(
  pontosA: number,
  pontosB: number,
  partidasA: number,
  partidasB: number,
  k: number = K,
): number {
  const resultado = partidasA > partidasB ? 1 : partidasA < partidasB ? 0 : 0.5;
  const delta = k * multiplicadorMargem(partidasA, partidasB) * (resultado - chanceEsperada(pontosA, pontosB));
  return arredondar(delta) || 0; // evita -0
}

/** Pontos de largada na temporada seguinte: metade da distância até 1000 (1100 → 1050, 940 → 970).
 *  Espelha public.pontos_na_nova_temporada. */
export function pontosNaNovaTemporada(pontos: number): number {
  return arredondar(PONTOS_INICIAIS + (pontos - PONTOS_INICIAIS) / 2);
}

export type ConfrontoParaElo = {
  cla_a_id: string;
  cla_b_id: string;
  partidas_a: number;
  partidas_b: number;
  conta_pontos: boolean | null;
};

/** Elo geral histórico: começa em 1000 e aplica, na ordem recebida (ordem de aprovação), todos os
 *  confrontos que valeram pontos. Nunca reseta entre temporadas. Devolve os pontos e o pico de cada clã. */
export function historicoEloGeral(confrontos: ConfrontoParaElo[]): { pontos: Map<string, number>; pico: Map<string, number> } {
  const pontos = new Map<string, number>();
  const pico = new Map<string, number>();
  const aplicar = (cla: string, valor: number) => {
    pontos.set(cla, valor);
    pico.set(cla, Math.max(pico.get(cla) ?? PONTOS_INICIAIS, valor));
  };
  for (const c of confrontos) {
    if (!c.conta_pontos) continue;
    const ra = pontos.get(c.cla_a_id) ?? PONTOS_INICIAIS;
    const rb = pontos.get(c.cla_b_id) ?? PONTOS_INICIAIS;
    const delta = variacaoElo(ra, rb, c.partidas_a, c.partidas_b);
    aplicar(c.cla_a_id, ra + delta);
    aplicar(c.cla_b_id, rb - delta);
  }
  return { pontos, pico };
}

export function calcularEloGeral(confrontos: ConfrontoParaElo[]): Map<string, number> {
  return historicoEloGeral(confrontos).pontos;
}

export type ConfrontoQueContou = { cla_a_id: string; cla_b_id: string; data: string };

export type SemPontos =
  | { motivo: "partidas" }
  | { motivo: "mesmo-par" }
  | { motivo: "limite-diario"; claId: string };

/** Por que o confronto não valeria pontos se fosse aprovado agora (null = vale). `contaram` são os
 *  aprovados que valeram pontos (sem o próprio). Espelha public._conta_pontos. */
export function motivoSemPontos(
  c: ConfrontoQueContou & { partidas_a: number; partidas_b: number },
  contaram: ConfrontoQueContou[],
): SemPontos | null {
  if (c.partidas_a + c.partidas_b < MIN_PARTIDAS_PARA_PONTOS) return { motivo: "partidas" };
  const dia = diaEmBrasilia(c.data);
  const doDia = contaram.filter((o) => diaEmBrasilia(o.data) === dia);
  const joga = (o: ConfrontoQueContou, cla: string) => o.cla_a_id === cla || o.cla_b_id === cla;
  if (doDia.some((o) => joga(o, c.cla_a_id) && joga(o, c.cla_b_id))) return { motivo: "mesmo-par" };
  for (const cla of [c.cla_a_id, c.cla_b_id]) {
    if (doDia.filter((o) => joga(o, cla)).length >= MAX_CONFRONTOS_COM_PONTOS_POR_DIA) return { motivo: "limite-diario", claId: cla };
  }
  return null;
}
