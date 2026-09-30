import type { Metadata } from "next";
import { FormCla } from "../form-cla";

export const metadata: Metadata = { title: "Novo clã · ADM" };

export default function NovoCla() {
  return (
    <>
      <h1 className="mb-2 font-display text-5xl tracking-wide uppercase">Novo clã</h1>
      <p className="mb-6 text-sm text-aco-400">Depois de cadastrar, você define o líder e o sublíder na página do clã.</p>
      <FormCla />
    </>
  );
}
