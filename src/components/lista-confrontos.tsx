import Link from "next/link";
import { contestacaoAberta } from "@/lib/confronto";
import { formatarDataCurta, formatarVariacao } from "@/lib/formato";
import type { ConfrontoComClas } from "@/lib/tipos";
import { LogoCla } from "./logo-cla";
import { AvisoContestado, RespostaSelo, StatusConfrontoSelo } from "./status-confronto";
import { LetraResultado } from "./ultimos-resultados";

/**
 * Lista compacta de confrontos. Com `claId`, mostra resultado e variação do ponto de vista desse clã.
 * Com `mostrarStatus`, mostra o status (para listas que incluem pendentes).
 * Resultado com contestação aberta ganha o aviso "Contestado".
 */
export function ListaConfrontos({
  confrontos,
  claId,
  mostrarStatus = false,
  mostrarResposta = false,
  vazio = "Nenhum confronto ainda.",
}: {
  confrontos: ConfrontoComClas[];
  claId?: string;
  mostrarStatus?: boolean;
  /** Mostra a resposta do adversário (confirmado, contestado, aguardando…) numa linha abaixo. */
  mostrarResposta?: boolean;
  vazio?: string;
}) {
  if (confrontos.length === 0) {
    return <p className="cartao px-4 py-6 text-center text-sm text-aco-400">{vazio}</p>;
  }

  return (
    <ul className="space-y-2">
      {confrontos.map((c) => {
        const ehA = claId === c.cla_a.id;
        const pro = ehA ? c.partidas_a : c.partidas_b;
        const contra = ehA ? c.partidas_b : c.partidas_a;
        const letra = pro > contra ? "V" : pro < contra ? "D" : "E";
        const variacao = c.variacao === null ? null : ehA ? c.variacao : -c.variacao;

        return (
          <li key={c.id}>
            <Link
              href={`/confrontos/${c.id}`}
              className={`relative flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-grafite-800 bg-grafite-900 px-3 py-2.5 transition-colors hover:border-grafite-600 sm:gap-3 sm:px-4 ${
                mostrarResposta ? "" : "sm:flex-nowrap"
              }`}
            >
              <span className="w-10 shrink-0 text-xs text-aco-400 tabular-nums">{formatarDataCurta(c.data)}</span>
              <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
                <span className="truncate font-semibold">{c.cla_a.tag}</span>
                <LogoCla cla={c.cla_a} tamanho={28} />
              </span>
              <span className="shrink-0 px-1 font-display text-2xl tabular-nums">
                {c.partidas_a}
                <span className="mx-1 text-aco-500">x</span>
                {c.partidas_b}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <LogoCla cla={c.cla_b} tamanho={28} />
                <span className="truncate font-semibold">{c.cla_b.tag}</span>
              </span>
              {contestacaoAberta(c) && !mostrarResposta && (
                // Sem coluna à direita (lista do início), o aviso não pode deslocar o placar do centro.
                <span
                  className={
                    claId || mostrarStatus
                      ? "order-last w-full text-right sm:order-none sm:w-auto sm:shrink-0" // no celular vai para uma linha própria
                      : "w-full text-right sm:absolute sm:right-4 sm:w-auto"
                  }
                >
                  <AvisoContestado />
                </span>
              )}
              {mostrarStatus && c.status !== "aprovado" ? (
                <span className="w-full shrink-0 text-right sm:w-auto">
                  <StatusConfrontoSelo status={c.status} />
                </span>
              ) : claId ? (
                <span className="flex w-16 shrink-0 items-center justify-end gap-2">
                  {c.status === "aprovado" && variacao !== null && c.conta_pontos && (
                    <span className={`text-xs font-semibold tabular-nums ${variacao >= 0 ? "text-vitoria" : "text-derrota"}`}>
                      {formatarVariacao(variacao)}
                    </span>
                  )}
                  <LetraResultado letra={letra} />
                </span>
              ) : null}
              {mostrarResposta && (
                <span className="flex w-full flex-wrap justify-end gap-2">
                  {c.status !== "aprovado" && <StatusConfrontoSelo status={c.status} />}
                  <RespostaSelo confronto={c} />
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
