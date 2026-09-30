// Regras do placar de um confronto, usadas no formulário (feedback na hora).
// O banco repete essas validações em public.enviar_confronto.

export const MAX_PARTIDAS = 15;
export const ROUNDS_PARA_VENCER = 9;

export type RoundsPartida = { a: number | null; b: number | null };

export type ResultadoValidacao =
  | { ok: true }
  | { ok: false; erros: string[] };

function inteiroEntre(valor: number | null, min: number, max: number): valor is number {
  return valor !== null && Number.isInteger(valor) && valor >= min && valor <= max;
}

/** Uma partida é válida quando um lado faz 9 e o outro fica entre 0 e 8. */
export function vencedorDaPartida(p: RoundsPartida): "a" | "b" | null {
  if (!inteiroEntre(p.a, 0, 9) || !inteiroEntre(p.b, 0, 9)) return null;
  if (p.a === ROUNDS_PARA_VENCER && p.b < ROUNDS_PARA_VENCER) return "a";
  if (p.b === ROUNDS_PARA_VENCER && p.a < ROUNDS_PARA_VENCER) return "b";
  return null;
}

export function validarPlacar(partidasA: number | null, partidasB: number | null, rounds: RoundsPartida[]): ResultadoValidacao {
  const erros: string[] = [];

  if (!inteiroEntre(partidasA, 0, MAX_PARTIDAS) || !inteiroEntre(partidasB, 0, MAX_PARTIDAS)) {
    return { ok: false, erros: ["Informe o placar do confronto em partidas."] };
  }
  const total = partidasA + partidasB;
  if (total < 1 || total > MAX_PARTIDAS) {
    return { ok: false, erros: [`O confronto precisa ter de 1 a ${MAX_PARTIDAS} partidas.`] };
  }
  if (rounds.length !== total) {
    return { ok: false, erros: [`Informe os rounds das ${total} partidas.`] };
  }

  let vitoriasA = 0;
  let vitoriasB = 0;
  rounds.forEach((p, i) => {
    const vencedor = vencedorDaPartida(p);
    if (vencedor === null) {
      erros.push(`Partida ${i + 1}: quem vence faz 9 rounds e o outro de 0 a 8.`);
    } else if (vencedor === "a") {
      vitoriasA++;
    } else {
      vitoriasB++;
    }
  });

  if (erros.length === 0 && (vitoriasA !== partidasA || vitoriasB !== partidasB)) {
    erros.push(`Os rounds não batem com o placar: pelos rounds ficou ${vitoriasA}x${vitoriasB}.`);
  }

  return erros.length ? { ok: false, erros } : { ok: true };
}

/** Ajusta a lista de rounds ao total de partidas, preservando o que já foi digitado. */
export function ajustarRounds(rounds: RoundsPartida[], total: number): RoundsPartida[] {
  const n = Math.max(0, Math.min(total, MAX_PARTIDAS));
  return Array.from({ length: n }, (_, i) => rounds[i] ?? { a: null, b: null });
}
