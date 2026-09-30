import { ExternalLink, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListaConfrontos } from "@/components/lista-confrontos";
import { LogoCla } from "@/components/logo-cla";
import { UltimosResultados } from "@/components/ultimos-resultados";
import { garantir, obterRanking, obterTemporadaAtiva, obterTitulosDeTemporada, obterUltimosConfrontos } from "@/lib/dados";
import { PONTOS_INICIAIS } from "@/lib/elo";
import { formatarDia } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/server";
import { NOME_CARGO, type Cargo, type Cla } from "@/lib/tipos";

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

export default async function PerfilCla({ params }: PageProps<"/clas/[tag]">) {
  const { supabase, cla } = await buscarCla((await params).tag);
  if (!cla) notFound();

  const [temporada, membros, confrontos, titulos] = await Promise.all([
    obterTemporadaAtiva(supabase),
    supabase
      .from("membros_cla")
      .select("cargo, usuario:usuarios(id, nick)")
      .eq("cla_id", cla.id)
      .is("saiu_em", null)
      .overrideTypes<{ cargo: Cargo; usuario: { id: string; nick: string } }[], { merge: false }>(),
    obterUltimosConfrontos(supabase, { limite: 20, claId: cla.id }),
    obterTitulosDeTemporada(supabase, cla.id),
  ]);

  const ranking = temporada ? await obterRanking(supabase, temporada.id) : null;
  const linha =
    ranking?.classificados.find((l) => l.cla.id === cla.id) ?? ranking?.emClassificacao.find((l) => l.cla.id === cla.id);
  const elenco = garantir(membros).sort((x, y) => ORDEM_CARGO[x.cargo] - ORDEM_CARGO[y.cargo] || x.usuario.nick.localeCompare(y.usuario.nick));
  const redes = Object.entries(cla.redes ?? {}).filter(([, url]) => typeof url === "string" && url.startsWith("http")) as [
    keyof typeof NOME_REDE,
    string,
  ][];

  return (
    <>
      <header className="mb-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
        <LogoCla cla={cla} tamanho={112} anel={linha?.posicao === 1 ? "ouro" : linha?.posicao === 2 ? "prata" : linha?.posicao === 3 ? "bronze" : "neutro"} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-6xl leading-none tracking-wide">{cla.tag}</h1>
          <p className="text-lg text-aco-200">{cla.nome}</p>
          <p className="mt-1 text-sm text-aco-400">
            {cla.fundado_em && <>Fundado em {formatarDia(cla.fundado_em)}</>}
            {!cla.ativo && <span className="ml-2 text-alerta">· Inativo</span>}
          </p>
          <Link
            href={`/comparar?a=${encodeURIComponent(cla.tag)}`}
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

      {titulos.length > 0 && (
        <ul className="mb-8 flex flex-wrap gap-2">
          {titulos.map((t) => (
            <li key={t.id}>
              <a
                href={`/ranking?temporada=${t.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-ouro/50 bg-ouro/10 px-3 py-1.5 text-sm font-semibold text-ouro hover:bg-ouro/20"
              >
                <Trophy className="size-4" /> Campeão · {t.nome}
              </a>
            </li>
          ))}
        </ul>
      )}

      {cla.bio && <p className="mb-8 whitespace-pre-line text-aco-200">{cla.bio}</p>}

      <section className="mb-10">
        <h2 className="titulo-secao">{temporada ? temporada.nome : "Temporada"}</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Numero rotulo="Posição" valor={linha?.posicao ? `${linha.posicao}º` : "—"} dica={linha && !linha.posicao ? "em classificação" : undefined} />
          <Numero rotulo="Pontos" valor={String(linha?.pontos ?? PONTOS_INICIAIS)} />
          <Numero rotulo="V / E / D" valor={linha ? `${linha.vitorias}/${linha.empates}/${linha.derrotas}` : "0/0/0"} />
          <Numero rotulo="Aproveitamento" valor={`${(linha?.aproveitamento ?? 0).toLocaleString("pt-BR")}%`} />
          <Numero rotulo="Partidas" valor={linha ? `${linha.partidasPro}–${linha.partidasContra}` : "0–0"} />
          <Numero rotulo="Saldo de partidas" valor={linha ? (linha.saldoPartidas > 0 ? `+${linha.saldoPartidas}` : String(linha.saldoPartidas)) : "0"} />
          <div className="cartao col-span-2 flex flex-col justify-center px-4 py-3">
            <dt className="text-xs tracking-wider text-aco-400 uppercase">Últimos resultados</dt>
            <dd className="mt-2">{linha?.ultimos.length ? <UltimosResultados ultimos={linha.ultimos} /> : <span className="text-aco-500">—</span>}</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <section>
          <h2 className="titulo-secao">Últimos confrontos</h2>
          <ListaConfrontos confrontos={confrontos} claId={cla.id} vazio="Este clã ainda não tem confrontos aprovados." />
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

function Numero({ rotulo, valor, dica }: { rotulo: string; valor: string; dica?: string }) {
  return (
    <div className="cartao px-4 py-3">
      <dt className="text-xs tracking-wider text-aco-400 uppercase">{rotulo}</dt>
      <dd className="mt-1 font-display text-3xl leading-none">{valor}</dd>
      {dica && <dd className="text-xs text-aco-500">{dica}</dd>}
    </div>
  );
}
