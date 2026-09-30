import { ArrowRight, Medal } from "lucide-react";
import Link from "next/link";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { LogoFaca } from "@/components/logo-faca";
import { ListaConfrontos } from "@/components/lista-confrontos";
import { Podio } from "@/components/podio";
import { SemTemporada } from "@/components/sem-temporada";
import { NOME_SITE } from "@/lib/config";
import { obterRanking, obterTemporadaAtiva, obterUltimosConfrontos } from "@/lib/dados";
import { formatarDia, hojeEmBrasilia } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Campeonato } from "@/lib/tipos";

export default async function Inicio() {
  const supabase = await criarClienteServidor();
  const [temporada, ultimos, proximo] = await Promise.all([
    obterTemporadaAtiva(supabase),
    obterUltimosConfrontos(supabase, { limite: 8 }),
    supabase
      .from("campeonatos")
      .select("id, nome, data, descricao")
      .gte("data", hojeEmBrasilia())
      .order("data")
      .limit(1)
      .maybeSingle<Campeonato>(),
  ]);
  const proximoCampeonato = proximo.data;
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
      >
        <LogoFaca className="-my-4 hidden w-72 drop-shadow-[0_8px_24px_rgba(240,106,28,0.25)] md:block" titulo="" />
      </CabecalhoPagina>

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

      {proximoCampeonato && (
        <Link
          href={`/campeonatos/${proximoCampeonato.id}`}
          className="cartao mb-10 flex items-center gap-4 border-ouro/40 p-4 transition-colors hover:border-ouro/70"
        >
          <Medal className="size-8 shrink-0 text-ouro" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold tracking-wider text-ouro uppercase">Próximo campeonato</span>
            <span className="block truncate font-display text-2xl tracking-wide">{proximoCampeonato.nome}</span>
            <span className="block text-xs text-aco-400 sm:hidden">{proximoCampeonato.data && formatarDia(proximoCampeonato.data)}</span>
          </span>
          <span className="hidden text-sm text-aco-200 sm:block">{proximoCampeonato.data && formatarDia(proximoCampeonato.data)}</span>
        </Link>
      )}

      <section>
        <h2 className="titulo-secao">Últimos confrontos</h2>
        <ListaConfrontos confrontos={ultimos} vazio="Nenhum confronto aprovado ainda." />
      </section>
    </>
  );
}
