import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { buscarTodos, obterTagsDosJogadores } from "@/lib/dados";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Cargo, ClaResumo } from "@/lib/tipos";
import { ListaJogadores, type JogadorLinha } from "./lista-jogadores";

export const metadata: Metadata = { title: "Jogadores" };

type Linha = {
  id: string;
  nick: string;
  membros: { cargo: Cargo; saiu_em: string | null; cla: ClaResumo }[];
};

export default async function Jogadores() {
  const supabase = await criarClienteServidor();
  const [linhas, tags] = await Promise.all([
    buscarTodos((de, ate) =>
      supabase
        .from("usuarios")
        .select("id, nick, membros:membros_cla(cargo, saiu_em, cla:clas(id, nome, tag, logo))")
        .eq("banido", false)
        .order("nick")
        .range(de, ate)
        .overrideTypes<Linha[], { merge: false }>(),
    ),
    obterTagsDosJogadores(supabase),
  ]);

  const jogadores: JogadorLinha[] = linhas
    .map((u) => {
      const atual = u.membros.find((m) => !m.saiu_em);
      return { id: u.id, nick: u.nick, cla: atual?.cla ?? null, cargo: atual?.cargo ?? null, tags: tags.get(u.id) ?? [] };
    })
    .sort((x, y) => x.nick.localeCompare(y.nick, "pt-BR", { sensitivity: "base" }));

  return (
    <>
      <CabecalhoPagina titulo="Jogadores" subtitulo="Todos os jogadores cadastrados e o clã de cada um. Estatísticas individuais chegam em breve." />
      <ListaJogadores jogadores={jogadores} />
    </>
  );
}
