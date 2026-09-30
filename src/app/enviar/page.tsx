import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaConfrontos } from "@/components/lista-confrontos";
import { SemTemporada } from "@/components/sem-temporada";
import { garantir, obterTemporadaAtiva, SELECT_CONFRONTO } from "@/lib/dados";
import { obterSessao } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ClaResumo, ConfrontoComClas } from "@/lib/tipos";
import { FormEnvio } from "./form-envio";

export const metadata: Metadata = { title: "Enviar resultado" };

export default async function PaginaEnviar() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/entrar?proximo=/enviar");

  if (!sessao.podeEnviar || !sessao.cla) {
    return (
      <>
        <CabecalhoPagina titulo="Enviar resultado" />
        <p className="cartao px-4 py-8 text-center text-aco-400">
          Só o líder ou o sublíder de um clã pode enviar resultados. Se você é um deles, peça ao ADM para vincular sua conta ao clã.
        </p>
      </>
    );
  }

  const supabase = await criarClienteServidor();
  const cla = sessao.cla;
  const [temporada, adversarios, envios] = await Promise.all([
    obterTemporadaAtiva(supabase),
    supabase.from("clas").select("id, nome, tag, logo").eq("ativo", true).neq("id", cla.id).order("tag")
      .overrideTypes<ClaResumo[], { merge: false }>(),
    supabase
      .from("confrontos")
      .select(SELECT_CONFRONTO)
      .or(`cla_a_id.eq.${cla.id},cla_b_id.eq.${cla.id}`)
      .order("enviado_em", { ascending: false })
      .limit(10)
      .overrideTypes<ConfrontoComClas[], { merge: false }>(),
  ]);

  return (
    <>
      <CabecalhoPagina titulo="Enviar resultado" subtitulo={`Você está enviando pelo clã ${cla.tag}.`} />

      {temporada ? (
        <FormEnvio uid={sessao.usuario.id} meuCla={cla} adversarios={garantir(adversarios)} />
      ) : (
        <SemTemporada />
      )}

      <section className="mt-12">
        <h2 className="titulo-secao">Resultados recentes do {cla.tag}</h2>
        <ListaConfrontos confrontos={garantir(envios)} claId={cla.id} mostrarResposta vazio="Nenhum resultado enviado ainda." />
      </section>
    </>
  );
}
