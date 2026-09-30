// Utilidades de imagem para o navegador: hash (para bloquear print repetido) e compressão.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Bucket } from "./supabase/env";

export const TIPOS_ACEITOS = "image/png,image/jpeg,image/webp";
export const TAMANHO_MAXIMO_ORIGINAL = 20 * 1024 * 1024;

/** SHA-256 do arquivo original, em hexadecimal. */
export async function hashArquivo(arquivo: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await arquivo.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Reduz para no máximo `ladoMaximo` px e converte para WebP (ou JPEG, se o navegador não gerar WebP). */
export async function comprimirImagem(arquivo: File, ladoMaximo = 1920, qualidade = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const gerar = (tipo: string) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, qualidade));
  const webp = await gerar("image/webp");
  if (webp?.type === "image/webp") return webp;
  const jpeg = await gerar("image/jpeg");
  if (!jpeg) throw new Error("Não foi possível processar a imagem.");
  return jpeg;
}

/** Sobe o arquivo para <bucket>/<pasta>/<aleatório>.<ext> e devolve o caminho. */
export async function subirArquivo(supabase: SupabaseClient, bucket: Bucket, pasta: string, arquivo: Blob): Promise<string> {
  const ext = arquivo.type === "image/webp" ? "webp" : arquivo.type === "image/png" ? "png" : "jpg";
  const caminho = `${pasta}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(caminho, arquivo, {
    contentType: arquivo.type,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`Falha ao enviar imagem: ${error.message}`);
  return caminho;
}
