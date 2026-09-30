import { describe, expect, it } from "vitest";
import { montarRanking, type ConfrontoResumo } from "./ranking";

const clas = [
  { id: "a", tag: "AAA" },
  { id: "b", tag: "BBB" },
  { id: "c", tag: "CCC" },
  { id: "d", tag: "DDD" },
];

let dia = 1;
function confronto(a: string, b: string, pa: number, pb: number): ConfrontoResumo {
  return { cla_a_id: a, cla_b_id: b, partidas_a: pa, partidas_b: pb, data: `2026-10-${String(dia++).padStart(2, "0")}T20:00:00Z` };
}

describe("montarRanking", () => {
  it("conta V/E/D, aproveitamento, saldo e últimos resultados", () => {
    dia = 1;
    const confrontos = [
      confronto("a", "b", 5, 1), // A vence
      confronto("b", "a", 2, 2), // empate
      confronto("c", "a", 3, 0), // A perde
    ];
    const { classificados } = montarRanking(clas, new Map([["a", 1030]]), confrontos);
    const a = classificados.find((l) => l.cla.id === "a")!;
    expect(a).toMatchObject({
      posicao: 1,
      pontos: 1030,
      jogos: 3,
      vitorias: 1,
      empates: 1,
      derrotas: 1,
      aproveitamento: 50,
      partidasPro: 7,
      partidasContra: 6,
      saldoPartidas: 1,
      ultimos: ["D", "E", "V"],
    });
  });

  it("só entra no ranking com 3 confrontos; quem tem 1 ou 2 fica em classificação", () => {
    dia = 1;
    const confrontos = [confronto("a", "b", 3, 0), confronto("a", "b", 3, 1), confronto("a", "c", 3, 2)];
    const r = montarRanking(clas, new Map(), confrontos);
    expect(r.classificados.map((l) => l.cla.id)).toEqual(["a"]);
    expect(r.emClassificacao.map((l) => l.cla.id)).toEqual(["c", "b"]); // mesmo pontos e aproveitamento; C tem saldo melhor
  });

  it("desempata por pontos, depois aproveitamento, depois saldo de partidas", () => {
    dia = 1;
    const confrontos = [
      // A: 2V 1D, saldo +1 · B: 2V 1D, saldo +5 · C: 3V 0D, saldo +3 · todos com 1000
      confronto("a", "d", 3, 2), confronto("a", "d", 3, 2), confronto("d", "a", 3, 2),
      confronto("b", "d", 5, 0), confronto("b", "d", 5, 0), confronto("d", "b", 5, 0),
      confronto("c", "d", 3, 2), confronto("c", "d", 3, 2), confronto("c", "d", 3, 2),
    ];
    const r = montarRanking(clas, new Map([["d", 1100]]), confrontos);
    expect(r.classificados.map((l) => [l.cla.id, l.posicao])).toEqual([
      ["d", 1],
      ["c", 2],
      ["b", 3],
      ["a", 4],
    ]);
  });

  it("empate em todos os critérios divide a posição", () => {
    dia = 1;
    const confrontos = [
      confronto("a", "c", 3, 0), confronto("a", "c", 3, 0), confronto("a", "c", 3, 0),
      confronto("b", "d", 3, 0), confronto("b", "d", 3, 0), confronto("b", "d", 3, 0),
    ];
    const r = montarRanking(clas, new Map(), confrontos);
    expect(r.classificados.map((l) => l.posicao)).toEqual([1, 1, 3, 3]);
  });
});
