import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SeloTitulo } from "@/components/colocacao";
import { ListaConfrontos } from "@/components/lista-confrontos";
import { LogoCla } from "@/components/logo-cla";
import { UltimosResultados } from "@/components/ultimos-resultados";
import {
  garantir,
  obterConfrontosDoCla,
  obterRanking,
  obterRankingGeral,
  obterTemporadaAtiva,
  obterTitulosDeCampeonato,
  obterTitulosDeTemporada,
  obterUltimosConfrontos,
} from "@/lib/dados";
import { estatisticasDoCla } from "@/lib/estatisticas";
import { PONTOS_INICIAIS } from "@/lib/elo";
import { formatarDataCurta, formatarDia } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/server";
import { NOME_CARGO, type Cargo, type Cla, type ClaResumo } from "@/lib/tipos";

const ORDEM_CARGO: Record<Cargo, number> = { lider: 0, sublider: 1, membro: 2 };
const NOME_REDE = { discord: "Discord", instagram: "Instagram", youtube: "YouTube" } as const;

async function buscarCla(tag: string) {
  const supabase = await criarClienteServidor();
  const cla = garantir(
    await supabase
      .from("clas")
      .select("id, nome, tag, logo, bio, redes, fundado_em, ativo")
      .eq("tag", decodeURIComponent(tag))
      .maybeSingle<Cla>(),
  );
  return { supabase, cla };
}

export async function generateMetadata({ params }: PageProps<"/clas/[tag]">): Promise<Metadata> {
  const { cla } = await buscarCla((await params).tag);
  return { title: cla ? `${cla.tag} · ${cla.nome}` : "Clã não encontrado" };
}

