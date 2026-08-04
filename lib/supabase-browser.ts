import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton para reutilizar en componentes cliente
let client: ReturnType<typeof createSupabaseBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!client) {
    client = createSupabaseBrowserClient();
  }
  return client;
}
