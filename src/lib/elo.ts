// Elo por confronto — ESPECIFICACAO.md › Pontuação.
// Espelha public.calcular_variacao_elo (supabase/migrations). O banco é quem grava os
// pontos na aprovação; aqui serve para prévias na tela. Mudou um, mude o outro.

export const PONTOS_INICIAIS = 1000;
export const K = 32;
export const MIN_PARTIDAS_PARA_PONTOS = 3;
export const MIN_CONFRONTOS_NO_RANKING = 3;

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
