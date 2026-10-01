import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TagJogador } from "@/components/tags-jogador";
import { buscarTodos, garantir, obterTagsUsuario } from "@/lib/dados";
import { obterSessao } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Tag } from "@/lib/tipos";
import { ehUuid } from "@/lib/uuid";
import { BotaoExcluirTag, BotaoTirarTag, FormDarTag, FormTag } from "../forms";

export const metadata: Metadata = { title: "Editar tag · ADM" };

type Jogador = { id: string; nick: string };

export default async function EditarTag({ params }: PageProps<"/admin/tags/[id]">) {
  const sessao = await obterSessao();
  if (!sessao?.ehCoder) notFound();
  const { id } = await params;
  if (!ehUuid(id)) notFound();
  const supabase = await criarClienteServidor();

  const [tag, donos, jogadores] = await Promise.all([
    supabase.from("tags").select("id, nome, cor, ordem, automatica").eq("id", id).maybeSingle<Tag>().then(garantir),
    obterTagsUsuario(supabase, { tag: id }),
    buscarTodos((de, ate) =>
      supabase.from("usuarios").select("id, nick").eq("banido", false).order("nick").range(de, ate).overrideTypes<Jogador[], { merge: false }>(),
    ),
  ]);
  if (!tag) notFound();

  const temTag = new Set(donos.map((d) => d.usuario_id));
  const comTag = jogadores.filter((j) => temTag.has(j.id)).sort((x, y) => x.nick.localeCompare(y.nick, "pt-BR", { sensitivity: "base" }));
  const semTag = jogadores.filter((j) => !temTag.has(j.id)).map((j) => j.nick);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 font-display text-4xl tracking-wide uppercase">
          Tag <TagJogador tag={tag} grande />
        </h1>
        <Link href="/admin/tags" className="text-sm text-destaque-claro hover:underline">
          ← todas as tags
        </Link>
      </div>

      <section>
        <h2 className="titulo-secao">Dados</h2>
        <FormTag key={`${tag.nome}-${tag.cor}`} tag={tag} />
      </section>

      <section>
        <h2 className="titulo-secao">
          Quem tem <span className="text-aco-500">({comTag.length})</span>
        </h2>
        {tag.automatica ? (
          <p className="mb-3 text-sm text-aco-400">
            Automática: todo {tag.automatica === "adm" ? "ADM recebe esta tag. Para mudar, mude quem é ADM" : "CODER recebe esta tag. CODER só se muda pelo banco"}.
          </p>
        ) : (
          <div className="mb-4">
            <FormDarTag tagId={tag.id} nicks={semTag} />
          </div>
        )}
        {comTag.length === 0 ? (
          <p className="cartao px-4 py-6 text-center text-sm text-aco-400">Ninguém tem esta tag ainda.</p>
        ) : (
          <ul className="cartao divide-y divide-grafite-800">
            {comTag.map((j) => (
              <li key={j.id} className="flex items-center gap-3 px-4 py-2.5">
                <Link href={`/jogadores/${encodeURIComponent(j.nick)}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">
                  {j.nick}
                </Link>
                {!tag.automatica && <BotaoTirarTag tagId={tag.id} usuarioId={j.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!tag.automatica && (
        <section>
          <h2 className="titulo-secao">Apagar</h2>
          <BotaoExcluirTag id={tag.id} />
        </section>
      )}
    </div>
  );
}
