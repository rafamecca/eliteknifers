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

export type Retrospecto = {
  adversarioId: string;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  partidasPro: number;
  partidasContra: number;
};

export type EstatisticasCla = {
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  /** (V + E/2) ÷ confrontos, 0 a 100 — mesma regra do ranking. */
  aproveitamento: number;
  partidasPro: number;
  partidasContra: number;
  saldoPartidas: number;
  /** Partidas ganhas ÷ partidas jogadas, 0 a 100. */
  aproveitamentoPartidas: number;
  roundsPro: number;
  roundsContra: number;
  saldoRounds: number;
  /** Resultado repetido nos confrontos mais recentes (ex.: 3 vitórias seguidas). */
  sequenciaAtual: { resultado: ResultadoLetra; quantidade: number } | null;
  maiorSequenciaVitorias: number;
  /** Vitória com maior diferença de partidas (a mais recente, se empatar). */
  maiorVitoria: { confronto: ConfrontoEstat; pro: number; contra: number } | null;
  /** Retrospecto contra cada adversário, do mais enfrentado para o menos. */
  rivais: Retrospecto[];
};

const umaCasa = (n: number) => Math.round(n * 10) / 10;

/** Estatísticas de um clã a partir dos confrontos aprovados dele (de uma temporada ou de todas). */
export function estatisticasDoCla(confrontos: ConfrontoEstat[], claId: string): EstatisticasCla {
  const doCla = confrontos
    .filter((c) => c.cla_a_id === claId || c.cla_b_id === claId)
    .sort((x, y) => x.data.localeCompare(y.data) || x.id.localeCompare(y.id));

  const e: EstatisticasCla = {
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    aproveitamento: 0,
    partidasPro: 0,
    partidasContra: 0,
    saldoPartidas: 0,
    aproveitamentoPartidas: 0,
    roundsPro: 0,
    roundsContra: 0,
    saldoRounds: 0,
    sequenciaAtual: null,
    maiorSequenciaVitorias: 0,
    maiorVitoria: null,
    rivais: [],
  };
  const rivais = new Map<string, Retrospecto>();
  let seguidasV = 0;

  for (const c of doCla) {
    const v = doPontoDeVista(c, claId);
    e.jogos++;
    if (v.resultado === "V") e.vitorias++;
    else if (v.resultado === "D") e.derrotas++;
    else e.empates++;
    e.partidasPro += v.pro;
    e.partidasContra += v.contra;
    e.roundsPro += v.roundsPro;
    e.roundsContra += v.roundsContra;

    seguidasV = v.resultado === "V" ? seguidasV + 1 : 0;
    e.maiorSequenciaVitorias = Math.max(e.maiorSequenciaVitorias, seguidasV);
    e.sequenciaAtual =
      e.sequenciaAtual?.resultado === v.resultado
        ? { resultado: v.resultado, quantidade: e.sequenciaAtual.quantidade + 1 }
        : { resultado: v.resultado, quantidade: 1 };

    if (v.resultado === "V" && (!e.maiorVitoria || v.pro - v.contra >= e.maiorVitoria.pro - e.maiorVitoria.contra)) {
      e.maiorVitoria = { confronto: c, pro: v.pro, contra: v.contra };
    }

    const r = rivais.get(v.adversarioId) ?? {
      adversarioId: v.adversarioId,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      partidasPro: 0,
      partidasContra: 0,
    };
    r.jogos++;
    if (v.resultado === "V") r.vitorias++;
    else if (v.resultado === "D") r.derrotas++;
    else r.empates++;
    r.partidasPro += v.pro;
    r.partidasContra += v.contra;
    rivais.set(v.adversarioId, r);
  }

  e.saldoPartidas = e.partidasPro - e.partidasContra;
  e.saldoRounds = e.roundsPro - e.roundsContra;
  e.aproveitamento = e.jogos ? umaCasa(((e.vitorias + e.empates / 2) / e.jogos) * 100) : 0;
  const partidas = e.partidasPro + e.partidasContra;
  e.aproveitamentoPartidas = partidas ? umaCasa((e.partidasPro / partidas) * 100) : 0;
  e.rivais = [...rivais.values()].sort((x, y) => y.jogos - x.jogos || y.vitorias - x.vitorias);
  return e;
}
