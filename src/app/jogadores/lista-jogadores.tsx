"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LogoCla } from "@/components/logo-cla";
import { NOME_CARGO, type Cargo, type ClaResumo } from "@/lib/tipos";

export type JogadorLinha = { id: string; nick: string; cla: ClaResumo | null; cargo: Cargo | null };

const SEM_CLA = "__sem_cla__";

export function ListaJogadores({ jogadores }: { jogadores: JogadorLinha[] }) {
  const [busca, setBusca] = useState("");
  const [cla, setCla] = useState("");

  const clas = useMemo(() => {
    const porId = new Map<string, ClaResumo>();
    jogadores.forEach((j) => j.cla && porId.set(j.cla.id, j.cla));
    return [...porId.values()].sort((x, y) => x.tag.localeCompare(y.tag));
  }, [jogadores]);

  const termo = busca.trim().toLowerCase();
  const filtrados = jogadores.filter(
    (j) =>
      (!termo || j.nick.toLowerCase().includes(termo)) &&
      (!cla || (cla === SEM_CLA ? !j.cla : j.cla?.id === cla)),
  );

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-[2fr_1fr]">
        <label className="relative block">
          <span className="sr-only">Buscar jogador</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-aco-500" />
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nick" className="campo pl-9" />
        </label>
        <label>
          <span className="sr-only">Filtrar por clã</span>
          <select value={cla} onChange={(e) => setCla(e.target.value)} className="campo">
            <option value="">Todos os clãs</option>
            {clas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tag} — {c.nome}
              </option>
            ))}
            <option value={SEM_CLA}>Sem clã</option>
          </select>
        </label>
      </div>

      <p className="mb-2 text-xs text-aco-500">
        {filtrados.length} de {jogadores.length} jogador{jogadores.length === 1 ? "" : "es"}
      </p>

      {filtrados.length === 0 ? (
        <p className="cartao px-4 py-6 text-center text-sm text-aco-400">Nenhum jogador encontrado.</p>
      ) : (
        <ul className="cartao divide-y divide-grafite-800">
          {filtrados.map((j) => (
            <li key={j.id} className="flex items-center gap-3 px-4 py-2.5">
              <Link href={`/jogadores/${encodeURIComponent(j.nick)}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">
                {j.nick}
              </Link>
              {j.cla ? (
                <Link href={`/clas/${encodeURIComponent(j.cla.tag)}`} className="flex shrink-0 items-center gap-2 text-sm">
                  {j.cargo && j.cargo !== "membro" && (
                    <span className="hidden text-xs font-semibold text-destaque-claro sm:inline">{NOME_CARGO[j.cargo]}</span>
                  )}
                  <LogoCla cla={j.cla} tamanho={26} />
                  <span className="w-14 truncate font-semibold">{j.cla.tag}</span>
                </Link>
              ) : (
                <span className="shrink-0 text-sm text-aco-500">Sem clã</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
