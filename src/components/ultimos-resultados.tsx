import type { ResultadoLetra } from "@/lib/ranking";

const COR: Record<ResultadoLetra, string> = { V: "bg-vitoria", E: "bg-empate", D: "bg-derrota" };
const NOME: Record<ResultadoLetra, string> = { V: "vitória", E: "empate", D: "derrota" };

/** Bolinhas com os últimos resultados, do mais antigo (esquerda) ao mais recente (direita). */
export function UltimosResultados({ ultimos }: { ultimos: ResultadoLetra[] }) {
  const ordem = [...ultimos].reverse();
  return (
    <span className="inline-flex gap-1" title={ordem.map((l) => NOME[l]).join(", ")}>
      {ordem.map((letra, i) => (
        <span key={i} className={`size-2.5 rounded-full ${COR[letra]}`}>
          <span className="sr-only">{NOME[letra]} </span>
        </span>
      ))}
    </span>
  );
}

export function LetraResultado({ letra }: { letra: ResultadoLetra }) {
  return (
    <span className={`inline-grid size-6 place-items-center rounded text-xs font-bold text-grafite-950 ${COR[letra]}`}>
      {letra}
    </span>
  );
}
