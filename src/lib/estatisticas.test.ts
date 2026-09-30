import { describe, expect, it } from "vitest";
import { compararClas, doPontoDeVista, estatisticasDoCla, type ConfrontoEstat } from "./estatisticas";

const c = (id: string, data: string, a: string, b: string, pa: number, pb: number, rounds: [number, number][] = []): ConfrontoEstat => ({
  id,
  data,
  cla_a_id: a,
  cla_b_id: b,
  partidas_a: pa,
  partidas_b: pb,
  partidas: rounds.map(([rounds_a, rounds_b]) => ({ rounds_a, rounds_b })),
});

describe("doPontoDeVista", () => {
  it("inverte placar e rounds para o clã B", () => {
    const v = doPontoDeVista(c("1", "2026-10-01", "x", "y", 2, 1, [[9, 5], [9, 7], [3, 9]]), "y");
    expect(v).toEqual({ pro: 1, contra: 2, roundsPro: 21, roundsContra: 21, resultado: "D", adversarioId: "x" });
  });
});

describe("compararClas", () => {
  it("soma o confronto direto dos dois lados e ignora outros clãs", () => {
    const r = compararClas(
      [
        c("1", "2026-10-01", "a", "b", 3, 1, [[9, 1], [9, 2], [1, 9], [9, 8]]),
        c("2", "2026-10-03", "b", "a", 3, 2),
        c("3", "2026-10-05", "a", "b", 2, 2),
        c("4", "2026-10-06", "a", "z", 5, 0),
      ],
      "a",
      "b",
    );
    expect(r).toMatchObject({
      confrontos: 3,
      vitoriasA: 1,
      vitoriasB: 1,
      empates: 1,
      partidasA: 7,
      partidasB: 6,
      roundsA: 28,
      roundsB: 20,
    });
    expect(r.ultimo?.id).toBe("3");
  });

  it("sem confrontos entre eles", () => {
    expect(compararClas([], "a", "b")).toMatchObject({ confrontos: 0, ultimo: null });
  });
});

describe("estatisticasDoCla", () => {
  const lista = [
    c("1", "2026-10-01", "a", "b", 3, 1, [[9, 1], [9, 2], [1, 9], [9, 8]]), // V (+2)
    c("2", "2026-10-02", "c", "a", 0, 5), // V (+5)
    c("3", "2026-10-03", "a", "b", 5, 0), // V (+5, mais recente)
    c("4", "2026-10-04", "b", "a", 3, 2), // D
    c("5", "2026-10-05", "a", "c", 2, 2), // E
    c("6", "2026-10-06", "a", "b", 1, 3), // D
    c("7", "2026-10-07", "b", "a", 4, 1), // D
    c("8", "2026-10-07", "b", "c", 9, 0), // não é do clã a
  ];
  const e = estatisticasDoCla(lista, "a");

  it("conta confrontos, partidas e rounds", () => {
    expect(e).toMatchObject({
      jogos: 7,
      vitorias: 3,
      empates: 1,
      derrotas: 3,
      aproveitamento: 50,
      partidasPro: 19,
      partidasContra: 13,
      saldoPartidas: 6,
      roundsPro: 28,
      roundsContra: 20,
      saldoRounds: 8,
    });
    expect(e.aproveitamentoPartidas).toBe(59.4); // 19 de 32
  });

  it("sequência atual e maior sequência de vitórias", () => {
    expect(e.sequenciaAtual).toEqual({ resultado: "D", quantidade: 2 });
    expect(e.maiorSequenciaVitorias).toBe(3);
  });

  it("maior vitória fica com a mais recente em caso de empate na margem", () => {
    expect(e.maiorVitoria?.confronto.id).toBe("3");
    expect(e.maiorVitoria).toMatchObject({ pro: 5, contra: 0 });
  });

  it("retrospecto contra cada rival, do mais enfrentado", () => {
    expect(e.rivais.map((r) => [r.adversarioId, r.jogos, r.vitorias, r.empates, r.derrotas])).toEqual([
      ["b", 5, 2, 0, 3],
      ["c", 2, 1, 1, 0],
    ]);
  });

  it("clã sem confrontos", () => {
    expect(estatisticasDoCla([], "a")).toMatchObject({ jogos: 0, sequenciaAtual: null, maiorVitoria: null, rivais: [] });
  });
});
