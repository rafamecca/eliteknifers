import { corDoTexto } from "@/lib/tags";
import type { Tag } from "@/lib/tipos";

/** Uma tag de jogador: fundo na cor escolhida, texto claro ou escuro conforme o contraste. */
export function TagJogador({ tag, grande = false }: { tag: Pick<Tag, "nome" | "cor">; grande?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded font-bold tracking-wide whitespace-nowrap ${
        grande ? "px-2 py-0.5 text-xs" : "px-1.5 text-[0.65rem] leading-4"
      }`}
      style={{ backgroundColor: tag.cor, color: corDoTexto(tag.cor) }}
    >
      {tag.nome}
    </span>
  );
}

/** Tags já ordenadas por importância; com `max`, mostra as primeiras e um "+N". */
export function TagsJogador({ tags, max, grande = false }: { tags: Tag[] | undefined; max?: number; grande?: boolean }) {
  if (!tags?.length) return null;
  const visiveis = max ? tags.slice(0, max) : tags;
  const resto = tags.length - visiveis.length;
  return (
    <span className="inline-flex flex-wrap items-center gap-1" title={tags.map((t) => t.nome).join(", ")}>
      {visiveis.map((t) => (
        <TagJogador key={t.id} tag={t} grande={grande} />
      ))}
      {resto > 0 && <span className="text-[0.65rem] font-semibold text-aco-500">+{resto}</span>}
    </span>
  );
}
