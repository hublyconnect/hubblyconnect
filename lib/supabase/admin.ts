import { createClient } from "@supabase/supabase-js";

let adminInstance: ReturnType<typeof createClient> | null = null;

/**
 * Supabase client with service_role key. Use ONLY on the server (Server Actions, API routes).
 * Bypasses RLS; can create users and insert into any table.
 * Uses singleton pattern to avoid connection exhaustion.
 */
export function createAdminClient() {
  if (adminInstance) return adminInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !key) {
    console.error(
      "[Supabase Admin] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server-only)"
    );
    throw new Error(
      "Supabase admin não configurado. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local"
    );
  }

  adminInstance = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminInstance;
}
