import { urlPublica } from "@/lib/supabase/env";
import type { ClaResumo } from "@/lib/tipos";

const ANEIS = {
  ouro: "ring-ouro",
  prata: "ring-prata",
  bronze: "ring-bronze",
  neutro: "ring-grafite-600",
};

export function LogoCla({
  cla,
  tamanho = 36,
  anel = "neutro",
}: {
  cla: Pick<ClaResumo, "tag" | "logo">;
  tamanho?: number;
  anel?: keyof typeof ANEIS;
}) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-grafite-800 ring-2 ${ANEIS[anel]}`}
      style={{ width: tamanho, height: tamanho }}
    >
      {cla.logo ? (
        // Logos já chegam comprimidos do upload; não passam pelo otimizador de imagens.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={urlPublica("logos", cla.logo)} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <span className="font-display text-aco-200" style={{ fontSize: Math.max(12, tamanho * 0.36) }} aria-hidden>
          {cla.tag.slice(0, 4)}
        </span>
      )}
    </span>
  );
}
