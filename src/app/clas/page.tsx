import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { garantir, obterRanking, obterTemporadaAtiva } from "@/lib/dados";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ClaResumo } from "@/lib/tipos";
import { ListaClas } from "./lista-clas";

export const metadata: Metadata = { title: "Clãs" };

export default async function PaginaClas() {
  const supabase = await criarClienteServidor();
  const [clas, temporada] = await Promise.all([
    supabase.from("clas").select("id, nome, tag, logo").eq("ativo", true).order("tag")
      .overrideTypes<ClaResumo[], { merge: false }>(),
    obterTemporadaAtiva(supabase),
  ]);

  const posicoes: Record<string, number> = {};
  if (temporada) {
    const { classificados } = await obterRanking(supabase, temporada.id);
    classificados.forEach((l) => l.posicao && (posicoes[l.cla.id] = l.posicao));
  }

  return (
    <>
      <CabecalhoPagina titulo="Clãs" subtitulo="Todos os clãs cadastrados na comunidade." />
      <ListaClas clas={garantir(clas)} posicoes={posicoes} />
    </>
  );
}
