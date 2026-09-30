import Link from "next/link";
import type { LinhaRanking } from "@/lib/ranking";
import type { ClaResumo } from "@/lib/tipos";
import { LogoCla } from "./logo-cla";

const ESTILO = {
  1: { anel: "ouro", texto: "text-ouro", borda: "border-ouro/50", brilho: "from-ouro/15" },
  2: { anel: "prata", texto: "text-prata", borda: "border-prata/40", brilho: "from-prata/10" },
  3: { anel: "bronze", texto: "text-bronze", borda: "border-bronze/40", brilho: "from-bronze/10" },
} as const;

/** Os 3 primeiros em cards grandes. No celular ficam em coluna (1º, 2º, 3º); no desktop, 2º-1º-3º. */
export function Podio({ linhas }: { linhas: LinhaRanking<ClaResumo>[] }) {
  const top = linhas.slice(0, 3);
  if (top.length === 0) return null;

  const ordemDesktop = ["sm:order-2", "sm:order-1", "sm:order-3"];

  return (
    <ol className="grid gap-3 sm:grid-cols-3 sm:items-end">
      {top.map((l, i) => {
        const pos = Math.min(l.posicao ?? i + 1, 3) as 1 | 2 | 3;
        const e = ESTILO[pos];
        return (
          <li key={l.cla.id} className={ordemDesktop[i]}>
            <Link
              href={`/clas/${encodeURIComponent(l.cla.tag)}`}
              className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border bg-gradient-to-b to-grafite-900 p-4 transition-transform hover:-translate-y-0.5 sm:flex-col sm:gap-3 sm:p-6 sm:text-center ${e.borda} ${e.brilho} ${
                i === 0 ? "sm:pb-10" : ""
              }`}
            >
              <span className={`font-display text-4xl leading-none sm:absolute sm:top-3 sm:left-4 ${e.texto}`}>
                {l.posicao}º
              </span>
              <LogoCla cla={l.cla} tamanho={i === 0 ? 88 : 72} anel={e.anel} />
              <div className="min-w-0 flex-1 sm:flex-none">
                <p className="truncate font-display text-3xl leading-none tracking-wide">{l.cla.tag}</p>
                <p className="truncate text-sm text-aco-400">{l.cla.nome}</p>
              </div>
              <div className="text-right sm:text-center">
                <p className="font-display text-3xl leading-none">
                  {l.pontos}
                  <span className="ml-1 font-sans text-xs text-aco-400">pts</span>
                </p>
                <p className="mt-1 text-xs text-aco-400">
                  {l.vitorias}V · {l.empates}E · {l.derrotas}D
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
