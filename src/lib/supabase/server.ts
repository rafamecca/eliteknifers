import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/** Cliente do Supabase para Server Components, Server Actions e Route Handlers. */
export async function criarClienteServidor() {
  // cookies() primeiro: deixa a rota dinâmica, então a falta das variáveis só é
  // cobrada quando alguém abre a página, e não quebra o build.
  const cookieStore = await cookies();
  const { url, chave } = supabaseEnv();

  return createServerClient(url, chave, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de um Server Component: o proxy (src/proxy.ts) já renova a sessão.
        }
      },
    },
  });
}
