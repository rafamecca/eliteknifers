import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaConfrontos } from "@/components/lista-confrontos";
import { Podio } from "@/components/podio";
import { SemTemporada } from "@/components/sem-temporada";
import { NOME_SITE } from "@/lib/config";
import { obterRanking, obterTemporadaAtiva, obterUltimosConfrontos } from "@/lib/dados";
import { formatarDia } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/server";

export default async function Inicio() {
  const supabase = await criarClienteServidor();
  const [temporada, ultimos] = await Promise.all([
    obterTemporadaAtiva(supabase),
    obterUltimosConfrontos(supabase, { limite: 8 }),
  ]);
  const ranking = temporada ? await obterRanking(supabase, temporada.id) : null;

  return (
    <>
      <CabecalhoPagina
        selo={temporada ? `${temporada.nome} · em andamento` : undefined}
        titulo={NOME_SITE}
        subtitulo={
          temporada
            ? `Ranking de clãs @79 · ${formatarDia(temporada.inicio)} a ${formatarDia(temporada.fim)}`
            : "Ranking de clãs @79"
        }
      />

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="titulo-secao mb-0">Top 3 da temporada</h2>
          <Link href="/ranking" className="inline-flex items-center gap-1 text-sm font-semibold text-destaque-claro hover:underline">
            Ranking completo <ArrowRight className="size-4" />
          </Link>
        </div>
        {!temporada ? (
          <SemTemporada />
        ) : ranking && ranking.classificados.length > 0 ? (
          <Podio linhas={ranking.classificados} />
        ) : (
          <p className="cartao px-4 py-8 text-center text-aco-400">
            Nenhum clã completou 3 confrontos aprovados ainda. O pódio aparece assim que isso acontecer.
          </p>
        )}
      </section>

      <section>
        <h2 className="titulo-secao">Últimos confrontos</h2>
        <ListaConfrontos confrontos={ultimos} vazio="Nenhum confronto aprovado ainda." />
      </section>
    </>
  );
}
