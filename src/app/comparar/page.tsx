import { ArrowLeftRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaConfrontos } from "@/components/lista-confrontos";
import { LogoCla } from "@/components/logo-cla";
import { buscarTodos, garantir, SELECT_CONFRONTO } from "@/lib/dados";
import { compararClas, type ConfrontoEstat } from "@/lib/estatisticas";
import { formatarDataCurta } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ClaResumo, ConfrontoComClas } from "@/lib/tipos";

export const metadata: Metadata = { title: "Comparar clãs" };

type ConfrontoCompleto = ConfrontoComClas & ConfrontoEstat;

export default async function Comparar({ searchParams }: PageProps<"/comparar">) {
  const params = await searchParams;
  const tagA = typeof params.a === "string" ? params.a : "";
  const tagB = typeof params.b === "string" ? params.b : "";

  const supabase = await criarClienteServidor();
  const clas = garantir(
    await supabase.from("clas").select("id, nome, tag, logo").order("tag").overrideTypes<ClaResumo[], { merge: false }>(),
  );
  const claA = clas.find((c) => c.tag === tagA);
  const claB = clas.find((c) => c.tag === tagB);

  let confrontos: ConfrontoCompleto[] = [];
  if (claA && claB && claA.id !== claB.id) {
    const par = `and(cla_a_id.eq.${claA.id},cla_b_id.eq.${claB.id}),and(cla_a_id.eq.${claB.id},cla_b_id.eq.${claA.id})`;
    confrontos = await buscarTodos((de, ate) =>
      supabase
        .from("confrontos")
        .select(`${SELECT_CONFRONTO}, cla_a_id, cla_b_id, partidas(rounds_a, rounds_b)`)
        .eq("status", "aprovado")
        .or(par)
        .order("data", { ascending: false })
        .order("id")
        .range(de, ate)
        .overrideTypes<ConfrontoCompleto[], { merge: false }>(),
    );
  }
  const r = claA && claB ? compararClas(confrontos, claA.id, claB.id) : null;
  const ultimo = r?.ultimo ? confrontos.find((c) => c.id === r.ultimo!.id) : undefined;

  return (
    <>
      <CabecalhoPagina titulo="Comparar clãs" subtitulo="Escolha dois clãs e veja o confronto direto entre eles." />

      <form className="cartao mb-8 grid items-end gap-3 p-4 sm:grid-cols-[1fr_auto_1fr_auto]">
        <SeletorCla nome="a" rotulo="Clã" clas={clas} valor={tagA} />
        <ArrowLeftRight className="mx-auto hidden size-5 text-aco-500 sm:mb-3 sm:block" />
        <SeletorCla nome="b" rotulo="Contra" clas={clas} valor={tagB} />
        <button type="submit" className="btn-destaque">
          Comparar
        </button>
      </form>

      {!claA || !claB ? (
        <p className="cartao px-4 py-8 text-center text-aco-400">Escolha os dois clãs para comparar.</p>
      ) : claA.id === claB.id ? (
        <p className="cartao px-4 py-8 text-center text-aco-400">Escolha dois clãs diferentes.</p>
      ) : (
        r && (
          <>
            <section className="cartao mb-8 p-5 sm:p-8">
              <div className="flex items-center gap-2 sm:gap-6">
                <Lado cla={claA} />
                <div className="shrink-0 text-center">
                  <div className="font-display text-6xl leading-none tabular-nums sm:text-7xl">
                    {r.vitoriasA}
                    <span className="mx-2 text-3xl text-aco-500 sm:text-4xl">x</span>
                    {r.vitoriasB}
                  </div>
                  <p className="mt-2 text-xs tracking-wider text-aco-400 uppercase">
                    vitórias{r.empates > 0 && ` · ${r.empates} empate${r.empates > 1 ? "s" : ""}`}
                  </p>
                </div>
                <Lado cla={claB} />
              </div>

              <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Numero rotulo="Confrontos" valor={String(r.confrontos)} />
                <Numero rotulo={`Partidas ${claA.tag} x ${claB.tag}`} valor={`${r.partidasA}–${r.partidasB}`} />
                <Numero
                  rotulo={`Saldo de rounds (${claA.tag})`}
                  valor={r.roundsA + r.roundsB === 0 ? "—" : `${r.roundsA - r.roundsB > 0 ? "+" : ""}${r.roundsA - r.roundsB}`}
                  dica={r.roundsA + r.roundsB > 0 ? `${r.roundsA} a ${r.roundsB}` : undefined}
                />
                <Numero
                  rotulo="Último resultado"
                  valor={ultimo ? `${ultimo.cla_a.tag} ${ultimo.partidas_a}x${ultimo.partidas_b} ${ultimo.cla_b.tag}` : "—"}
                  dica={ultimo ? formatarDataCurta(ultimo.data) : undefined}
                  href={ultimo ? `/confrontos/${ultimo.id}` : undefined}
                  pequeno
                />
              </dl>
            </section>

            <section>
              <h2 className="titulo-secao">Todos os confrontos entre eles</h2>
              <ListaConfrontos confrontos={confrontos} claId={claA.id} vazio="Esses clãs ainda não se enfrentaram." />
            </section>
          </>
        )
      )}
    </>
  );
}

function SeletorCla({ nome, rotulo, clas, valor }: { nome: string; rotulo: string; clas: ClaResumo[]; valor: string }) {
  return (
    <div>
      <label htmlFor={`cla-${nome}`} className="rotulo">
        {rotulo}
      </label>
      <select id={`cla-${nome}`} name={nome} defaultValue={valor} className="campo" required>
        <option value="">Escolha…</option>
        {clas.map((c) => (
          <option key={c.id} value={c.tag}>
            {c.tag} — {c.nome}
          </option>
        ))}
      </select>
    </div>
  );
}

function Lado({ cla }: { cla: ClaResumo }) {
  return (
    <Link href={`/clas/${encodeURIComponent(cla.tag)}`} className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <LogoCla cla={cla} tamanho={64} />
      <span className="font-display text-2xl leading-none tracking-wide sm:text-3xl">{cla.tag}</span>
      <span className="hidden truncate text-xs text-aco-400 sm:block">{cla.nome}</span>
    </Link>
  );
}

function Numero({
  rotulo,
  valor,
  dica,
  href,
  pequeno = false,
}: {
  rotulo: string;
  valor: string;
  dica?: string;
  href?: string;
  pequeno?: boolean;
}) {
  const conteudo = (
    <>
      <dt className="text-xs tracking-wider text-aco-400 uppercase">{rotulo}</dt>
      <dd className={`mt-1 font-display leading-none ${pequeno ? "text-xl" : "text-3xl"}`}>{valor}</dd>
      {dica && <dd className="mt-1 text-xs text-aco-500">{dica}</dd>}
    </>
  );
  return href ? (
    <Link href={href} className="rounded-xl border border-grafite-700 bg-grafite-850 px-4 py-3 hover:border-grafite-600">
      {conteudo}
    </Link>
  ) : (
    <div className="rounded-xl border border-grafite-700 bg-grafite-850 px-4 py-3">{conteudo}</div>
  );
}
