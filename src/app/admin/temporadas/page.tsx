import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LogoCla } from "@/components/logo-cla";
import { garantir, obterRanking, obterTemporadaAtiva, obterTemporadasEncerradas } from "@/lib/dados";
import { pontosNaNovaTemporada } from "@/lib/elo";
import { fimDoPeriodo, formatarDia, hojeEmBrasilia } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ClaResumo } from "@/lib/tipos";
import { FormEditarTemporada, FormNovaTemporada } from "./forms";

export const metadata: Metadata = { title: "Temporadas · ADM" };

export default async function AdminTemporadas() {
  const supabase = await criarClienteServidor();
  const [atual, encerradas] = await Promise.all([obterTemporadaAtiva(supabase), obterTemporadasEncerradas(supabase)]);

  const [ranking, pontos, pendentes] = atual
    ? await Promise.all([
        obterRanking(supabase, atual.id),
        supabase
          .from("pontos_temporada")
          .select("pontos, cla:clas(id, nome, tag, logo)")
          .eq("temporada_id", atual.id)
          .order("pontos", { ascending: false })
          .overrideTypes<{ pontos: number; cla: ClaResumo }[], { merge: false }>(),
        supabase.from("confrontos").select("id", { count: "exact", head: true }).eq("temporada_id", atual.id).eq("status", "pendente"),
      ])
    : [null, null, null];

  const qtdPendentes = pendentes?.count ?? 0;
  const hoje = hojeEmBrasilia();

  return (
    <div className="space-y-12">
      {atual ? (
        <section>
          <h1 className="mb-6 font-display text-4xl tracking-wide uppercase">{atual.nome}</h1>
          <FormEditarTemporada temporada={atual} />
        </section>
      ) : (
        <p className="cartao px-4 py-6 text-center text-alerta">Não há temporada ativa: ninguém consegue enviar resultados.</p>
      )}

      <section>
        <h2 className="mb-2 font-display text-3xl tracking-wide uppercase">
          {atual ? "Encerrar e abrir a próxima" : "Abrir temporada"}
        </h2>

        {atual && ranking && (
          <div className="mb-6 space-y-4">
            <p className="text-sm text-aco-400">
              Ao encerrar, o ranking de agora vira a classificação final, o 1º colocado ganha o título de campeão e cada clã
              começa a próxima com metade da distância que tem de 1000.
            </p>

            {qtdPendentes > 0 && (
              <p className="rounded-lg border border-alerta/40 bg-alerta/10 px-3 py-2 text-sm text-alerta">
                Há {qtdPendentes} resultado(s) aguardando decisão nesta temporada.{" "}
                <Link href="/admin" className="underline">
                  Aprove ou rejeite
                </Link>{" "}
                antes de encerrar.
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="cartao p-4">
                <h3 className="mb-3 text-xs font-semibold tracking-wider text-aco-400 uppercase">Classificação final (prévia)</h3>
                {ranking.classificados.length === 0 ? (
                  <p className="text-sm text-aco-500">Nenhum clã classificado: a temporada fecha sem campeão.</p>
                ) : (
                  <ol className="space-y-2">
                    {ranking.classificados.slice(0, 5).map((l) => (
                      <li key={l.cla.id} className="flex items-center gap-3 text-sm">
                        <span className="w-6 font-display text-xl text-aco-400">{l.posicao}º</span>
                        <LogoCla cla={l.cla} tamanho={28} anel={l.posicao === 1 ? "ouro" : "neutro"} />
                        <span className="font-semibold">{l.cla.tag}</span>
                        {l.posicao === 1 && <Trophy className="size-4 text-ouro" />}
                        <span className="ml-auto tabular-nums text-aco-200">{l.pontos}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div className="cartao p-4">
                <h3 className="mb-3 text-xs font-semibold tracking-wider text-aco-400 uppercase">Pontos na próxima temporada</h3>
                {garantir(pontos!).length === 0 ? (
                  <p className="text-sm text-aco-500">Ninguém pontuou ainda: todos começam com 1000.</p>
                ) : (
                  <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1 text-sm">
                    {garantir(pontos!).map((p) => (
                      <li key={p.cla.id} className="flex items-center gap-2">
                        <span className="w-16 truncate font-semibold">{p.cla.tag}</span>
                        <span className="tabular-nums text-aco-400">{p.pontos}</span>
                        <span className="text-aco-500">→</span>
                        <span className="tabular-nums">{pontosNaNovaTemporada(p.pontos)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-xs text-aco-500">Clãs que não jogaram começam com 1000.</p>
              </div>
            </div>
          </div>
        )}

        <FormNovaTemporada
          nome={`Temporada ${encerradas.length + (atual ? 2 : 1)}`}
          inicio={hoje}
          fim={fimDoPeriodo(hoje, 3)}
          encerrando={atual?.nome ?? null}
          bloqueado={qtdPendentes > 0}
        />
      </section>

      {encerradas.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-3xl tracking-wide uppercase">Encerradas</h2>
          <ul className="cartao divide-y divide-grafite-800">
            {encerradas.map((t) => {
              const campeao = t.podio.find((p) => p.posicao === 1);
              return (
                <li key={t.id}>
                  <Link href={`/ranking?temporada=${t.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-grafite-850">
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{t.nome}</span>
                      <span className="text-xs text-aco-400">
                        {formatarDia(t.inicio)} a {formatarDia(t.fim)}
                      </span>
                    </span>
                    {campeao && (
                      <span className="flex items-center gap-2 text-sm">
                        <Trophy className="size-4 text-ouro" /> {campeao.cla.tag}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
