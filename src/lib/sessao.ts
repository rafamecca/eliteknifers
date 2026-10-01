import { cache } from "react";
import { supabaseConfigurado } from "./supabase/env";
import { criarClienteServidor } from "./supabase/server";
import type { Cargo, ClaResumo, Usuario } from "./tipos";

export type Sessao = {
  usuario: Usuario;
  cla: ClaResumo | null;
  cargo: Cargo | null;
  ehAdmin: boolean;
  /** Gerencia as tags de jogador (tabela coders, ligada só pelo banco). */
  ehCoder: boolean;
  /** Líder ou sublíder de um clã, sem banimento. */
  podeEnviar: boolean;
};

/** Quem está logado (ou null). Memorizado por requisição. */
export const obterSessao = cache(async (): Promise<Sessao | null> => {
  // Sem Supabase configurado (ex.: build sem variáveis) o menu aparece deslogado;
  // as páginas que buscam dados mostram o erro explicando o que falta.
  if (!supabaseConfigurado()) return null;
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return null;

  const [{ data: usuario }, { data: membro }, { data: coder }] = await Promise.all([
    supabase.from("usuarios").select("id, nick, avatar, papel, banido").eq("id", uid).maybeSingle<Usuario>(),
    supabase
      .from("membros_cla")
      .select("cargo, cla:clas(id, nome, tag, logo)")
      .eq("usuario_id", uid)
      .is("saiu_em", null)
      .maybeSingle<{ cargo: Cargo; cla: ClaResumo }>(),
    // Antes da migração das tags a tabela não existe: o erro vira "não é CODER".
    supabase.from("coders").select("usuario_id").eq("usuario_id", uid).maybeSingle<{ usuario_id: string }>(),
  ]);
  if (!usuario) return null;

  const cargo = membro?.cargo ?? null;
  return {
    usuario,
    cla: membro?.cla ?? null,
    cargo,
    ehAdmin: usuario.papel === "adm" && !usuario.banido,
    ehCoder: !!coder && !usuario.banido,
    podeEnviar: !usuario.banido && (cargo === "lider" || cargo === "sublider"),
  };
});
