import Link from "next/link";
import type { LinhaRanking } from "@/lib/ranking";
import type { ClaResumo } from "@/lib/tipos";
import { LogoCla } from "./logo-cla";
import { UltimosResultados } from "./ultimos-resultados";

export function TabelaRanking({ linhas }: { linhas: LinhaRanking<ClaResumo>[] }) {
  if (linhas.length === 0) return null;
  return (
    <div className="cartao overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-grafite-700 text-left text-xs tracking-wider text-aco-400 uppercase">
          <tr>
            <th className="w-10 py-3 pl-4 font-medium">#</th>
            <th className="py-3 font-medium">Clã</th>
            <th className="px-2 py-3 text-right font-medium">Pts</th>
            <th className="px-2 py-3 text-center font-medium">V/E/D</th>
            <th className="hidden px-2 py-3 text-right font-medium sm:table-cell">Aprov.</th>
            <th className="hidden px-2 py-3 text-right font-medium md:table-cell">Saldo</th>
            <th className="hidden py-3 pr-4 pl-2 font-medium sm:table-cell">Sequência</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-grafite-800">
          {linhas.map((l) => (
            <tr key={l.cla.id} className="transition-colors hover:bg-grafite-850">
              <td className="py-2.5 pl-4 font-display text-xl text-aco-400">{l.posicao ?? "–"}</td>
              <td className="py-2.5">
                <Link href={`/clas/${encodeURIComponent(l.cla.tag)}`} className="flex min-w-0 items-center gap-3">
                  <LogoCla cla={l.cla} tamanho={32} />
                  <span className="min-w-0">
                    <span className="block font-semibold">{l.cla.tag}</span>
                    <span className="hidden truncate text-xs text-aco-400 sm:block">{l.cla.nome}</span>
                  </span>
                </Link>
              </td>
              <td className="px-2 py-2.5 text-right font-display text-xl">{l.pontos}</td>
              <td className="px-2 py-2.5 text-center whitespace-nowrap text-aco-200 tabular-nums">
                {l.vitorias}/{l.empates}/{l.derrotas}
              </td>
              <td className="hidden px-2 py-2.5 text-right text-aco-200 tabular-nums sm:table-cell">
                {l.aproveitamento.toLocaleString("pt-BR")}%
              </td>
              <td className="hidden px-2 py-2.5 text-right text-aco-200 tabular-nums md:table-cell">
                {l.saldoPartidas > 0 ? `+${l.saldoPartidas}` : l.saldoPartidas}
              </td>
              <td className="hidden py-2.5 pr-4 pl-2 sm:table-cell">
                <UltimosResultados ultimos={l.ultimos} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
