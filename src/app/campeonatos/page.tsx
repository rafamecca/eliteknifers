import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { LogoCla } from "@/components/logo-cla";
import { obterCampeonatos } from "@/lib/dados";
import { formatarDia } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Campeonatos" };

export default async function Campeonatos() {
  const campeonatos = await obterCampeonatos(await criarClienteServidor());

  return (
    <>
      <CabecalhoPagina titulo="Campeonatos" subtitulo="Torneios organizados pelo ADM e seus campeões." />
      {campeonatos.length === 0 ? (
        <p className="cartao px-4 py-8 text-center text-aco-400">Nenhum campeonato cadastrado ainda.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {campeonatos.map((c) => {
            const campeao = c.colocacoes.find((x) => x.colocacao === 1);
            const vice = c.colocacoes.find((x) => x.colocacao === 2);
            return (
              <li key={c.id}>
                <Link href={`/campeonatos/${c.id}`} className="cartao flex h-full flex-col gap-3 p-4 transition-colors hover:border-grafite-600">
                  <span>
                    <span className="block font-display text-2xl tracking-wide">{c.nome}</span>
                    <span className="text-xs text-aco-400">{c.data ? formatarDia(c.data) : "Data a definir"}</span>
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
                      {vice && (
                        <span className="ml-auto flex items-center gap-2 text-sm text-aco-400">
                          Vice <LogoCla cla={vice.cla} tamanho={28} anel="prata" /> {vice.cla.tag}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-sm text-aco-500">Resultado ainda não cadastrado.</span>
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
