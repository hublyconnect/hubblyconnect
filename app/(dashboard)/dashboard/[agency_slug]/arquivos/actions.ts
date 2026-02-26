"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ClientAccessPlatform = "instagram" | "facebook" | "google" | "assets";

export type SaveClientAccessResult = { ok: true } | { ok: false; error: string };

export async function saveClientAccessAction(
  agencySlug: string,
  clientId: string,
  platform: ClientAccessPlatform,
  data: Record<string, string>
): Promise<SaveClientAccessResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { error } = await supabase
    .from("client_access")
    .upsert(
      {
        client_id: clientId,
        platform,
        data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,platform" }
    );

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/${agencySlug}/arquivos`);
  revalidatePath(`/dashboard/${agencySlug}`);
  return { ok: true };
}
