// Monta a tabela do ranking da temporada a partir dos pontos e dos confrontos aprovados.
// Regras: ESPECIFICACAO.md › Regras do ranking.
import { MIN_CONFRONTOS_NO_RANKING, PONTOS_INICIAIS } from "./elo";

export type ResultadoLetra = "V" | "E" | "D";

export type ConfrontoResumo = {
  cla_a_id: string;
  cla_b_id: string;
  partidas_a: number;
  partidas_b: number;
  data: string;
};

export type LinhaRanking<C> = {
  cla: C;
  posicao: number | null; // null = ainda não tem confrontos suficientes
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  /** Aproveitamento de confrontos, 0 a 100: (V + E/2) ÷ jogos. */
  aproveitamento: number;
  partidasPro: number;
  partidasContra: number;
  saldoPartidas: number;
  /** Últimos resultados, do mais recente para o mais antigo (máx. 5). */
  ultimos: ResultadoLetra[];
};

export type Ranking<C> = {
  classificados: LinhaRanking<C>[];
  emClassificacao: LinhaRanking<C>[]; // 1 ou 2 confrontos aprovados na temporada
};

export function compararLinhas<C>(x: LinhaRanking<C>, y: LinhaRanking<C>): number {
  return (
    y.pontos - x.pontos ||
    y.aproveitamento - x.aproveitamento ||
    y.saldoPartidas - x.saldoPartidas
  );
}

export function montarRanking<C extends { id: string; tag: string }>(
  clas: C[],
  pontos: Map<string, number>,
  confrontosAprovados: ConfrontoResumo[],
): Ranking<C> {
  const ordenados = [...confrontosAprovados].sort((x, y) => y.data.localeCompare(x.data));

  const linhas = clas.map((cla): LinhaRanking<C> => {
    const linha: LinhaRanking<C> = {
      cla,
      posicao: null,
      pontos: pontos.get(cla.id) ?? PONTOS_INICIAIS,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      aproveitamento: 0,
      partidasPro: 0,
      partidasContra: 0,
      saldoPartidas: 0,
      ultimos: [],
    };

    for (const c of ordenados) {
      const ehA = c.cla_a_id === cla.id;
      if (!ehA && c.cla_b_id !== cla.id) continue;
      const pro = ehA ? c.partidas_a : c.partidas_b;
      const contra = ehA ? c.partidas_b : c.partidas_a;
      const letra: ResultadoLetra = pro > contra ? "V" : pro < contra ? "D" : "E";
      linha.jogos++;
      if (letra === "V") linha.vitorias++;
      else if (letra === "D") linha.derrotas++;
      else linha.empates++;
      linha.partidasPro += pro;
      linha.partidasContra += contra;
      if (linha.ultimos.length < 5) linha.ultimos.push(letra);
    }

    linha.saldoPartidas = linha.partidasPro - linha.partidasContra;
    linha.aproveitamento = linha.jogos
      ? Math.round(((linha.vitorias + linha.empates / 2) / linha.jogos) * 1000) / 10
      : 0;
    return linha;
  });

  const porTag = (x: LinhaRanking<C>, y: LinhaRanking<C>) => x.cla.tag.localeCompare(y.cla.tag);

  const classificados = linhas
    .filter((l) => l.jogos >= MIN_CONFRONTOS_NO_RANKING)
    .sort((x, y) => compararLinhas(x, y) || porTag(x, y));
  classificados.forEach((l, i) => {
    // Empate total nos três critérios divide a posição.
    const anterior = classificados[i - 1];
    l.posicao = anterior && compararLinhas(anterior, l) === 0 ? anterior.posicao : i + 1;
  });

  const emClassificacao = linhas
    .filter((l) => l.jogos > 0 && l.jogos < MIN_CONFRONTOS_NO_RANKING)
    .sort((x, y) => compararLinhas(x, y) || porTag(x, y));

  return { classificados, emClassificacao };
}
