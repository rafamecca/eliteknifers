import { describe, expect, it } from "vitest";
import { compararClas, doPontoDeVista, type ConfrontoEstat } from "./estatisticas";

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
