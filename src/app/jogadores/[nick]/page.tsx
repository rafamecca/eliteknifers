import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoCla } from "@/components/logo-cla";
import { garantir } from "@/lib/dados";
import { formatarData } from "@/lib/formato";
import { criarClienteServidor } from "@/lib/supabase/server";
import { NOME_CARGO, type Cargo, type ClaResumo, type Usuario } from "@/lib/tipos";

async function buscarJogador(nick: string) {
  const supabase = await criarClienteServidor();
  const usuario = garantir(
    await supabase
      .from("usuarios")
      .select("id, nick, avatar, papel, banido")
      .ilike("nick", decodeURIComponent(nick).replace(/[\\%_]/g, "\\$&"))
      .maybeSingle<Usuario>(),
  );
  return { supabase, usuario };
}

export async function generateMetadata({ params }: PageProps<"/jogadores/[nick]">): Promise<Metadata> {
  const { usuario } = await buscarJogador((await params).nick);
  return { title: usuario?.nick ?? "Jogador não encontrado" };
}

type Passagem = { cargo: Cargo; entrou_em: string; saiu_em: string | null; cla: ClaResumo };

export default async function PerfilJogador({ params }: PageProps<"/jogadores/[nick]">) {
  const { supabase, usuario } = await buscarJogador((await params).nick);
  if (!usuario) notFound();

  const historico = garantir(
    await supabase
      .from("membros_cla")
      .select("cargo, entrou_em, saiu_em, cla:clas(id, nome, tag, logo)")
      .eq("usuario_id", usuario.id)
      .order("entrou_em", { ascending: false })
      .overrideTypes<Passagem[], { merge: false }>(),
  );
  const atual = historico.find((h) => !h.saiu_em);

  return (
    <>
      <header className="mb-8">
        <p className="text-xs font-semibold tracking-widest text-aco-400 uppercase">Jogador</p>
        <h1 className="font-display text-6xl leading-none tracking-wide">{usuario.nick}</h1>
        {usuario.banido && <p className="mt-1 text-sm text-derrota">Conta banida</p>}
      </header>

      <section className="mb-10">
        <h2 className="titulo-secao">Clã atual</h2>
        {atual ? (
          <Link href={`/clas/${encodeURIComponent(atual.cla.tag)}`} className="cartao flex items-center gap-4 p-4 hover:border-grafite-600">
            <LogoCla cla={atual.cla} tamanho={56} />
            <span>
              <span className="block font-display text-3xl leading-none tracking-wide">{atual.cla.tag}</span>
              <span className="text-sm text-aco-400">
                {atual.cla.nome} · {NOME_CARGO[atual.cargo]}
              </span>
            </span>
          </Link>
        ) : (
          <p className="cartao px-4 py-6 text-center text-sm text-aco-400">Sem clã no momento.</p>
        )}
      </section>

      <section>
        <h2 className="titulo-secao">Histórico de clãs</h2>
        {historico.length === 0 ? (
          <p className="cartao px-4 py-6 text-center text-sm text-aco-400">Nunca esteve em um clã.</p>
        ) : (
          <ol className="cartao divide-y divide-grafite-800">
            {historico.map((h) => (
              <li key={`${h.cla.id}-${h.entrou_em}`} className="flex items-center gap-3 px-4 py-3">
                <LogoCla cla={h.cla} tamanho={32} />
                <Link href={`/clas/${encodeURIComponent(h.cla.tag)}`} className="flex-1 font-semibold hover:underline">
                  {h.cla.tag}
                </Link>
                <span className="text-xs text-aco-400 tabular-nums">
                  {formatarData(h.entrou_em)} → {h.saiu_em ? formatarData(h.saiu_em) : "hoje"}
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-xs text-aco-500">Estatísticas individuais chegam numa fase futura.</p>
      </section>
    </>
  );
}
