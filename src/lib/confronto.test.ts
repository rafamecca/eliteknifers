import { describe, expect, it } from "vitest";
import {
  ajustarRounds,
  contestacaoAberta,
  estadoResposta,
  podeResponder,
  tempoRestante,
  validarPlacar,
  vencedorDaPartida,
} from "./confronto";

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

describe("resposta do adversário", () => {
  const enviado = "2026-10-01T10:00:00Z";
  const base = { enviado_em: enviado, status: "aprovado" as const, resposta: "aguardando" as const, contestacao_resolvida: null };

  it("aguarda até 12h depois do envio e depois vira sem resposta", () => {
    expect(estadoResposta(base, new Date("2026-10-01T21:59:00Z"))).toBe("aguardando");
    expect(podeResponder(base, new Date("2026-10-01T21:59:00Z"))).toBe(true);
    expect(estadoResposta(base, new Date("2026-10-01T22:01:00Z"))).toBe("sem_resposta");
    expect(podeResponder(base, new Date("2026-10-01T22:01:00Z"))).toBe(false);
  });

  it("rejeitado não pode ser respondido", () => {
    expect(podeResponder({ ...base, status: "rejeitado" }, new Date(enviado))).toBe(false);
  });

  it("contestação fica aberta até o ADM resolver", () => {
    const contestado = { ...base, resposta: "contestado" as const };
    expect(contestacaoAberta(contestado)).toBe(true);
    expect(contestacaoAberta({ ...contestado, contestacao_resolvida: "mantido" })).toBe(false);
    expect(contestacaoAberta({ ...contestado, status: "rejeitado" })).toBe(false);
    expect(estadoResposta(contestado, new Date("2026-10-05T00:00:00Z"))).toBe("contestado");
  });

  it("mostra o tempo que falta", () => {
    expect(tempoRestante(enviado, new Date("2026-10-01T16:40:00Z"))).toBe("5h 20min");
    expect(tempoRestante(enviado, new Date("2026-10-01T21:30:00Z"))).toBe("30min");
    expect(tempoRestante(enviado, new Date("2026-10-01T23:00:00Z"))).toBeNull();
  });
});
