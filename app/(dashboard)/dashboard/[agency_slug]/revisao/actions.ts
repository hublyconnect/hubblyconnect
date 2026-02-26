"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const BUCKET = "portal-files";

export type DeleteAssetResult = { ok: true } | { ok: false; error: string };
export type ResubmitToPendingResult = { ok: true } | { ok: false; error: string };
export type UpdateFolderNameResult = { ok: true } | { ok: false; error: string };
export type DeleteFolderResult = { ok: true } | { ok: false; error: string };

/** Extrai o path no bucket a partir da URL pública do Supabase Storage. */
function getStoragePathFromPublicUrl(fileUrl: string): string | null {
  const match = fileUrl.match(/\/portal-files\/(.+)$/);
  return match ? match[1] : null;
}

export async function deleteCreativeAssetAction(
  agencySlug: string,
  assetId: string
): Promise<DeleteAssetResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false, error: "Sem permissão." };

  const { error } = await supabase.from("creative_assets").delete().eq("id", assetId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/${agencySlug}/revisao`);
  return { ok: true };
}

export async function updateFolderNameAction(
  agencySlug: string,
  clientId: string,
  oldDemandName: string,
  newDemandName: string
): Promise<UpdateFolderNameResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false, error: "Sem permissão." };

  const nameToMatch = oldDemandName.trim() || null;
  const newName = newDemandName.trim() || null;

  let query = supabase
    .from("creative_assets")
    .update({ demand_name: newName })
    .eq("client_id", clientId);
  if (nameToMatch === null) {
    query = query.is("demand_name", null);
  } else {
    query = query.eq("demand_name", nameToMatch);
  }
  const { error } = await query;
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/${agencySlug}/revisao`);
  return { ok: true };
}

export async function deleteFolderAction(
  agencySlug: string,
  clientId: string,
  demandName: string
): Promise<DeleteFolderResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false, error: "Sem permissão." };

  const nameToMatch = demandName.trim() || null;

  let selectQuery = supabase
    .from("creative_assets")
    .select("id, file_url")
    .eq("client_id", clientId);
  if (nameToMatch === null) {
    selectQuery = selectQuery.is("demand_name", null);
  } else {
    selectQuery = selectQuery.eq("demand_name", nameToMatch);
  }
  const { data: rows, error: selectError } = await selectQuery;
  if (selectError) return { ok: false, error: selectError.message };
  if (!rows?.length) {
    revalidatePath(`/dashboard/${agencySlug}/revisao`);
    return { ok: true };
  }

  const pathsToRemove: string[] = [];
  for (const row of rows) {
    const path = getStoragePathFromPublicUrl(row.file_url);
    if (path) pathsToRemove.push(path);
  }
  if (pathsToRemove.length > 0) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(pathsToRemove);
    if (storageError) {
      // Log but continue: DB cleanup still desired
      console.warn("[deleteFolderAction] storage remove warning:", storageError.message);
    }
  }

  let deleteQuery = supabase.from("creative_assets").delete().eq("client_id", clientId);
  if (nameToMatch === null) {
    deleteQuery = deleteQuery.is("demand_name", null);
  } else {
    deleteQuery = deleteQuery.eq("demand_name", nameToMatch);
  }
  const { error: deleteError } = await deleteQuery;
  if (deleteError) return { ok: false, error: deleteError.message };
  revalidatePath(`/dashboard/${agencySlug}/revisao`);
  return { ok: true };
}

/** Atualiza criativo de revision_requested para pending (Enviar para nova aprovação). */
export async function resubmitAssetToPendingAction(
  agencySlug: string,
  assetId: string
): Promise<ResubmitToPendingResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false, error: "Sem permissão." };

  const { data: asset, error: fetchErr } = await supabase
    .from("creative_assets")
    .select("id, status")
    .eq("id", assetId)
    .single();
  if (fetchErr || !asset) return { ok: false, error: "Criativo não encontrado." };
  if (asset.status !== "revision_requested") {
    return { ok: false, error: "Apenas criativos com ajuste solicitado podem ser reenviados." };
  }

  const { error } = await supabase
    .from("creative_assets")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("id", assetId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/${agencySlug}/revisao`);
  return { ok: true };
}
