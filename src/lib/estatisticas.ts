// Estatísticas calculadas a partir dos confrontos aprovados (ESPECIFICACAO.md › Estatísticas do clã).
import type { ResultadoLetra } from "./ranking";

export type ConfrontoEstat = {
  id: string;
  data: string;
  cla_a_id: string;
  cla_b_id: string;
  partidas_a: number;
  partidas_b: number;
  partidas?: { rounds_a: number; rounds_b: number }[];
};

/** Um confronto visto por um dos clãs. */
export function doPontoDeVista(c: ConfrontoEstat, claId: string) {
  const ehA = c.cla_a_id === claId;
  const pro = ehA ? c.partidas_a : c.partidas_b;
  const contra = ehA ? c.partidas_b : c.partidas_a;
  const partidas = c.partidas ?? [];
  const roundsPro = partidas.reduce((s, p) => s + (ehA ? p.rounds_a : p.rounds_b), 0);
  const roundsContra = partidas.reduce((s, p) => s + (ehA ? p.rounds_b : p.rounds_a), 0);
  const resultado: ResultadoLetra = pro > contra ? "V" : pro < contra ? "D" : "E";
  return { pro, contra, roundsPro, roundsContra, resultado, adversarioId: ehA ? c.cla_b_id : c.cla_a_id };
}

export type Comparacao = {
  confrontos: number;
  vitoriasA: number;
  vitoriasB: number;
  empates: number;
  partidasA: number;
  partidasB: number;
  roundsA: number;
  roundsB: number;
  ultimo: ConfrontoEstat | null;
};

/** Confronto direto entre A e B (só confrontos entre os dois). */
export function compararClas(confrontos: ConfrontoEstat[], idA: string, idB: string): Comparacao {
  const entreEles = confrontos
    .filter((c) => (c.cla_a_id === idA && c.cla_b_id === idB) || (c.cla_a_id === idB && c.cla_b_id === idA))
    .sort((x, y) => y.data.localeCompare(x.data));

  const r: Comparacao = {
    confrontos: entreEles.length,
    vitoriasA: 0,
    vitoriasB: 0,
    empates: 0,
    partidasA: 0,
    partidasB: 0,
    roundsA: 0,
    roundsB: 0,
    ultimo: entreEles[0] ?? null,
  };
  for (const c of entreEles) {
    const v = doPontoDeVista(c, idA);
    if (v.resultado === "V") r.vitoriasA++;
    else if (v.resultado === "D") r.vitoriasB++;
    else r.empates++;
    r.partidasA += v.pro;
    r.partidasB += v.contra;
    r.roundsA += v.roundsPro;
    r.roundsB += v.roundsContra;
  }
  return r;
}
