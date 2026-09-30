import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { obterCampeonatos } from "@/lib/dados";
import { formatarDia } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormCampeonato } from "./forms";

export const metadata: Metadata = { title: "Campeonatos · ADM" };

export default async function AdminCampeonatos() {
  const campeonatos = await obterCampeonatos(await criarClienteServidor());
  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-6 font-display text-4xl tracking-wide uppercase">Novo campeonato</h1>
        <FormCampeonato />
        <p className="mt-2 text-xs text-aco-500">Depois de cadastrar, você adiciona as colocações dos clãs na página do campeonato.</p>
      </section>

      <section>
        <h2 className="mb-4 font-display text-3xl tracking-wide uppercase">
          Campeonatos <span className="text-aco-500">({campeonatos.length})</span>
        </h2>
        {campeonatos.length === 0 ? (
          <p className="cartao px-4 py-6 text-center text-aco-400">Nenhum campeonato cadastrado.</p>
        ) : (
          <ul className="cartao divide-y divide-grafite-800">
            {campeonatos.map((c) => {
              const campeao = c.colocacoes.find((x) => x.colocacao === 1);
              return (
                <li key={c.id}>
                  <Link href={`/admin/campeonatos/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-grafite-850">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{c.nome}</span>
                      <span className="text-xs text-aco-400">
                        {c.data ? formatarDia(c.data) : "Sem data"} · {c.colocacoes.length} colocação(ões)
                      </span>
                    </span>
                    {campeao && (
                      <span className="flex items-center gap-1 text-sm">
                        <Trophy className="size-4 text-ouro" /> {campeao.cla.tag}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