export default async function PerfilCla({ params, searchParams }: PageProps<"/clas/[tag]">) {
  const { supabase, cla } = await buscarCla((await params).tag);
  if (!cla) notFound();
  const geral = (await searchParams).visao === "geral";

  const [temporada, membros, ultimos, titulos, doCla, clas, titulosCampeonato] = await Promise.all([
    obterTemporadaAtiva(supabase),
    supabase
      .from("membros_cla")
      .select("cargo, usuario:usuarios(id, nick)")
      .eq("cla_id", cla.id)
      .is("saiu_em", null)
      .overrideTypes<{ cargo: Cargo; usuario: { id: string; nick: string } }[], { merge: false }>(),
    obterUltimosConfrontos(supabase, { limite: 20, claId: cla.id }),
    obterTitulosDeTemporada(supabase, cla.id),
    obterConfrontosDoCla(supabase, cla.id),
    supabase.from("clas").select("id, nome, tag, logo").overrideTypes<ClaResumo[], { merge: false }>(),
    obterTitulosDeCampeonato(supabase, cla.id),
  ]);

  const [rankingTemporada, pontosTemporada, rankingGeral] = await Promise.all([
    temporada ? obterRanking(supabase, temporada.id) : null,
    temporada
      ? supabase
          .from("pontos_temporada")
          .select("pico")
          .eq("temporada_id", temporada.id)
          .eq("cla_id", cla.id)
          .maybeSingle<{ pico: number }>()
      : null,
    geral ? obterRankingGeral(supabase) : null,
  ]);

  const acharLinha = (r: typeof rankingTemporada) =>
    r?.classificados.find((l) => l.cla.id === cla.id) ?? r?.emClassificacao.find((l) => l.cla.id === cla.id);
  const linhaTemporada = acharLinha(rankingTemporada);
  const linha = geral ? acharLinha(rankingGeral) : linhaTemporada;
  const pico = geral ? rankingGeral?.pico.get(cla.id) : pontosTemporada ? garantir(pontosTemporada)?.pico : undefined;
  const est = estatisticasDoCla(geral ? doCla : doCla.filter((c) => c.temporada_id === temporada?.id), cla.id);
  const porId = new Map(garantir(clas).map((c) => [c.id, c]));

  const elenco = garantir(membros).sort((x, y) => ORDEM_CARGO[x.cargo] - ORDEM_CARGO[y.cargo] || x.usuario.nick.localeCompare(y.usuario.nick));
  const redes = Object.entries(cla.redes ?? {}).filter(([, url]) => typeof url === "string" && url.startsWith("http")) as [
    keyof typeof NOME_REDE,
    string,
  ][];
  const tagUrl = encodeURIComponent(cla.tag);
  const sinal = (n: number) => (n > 0 ? `+${n}` : String(n));
  const NOME_SEQ = { V: ["vitória", "vitórias"], E: ["empate", "empates"], D: ["derrota", "derrotas"] } as const;
  const posAnel = linhaTemporada?.posicao;

  return (
    <>
      <header className="mb-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
        <LogoCla cla={cla} tamanho={112} anel={posAnel === 1 ? "ouro" : posAnel === 2 ? "prata" : posAnel === 3 ? "bronze" : "neutro"} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-6xl leading-none tracking-wide">{cla.tag}</h1>
          <p className="text-lg text-aco-200">{cla.nome}</p>
          <p className="mt-1 text-sm text-aco-400">
            {cla.fundado_em && <>Fundado em {formatarDia(cla.fundado_em)}</>}
            {!cla.ativo && <span className="ml-2 text-alerta">· Inativo</span>}
          </p>
          <Link
            href={`/comparar?a=${tagUrl}`}
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-destaque-claro hover:underline"
          >
            Comparar com outro clã
          </Link>
          {redes.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-3 sm:justify-start">
              {redes.map(([rede, url]) => (
                <a key={rede} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-destaque-claro hover:underline">
                  {NOME_REDE[rede] ?? rede} <ExternalLink className="size-3.5" />
                </a>
              ))}
            </div>
          )}
        </div>
      </header>

      {(titulos.length > 0 || titulosCampeonato.length > 0) && (
        <ul className="mb-8 flex flex-wrap gap-2">
          {titulos.map((t) => (
            <li key={t.id}>
              <SeloTitulo colocacao={1} nome={t.nome} href={`/ranking?temporada=${t.id}`} />
            </li>
          ))}
          {titulosCampeonato.map((t) => (
            <li key={t.campeonato.id}>
              <SeloTitulo colocacao={t.colocacao} nome={t.campeonato.nome} href={`/campeonatos/${t.campeonato.id}`} />
            </li>
          ))}
        </ul>
      )}

      {cla.bio && <p className="mb-8 whitespace-pre-line text-aco-200">{cla.bio}</p>}

      <section className="mb-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="titulo-secao mb-0">Estatísticas</h2>
          <nav className="flex gap-1 rounded-lg bg-grafite-900 p-1 text-sm">
            <Link
              href={`/clas/${tagUrl}`}
              className={`rounded-md px-3 py-1 font-semibold ${!geral ? "bg-grafite-700 text-aco-50" : "text-aco-400 hover:text-aco-50"}`}
            >
              {temporada?.nome ?? "Temporada"}
            </Link>
            <Link
              href={`/clas/${tagUrl}?visao=geral`}
              className={`rounded-md px-3 py-1 font-semibold ${geral ? "bg-grafite-700 text-aco-50" : "text-aco-400 hover:text-aco-50"}`}
            >
              Geral
            </Link>
          </nav>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Numero
            rotulo={geral ? "Posição geral" : "Posição"}
            valor={linha?.posicao ? `${linha.posicao}º` : "—"}
            dica={linha && !linha.posicao ? "em classificação" : undefined}
          />
          <Numero rotulo="Pontos" valor={String(linha?.pontos ?? PONTOS_INICIAIS)} />
          <Numero rotulo={geral ? "Pico geral" : "Pico na temporada"} valor={String(pico ?? PONTOS_INICIAIS)} />
          <Numero rotulo="Aproveitamento" valor={`${est.aproveitamento.toLocaleString("pt-BR")}%`} dica={`${est.jogos} confronto${est.jogos === 1 ? "" : "s"}`} />
          <Numero rotulo="V / E / D" valor={`${est.vitorias}/${est.empates}/${est.derrotas}`} />
          <Numero
            rotulo="Partidas"
            valor={`${est.partidasPro}–${est.partidasContra}`}
            dica={est.jogos ? `saldo ${sinal(est.saldoPartidas)} · ${est.aproveitamentoPartidas.toLocaleString("pt-BR")}% ganhas` : undefined}
          />
          <Numero
            rotulo="Rounds"
            valor={est.roundsPro + est.roundsContra ? `${est.roundsPro}–${est.roundsContra}` : "—"}
            dica={est.roundsPro + est.roundsContra ? `saldo ${sinal(est.saldoRounds)}` : undefined}
          />
          <Numero
            rotulo="Sequência atual"
            valor={est.sequenciaAtual ? `${est.sequenciaAtual.quantidade} ${NOME_SEQ[est.sequenciaAtual.resultado][est.sequenciaAtual.quantidade > 1 ? 1 : 0]}` : "—"}
            pequeno
          />
          <Numero rotulo="Maior sequência de vitórias" valor={String(est.maiorSequenciaVitorias)} />
          {est.maiorVitoria ? (
            <Link href={`/confrontos/${est.maiorVitoria.confronto.id}`} className="cartao px-4 py-3 hover:border-grafite-600">
              <dt className="text-xs tracking-wider text-aco-400 uppercase">Maior vitória</dt>
              <dd className="mt-1 font-display text-3xl leading-none">
                {est.maiorVitoria.pro}x{est.maiorVitoria.contra}
              </dd>
              <dd className="text-xs text-aco-500">
                contra{" "}
                {porId.get(
                  est.maiorVitoria.confronto.cla_a_id === cla.id ? est.maiorVitoria.confronto.cla_b_id : est.maiorVitoria.confronto.cla_a_id,
                )?.tag ?? "?"}{" "}
                · {formatarDataCurta(est.maiorVitoria.confronto.data)}
              </dd>
            </Link>
          ) : (
            <Numero rotulo="Maior vitória" valor="—" />
          )}
          <div className="cartao col-span-2 flex flex-col justify-center px-4 py-3">
            <dt className="text-xs tracking-wider text-aco-400 uppercase">Últimos resultados</dt>
            <dd className="mt-2">{linha?.ultimos.length ? <UltimosResultados ultimos={linha.ultimos} /> : <span className="text-aco-500">—</span>}</dd>
          </div>
        </dl>
      </section>

      {est.rivais.length > 0 && (
        <section className="mb-10">
          <h2 className="titulo-secao">Retrospecto contra cada clã</h2>
          <p className="mb-3 text-sm text-aco-400">
            Rival mais frequente: <strong className="text-aco-50">{porId.get(est.rivais[0].adversarioId)?.tag ?? "?"}</strong> (
            {est.rivais[0].jogos} confronto{est.rivais[0].jogos > 1 ? "s" : ""}).
          </p>
          <div className="cartao overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-grafite-700 text-left text-xs tracking-wider text-aco-400 uppercase">
                <tr>
                  <th className="py-3 pl-4 font-medium">Adversário</th>
                  <th className="px-2 py-3 text-center font-medium">Jogos</th>
                  <th className="px-2 py-3 text-center font-medium">V/E/D</th>
                  <th className="hidden px-2 py-3 text-center font-medium sm:table-cell">Partidas</th>
                  <th className="py-3 pr-4 text-right font-medium">
                    <span className="sr-only">Comparar</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grafite-800">
                {est.rivais.map((r) => {
                  const adv = porId.get(r.adversarioId);
                  if (!adv) return null;
                  return (
                    <tr key={r.adversarioId}>
                      <td className="py-2 pl-4">
                        <Link href={`/clas/${encodeURIComponent(adv.tag)}`} className="flex items-center gap-2 font-semibold">
                          <LogoCla cla={adv} tamanho={28} /> {adv.tag}
                        </Link>
                      </td>
                      <td className="px-2 py-2 text-center tabular-nums">{r.jogos}</td>
                      <td className="px-2 py-2 text-center tabular-nums">
                        <span className="text-vitoria">{r.vitorias}</span>/{r.empates}/<span className="text-derrota">{r.derrotas}</span>
                      </td>
                      <td className="hidden px-2 py-2 text-center tabular-nums sm:table-cell">
                        {r.partidasPro}–{r.partidasContra}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <Link href={`/comparar?a=${tagUrl}&b=${encodeURIComponent(adv.tag)}`} className="text-xs text-destaque-claro hover:underline">
                          comparar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="titulo-secao mb-0">Últimos confrontos</h2>
            {doCla.length > ultimos.length && (
              <Link href={`/clas/${tagUrl}/confrontos`} className="text-sm font-semibold text-destaque-claro hover:underline">
                Ver todos ({doCla.length})
              </Link>
            )}
          </div>
          <ListaConfrontos confrontos={ultimos} claId={cla.id} vazio="Este clã ainda não tem confrontos aprovados." />
        </section>

        <section>
          <h2 className="titulo-secao">Elenco</h2>
          {elenco.length === 0 ? (
            <p className="cartao px-4 py-6 text-center text-sm text-aco-400">Nenhum membro cadastrado.</p>
          ) : (
            <ul className="cartao divide-y divide-grafite-800">
              {elenco.map((m) => (
                <li key={m.usuario.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="font-medium">{m.usuario.nick}</span>
                  <span className={`text-xs ${m.cargo === "membro" ? "text-aco-500" : "font-semibold text-destaque-claro"}`}>
                    {NOME_CARGO[m.cargo]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Numero({ rotulo, valor, dica, pequeno = false }: { rotulo: string; valor: string; dica?: string; pequeno?: boolean }) {
  return (
    <div className="cartao px-4 py-3">
      <dt className="text-xs tracking-wider text-aco-400 uppercase">{rotulo}</dt>
      <dd className={`mt-1 font-display leading-none ${pequeno ? "text-2xl" : "text-3xl"}`}>{valor}</dd>
      {dica && <dd className="text-xs text-aco-500">{dica}</dd>}
    </div>
  );
}
