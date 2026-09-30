import { Medal, Trophy } from "lucide-react";
import { nomeColocacao } from "@/lib/tipos";

const COR: Record<number, string> = {
  1: "border-ouro/50 bg-ouro/10 text-ouro",
  2: "border-prata/50 bg-prata/10 text-prata",
  3: "border-bronze/50 bg-bronze/10 text-bronze",
};

/** Selo de título: "Campeão · Copa X", "Vice · Copa X"… */
export function SeloTitulo({ colocacao, nome, href }: { colocacao: number; nome: string; href: string }) {
  const Icone = colocacao === 1 ? Trophy : Medal;
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold hover:brightness-125 ${
        COR[colocacao] ?? "border-grafite-600 bg-grafite-800 text-aco-200"
      }`}
    >
      <Icone className="size-4" /> {nomeColocacao(colocacao)} · {nome}
    </a>
  );
}
