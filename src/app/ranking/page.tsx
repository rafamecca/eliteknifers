import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { LogoCla } from "@/components/logo-cla";
import { Podio } from "@/components/podio";
import { SemTemporada } from "@/components/sem-temporada";
import { TabelaRanking } from "@/components/tabela-ranking";
import { garantir, obterRanking, obterRankingGeral, obterTemporadaAtiva, obterTemporadasEncerradas } from "@/lib/dados";
import { MIN_CONFRONTOS_NO_RANKING } from "@/lib/elo";
import { formatarDia } from "@/lib/formato";
import type { Ranking } from "@/lib/ranking";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ClaResumo, Temporada } from "@/lib/tipos";
import { ehUuid } from "@/lib/uuid";

export const metadata: Metadata = { title: "Ranking" };

type Aba = "atual" | "anteriores" | "geral";

export default async function PaginaRanking({ searchParams }: PageProps<"/ranking">) {
  const { aba: abaParam, temporada: temporadaParam } = await searchParams;
  const supabase = await criarClienteServidor();

  // Uma temporada encerrada específica
  if (typeof temporadaParam === "string") {
    if (!ehUuid(temporadaParam)) notFound();
    const temporada = garantir(
      await supabase.from("temporadas").select("id, nome, inicio, fim, ativa").eq("id", temporadaParam).maybeSingle<Temporada>(),
    );
    if (!temporada) notFound();
    if (temporada.ativa) redirect("/ranking");
    const ranking = await obterRanking(supabase, temporada.id, { soAtivos: false });
    return (
      <>
        <CabecalhoPagina
          selo="Temporada encerrada"
          titulo={`Ranking · ${temporada.nome}`}
          subtitulo={`${formatarDia(temporada.inicio)} a ${formatarDia(temporada.fim)}`}
        />
        <Abas ativa="anteriores" />
        <VisaoRanking ranking={ranking} vazio="Nenhum clã completou os confrontos mínimos nesta temporada." />
      </>
    );
  }

  const aba: Aba = abaParam === "anteriores" || abaParam === "geral" ? abaParam : "atual";

  if (aba === "anteriores") {
    const temporadas = await obterTemporadasEncerradas(supabase);
    return (
      <>
        <CabecalhoPagina titulo="Temporadas anteriores" subtitulo="Clique numa temporada para ver a tabela final." />
        <Abas ativa="anteriores" />
        {temporadas.length === 0 ? (
          <p className="cartao px-4 py-8 text-center text-aco-400">Nenhuma temporada foi encerrada ainda.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {temporadas.map((t) => {
              const campeao = t.podio.find((p) => p.posicao === 1);
              return (
                <li key={t.id}>
                  <Link href={`/ranking?temporada=${t.id}`} className="cartao flex h-full flex-col gap-3 p-4 transition-colors hover:border-grafite-600">
                    <span>
                      <span className="block font-display text-2xl tracking-wide">{t.nome}</span>
                      <span className="text-xs text-aco-400">
                        {formatarDia(t.inicio)} a {formatarDia(t.fim)}
                      </span>
                    </span>
                    {campeao ? (
                      <span className="flex items-center gap-3">
                        <LogoCla cla={campeao.cla} tamanho={44} anel="ouro" />
                        <span>
                          <span className="flex items-center gap-1 text-xs font-semibold tracking-wider text-ouro uppercase">
                            <Trophy className="size-3.5" /> Campeão
                          </span>
                          <span className="font-display text-2xl leading-none">{campeao.cla.tag}</span>
                        </span>
                        <span className="ml-auto flex gap-1.5">
                          {t.podio
                            .filter((p) => p.posicao > 1)
                            .map((p) => (
                              <LogoCla key={p.cla.id} cla={p.cla} tamanho={28} anel={p.posicao === 2 ? "prata" : "bronze"} />
                            ))}
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-aco-500">Sem clãs classificados.</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </>
    );
  }

  if (aba === "geral") {
    const ranking = await obterRankingGeral(supabase);
    return (
      <>
        <CabecalhoPagina
          selo="Todas as temporadas"
          titulo="Ranking geral histórico"
          subtitulo="Pontuação que nunca é resetada, somando os confrontos de todas as temporadas."
        />
        <Abas ativa="geral" />
        <VisaoRanking ranking={ranking} vazio={`Nenhum clã completou ${MIN_CONFRONTOS_NO_RANKING} confrontos aprovados ainda.`} />
      </>
    );
  }

  const temporada = await obterTemporadaAtiva(supabase);
  if (!temporada) {
    return (
      <>
        <CabecalhoPagina titulo="Ranking" />
        <Abas ativa="atual" />
        <SemTemporada />
      </>
    );
  }
  const ranking = await obterRanking(supabase, temporada.id);
  return (
    <>
      <CabecalhoPagina
        selo="Temporada atual"
        titulo={`Ranking · ${temporada.nome}`}
        subtitulo={`${formatarDia(temporada.inicio)} a ${formatarDia(temporada.fim)}`}
      />
      <Abas ativa="atual" />
      <VisaoRanking
        ranking={ranking}
        vazio={`Nenhum clã completou ${MIN_CONFRONTOS_NO_RANKING} confrontos aprovados nesta temporada ainda.`}
      />
    </>
  );
}

function Abas({ ativa }: { ativa: Aba }) {
  const abas: { aba: Aba; href: string; rotulo: string }[] = [
    { aba: "atual", href: "/ranking", rotulo: "Temporada atual" },
    { aba: "anteriores", href: "/ranking?aba=anteriores", rotulo: "Temporadas anteriores" },
    { aba: "geral", href: "/ranking?aba=geral", rotulo: "Geral histórico" },
  ];
  return (
    <nav className="-mt-2 mb-8 flex gap-1 overflow-x-auto border-b border-grafite-700">
      {abas.map((a) => (
        <Link
          key={a.aba}
          href={a.href}
          aria-current={a.aba === ativa ? "page" : undefined}
          className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap ${
            a.aba === ativa ? "border-destaque text-aco-50" : "border-transparent text-aco-400 hover:text-aco-50"
          }`}
        >
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}

function VisaoRanking({ ranking, vazio }: { ranking: Ranking<ClaResumo>; vazio: string }) {
  const { classificados, emClassificacao } = ranking;
  return (
    <>
      {classificados.length === 0 ? (
        <p className="cartao px-4 py-8 text-center text-aco-400">{vazio}</p>
      ) : (
        <div className="space-y-6">
          <Podio linhas={classificados} />
          <TabelaRanking linhas={classificados.slice(3)} />
        </div>
      )}

      {emClassificacao.length > 0 && (
        <section className="mt-10">
          <h2 className="titulo-secao">Em classificação</h2>
          <p className="mb-3 text-sm text-aco-400">Clãs que ainda não têm {MIN_CONFRONTOS_NO_RANKING} confrontos aprovados.</p>
          <TabelaRanking linhas={emClassificacao} />
        </section>
      )}

      <p className="mt-8 text-xs text-aco-500">
        Desempate: pontos, depois aproveitamento de confrontos, depois saldo de partidas. Aproveitamento = (vitórias + empates ÷ 2) ÷
        confrontos.
      </p>
    </>
  );
}
