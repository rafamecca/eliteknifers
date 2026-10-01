import { ArrowDown, ArrowUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TagJogador } from "@/components/tags-jogador";
import { obterTags, obterTagsUsuario } from "@/lib/dados";
import { obterSessao } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { moverTag } from "./actions";
import { FormTag } from "./forms";

export const metadata: Metadata = { title: "Tags · ADM" };

export default async function AdminTags() {
  const sessao = await obterSessao();
  if (!sessao?.ehCoder) notFound();
  const supabase = await criarClienteServidor();
  const [tags, donos] = await Promise.all([obterTags(supabase), obterTagsUsuario(supabase)]);
  const quantos = new Map<string, number>();
  donos.forEach((d) => quantos.set(d.tag_id, (quantos.get(d.tag_id) ?? 0) + 1));

  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-2 font-display text-4xl tracking-wide uppercase">Nova tag</h1>
        <p className="mb-6 text-sm text-aco-400">
          Tags aparecem ao lado do nick (até 2, as mais importantes) e todas no perfil do jogador. São só visuais: não dão
          permissão nenhuma.
        </p>
        <FormTag />
      </section>

      <section>
        <h2 className="mb-1 font-display text-3xl tracking-wide uppercase">
          Tags <span className="text-aco-500">({tags.length})</span>
        </h2>
        <p className="mb-4 text-xs text-aco-500">Da mais importante para a menos. Use as setas para mudar a ordem.</p>
        {tags.length === 0 ? (
          <p className="cartao px-4 py-6 text-center text-aco-400">Nenhuma tag cadastrada.</p>
        ) : (
          <ol className="cartao divide-y divide-grafite-800">
            {tags.map((t, i) => (
              <li key={t.id} className="flex items-center gap-2 px-3 py-2.5">
                <form action={moverTag} className="flex">
                  <input type="hidden" name="id" value={t.id} />
                  <button
                    type="submit"
                    name="direcao"
                    value="subir"
                    disabled={i === 0}
                    className="rounded p-1.5 text-aco-400 hover:bg-grafite-850 hover:text-aco-50 disabled:opacity-30"
                    aria-label={`Subir ${t.nome}`}
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="submit"
                    name="direcao"
                    value="descer"
                    disabled={i === tags.length - 1}
                    className="rounded p-1.5 text-aco-400 hover:bg-grafite-850 hover:text-aco-50 disabled:opacity-30"
                    aria-label={`Descer ${t.nome}`}
                  >
                    <ArrowDown className="size-4" />
                  </button>
                </form>
                <Link href={`/admin/tags/${t.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded px-1 py-1 hover:bg-grafite-850">
                  <TagJogador tag={t} grande />
                  <span className="truncate text-xs text-aco-400">
                    {t.automatica ? `automática · todo ${t.automatica === "adm" ? "ADM" : "CODER"}` : `${quantos.get(t.id) ?? 0} jogador(es)`}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
