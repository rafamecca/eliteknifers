import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaConfrontos } from "@/components/lista-confrontos";
import { LogoCla } from "@/components/logo-cla";
import { ResponderConfronto } from "@/components/responder-confronto";
import { tempoRestante } from "@/lib/confronto";
import { garantir, obterAguardandoResposta, SELECT_CONFRONTO } from "@/lib/dados";
import { formatarDataHora } from "@/lib/formato";
import { obterSessao } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ConfrontoComClas } from "@/lib/tipos";

export const metadata: Metadata = { title: "Minhas pendências" };

export default async function MinhasPendencias() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/entrar?proximo=/pendencias");
  if (!sessao.podeEnviar || !sessao.cla) {
    return (
      <>
        <CabecalhoPagina titulo="Minhas pendências" />
        <p className="cartao px-4 py-8 text-center text-aco-400">
          Esta página é para o líder e o sublíder de um clã confirmarem ou contestarem resultados.
        </p>
      </>
    );
  }

  const cla = sessao.cla;
  const supabase = await criarClienteServidor();
  const [paraResponder, contestacoes, enviados] = await Promise.all([
    obterAguardandoResposta(supabase, cla.id),
    supabase
      .from("confrontos")
      .select(SELECT_CONFRONTO)
      .or(`cla_a_id.eq.${cla.id},cla_b_id.eq.${cla.id}`)
      .eq("resposta", "contestado")
      .is("contestacao_resolvida", null)
      .neq("status", "rejeitado")
      .order("enviado_em", { ascending: false })
      .overrideTypes<ConfrontoComClas[], { merge: false }>(),
    supabase
      .from("confrontos")
      .select(SELECT_CONFRONTO)
      .eq("cla_a_id", cla.id)
      .order("enviado_em", { ascending: false })
      .limit(10)
      .overrideTypes<ConfrontoComClas[], { merge: false }>(),
  ]);

  return (
    <>
      <CabecalhoPagina titulo="Minhas pendências" subtitulo={`Resultados do clã ${cla.tag}.`} />

      <section className="mb-10">
        <h2 className="titulo-secao">Aguardando sua resposta ({paraResponder.length})</h2>
        <p className="mb-3 text-sm text-aco-400">
          Resultados que outros clãs enviaram contra o {cla.tag}. Você tem 12h a partir do envio para confirmar ou contestar;
          depois disso o resultado segue sem a sua resposta.
        </p>
        {paraResponder.length === 0 ? (
          <p className="cartao px-4 py-6 text-center text-sm text-aco-400">Nada para responder agora.</p>
        ) : (
          <ul className="space-y-3">
            {paraResponder.map((c) => (
              <li key={c.id} className="cartao space-y-4 border-alerta/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <LogoCla cla={c.cla_a} tamanho={28} />
                    <strong>{c.cla_a.tag}</strong>
                    <span className="font-display text-2xl">
                      {c.partidas_a} <span className="text-aco-500">x</span> {c.partidas_b}
                    </span>
                    <strong>{c.cla_b.tag}</strong>
                    <LogoCla cla={c.cla_b} tamanho={28} />
                  </span>
                  <span className="text-xs text-aco-400">{formatarDataHora(c.data)}</span>
                </div>
                <Link href={`/confrontos/${c.id}`} className="inline-block text-sm text-destaque-claro hover:underline">
                  Ver rounds e prints antes de responder
                </Link>
                <ResponderConfronto id={c.id} prazo={tempoRestante(c.enviado_em)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="titulo-secao">Contestações abertas ({garantir(contestacoes).length})</h2>
        <p className="mb-3 text-sm text-aco-400">Resultados do {cla.tag} que foram contestados e o ADM ainda vai avaliar.</p>
        <ListaConfrontos confrontos={garantir(contestacoes)} claId={cla.id} mostrarResposta vazio="Nenhuma contestação aberta." />
      </section>

      <section>
        <h2 className="titulo-secao">Enviados pelo {cla.tag}</h2>
        <ListaConfrontos confrontos={garantir(enviados)} claId={cla.id} mostrarResposta vazio="Nenhum resultado enviado ainda." />
      </section>
    </>
  );
}
