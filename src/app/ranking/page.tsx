import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Podio } from "@/components/podio";
import { SemTemporada } from "@/components/sem-temporada";
import { TabelaRanking } from "@/components/tabela-ranking";
import { obterRanking, obterTemporadaAtiva } from "@/lib/dados";
import { MIN_CONFRONTOS_NO_RANKING } from "@/lib/elo";
import { formatarDia } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ranking" };

export default async function PaginaRanking() {
  const supabase = await criarClienteServidor();
  const temporada = await obterTemporadaAtiva(supabase);

  if (!temporada) {
    return (
      <>
        <CabecalhoPagina titulo="Ranking" />
        <SemTemporada />
      </>
    );
  }

  const { classificados, emClassificacao } = await obterRanking(supabase, temporada.id);

  return (
    <>
      <CabecalhoPagina
        selo="Temporada atual"
        titulo={`Ranking · ${temporada.nome}`}
        subtitulo={`${formatarDia(temporada.inicio)} a ${formatarDia(temporada.fim)}`}
      />

      {classificados.length === 0 ? (
        <p className="cartao px-4 py-8 text-center text-aco-400">
          Nenhum clã completou {MIN_CONFRONTOS_NO_RANKING} confrontos aprovados nesta temporada ainda.
        </p>
      ) : (
        <div className="space-y-6">
          <Podio linhas={classificados} />
          <TabelaRanking linhas={classificados.slice(3)} />
        </div>
      )}

      {emClassificacao.length > 0 && (
        <section className="mt-10">
          <h2 className="titulo-secao">Em classificação</h2>
          <p className="mb-3 text-sm text-aco-400">
            Clãs que ainda não têm {MIN_CONFRONTOS_NO_RANKING} confrontos aprovados na temporada.
          </p>
          <TabelaRanking linhas={emClassificacao} />
        </section>
      )}

      <p className="mt-8 text-xs text-aco-500">
        Desempate: pontos, depois aproveitamento de confrontos, depois saldo de partidas. Aproveitamento = (vitórias + empates ÷ 2) ÷ confrontos.
      </p>
    </>
  );
}
