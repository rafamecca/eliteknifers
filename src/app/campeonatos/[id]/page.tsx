import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { LogoCla } from "@/components/logo-cla";
import { obterCampeonato } from "@/lib/dados";
import { formatarDia } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/server";
import { nomeColocacao } from "@/lib/tipos";
import { ehUuid } from "@/lib/uuid";

async function buscar(id: string) {
  return ehUuid(id) ? obterCampeonato(await criarClienteServidor(), id) : null;
}

export async function generateMetadata({ params }: PageProps<"/campeonatos/[id]">): Promise<Metadata> {
  const c = await buscar((await params).id);
  return { title: c?.nome ?? "Campeonato não encontrado" };
}

const ANEL = { 1: "ouro", 2: "prata", 3: "bronze" } as const;

export default async function PaginaCampeonato({ params }: PageProps<"/campeonatos/[id]">) {
  const c = await buscar((await params).id);
  if (!c) notFound();

  return (
    <>
      <Link href="/campeonatos" className="text-sm text-destaque-claro hover:underline">
        ← Campeonatos
      </Link>
      <CabecalhoPagina selo="Campeonato" titulo={c.nome} subtitulo={c.data ? formatarDia(c.data) : "Data a definir"} />
      {c.descricao && <p className="mb-8 whitespace-pre-line text-aco-200">{c.descricao}</p>}

      <h2 className="titulo-secao">Classificação</h2>
      {c.colocacoes.length === 0 ? (
        <p className="cartao px-4 py-6 text-center text-sm text-aco-400">O resultado ainda não foi cadastrado.</p>
      ) : (
        <ol className="cartao divide-y divide-grafite-800">
          {c.colocacoes.map((x) => (
            <li key={x.cla.id}>
              <Link href={`/clas/${encodeURIComponent(x.cla.tag)}`} className="flex items-center gap-4 px-4 py-3 hover:bg-grafite-850">
                <span className="w-8 font-display text-2xl text-aco-400">{x.colocacao}º</span>
                <LogoCla cla={x.cla} tamanho={40} anel={ANEL[x.colocacao as 1 | 2 | 3] ?? "neutro"} />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-2xl leading-none tracking-wide">{x.cla.tag}</span>
                  <span className="text-xs text-aco-400">{x.cla.nome}</span>
                </span>
                <span className="text-sm font-semibold text-aco-200">{nomeColocacao(x.colocacao)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
