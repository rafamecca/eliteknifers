import type { Metadata } from "next";
import Link from "next/link";
import { PartidasEPrints, PlacarConfronto } from "@/components/detalhe-confronto";
import { StatusConfrontoSelo } from "@/components/status-confronto";
import { garantir, SELECT_CONFRONTO } from "@/lib/dados";
import { MIN_PARTIDAS_PARA_PONTOS, PONTOS_INICIAIS, variacaoElo } from "@/lib/elo";
import { diaEmBrasilia, formatarDataHora, formatarVariacao } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/server";
import { PENDENTES, type ConfrontoComClas, type Partida, type Print } from "@/lib/tipos";
import { DecisaoConfronto } from "./decisao";

export const metadata: Metadata = { title: "Fila de aprovação" };

type Pendente = ConfrontoComClas & {
  temporada_id: string;
  observacao: string | null;
  enviado: { nick: string } | null;
  partidas: Partida[];
  prints: Print[];
};

type JaContou = { cla_a_id: string; cla_b_id: string; data: string };

const par = (a: string, b: string) => [a, b].sort().join("|");

export default async function FilaAprovacao() {
  const supabase = await criarClienteServidor();
  const pendentes = garantir(
    await supabase
      .from("confrontos")
      .select(
        `${SELECT_CONFRONTO}, temporada_id, observacao,
         enviado:usuarios!confrontos_enviado_por_fkey(nick),
         partidas(id, numero, rounds_a, rounds_b),
         prints(id, partida_id, arquivo, tipo)`,
      )
      .in("status", PENDENTES)
      .order("data", { ascending: true })
      .overrideTypes<Pendente[], { merge: false }>(),
  );

  // Dados para a prévia de pontos (quem grava de verdade é o banco, na aprovação).
  const pontos = new Map<string, number>();
  const jaContouNoDia = new Set<string>();
  if (pendentes.length > 0) {
    const temporadas = [...new Set(pendentes.map((c) => c.temporada_id))];
    const desde = new Date(new Date(pendentes[0].data).getTime() - 36 * 3600_000).toISOString();
    const [linhasPontos, contaram] = await Promise.all([
      supabase.from("pontos_temporada").select("cla_id, temporada_id, pontos").in("temporada_id", temporadas)
        .overrideTypes<{ cla_id: string; temporada_id: string; pontos: number }[], { merge: false }>(),
      supabase.from("confrontos").select("cla_a_id, cla_b_id, data").eq("status", "aprovado").eq("conta_pontos", true).gte("data", desde)
        .overrideTypes<JaContou[], { merge: false }>(),
    ]);
    garantir(linhasPontos).forEach((p) => pontos.set(`${p.temporada_id}|${p.cla_id}`, p.pontos));
    garantir(contaram).forEach((c) => jaContouNoDia.add(`${par(c.cla_a_id, c.cla_b_id)}|${diaEmBrasilia(c.data)}`));
  }

  function previa(c: Pendente): string {
    if (c.partidas_a + c.partidas_b < MIN_PARTIDAS_PARA_PONTOS) return `Não vale pontos: menos de ${MIN_PARTIDAS_PARA_PONTOS} partidas.`;
    if (jaContouNoDia.has(`${par(c.cla_a.id, c.cla_b.id)}|${diaEmBrasilia(c.data)}`)) {
      return "Não vale pontos: já houve um confronto aprovado que valeu pontos entre esses clãs neste dia.";
    }
    const ra = pontos.get(`${c.temporada_id}|${c.cla_a.id}`) ?? PONTOS_INICIAIS;
    const rb = pontos.get(`${c.temporada_id}|${c.cla_b.id}`) ?? PONTOS_INICIAIS;
    const d = variacaoElo(ra, rb, c.partidas_a, c.partidas_b);
    return `Prévia: ${c.cla_a.tag} ${ra} ${formatarVariacao(d)} · ${c.cla_b.tag} ${rb} ${formatarVariacao(-d)}`;
  }

  return (
    <>
      <h1 className="mb-6 font-display text-5xl tracking-wide uppercase">
        Fila de aprovação <span className="text-aco-500">({pendentes.length})</span>
      </h1>

      {pendentes.length === 0 ? (
        <p className="cartao px-4 py-8 text-center text-aco-400">Nenhum resultado aguardando aprovação.</p>
      ) : (
        <ul className="space-y-6">
          {pendentes.map((c) => (
            <li key={c.id} className={`cartao space-y-5 p-5 ${c.status === "contestado" ? "border-destaque" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-aco-400">
                <span>
                  {formatarDataHora(c.data)} · enviado por <strong className="text-aco-200">{c.enviado?.nick ?? "?"}</strong> ({c.cla_a.tag})
                </span>
                <span className="flex items-center gap-3">
                  <Link href={`/confrontos/${c.id}`} className="text-destaque-claro hover:underline">
                    abrir
                  </Link>
                  <StatusConfrontoSelo status={c.status} />
                </span>
              </div>

              <PlacarConfronto claA={c.cla_a} claB={c.cla_b} partidasA={c.partidas_a} partidasB={c.partidas_b} />
              <p className="text-center text-sm text-aco-200">{previa(c)}</p>

              <PartidasEPrints partidas={c.partidas} prints={c.prints} tagA={c.cla_a.tag} tagB={c.cla_b.tag} />

              {c.observacao && (
                <p className="rounded-lg bg-grafite-850 px-3 py-2 text-sm">
                  <span className="text-aco-400">Observação: </span>
                  {c.observacao}
                </p>
              )}

              <DecisaoConfronto id={c.id} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
