import { notFound } from "next/navigation";
import { obterSessao } from "@/lib/sessao";
import { SubmenuAdmin } from "./submenu";

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const sessao = await obterSessao();
  if (!sessao?.ehAdmin) notFound();

  return (
    <>
      <p className="mb-2 text-xs font-semibold tracking-widest text-destaque-claro uppercase">Painel ADM</p>
      <SubmenuAdmin mostrarTags={sessao.ehCoder} />
      {children}
    </>
  );
}
