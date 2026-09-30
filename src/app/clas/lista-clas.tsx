"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LogoCla } from "@/components/logo-cla";
import type { ClaResumo } from "@/lib/tipos";

export function ListaClas({ clas, posicoes }: { clas: ClaResumo[]; posicoes: Record<string, number> }) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const filtrados = clas.filter((c) => !termo || c.tag.toLowerCase().includes(termo) || c.nome.toLowerCase().includes(termo));

  return (
    <>
      <label className="relative mb-4 block">
        <span className="sr-only">Buscar clã</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-aco-500" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por tag ou nome"
          className="campo pl-9"
        />
      </label>

      {filtrados.length === 0 ? (
        <p className="cartao px-4 py-6 text-center text-sm text-aco-400">Nenhum clã encontrado.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((c) => (
            <li key={c.id}>
              <Link
                href={`/clas/${encodeURIComponent(c.tag)}`}
                className="cartao flex items-center gap-3 p-3 transition-colors hover:border-grafite-600"
              >
                <LogoCla cla={c} tamanho={48} />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-2xl leading-none tracking-wide">{c.tag}</span>
                  <span className="block truncate text-sm text-aco-400">{c.nome}</span>
                </span>
                {posicoes[c.id] && <span className="font-display text-2xl text-aco-400">{posicoes[c.id]}º</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
