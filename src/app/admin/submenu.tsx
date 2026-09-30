"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/admin", rotulo: "Fila de aprovação" },
  { href: "/admin/clas", rotulo: "Clãs" },
  { href: "/admin/temporadas", rotulo: "Temporadas" },
];

export function SubmenuAdmin() {
  const caminho = usePathname();
  return (
    <nav className="mb-8 flex gap-1 border-b border-grafite-700">
      {ABAS.map(({ href, rotulo }) => {
        const ativo = href === "/admin" ? caminho === "/admin" : caminho.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${
              ativo ? "border-destaque text-aco-50" : "border-transparent text-aco-400 hover:text-aco-50"
            }`}
          >
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
