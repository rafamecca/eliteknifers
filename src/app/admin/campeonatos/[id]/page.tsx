import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoCla } from "@/components/logo-cla";
import { garantir, obterCampeonato } from "@/lib/dados";
import { criarClienteServidor } from "@/lib/supabase/server";
import { nomeColocacao, type ClaResumo } from "@/lib/tipos";
import { ehUuid } from "@/lib/uuid";
import { BotaoExcluirCampeonato, BotaoRemoverColocacao, FormCampeonato, FormColocacao } from "../forms";

export const metadata: Metadata = { title: "Editar campeonato · ADM" };

export default async function EditarCampeonato({ params }: PageProps<"/admin/campeonatos/[id]">) {
  const { id } = await params;
  if (!ehUuid(id)) notFound();
  const supabase = await criarClienteServidor();
  const [campeonato, clas] = await Promise.all([
    obterCampeonato(supabase, id),
    supabase.from("clas").select("id, nome, tag, logo").order("tag").overrideTypes<ClaResumo[], { merge: false }>(),
  ]);
  if (!campeonato) notFound();

  const jaColocados = new Set(campeonato.colocacoes.map((c) => c.cla.id));
  const disponiveis = garantir(clas).filter((c) => !jaColocados.has(c.id));
  const proxima = Math.max(0, ...campeonato.colocacoes.map((c) => c.colocacao)) + 1;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl tracking-wide uppercase">{campeonato.nome}</h1>
        <Link href={`/campeonatos/${campeonato.id}`} className="text-sm text-destaque-claro hover:underline">
          ver página pública
        </Link>
      </div>

      <section>
        <h2 className="titulo-secao">Dados</h2>
        <FormCampeonato campeonato={campeonato} />
      </section>

      <section>
        <h2 className="titulo-secao">Colocações</h2>
        <p className="mb-3 text-sm text-aco-400">Cada colocação vira um título no perfil do clã (Campeão, Vice, 3º lugar…).</p>
        {campeonato.colocacoes.length > 0 && (
          <ol className="cartao mb-4 divide-y divide-grafite-800">
            {campeonato.colocacoes.map((c) => (
              <li key={c.cla.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-8 font-display text-xl text-aco-400">{c.colocacao}º</span>
                <LogoCla cla={c.cla} tamanho={28} />
                <span className="flex-1 font-semibold">
                  {c.cla.tag} <span className="text-xs font-normal text-aco-400">· {nomeColocacao(c.colocacao)}</span>
                </span>
                <BotaoRemoverColocacao campeonatoId={campeonato.id} claId={c.cla.id} />
              </li>
            ))}
          </ol>
        )}
        {disponiveis.length > 0 && <FormColocacao campeonatoId={campeonato.id} clas={disponiveis} proxima={proxima} />}
      </section>

      <section>
        <h2 className="titulo-secao">Excluir</h2>
        <BotaoExcluirCampeonato id={campeonato.id} />
      </section>
    </div>
  );
}
