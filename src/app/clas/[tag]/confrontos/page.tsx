import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ListaConfrontos } from "@/components/lista-confrontos";
import { buscarTodos, garantir, SELECT_CONFRONTO } from "@/lib/dados";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ClaResumo, ConfrontoComClas } from "@/lib/tipos";

async function buscarCla(tag: string) {
  const supabase = await criarClienteServidor();
  const cla = garantir(
    await supabase.from("clas").select("id, nome, tag, logo").eq("tag", decodeURIComponent(tag)).maybeSingle<ClaResumo>(),
  );
  return { supabase, cla };
}

export async function generateMetadata({ params }: PageProps<"/clas/[tag]/confrontos">): Promise<Metadata> {
  const { cla } = await buscarCla((await params).tag);
  return { title: cla ? `Confrontos · ${cla.tag}` : "Clã não encontrado" };
}

export default async function TodosConfrontos({ params }: PageProps<"/clas/[tag]/confrontos">) {
  const { supabase, cla } = await buscarCla((await params).tag);
  if (!cla) notFound();

  const confrontos = await buscarTodos((de, ate) =>
    supabase
      .from("confrontos")
      .select(SELECT_CONFRONTO)
      .eq("status", "aprovado")
      .or(`cla_a_id.eq.${cla.id},cla_b_id.eq.${cla.id}`)
      .order("data", { ascending: false })
      .order("id")
      .range(de, ate)
      .overrideTypes<ConfrontoComClas[], { merge: false }>(),
  );

  return (
    <>
      <Link href={`/clas/${encodeURIComponent(cla.tag)}`} className="text-sm text-destaque-claro hover:underline">
        ← {cla.tag}
      </Link>
      <CabecalhoPagina titulo={`Confrontos do ${cla.tag}`} subtitulo={`${confrontos.length} confrontos aprovados, de todas as temporadas.`} />
      <ListaConfrontos confrontos={confrontos} claId={cla.id} vazio="Este clã ainda não tem confrontos aprovados." />
    </>
  );
}
