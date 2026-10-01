import { describe, expect, it } from "vitest";
import { corDoTexto, ordenarTags, validarTag } from "./tags";
import type { Tag } from "./tipos";

describe("corDoTexto", () => {
  it.each([
    ["#ffd700", "#131518"], // dourado claro → texto escuro
    ["#f06a1c", "#131518"], // laranja do site
    ["#a78bfa", "#131518"],
    ["#1e3a8a", "#ffffff"], // azul escuro → texto branco
    ["#000000", "#ffffff"],
    ["#e5484d", "#131518"],
    ["#7f1d1d", "#ffffff"],
  ])("%s → %s", (fundo, texto) => {
    expect(corDoTexto(fundo)).toBe(texto);
  });
});

describe("ordenarTags", () => {
  const tag = (nome: string, ordem: number): Tag => ({ id: nome, nome, cor: "#ffffff", ordem, automatica: null });
  it("menor ordem primeiro, depois nome", () => {
    expect(ordenarTags([tag("LENDA", 2), tag("ADM", 1), tag("ARTE", 2), tag("CODER", 0)]).map((t) => t.nome)).toEqual([
      "CODER",
      "ADM",
      "ARTE",
      "LENDA",
    ]);
  });
});

describe("validarTag", () => {
  it("normaliza nome e cor", () => {
    expect(validarTag("  Lenda   Viva ", "#FFD700")).toEqual({ nome: "Lenda Viva", cor: "#ffd700" });
  });
  it("recusa vazio, longo e cor inválida", () => {
    expect(validarTag("  ", "#ffffff")).toHaveProperty("erro");
    expect(validarTag("x".repeat(21), "#ffffff")).toHaveProperty("erro");
    expect(validarTag("OK", "red")).toHaveProperty("erro");
  });
});
