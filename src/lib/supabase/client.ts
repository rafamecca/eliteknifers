import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/** Cliente do Supabase para Client Components (usado no upload de prints e logos). */
export function criarClienteNavegador() {
  const { url, chave } = supabaseEnv();
  return createBrowserClient(url, chave);
}
