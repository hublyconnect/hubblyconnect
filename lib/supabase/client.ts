import { createBrowserClient } from "@supabase/ssr";

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

const getEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return { url, key };
};

export function createClient() {
  if (clientInstance) return clientInstance;

  const { url, key } = getEnv();
  if (!url || !key) {
    console.error(
      "[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check .env.local"
    );
    throw new Error(
      "Supabase não configurado. Verifique as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  clientInstance = createBrowserClient(url, key);
  return clientInstance;
}
