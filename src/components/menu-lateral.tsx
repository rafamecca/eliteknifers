"use client";

import { BellRing, BookOpen, Crosshair, Flag, Medal, Swords, UserRound, House, LogOut, Menu as IconeMenu, Send, Shield, Trophy, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NOME_SITE } from "@/lib/config";

const ICONES = {
  inicio: House,
  ranking: Trophy,
  clas: Users,
  enviar: Send,
  admin: Shield,
  pendencias: BellRing,
  regras: BookOpen,
  comparar: Swords,
  campeonatos: Medal,
  meuCla: Flag,
  jogadores: UserRound,
};

export type ItemMenu = { href: string; rotulo: string; icone: keyof typeof ICONES; contador?: number };

type Props = {
  itens: ItemMenu[];
  usuario: { nick: string; detalhe: string } | null;
  sairAction: () => Promise<void>;
};

export function MenuLateral({ itens, usuario, sairAction }: Props) {
  const [aberto, setAberto] = useState(false);
  const caminho = usePathname();
  const fechar = () => setAberto(false);

  const ativo = (href: string) => (href === "/" ? caminho === "/" : caminho.startsWith(href));

  return (
    <>
      {/* Barra do topo (celular) */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-grafite-700 bg-grafite-950/95 px-4 backdrop-blur lg:hidden">
        <Marca onClick={fechar} />
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="relative rounded-lg p-2 text-aco-200 hover:bg-grafite-800"
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={aberto}
        >
          {aberto ? <X className="size-6" /> : <IconeMenu className="size-6" />}
          {!aberto && itens.some((i) => i.contador) && (
            <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-destaque" aria-label="Há pendências" />
          )}
        </button>
      </header>

      {aberto && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={fechar} aria-hidden />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-grafite-700 bg-grafite-900 transition-transform lg:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center px-5">
          <Marca onClick={fechar} />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {itens.map(({ href, rotulo, icone, contador }) => {
            const Icone = ICONES[icone];
            const marcado = ativo(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={fechar}
                aria-current={marcado ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  marcado
                    ? "bg-destaque/15 text-aco-50 shadow-[inset_3px_0_0] shadow-destaque"
                    : "text-aco-400 hover:bg-grafite-800 hover:text-aco-50"
                }`}
              >
                <Icone className={`size-5 ${marcado ? "text-destaque-claro" : ""}`} />
                {rotulo}
                {!!contador && (
                  <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-destaque px-1.5 text-xs font-bold text-white">
                    {contador}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-grafite-700 p-4">
          {usuario ? (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{usuario.nick}</p>
                <p className="truncate text-xs text-aco-400">{usuario.detalhe}</p>
              </div>
              <form action={sairAction}>
                <button type="submit" className="rounded-lg p-2 text-aco-400 hover:bg-grafite-800 hover:text-aco-50" title="Sair">
                  <LogOut className="size-5" />
                  <span className="sr-only">Sair</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link href="/entrar" onClick={fechar} className="btn-secundario">
                Entrar
              </Link>
              <Link href="/cadastrar" onClick={fechar} className="btn-destaque">
                Cadastrar
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function Marca({ onClick }: { onClick: () => void }) {
  return (
    <Link href="/" onClick={onClick} className="flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-md bg-destaque">
        <Crosshair className="size-5 text-white" />
      </span>
      <span className="font-display text-2xl tracking-wider">{NOME_SITE}</span>
    </Link>
  );
}
