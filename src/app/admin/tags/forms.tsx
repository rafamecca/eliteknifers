"use client";

import { useActionState, useState } from "react";
import { TagJogador } from "@/components/tags-jogador";
import { TAMANHO_NOME_TAG } from "@/lib/tags";
import type { Tag } from "@/lib/tipos";
import type { EstadoAdmin } from "../actions";
import { AvisoAdmin } from "../aviso";
import { darTag, excluirTag, salvarTag, tirarTag } from "./actions";

const CORES = ["#f06a1c", "#e5484d", "#ffd700", "#3dd68c", "#22d3ee", "#3b82f6", "#a78bfa", "#ec4899", "#94a3b8", "#ffffff"];

export function FormTag({ tag }: { tag?: Tag }) {
  const [estado, acao, salvando] = useActionState<EstadoAdmin, FormData>(salvarTag, {});
  const [nome, setNome] = useState(tag?.nome ?? "");
  const [cor, setCor] = useState(tag?.cor ?? CORES[0]);
  return (
    <form action={acao} className="cartao space-y-4 p-5">
      {tag && <input type="hidden" name="id" value={tag.id} />}
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <div>
          <label htmlFor="nome" className="rotulo">
            Nome
          </label>
          <input
            id="nome"
            name="nome"
            required
            maxLength={TAMANHO_NOME_TAG}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="campo"
            placeholder="LENDA"
          />
        </div>
        <div>
          <label htmlFor="cor" className="rotulo">
            Cor
          </label>
          <div className="flex items-center gap-2">
            <input
              id="cor"
              name="cor"
              type="color"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-grafite-700 bg-grafite-900 p-1"
            />
            <span className="font-mono text-sm text-aco-400">{cor}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Cores sugeridas">
        {CORES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCor(c)}
            className={`size-7 rounded-full border-2 ${c === cor ? "border-aco-50" : "border-grafite-700"}`}
            style={{ backgroundColor: c }}
            aria-label={`Usar a cor ${c}`}
          />
        ))}
      </div>
      <p className="flex items-center gap-2 text-sm text-aco-400">
        Prévia: <span className="font-semibold text-aco-50">Jogador</span>
        <TagJogador tag={{ nome: nome.trim() || "TAG", cor }} />
      </p>
      {tag?.automatica && (
        <p className="text-xs text-aco-500">
          Tag automática: vai para todo {tag.automatica === "adm" ? "ADM" : "CODER"}. Dá para mudar nome e cor, mas não apagar.
        </p>
      )}
      <AvisoAdmin estado={estado} />
      <button type="submit" className="btn-destaque" disabled={salvando}>
        {salvando ? "Salvando…" : tag ? "Salvar alterações" : "Criar tag"}
      </button>
    </form>
  );
}

export function BotaoExcluirTag({ id }: { id: string }) {
  const [estado, acao, excluindo] = useActionState<EstadoAdmin, FormData>(excluirTag, {});
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (!confirm("Apagar esta tag? Ela sai de todos os jogadores que a têm.")) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-perigo" disabled={excluindo}>
        {excluindo ? "Apagando…" : "Apagar tag"}
      </button>
      <AvisoAdmin estado={estado} />
    </form>
  );
}

export function FormDarTag({ tagId, nicks }: { tagId: string; nicks: string[] }) {
  const [estado, acao, salvando] = useActionState<EstadoAdmin, FormData>(darTag, {});
  return (
    <form action={acao} className="cartao space-y-3 p-4">
      <input type="hidden" name="tag" value={tagId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label htmlFor="nick" className="rotulo">
            Dar para o jogador
          </label>
          <input id="nick" name="nick" required list="nicks" autoComplete="off" className="campo" placeholder="Nick do jogador" />
          <datalist id="nicks">
            {nicks.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        <button type="submit" className="btn-destaque" disabled={salvando}>
          {salvando ? "Salvando…" : "Dar tag"}
        </button>
      </div>
      <AvisoAdmin estado={estado} />
    </form>
  );
}

export function BotaoTirarTag({ tagId, usuarioId }: { tagId: string; usuarioId: string }) {
  const [estado, acao, tirando] = useActionState<EstadoAdmin, FormData>(tirarTag, {});
  return (
    <form action={acao}>
      <input type="hidden" name="tag" value={tagId} />
      <input type="hidden" name="usuario" value={usuarioId} />
      <button type="submit" className="text-xs text-derrota hover:underline disabled:opacity-50" disabled={tirando}>
        tirar
      </button>
      {estado.erro && <span className="ml-2 text-xs text-derrota">{estado.erro}</span>}
    </form>
  );
}
