import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { FormCadastrar } from "../form-conta";

export const metadata: Metadata = { title: "Cadastrar" };

export default async function PaginaCadastrar() {
  if (await obterSessao()) redirect("/");

  return (
    <div className="mx-auto max-w-sm pt-4">
      <h1 className="font-display text-5xl tracking-wide uppercase">Criar conta</h1>
      <p className="mt-1 mb-6 text-sm text-aco-400">
        Qualquer jogador pode ter conta. Líderes e sublíderes são vinculados ao clã pelo ADM.
      </p>
      <div className="cartao p-5">
        <FormCadastrar />
      </div>
    </div>
  );
}
