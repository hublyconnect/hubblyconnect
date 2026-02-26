"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/** Retorna uma URL assinada para download forçado do arquivo (máxima qualidade). */
export async function getDownloadUrlAction(
  clientSlug: string,
  assetId: string,
  fileUrl: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("slug", clientSlug)
    .maybeSingle();
  if (clientError || !client) return { ok: false, error: "Cliente não encontrado." };

  const { data: asset, error: assetError } = await supabase
    .from("creative_assets")
    .select("id, client_id, file_url")
    .eq("id", assetId)
    .single();
  if (assetError || !asset || asset.client_id !== client.id) {
    return { ok: false, error: "Criativo não encontrado." };
  }

  const match = fileUrl.match(/\/portal-files\/([^?]+)/);
  if (!match) return { ok: false, error: "URL inválida." };
  const path = decodeURIComponent(match[1]);

  const { data: signed, error } = await supabase.storage
    .from("portal-files")
    .createSignedUrl(path, 60, { download: true });
  if (error) return { ok: false, error: error.message };
  if (!signed?.signedUrl) return { ok: false, error: "Falha ao gerar URL." };
  return { ok: true, url: signed.signedUrl };
}
