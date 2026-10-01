import type { Metadata } from "next";
import Link from "next/link";
import { PartidasEPrints, PlacarConfronto } from "@/components/detalhe-confronto";
import { RespostaSelo, StatusConfrontoSelo } from "@/components/status-confronto";
import { contestacaoAberta } from "@/lib/confronto";
import { garantir, SELECT_CONFRONTO } from "@/lib/dados";
import {
  type ConfrontoQueContou,
  MAX_CONFRONTOS_COM_PONTOS_POR_DIA,
  MIN_PARTIDAS_PARA_PONTOS,
  motivoSemPontos,
  PONTOS_INICIAIS,
  variacaoElo,
} from "@/lib/elo";
import { formatarDataHora, formatarVariacao } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ConfrontoComClas, Partida, Print } from "@/lib/tipos";
import { AcoesConfronto } from "./acoes-confronto";

export const metadata: Metadata = { title: "Fila de aprovação" };

type Pendente = ConfrontoComClas & {
  temporada_id: string;
  observacao: string | null;
  motivo_contestacao: string | null;
  enviado: { nick: string } | null;
  partidas: Partida[];
  prints: Print[];
};

export default async function FilaAprovacao() {
  const supabase = await criarClienteServidor();
  const pendentes = garantir(
    await supabase
      .from("confrontos")
      .select(
        `${SELECT_CONFRONTO}, temporada_id, observacao, motivo_contestacao,
         enviado:usuarios!confrontos_enviado_por_fkey(nick),
         partidas(id, numero, rounds_a, rounds_b),
         prints(id, partida_id, arquivo, tipo)`,
      )
      // Pendentes de decisão + contestações que o ADM ainda não avaliou (mesmo já aprovadas).
      .or("status.eq.pendente,and(resposta.eq.contestado,contestacao_resolvida.is.null,status.neq.rejeitado)")
      .order("data", { ascending: true })
      .overrideTypes<Pendente[], { merge: false }>(),
  );

  // Dados para a prévia de pontos (quem grava de verdade é o banco, na aprovação).
  const pontos = new Map<string, number>();
  let contaram: ConfrontoQueContou[] = [];
  if (pendentes.length > 0) {
    const temporadas = [...new Set(pendentes.map((c) => c.temporada_id))];
    const desde = new Date(new Date(pendentes[0].data).getTime() - 36 * 3600_000).toISOString();
    const [linhasPontos, jaContaram] = await Promise.all([
      supabase.from("pontos_temporada").select("cla_id, temporada_id, pontos").in("temporada_id", temporadas)
        .overrideTypes<{ cla_id: string; temporada_id: string; pontos: number }[], { merge: false }>(),
      supabase.from("confrontos").select("cla_a_id, cla_b_id, data").eq("status", "aprovado").eq("conta_pontos", true).gte("data", desde)
        .overrideTypes<ConfrontoQueContou[], { merge: false }>(),
    ]);
    garantir(linhasPontos).forEach((p) => pontos.set(`${p.temporada_id}|${p.cla_id}`, p.pontos));
    contaram = garantir(jaContaram);
  }

  function previa(c: Pendente): string {
    const sem = motivoSemPontos({ ...c, cla_a_id: c.cla_a.id, cla_b_id: c.cla_b.id }, contaram);
    if (sem?.motivo === "partidas") return `Não vale pontos: menos de ${MIN_PARTIDAS_PARA_PONTOS} partidas.`;
    if (sem?.motivo === "mesmo-par") return "Não vale pontos: já houve um confronto aprovado que valeu pontos entre esses clãs neste dia.";
    if (sem?.motivo === "limite-diario") {
      const tag = sem.claId === c.cla_a.id ? c.cla_a.tag : c.cla_b.tag;
      return `Não vale pontos: ${tag} já tem ${MAX_CONFRONTOS_COM_PONTOS_POR_DIA} confrontos valendo pontos neste dia.`;
    }
    const ra = pontos.get(`${c.temporada_id}|${c.cla_a.id}`) ?? PONTOS_INICIAIS;
    const rb = pontos.get(`${c.temporada_id}|${c.cla_b.id}`) ?? PONTOS_INICIAIS;
    const d = variacaoElo(ra, rb, c.partidas_a, c.partidas_b);
    return `Prévia: ${c.cla_a.tag} ${ra} ${formatarVariacao(d)} · ${c.cla_b.tag} ${rb} ${formatarVariacao(-d)}`;
  }

  const contestados = pendentes.filter(contestacaoAberta);
  const fila = pendentes.filter((c) => !contestacaoAberta(c));

  function pontosAtuais(c: Pendente): string {
    if (c.status === "pendente") return previa(c);
    if (!c.conta_pontos || !c.variacao) return "Aprovado sem valer pontos.";
    return `Já aprovado: ${c.cla_a.tag} ${formatarVariacao(c.variacao)} · ${c.cla_b.tag} ${formatarVariacao(-c.variacao)}`;
  }

  function cartao(c: Pendente) {
    const contestado = contestacaoAberta(c);
    return (
      <li key={c.id} className={`cartao space-y-5 p-5 ${contestado ? "border-derrota/70" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-aco-400">
          <span>
            {formatarDataHora(c.data)} · enviado por <strong className="text-aco-200">{c.enviado?.nick ?? "?"}</strong> ({c.cla_a.tag})
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <Link href={`/confrontos/${c.id}`} className="mr-1 text-destaque-claro hover:underline">
              abrir
            </Link>
            <StatusConfrontoSelo status={c.status} />
            <RespostaSelo confronto={c} />
          </span>
        </div>

        {contestado && c.motivo_contestacao && (
          <p className="rounded-lg border border-derrota/50 bg-derrota/10 px-3 py-2 text-sm">
            <strong>Contestado pelo {c.cla_b.tag}:</strong> {c.motivo_contestacao}
          </p>
        )}

        <PlacarConfronto claA={c.cla_a} claB={c.cla_b} partidasA={c.partidas_a} partidasB={c.partidas_b} />
        <p className="text-center text-sm text-aco-200">{pontosAtuais(c)}</p>

        <PartidasEPrints partidas={c.partidas} prints={c.prints} tagA={c.cla_a.tag} tagB={c.cla_b.tag} />

        {c.observacao && (
          <p className="rounded-lg bg-grafite-850 px-3 py-2 text-sm">
            <span className="text-aco-400">Observação: </span>
            {c.observacao}
          </p>
        )}

        <AcoesConfronto
          id={c.id}
          status={c.status}
          partidasA={c.partidas_a}
          partidasB={c.partidas_b}
          rounds={[...c.partidas].sort((x, y) => x.numero - y.numero).map((p) => ({ a: p.rounds_a, b: p.rounds_b }))}
          tagA={c.cla_a.tag}
          tagB={c.cla_b.tag}
        />
      </li>
    );
  }

  return (
    <>
      {contestados.length > 0 && (
        <section className="mb-12">
          <h1 className="mb-2 font-display text-4xl tracking-wide text-derrota uppercase">
            Contestações <span className="text-aco-500">({contestados.length})</span>
          </h1>
          <p className="mb-6 text-sm text-aco-400">
            Resultados que o adversário contestou. Mantenha, anule (os pontos são desfeitos) ou corrija o placar.
          </p>
          <ul className="space-y-6">{contestados.map(cartao)}</ul>
        </section>
      )}

      <h1 className="mb-6 font-display text-4xl tracking-wide uppercase">
        Aguardando aprovação <span className="text-aco-500">({fila.length})</span>
      </h1>
      {fila.length === 0 ? (
        <p className="cartao px-4 py-8 text-center text-aco-400">Nenhum resultado aguardando aprovação.</p>
      ) : (
        <ul className="space-y-6">{fila.map(cartao)}</ul>
      )}
    </>
  );
}
