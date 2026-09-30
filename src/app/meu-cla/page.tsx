import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { LogoCla } from "@/components/logo-cla";
import { garantir } from "@/lib/dados";
import { formatarDataHora } from "@/lib/formato";
import { obterSessao } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { NOME_CARGO, type Cargo, type Cla, type ClaResumo } from "@/lib/tipos";
import { BotaoCancelarPedido, BotaoRemover, BotaoSair, FormPerfilCla, FormSublider, RespostaPedido } from "./forms";

export const metadata: Metadata = { title: "Meu clã" };

const ORDEM: Record<Cargo, number> = { lider: 0, sublider: 1, membro: 2 };

export default async function MeuCla() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/entrar?proximo=/meu-cla");
  const supabase = await criarClienteServidor();

  // Sem clã: mostra o pedido aberto, se houver.
  if (!sessao.cla) {
    const { data: pedido } = await supabase
      .from("pedidos_entrada")
      .select("id, criado_em, cla:clas(id, nome, tag, logo)")
      .eq("usuario_id", sessao.usuario.id)
      .eq("status", "pendente")
      .maybeSingle<{ id: string; criado_em: string; cla: ClaResumo }>();
    return (
      <>
        <CabecalhoPagina titulo="Meu clã" />
        {pedido ? (
          <div className="cartao flex flex-wrap items-center gap-4 p-5">
            <LogoCla cla={pedido.cla} tamanho={56} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-aco-400">Pedido de entrada aguardando o líder</p>
              <Link href={`/clas/${encodeURIComponent(pedido.cla.tag)}`} className="font-display text-3xl leading-none tracking-wide">
                {pedido.cla.tag}
              </Link>
              <p className="text-xs text-aco-500">Enviado em {formatarDataHora(pedido.criado_em)}</p>
            </div>
            <BotaoCancelarPedido pedidoId={pedido.id} />
          </div>
        ) : (
          <p className="cartao px-4 py-8 text-center text-aco-400">
            Você ainda não está em nenhum clã. Abra o perfil de um clã em{" "}
            <Link href="/clas" className="text-destaque-claro underline">
              Clãs
            </Link>{" "}
            e clique em <strong>Pedir para entrar</strong>.
          </p>
        )}
      </>
    );
  }

  const souLider = sessao.cargo === "lider";
  const [cla, membros, pedidos] = await Promise.all([
    supabase.from("clas").select("id, nome, tag, logo, bio, redes, fundado_em, ativo").eq("id", sessao.cla.id).single<Cla>(),
    supabase
      .from("membros_cla")
      .select("cargo, entrou_em, usuario:usuarios(id, nick)")
      .eq("cla_id", sessao.cla.id)
      .is("saiu_em", null)
      .overrideTypes<{ cargo: Cargo; entrou_em: string; usuario: { id: string; nick: string } }[], { merge: false }>(),
    souLider
      ? supabase
          .from("pedidos_entrada")
          .select("id, criado_em, usuario:usuarios!pedidos_entrada_usuario_id_fkey(id, nick)")
          .eq("cla_id", sessao.cla.id)
          .eq("status", "pendente")
          .order("criado_em")
          .overrideTypes<{ id: string; criado_em: string; usuario: { id: string; nick: string } }[], { merge: false }>()
      : null,
  ]);
  const dados = garantir(cla);
  const elenco = garantir(membros).sort((x, y) => ORDEM[x.cargo] - ORDEM[y.cargo] || x.usuario.nick.localeCompare(y.usuario.nick));
  const listaPedidos = pedidos?.data ?? [];

  return (
    <>
      <header className="mb-8 flex items-center gap-4">
        <LogoCla cla={dados} tamanho={72} />
        <div>
          <p className="text-xs font-semibold tracking-widest text-destaque-claro uppercase">Meu clã · {NOME_CARGO[sessao.cargo ?? "membro"]}</p>
          <Link href={`/clas/${encodeURIComponent(dados.tag)}`} className="font-display text-5xl leading-none tracking-wide">
            {dados.tag}
          </Link>
          <p className="text-aco-400">{dados.nome}</p>
        </div>
      </header>

      {souLider && (
        <section className="mb-10">
          <h2 className="titulo-secao">Pedidos de entrada ({listaPedidos.length})</h2>
          {listaPedidos.length === 0 ? (
            <p className="cartao px-4 py-6 text-center text-sm text-aco-400">Nenhum pedido aguardando.</p>
          ) : (
            <ul className="cartao divide-y divide-grafite-800">
              {listaPedidos.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <Link href={`/jogadores/${encodeURIComponent(p.usuario.nick)}`} className="font-semibold hover:underline">
                      {p.usuario.nick}
                    </Link>
                    <span className="block text-xs text-aco-500">pediu em {formatarDataHora(p.criado_em)}</span>
                  </span>
                  <RespostaPedido pedidoId={p.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mb-10">
        <h2 className="titulo-secao">Elenco ({elenco.length})</h2>
        <ul className="cartao mb-4 divide-y divide-grafite-800">
          {elenco.map((m) => (
            <li key={m.usuario.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span>
                <Link href={`/jogadores/${encodeURIComponent(m.usuario.nick)}`} className="font-medium hover:underline">
                  {m.usuario.nick}
                </Link>
                <span className={`ml-2 text-xs ${m.cargo === "membro" ? "text-aco-500" : "font-semibold text-destaque-claro"}`}>
                  {NOME_CARGO[m.cargo]}
                </span>
              </span>
              {souLider && m.cargo !== "lider" && <BotaoRemover claId={dados.id} usuarioId={m.usuario.id} nick={m.usuario.nick} />}
            </li>
          ))}
        </ul>
        {souLider && (
          <FormSublider
            membros={elenco.map((m) => ({ id: m.usuario.id, nick: m.usuario.nick, cargo: m.cargo }))}
            atual={elenco.find((m) => m.cargo === "sublider")?.usuario.id ?? ""}
          />
        )}
      </section>

      {souLider && (
        <section className="mb-10">
          <h2 className="titulo-secao">Perfil do clã</h2>
          <FormPerfilCla cla={dados} />
        </section>
      )}

      {!souLider && (
        <section>
          <h2 className="titulo-secao">Sair do clã</h2>
          <BotaoSair />
        </section>
      )}
      {souLider && (
        <p className="text-xs text-aco-500">
          Como líder, você não pode sair do clã. Para passar a liderança, fale com o ADM.
        </p>
      )}
    </>
  );
}
