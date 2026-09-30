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
    { href: "/como-funciona", rotulo: "Como funciona", icone: "regras" },
  ];
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
