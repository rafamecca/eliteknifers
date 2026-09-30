import { sair } from "@/app/(conta)/actions";
import { contarPendencias } from "@/lib/dados";
import { obterSessao } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { NOME_CARGO } from "@/lib/tipos";
import { MenuLateral, type ItemMenu } from "./menu-lateral";

export async function Menu() {
  const sessao = await obterSessao();

  const itens: ItemMenu[] = [
    { href: "/", rotulo: "Início", icone: "inicio" },
    { href: "/ranking", rotulo: "Ranking", icone: "ranking" },
    { href: "/clas", rotulo: "Clãs", icone: "clas" },
    { href: "/comparar", rotulo: "Comparar", icone: "comparar" },
    { href: "/campeonatos", rotulo: "Campeonatos", icone: "campeonatos" },
    { href: "/como-funciona", rotulo: "Como funciona", icone: "regras" },
  ];
  if (sessao) {
    // Líder: número de pedidos de entrada aguardando (0 se a migração da Fase 3 ainda não rodou).
    const pedidos =
      sessao.cargo === "lider" && sessao.cla
        ? (
            await (await criarClienteServidor())
              .from("pedidos_entrada")
              .select("id", { count: "exact", head: true })
              .eq("cla_id", sessao.cla.id)
              .eq("status", "pendente")
          ).count ?? 0
        : 0;
    itens.push({ href: "/meu-cla", rotulo: "Meu clã", icone: "meuCla", contador: pedidos });
  }
  if (sessao?.podeEnviar && sessao.cla) {
    const pendencias = await contarPendencias(await criarClienteServidor(), sessao.cla.id);
    itens.push({ href: "/enviar", rotulo: "Enviar resultado", icone: "enviar" });
    itens.push({ href: "/pendencias", rotulo: "Minhas pendências", icone: "pendencias", contador: pendencias });
  }
  if (sessao?.ehAdmin) itens.push({ href: "/admin", rotulo: "Painel ADM", icone: "admin" });

  const usuario = sessao && {
    nick: sessao.usuario.nick,
    detalhe: sessao.cla
      ? `${sessao.cla.tag} · ${NOME_CARGO[sessao.cargo ?? "membro"]}`
      : sessao.ehAdmin
        ? "ADM"
        : "Sem clã",
  };

  return <MenuLateral itens={itens} usuario={usuario} sairAction={sair} />;
}
