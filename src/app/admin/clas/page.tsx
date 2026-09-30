import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LogoCla } from "@/components/logo-cla";
import { garantir } from "@/lib/dados";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Cargo, ClaResumo } from "@/lib/tipos";

export const metadata: Metadata = { title: "Clãs · ADM" };

type ClaAdmin = ClaResumo & {
  ativo: boolean;
  membros: { cargo: Cargo; saiu_em: string | null; usuario: { nick: string } }[];
};

export default async function AdminClas() {
  const supabase = await criarClienteServidor();
  const clas = garantir(
    await supabase
      .from("clas")
      .select("id, nome, tag, logo, ativo, membros:membros_cla(cargo, saiu_em, usuario:usuarios(nick))")
      .order("tag")
      .overrideTypes<ClaAdmin[], { merge: false }>(),
  );

  const nickDo = (c: ClaAdmin, cargo: Cargo) => c.membros.find((m) => m.cargo === cargo && !m.saiu_em)?.usuario.nick;

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-display text-5xl tracking-wide uppercase">
          Clãs <span className="text-aco-500">({clas.length})</span>
        </h1>
        <Link href="/admin/clas/novo" className="btn-destaque">
          <Plus className="size-4" /> Novo clã
        </Link>
      </div>

      {clas.length === 0 ? (
        <p className="cartao px-4 py-8 text-center text-aco-400">Nenhum clã cadastrado ainda.</p>
      ) : (
        <ul className="cartao divide-y divide-grafite-800">
          {clas.map((c) => {
            const lider = nickDo(c, "lider");
            const sublider = nickDo(c, "sublider");
            return (
              <li key={c.id}>
                <Link href={`/admin/clas/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-grafite-850">
                  <LogoCla cla={c} tamanho={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {c.tag} <span className="font-normal text-aco-400">· {c.nome}</span>
                      {!c.ativo && <span className="ml-2 text-xs text-alerta">inativo</span>}
                    </span>
                    <span className="block truncate text-xs text-aco-400">
                      Líder: {lider ?? <span className="text-alerta">sem líder</span>} · Sublíder: {sublider ?? "—"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
