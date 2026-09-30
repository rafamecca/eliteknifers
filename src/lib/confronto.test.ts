import { describe, expect, it } from "vitest";
import { ajustarRounds, validarPlacar, vencedorDaPartida } from "./confronto";

describe("vencedorDaPartida", () => {
  it("reconhece quem fez 9", () => {
    expect(vencedorDaPartida({ a: 9, b: 6 })).toBe("a");
    expect(vencedorDaPartida({ a: 4, b: 9 })).toBe("b");
  });

  it("rejeita placares impossíveis", () => {
    expect(vencedorDaPartida({ a: 9, b: 9 })).toBeNull();
    expect(vencedorDaPartida({ a: 8, b: 7 })).toBeNull();
    expect(vencedorDaPartida({ a: 10, b: 2 })).toBeNull();
    expect(vencedorDaPartida({ a: null, b: 9 })).toBeNull();
  });
});

describe("validarPlacar", () => {
  it("aceita um 2x1 coerente", () => {
    expect(validarPlacar(2, 1, [{ a: 9, b: 6 }, { a: 9, b: 8 }, { a: 4, b: 9 }])).toEqual({ ok: true });
  });

  it("aceita empate (quando um clã sai)", () => {
    expect(validarPlacar(1, 1, [{ a: 9, b: 6 }, { a: 4, b: 9 }])).toEqual({ ok: true });
  });

  it("acusa rounds que não batem com o placar", () => {
    const r = validarPlacar(2, 1, [{ a: 9, b: 6 }, { a: 9, b: 8 }, { a: 9, b: 1 }]);
    expect(r).toEqual({ ok: false, erros: ["Os rounds não batem com o placar: pelos rounds ficou 3x0."] });
  });

  it("aponta a partida com rounds inválidos", () => {
    const r = validarPlacar(1, 1, [{ a: 9, b: 6 }, { a: 9, b: 9 }]);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.erros[0]).toContain("Partida 2");
  });

  it("exige placar e quantidade certa de partidas", () => {
    expect(validarPlacar(null, 1, []).ok).toBe(false);
    expect(validarPlacar(0, 0, []).ok).toBe(false);
    expect(validarPlacar(2, 0, [{ a: 9, b: 1 }]).ok).toBe(false);
  });
});

describe("ajustarRounds", () => {
  it("preserva o que já foi digitado ao aumentar ou diminuir", () => {
    const r = [{ a: 9, b: 1 }];
    expect(ajustarRounds(r, 3)).toEqual([{ a: 9, b: 1 }, { a: null, b: null }, { a: null, b: null }]);
    expect(ajustarRounds(r, 0)).toEqual([]);
  });
});
