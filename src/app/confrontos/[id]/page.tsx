import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartidasEPrints, PlacarConfronto } from "@/components/detalhe-confronto";
import { StatusConfrontoSelo } from "@/components/status-confronto";
import { garantir, SELECT_CONFRONTO } from "@/lib/dados";
import { formatarDataHora, formatarVariacao } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ConfrontoComClas, Partida, Print } from "@/lib/tipos";
import { ehUuid } from "@/lib/uuid";

export const metadata: Metadata = { title: "Confronto" };

type ConfrontoDetalhe = ConfrontoComClas & {
  observacao: string | null;
  motivo_rejeicao: string | null;
  enviado_em: string;
  enviado: { nick: string } | null;
  partidas: Partida[];
  prints: Print[];
};

export default async function PaginaConfronto({ params }: PageProps<"/confrontos/[id]">) {
  const { id } = await params;
  if (!ehUuid(id)) notFound();

  const supabase = await criarClienteServidor();
  const c = garantir(
    await supabase
      .from("confrontos")
      .select(
        `${SELECT_CONFRONTO}, observacao, motivo_rejeicao, enviado_em,
         enviado:usuarios!confrontos_enviado_por_fkey(nick),
         partidas(id, numero, rounds_a, rounds_b),
         prints(id, partida_id, arquivo, tipo)`,
      )
      .eq("id", id)
      .maybeSingle<ConfrontoDetalhe>(),
  );
  if (!c) notFound();

  const aprovado = c.status === "aprovado";

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-aco-400">{formatarDataHora(c.data)}</p>
        <StatusConfrontoSelo status={c.status} />
      </div>

      <div className="cartao p-5 sm:p-8">
        <PlacarConfronto
          claA={c.cla_a}
          claB={c.cla_b}
          partidasA={c.partidas_a}
          partidasB={c.partidas_b}
          variacao={aprovado && c.conta_pontos ? c.variacao : null}
        />
        {aprovado && (
          <p className="mt-6 text-center text-sm text-aco-400">
            {c.conta_pontos && c.pontos_a_antes !== null && c.pontos_b_antes !== null && c.variacao !== null ? (
              <>
                {c.cla_a.tag}: {c.pontos_a_antes} → {c.pontos_a_antes + c.variacao} · {c.cla_b.tag}: {c.pontos_b_antes} →{" "}
                {c.pontos_b_antes - c.variacao}
              </>
            ) : (
              <>Não valeu pontos (menos de 3 partidas ou não foi o primeiro confronto do dia entre os dois clãs). Conta nas estatísticas.</>
            )}
          </p>
        )}
      </div>

      {c.status === "rejeitado" && c.motivo_rejeicao && (
        <p className="rounded-lg border border-derrota/40 bg-derrota/10 px-4 py-3 text-sm text-derrota">
          <strong>Rejeitado pelo ADM:</strong> {c.motivo_rejeicao}
        </p>
      )}

      <section className="cartao p-5">
        <h2 className="titulo-secao">Partidas</h2>
        <PartidasEPrints partidas={c.partidas} prints={c.prints} tagA={c.cla_a.tag} tagB={c.cla_b.tag} />
      </section>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {c.observacao && (
          <div className="cartao px-4 py-3 sm:col-span-2">
            <dt className="text-xs tracking-wider text-aco-400 uppercase">Observação</dt>
            <dd className="mt-1 whitespace-pre-line">{c.observacao}</dd>
          </div>
        )}
        <div className="cartao px-4 py-3">
          <dt className="text-xs tracking-wider text-aco-400 uppercase">Enviado por</dt>
          <dd className="mt-1">
            {c.enviado?.nick ?? "—"} ({c.cla_a.tag}) em {formatarDataHora(c.enviado_em)}
          </dd>
        </div>
        {aprovado && c.conta_pontos && c.variacao !== null && (
          <div className="cartao px-4 py-3">
            <dt className="text-xs tracking-wider text-aco-400 uppercase">Variação</dt>
            <dd className="mt-1">
              {c.cla_a.tag} {formatarVariacao(c.variacao)} · {c.cla_b.tag} {formatarVariacao(-c.variacao)}
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}
