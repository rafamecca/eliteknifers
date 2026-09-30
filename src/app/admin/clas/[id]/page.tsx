import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { garantir } from "@/lib/dados";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Cargo, Cla } from "@/lib/tipos";
import { ehUuid } from "@/lib/uuid";
import { FormCla } from "../form-cla";
import { FormLideranca, ListaMembros } from "./lideranca";

export const metadata: Metadata = { title: "Editar clã · ADM" };

const ORDEM: Record<Cargo, number> = { lider: 0, sublider: 1, membro: 2 };

export default async function EditarCla({ params }: PageProps<"/admin/clas/[id]">) {
  const { id } = await params;
  if (!ehUuid(id)) notFound();

  const supabase = await criarClienteServidor();
  const [cla, membros, usuarios] = await Promise.all([
    supabase.from("clas").select("id, nome, tag, logo, bio, redes, fundado_em, ativo").eq("id", id).maybeSingle<Cla>(),
    supabase
      .from("membros_cla")
      .select("cargo, usuario:usuarios(id, nick)")
      .eq("cla_id", id)
      .is("saiu_em", null)
      .overrideTypes<{ cargo: Cargo; usuario: { id: string; nick: string } }[], { merge: false }>(),
    supabase.from("usuarios").select("nick").eq("banido", false).order("nick").limit(1000)
      .overrideTypes<{ nick: string }[], { merge: false }>(),
  ]);
  const dados = garantir(cla);
  if (!dados) notFound();
  const elenco = garantir(membros).sort((x, y) => ORDEM[x.cargo] - ORDEM[y.cargo] || x.usuario.nick.localeCompare(y.usuario.nick));

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-5xl tracking-wide uppercase">{dados.tag}</h1>
        <Link href={`/clas/${encodeURIComponent(dados.tag)}`} className="text-sm text-destaque-claro hover:underline">
          ver perfil público
        </Link>
      </div>

      <section>
        <h2 className="titulo-secao">Dados do clã</h2>
        <FormCla cla={dados} />
      </section>

      <section>
        <h2 className="titulo-secao">Líder e sublíder</h2>
        <FormLideranca claId={dados.id} membros={elenco} nicks={garantir(usuarios).map((u) => u.nick)} />
      </section>

      <section>
        <h2 className="titulo-secao">Elenco atual</h2>
        <ListaMembros claId={dados.id} membros={elenco} />
      </section>
    </div>
  );
}
