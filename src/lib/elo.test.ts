import { describe, expect, it } from "vitest";
import { calcularEloGeral, chanceEsperada, historicoEloGeral, multiplicadorMargem, pontosNaNovaTemporada, variacaoElo } from "./elo";

describe("variacaoElo — exemplos da especificação", () => {
  it.each([
    { a: 1000, b: 1000, pa: 5, pb: 1, esperado: 21 },
    { a: 1000, b: 1000, pa: 3, pb: 2, esperado: 18 },
    { a: 1000, b: 1200, pa: 3, pb: 2, esperado: 27 },
    { a: 1200, b: 1000, pa: 5, pb: 0, esperado: 12 },
  ])("$a x $b, placar $pa x $pb → +$esperado", ({ a, b, pa, pb, esperado }) => {
    expect(variacaoElo(a, b, pa, pb)).toBe(esperado);
  });

  it("é simétrico: a derrota tira o mesmo que a vitória dá", () => {
    expect(variacaoElo(1000, 1000, 1, 5)).toBe(-21);
    expect(variacaoElo(1000, 1200, 2, 3)).toBe(-variacaoElo(1200, 1000, 3, 2));
  });

  it("empate entre iguais não mexe; empate contra mais forte dá pontos", () => {
    expect(variacaoElo(1000, 1000, 2, 2)).toBe(0);
    expect(Object.is(variacaoElo(1000, 1000, 2, 2), -0)).toBe(false);
    expect(variacaoElo(1000, 1200, 2, 2)).toBe(8);
  });
});

describe("partes da fórmula", () => {
  it("chance esperada", () => {
    expect(chanceEsperada(1000, 1000)).toBe(0.5);
    expect(chanceEsperada(1000, 1200)).toBeCloseTo(0.2403, 4);
  });

  it("multiplicador de margem vai de 1,0 a 1,5", () => {
    expect(multiplicadorMargem(3, 3)).toBe(1);
    expect(multiplicadorMargem(5, 0)).toBe(1.5);
    expect(multiplicadorMargem(5, 1)).toBeCloseTo(1.333, 3);
    expect(multiplicadorMargem(3, 2)).toBeCloseTo(1.1, 5);
  });
});

describe("pontosNaNovaTemporada", () => {
  it.each([
    [1100, 1050],
    [940, 970],
    [1000, 1000],
    [1037, 1019],
    [963, 982], // 981,5 arredonda como o Postgres
  ])("%i → %i", (pontos, esperado) => {
    expect(pontosNaNovaTemporada(pontos)).toBe(esperado);
  });
});

describe("calcularEloGeral", () => {
  it("aplica só o que valeu pontos, em ordem, sem resetar", () => {
    const pontos = calcularEloGeral([
      { cla_a_id: "a", cla_b_id: "b", partidas_a: 5, partidas_b: 1, conta_pontos: true },
      { cla_a_id: "a", cla_b_id: "b", partidas_a: 0, partidas_b: 3, conta_pontos: false },
      { cla_a_id: "b", cla_b_id: "a", partidas_a: 3, partidas_b: 2, conta_pontos: true },
    ]);
    const segundo = variacaoElo(1000 - 21, 1000 + 21, 3, 2);
    expect(pontos.get("a")).toBe(1021 - segundo);
    expect(pontos.get("b")).toBe(979 + segundo);
    expect(pontos.has("c")).toBe(false);
  });

  it("guarda o pico de cada clã", () => {
    const { pico } = historicoEloGeral([
      { cla_a_id: "a", cla_b_id: "b", partidas_a: 5, partidas_b: 1, conta_pontos: true },
      { cla_a_id: "b", cla_b_id: "a", partidas_a: 5, partidas_b: 0, conta_pontos: true },
    ]);
    expect(pico.get("a")).toBe(1021);
    expect(pico.get("b")).toBeGreaterThan(1000);
  });
});
