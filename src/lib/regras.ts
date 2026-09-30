// Itens liberados e proibidos em cada modo — ESPECIFICACAO.md › Modos de jogo.
// Mudou a regra? Atualize a especificação e depois esta lista.

export type Modo = { nome: string; liberado: string[]; proibido: string[] };

export const MODOS: Modo[] = [
  {
    nome: "@79",
    liberado: [
      "Máscara palhaço",
      "Colete 5%",
      "Troca rápida",
      "Fang Blade (leve e pesada)",
      "Machete (1 por time)",
      "Gordão",
      "Boneca",
    ],
    proibido: ["Máscara de dano com machete", "Colete acima de 5%", "Qualquer tipo de HP+", "WP Smoke"],
  },
  {
    nome: "@mix",
    liberado: ["Máscara palhaço", "Colete 5%", "Fang Blade (pesada)", "Machete (1 por time)", "Gordão"],
    proibido: [
      "Máscara de dano com machete",
      "Troca rápida",
      "Colete acima de 5%",
      "Qualquer tipo de HP+",
      "Fang Blade (leve)",
      "Boneca",
      "WP Smoke",
    ],
  },
];
