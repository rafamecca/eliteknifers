import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/** Cliente do Supabase para Server Components, Server Actions e Route Handlers. */
export async function criarClienteServidor() {
  const { url, chave } = supabaseEnv();
  const cookieStore = await cookies();

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
