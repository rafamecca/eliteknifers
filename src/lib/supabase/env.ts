// Variáveis públicas do Supabase (Project Settings › API). Ver .env.example.
export function supabaseConfigurado(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em .env.local (veja .env.example).",
    );
  }
  return { url, chave };
}

export type Bucket = "prints" | "logos";

/** URL pública de um arquivo guardado num bucket público. */
export function urlPublica(bucket: Bucket, caminho: string): string {
  const { url } = supabaseEnv();
  return `${url}/storage/v1/object/public/${bucket}/${caminho.split("/").map(encodeURIComponent).join("/")}`;
}
