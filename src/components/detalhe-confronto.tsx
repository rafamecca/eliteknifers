import Link from "next/link";
import { formatarVariacao } from "@/lib/formato";
import { urlPublica } from "@/lib/supabase/env";
import type { ClaResumo, Partida, Print } from "@/lib/tipos";
import { LogoCla } from "./logo-cla";

/** Placar grande: logo e tag de cada clã, partidas no meio e, se houver, a variação de pontos. */
export function PlacarConfronto({
  claA,
  claB,
  partidasA,
  partidasB,
  variacao,
}: {
  claA: ClaResumo;
  claB: ClaResumo;
  partidasA: number;
  partidasB: number;
  variacao?: number | null;
}) {
  const lado = (cla: ClaResumo, delta: number | null | undefined) => (
    <Link href={`/clas/${encodeURIComponent(cla.tag)}`} className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <LogoCla cla={cla} tamanho={64} />
      <span className="font-display text-2xl leading-none tracking-wide sm:text-3xl">{cla.tag}</span>
      <span className="hidden truncate text-xs text-aco-400 sm:block">{cla.nome}</span>
      {delta !== null && delta !== undefined && (
        <span className={`text-sm font-semibold tabular-nums ${delta > 0 ? "text-vitoria" : delta < 0 ? "text-derrota" : "text-aco-400"}`}>
          {formatarVariacao(delta)} pts
        </span>
      )}
    </Link>
  );

  return (
    <div className="flex items-center gap-2 sm:gap-6">
      {lado(claA, variacao)}
      <div className="shrink-0 font-display text-6xl leading-none tabular-nums sm:text-7xl">
        {partidasA}
        <span className="mx-2 text-3xl text-aco-500 sm:text-4xl">x</span>
        {partidasB}
      </div>
      {lado(claB, variacao === null || variacao === undefined ? variacao : -variacao)}
    </div>
  );
}

/** Rounds de cada partida e os prints (do placar e de cada partida). */
export function PartidasEPrints({
  partidas,
  prints,
  tagA,
  tagB,
}: {
  partidas: Partida[];
  prints: Print[];
  tagA: string;
  tagB: string;
}) {
  const ordenadas = [...partidas].sort((x, y) => x.numero - y.numero);
  const printPlacar = prints.find((p) => p.tipo === "confronto");
  const printDaPartida = new Map(prints.filter((p) => p.partida_id).map((p) => [p.partida_id, p]));

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_auto]">
      <table className="w-full text-sm">
        <thead className="text-xs tracking-wider text-aco-400 uppercase">
          <tr>
            <th className="py-2 text-left font-medium">Partida</th>
            <th className="py-2 text-center font-medium">{tagA}</th>
            <th className="py-2 text-center font-medium">{tagB}</th>
            <th className="py-2 text-right font-medium">Print</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-grafite-800">
          {ordenadas.map((p) => {
            const print = printDaPartida.get(p.id);
            return (
              <tr key={p.id}>
                <td className="py-2 text-aco-400">{p.numero}ª</td>
                <td className={`py-2 text-center font-display text-xl ${p.rounds_a === 9 ? "text-aco-50" : "text-aco-500"}`}>{p.rounds_a}</td>
                <td className={`py-2 text-center font-display text-xl ${p.rounds_b === 9 ? "text-aco-50" : "text-aco-500"}`}>{p.rounds_b}</td>
                <td className="py-2 text-right">
                  {print ? (
                    <a href={urlPublica("prints", print.arquivo)} target="_blank" rel="noreferrer" className="text-destaque-claro hover:underline">
                      ver
                    </a>
                  ) : (
                    <span className="text-aco-500">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {printPlacar && (
        <a href={urlPublica("prints", printPlacar.arquivo)} target="_blank" rel="noreferrer" className="block md:w-64">
          {/* Prints já chegam comprimidos do envio. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlPublica("prints", printPlacar.arquivo)}
            alt="Print do placar do confronto"
            className="w-full rounded-lg border border-grafite-700"
            loading="lazy"
          />
          <span className="mt-1 block text-center text-xs text-aco-400">Print do placar · toque para ampliar</span>
        </a>
      )}
    </div>
  );
}
