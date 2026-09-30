import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { FormEntrar } from "../form-conta";

export const metadata: Metadata = { title: "Entrar" };

const ERROS: Record<string, string> = {
  link: "O link de confirmação é inválido ou expirou. Tente entrar ou cadastre-se de novo.",
};

export default async function PaginaEntrar({ searchParams }: PageProps<"/entrar">) {
  const { proximo, erro } = await searchParams;
  if (await obterSessao()) redirect("/");

  return (
    <div className="mx-auto max-w-sm pt-4">
      <h1 className="mb-6 font-display text-5xl tracking-wide uppercase">Entrar</h1>
      {typeof erro === "string" && ERROS[erro] && (
        <p className="mb-4 rounded-lg border border-alerta/40 bg-alerta/10 px-3 py-2 text-sm text-alerta">{ERROS[erro]}</p>
      )}
      <div className="cartao p-5">
        <FormEntrar proximo={typeof proximo === "string" ? proximo : "/"} />
      </div>
    </div>
  );
}
