"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { garantir, obterTags } from "@/lib/dados";
import { obterSessao } from "@/lib/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { validarTag } from "@/lib/tags";
import { ehUuid } from "@/lib/uuid";
import type { EstadoAdmin } from "../actions";

async function clienteCoder() {
  const sessao = await obterSessao();
  if (!sessao?.ehCoder) throw new Error("Apenas o CODER pode gerenciar tags.");
  return { sessao, supabase: await criarClienteServidor() };
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

function mensagemDeErro(erro: { code?: string; message: string }): string {
  if (erro.code === "23505") return "Já existe uma tag com esse nome.";
  return erro.message;
}

export async function salvarTag(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { sessao, supabase } = await clienteCoder();
  const id = texto(formData, "id");
  const dados = validarTag(texto(formData, "nome"), texto(formData, "cor"));
  if ("erro" in dados) return dados;

  let tagId = id;
  if (id) {
    if (!ehUuid(id)) return { erro: "Tag inválida." };
    const { error } = await supabase.from("tags").update(dados).eq("id", id);
    if (error) return { erro: mensagemDeErro(error) };
  } else {
    const ordem = Math.max(0, ...(await obterTags(supabase)).map((t) => t.ordem)) + 1;
    const { data, error } = await supabase.from("tags").insert({ ...dados, ordem }).select("id").single();
    if (error) return { erro: mensagemDeErro(error) };
    tagId = data.id;
  }
  await supabase.from("log_admin").insert({
    adm_id: sessao.usuario.id,
    acao: id ? "editar_tag" : "criar_tag",
    alvo: `tags:${tagId}`,
    depois: dados,
  });
  revalidatePath("/", "layout");
  if (!id) redirect(`/admin/tags/${tagId}`);
  return { mensagem: "Tag salva." };
}

export async function excluirTag(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { sessao, supabase } = await clienteCoder();
  const id = texto(formData, "id");
  if (!ehUuid(id)) return { erro: "Tag inválida." };
  const { data, error } = await supabase.from("tags").delete().eq("id", id).select("id");
  if (error) return { erro: error.message };
  if (!data?.length) return { erro: "Tags automáticas (ADM e CODER) não podem ser apagadas." };
  await supabase.from("log_admin").insert({ adm_id: sessao.usuario.id, acao: "excluir_tag", alvo: `tags:${id}` });
  revalidatePath("/", "layout");
  redirect("/admin/tags");
}

/** Sobe ou desce a tag uma posição na ordem de importância. */
export async function moverTag(formData: FormData): Promise<void> {
  const { supabase } = await clienteCoder();
  const id = texto(formData, "id");
  const passo = texto(formData, "direcao") === "subir" ? -1 : 1;
  const tags = await obterTags(supabase);
  const i = tags.findIndex((t) => t.id === id);
  const j = i + passo;
  if (i < 0 || j < 0 || j >= tags.length) return;
  [tags[i], tags[j]] = [tags[j], tags[i]];
  // Renumera 0, 1, 2… (só grava o que mudou)
  for (const [ordem, tag] of tags.entries()) {
    if (tag.ordem !== ordem) garantir(await supabase.from("tags").update({ ordem }).eq("id", tag.id));
  }
  revalidatePath("/", "layout");
}

export async function darTag(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { sessao, supabase } = await clienteCoder();
  const tag = texto(formData, "tag");
  const nick = texto(formData, "nick");
  if (!ehUuid(tag)) return { erro: "Tag inválida." };
  if (!nick) return { erro: "Informe o nick do jogador." };

  const { data: usuario, error: erroUsuario } = await supabase
    .from("usuarios")
    .select("id, nick")
    .ilike("nick", nick.replace(/[\\%_]/g, "\\$&"))
    .maybeSingle<{ id: string; nick: string }>();
  if (erroUsuario) return { erro: erroUsuario.message };
  if (!usuario) return { erro: `Nenhum jogador com o nick "${nick}".` };

  const { error } = await supabase.from("usuarios_tags").insert({ usuario_id: usuario.id, tag_id: tag });
  if (error) return { erro: error.code === "23505" ? `${usuario.nick} já tem essa tag.` : error.message };
  await supabase.from("log_admin").insert({
    adm_id: sessao.usuario.id,
    acao: "dar_tag",
    alvo: `tags:${tag}`,
    depois: { usuario_id: usuario.id },
  });
  revalidatePath("/", "layout");
  return { mensagem: `Tag dada para ${usuario.nick}.` };
}

export async function tirarTag(_: EstadoAdmin, formData: FormData): Promise<EstadoAdmin> {
  const { sessao, supabase } = await clienteCoder();
  const tag = texto(formData, "tag");
  const usuario = texto(formData, "usuario");
  if (!ehUuid(tag) || !ehUuid(usuario)) return { erro: "Dados inválidos." };
  const { error } = await supabase.from("usuarios_tags").delete().eq("tag_id", tag).eq("usuario_id", usuario);
  if (error) return { erro: error.message };
  await supabase.from("log_admin").insert({
    adm_id: sessao.usuario.id,
    acao: "tirar_tag",
    alvo: `tags:${tag}`,
    antes: { usuario_id: usuario },
  });
  revalidatePath("/", "layout");
  return {};
}
