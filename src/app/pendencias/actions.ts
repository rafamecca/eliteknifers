"use server";

import { revalidatePath } from "next/cache";
import { obterSessao } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoResposta = { erro?: string; mensagem?: string };

/** Confirma ou contesta um resultado enviado contra o clã. O banco confere cargo e prazo. */
export async function responderConfronto(_: EstadoResposta, formData: FormData): Promise<EstadoResposta> {
  const sessao = await obterSessao();
  if (!sessao?.podeEnviar) return { erro: "Só o líder ou o sublíder do clã adversário pode responder." };

  const confirmar = formData.get("acao") === "confirmar";
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!confirmar && !motivo) return { erro: "Explique o motivo da contestação." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("responder_confronto", {
    p_confronto: String(formData.get("id") ?? ""),
    p_confirmar: confirmar,
    p_motivo: confirmar ? null : motivo,
  });
  if (error) return { erro: error.message };

  revalidatePath("/", "layout");
  return { mensagem: confirmar ? "Resultado confirmado." : "Contestação enviada ao ADM." };
}
