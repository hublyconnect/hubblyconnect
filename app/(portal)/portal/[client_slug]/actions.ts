"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AssetStatus } from "@/lib/types/database";

export type PortalUpdateStatusResult = { ok: true } | { ok: false; error: string };

export type SubmitRevisionResult = { ok: true } | { ok: false; error: string };

export type SubmitAttachmentResult =
  | { ok: true; comment: PortalComment }
  | { ok: false; error: string };

const BUCKET_ATTACHMENTS = "portal-attachments";
const BUCKET_PORTAL_FILES = "portal-files";
const MAX_FILE_SIZE_MB = 10;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_PDF = ["application/pdf"];

/**
 * Atualiza status de um criativo a partir do portal público.
 * Valida que o asset pertence ao cliente do slug (segurança).
 */
export async function updateAssetStatusFromPortalAction(
  clientSlug: string,
  assetId: string,
  status: AssetStatus
): Promise<PortalUpdateStatusResult> {
  if (status !== "approved" && status !== "revision_requested") {
    return { ok: false, error: "Status inválido." };
  }
  const supabase = createAdminClient();
  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("slug", clientSlug)
    .maybeSingle();
  const client = clientData as { id: string } | null;
  if (clientError || !client) return { ok: false, error: "Cliente não encontrado." };

  const { data: assetData, error: assetError } = await supabase
    .from("creative_assets")
    .select("id, client_id")
    .eq("id", assetId)
    .single();
  const asset = assetData as { id: string; client_id: string } | null;
  if (assetError || !asset || asset.client_id !== client.id) {
    return { ok: false, error: "Criativo não encontrado ou não pertence a este cliente." };
  }

  const { error: updateError } = await supabase
    .from("creative_assets")
    .update({ status, updated_at: new Date().toISOString() } as never)
    .eq("id", assetId);
  if (updateError) return { ok: false, error: updateError.message };
  return { ok: true };
}

/**
 * Solicitar ajuste com comentário: insere em asset_comments (sender_type 'client')
 * e atualiza o status do asset para revision_requested.
 */
export async function submitAssetRevisionAction(
  clientSlug: string,
  assetId: string,
  commentText: string
): Promise<SubmitRevisionResult> {
  const trimmed = (commentText ?? "").trim();
  if (!trimmed) return { ok: false, error: "Digite o que precisa ser ajustado." };

  const supabase = createAdminClient();

  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("slug", clientSlug)
    .maybeSingle();
  const client = clientData as { id: string } | null;
  if (clientError || !client) return { ok: false, error: "Cliente não encontrado." };

  const { data: assetData, error: assetError } = await supabase
    .from("creative_assets")
    .select("id, client_id")
    .eq("id", assetId)
    .single();
  const asset = assetData as { id: string; client_id: string } | null;
  if (assetError || !asset || asset.client_id !== client.id) {
    return { ok: false, error: "Criativo não encontrado ou não pertence a este cliente." };
  }

  const { error: insertError } = await supabase.from("asset_comments").insert({
    asset_id: assetId,
    content: trimmed,
    sender_type: "client",
    author_id: null,
  } as never);
  if (insertError) return { ok: false, error: insertError.message };

  const { error: updateError } = await supabase
    .from("creative_assets")
    .update({
      status: "revision_requested",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", assetId);
  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath(`/portal/${clientSlug}`);
  return { ok: true };
}

/** Faz upload de arquivo para portal-attachments e retorna a URL pública. */
export async function uploadCommentAttachmentAction(
  clientSlug: string,
  assetId: string,
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = createAdminClient();

  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("slug", clientSlug)
    .maybeSingle();
  const client = clientData as { id: string } | null;
  if (clientError || !client) return { ok: false, error: "Cliente não encontrado." };

  const { data: assetData, error: assetError } = await supabase
    .from("creative_assets")
    .select("id, client_id")
    .eq("id", assetId)
    .single();
  const asset = assetData as { id: string; client_id: string } | null;
  if (assetError || !asset || asset.client_id !== client.id) {
    return { ok: false, error: "Criativo não encontrado." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Nenhum arquivo enviado." };

  const allowedAudio = ["audio/webm", "audio/mp3", "audio/mpeg", "audio/mp4"];
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isPdf = ALLOWED_PDF.includes(file.type);
  const isAudio = allowedAudio.includes(file.type) || file.name.endsWith(".webm") || file.name.endsWith(".mp3");
  if (!isImage && !isAudio && !isPdf) {
    return { ok: false, error: "Use imagem (JPG, PNG, GIF, WebP), áudio (WebM, MP3) ou PDF." };
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return { ok: false, error: `Arquivo muito grande. Máximo ${MAX_FILE_SIZE_MB}MB.` };

  const ts = Date.now();
  const ext = file.name.split(".").pop() || (isAudio ? "webm" : isPdf ? "pdf" : "jpg");
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 80);
  const path = `comments/${assetId}/${ts}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_ATTACHMENTS)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: urlData } = supabase.storage.from(BUCKET_ATTACHMENTS).getPublicUrl(path);
  return { ok: true, url: urlData.publicUrl };
}

export type PortalComment = {
  id: string;
  content: string;
  sender_type: "client" | "agency";
  created_at: string;
  file_url?: string | null;
};

/** Retorna comentários do criativo para o chat do portal (valida que o asset pertence ao cliente). */
export async function getAssetCommentsAction(
  clientSlug: string,
  assetId: string
): Promise<{ ok: true; comments: PortalComment[] } | { ok: false; error: string }> {
  const supabase = createAdminClient();
  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("slug", clientSlug)
    .maybeSingle();
  const client = clientData as { id: string } | null;
  if (clientError || !client) return { ok: false, error: "Cliente não encontrado." };

  const { data: assetData, error: assetError } = await supabase
    .from("creative_assets")
    .select("id, client_id")
    .eq("id", assetId)
    .single();
  const asset = assetData as { id: string; client_id: string } | null;
  if (assetError || !asset || asset.client_id !== client.id) {
    return { ok: false, error: "Criativo não encontrado." };
  }

  const { data: rows, error } = await supabase
    .from("asset_comments")
    .select("id, content, sender_type, created_at, file_url")
    .eq("asset_id", assetId)
    .order("created_at", { ascending: true });
  if (error) return { ok: false, error: error.message };

  const comments = (rows ?? []).map((r) => {
    const row = r as { id: string; content: string; sender_type: string; created_at: string; file_url?: string | null };
    return {
      id: row.id,
      content: row.content ?? "",
      sender_type: (row.sender_type === "client" ? "client" : "agency") as "client" | "agency",
      created_at: row.created_at,
      file_url: row.file_url ?? null,
    };
  });
  return { ok: true, comments };
}

/** Envia arquivo (imagem/PDF) ou áudio como comentário com anexo. FormData: file | audio | text */
export async function submitCommentWithAttachmentAction(
  clientSlug: string,
  assetId: string,
  formData: FormData
): Promise<SubmitAttachmentResult> {
  const supabase = createAdminClient();

  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("slug", clientSlug)
    .maybeSingle();
  const client = clientData as { id: string } | null;
  if (clientError || !client) return { ok: false, error: "Cliente não encontrado." };

  const { data: assetData, error: assetError } = await supabase
    .from("creative_assets")
    .select("id, client_id")
    .eq("id", assetId)
    .single();
  const asset = assetData as { id: string; client_id: string } | null;
  if (assetError || !asset || asset.client_id !== client.id) {
    return { ok: false, error: "Criativo não encontrado ou não pertence a este cliente." };
  }

  let content = "";
  let fileUrl: string | null = null;

  const file = formData.get("file") as File | null;
  const audio = formData.get("audio") as File | null;
  const text = (formData.get("text") as string) ?? "";

  if (file && file.size > 0) {
    const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_PDF];
    if (!allowed.includes(file.type)) {
      return { ok: false, error: "Tipo não permitido. Use imagem (JPG, PNG, GIF, WebP) ou PDF." };
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return { ok: false, error: `Arquivo muito grande. Máximo ${MAX_FILE_SIZE_MB}MB.` };
    }
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${client.id}/${assetId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_ATTACHMENTS)
      .upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) return { ok: false, error: uploadError.message };
    const { data: urlData } = supabase.storage.from(BUCKET_ATTACHMENTS).getPublicUrl(path);
    fileUrl = urlData.publicUrl;
    content = file.type.startsWith("image/") ? "[Imagem]" : "[PDF]";
  } else if (audio && audio.size > 0) {
    if (audio.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return { ok: false, error: `Áudio muito grande. Máximo ${MAX_FILE_SIZE_MB}MB.` };
    }
    const mime = audio.type || "audio/webm";
    const ext = mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "m4a" : mime.includes("mpeg") ? "mp3" : "webm";
    const path = `${client.id}/${assetId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_ATTACHMENTS)
      .upload(path, audio, { upsert: false, contentType: mime });
    if (uploadError) return { ok: false, error: uploadError.message };
    const { data: urlData } = supabase.storage.from(BUCKET_ATTACHMENTS).getPublicUrl(path);
    fileUrl = urlData.publicUrl;
    content = "[Áudio]";
  } else {
    const trimmed = text.trim();
    if (!trimmed) return { ok: false, error: "Digite o que precisa ser ajustado ou anexe um arquivo." };
    content = trimmed;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("asset_comments")
    .insert({
      asset_id: assetId,
      content,
      sender_type: "client",
      author_id: null,
      file_url: fileUrl,
    } as never)
    .select("id, content, sender_type, created_at, file_url")
    .single();
  if (insertError) return { ok: false, error: insertError.message };
  const row = inserted as { id: string; content: string; sender_type: string; created_at: string; file_url: string | null };

  const { error: updateError } = await supabase
    .from("creative_assets")
    .update({
      status: "revision_requested",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", assetId);
  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath(`/portal/${clientSlug}`);
  return {
    ok: true,
    comment: {
      id: row.id,
      content: row.content,
      sender_type: "client",
      created_at: row.created_at,
      file_url: row.file_url,
    },
  };
}

export type CompleteOnboardingItemResult = { ok: true } | { ok: false; error: string };

/** Marca item de onboarding como enviado (upload + completed). */
export async function completeOnboardingItemWithFileAction(
  clientSlug: string,
  itemId: string,
  formData: FormData
): Promise<CompleteOnboardingItemResult> {
  const file = formData.get("file") as File | null;
  if (!file?.size) return { ok: false, error: "Selecione um arquivo." };
  const supabase = createAdminClient();
  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("slug", clientSlug)
    .maybeSingle();
  const client = clientData as { id: string } | null;
  if (clientError || !client) return { ok: false, error: "Cliente não encontrado." };
  const { data: itemData, error: itemError } = await supabase
    .from("client_onboarding_items")
    .select("id, client_id")
    .eq("id", itemId)
    .single();
  const item = itemData as { id: string; client_id: string } | null;
  if (itemError || !item || item.client_id !== client.id) {
    return { ok: false, error: "Item não encontrado." };
  }
  const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_PDF];
  if (!allowed.includes(file.type)) {
    return { ok: false, error: "Use imagem (JPG, PNG, GIF, WebP) ou PDF." };
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return { ok: false, error: `Arquivo muito grande. Máximo ${MAX_FILE_SIZE_MB}MB.` };
  }
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `onboarding/${client.id}/${itemId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_PORTAL_FILES)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) return { ok: false, error: uploadError.message };
  const { error: updateError } = await supabase
    .from("client_onboarding_items")
    .update({ completed: true } as never)
    .eq("id", itemId);
  if (updateError) return { ok: false, error: updateError.message };
  return { ok: true };
}

export type CompleteOnboardingItemWithCredentialsResult = { ok: true } | { ok: false; error: string };

/** Marca item de onboarding como concluído com dados de credenciais (login/senha, 2FA). Salva em metadata. */
export async function completeOnboardingItemWithCredentialsAction(
  clientSlug: string,
  itemId: string,
  payload: { login: string; password: string; twoFactor: boolean }
): Promise<CompleteOnboardingItemWithCredentialsResult> {
  try {
    const supabase = createAdminClient();
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", clientSlug)
      .maybeSingle();
    const client = clientData as { id: string } | null;
    if (clientError || !client) return { ok: false, error: "Cliente não encontrado." };

    const { data: itemData, error: itemError } = await supabase
      .from("client_onboarding_items")
      .select("id, client_id")
      .eq("id", itemId)
      .single();
    const item = itemData as { id: string; client_id: string } | null;
    if (itemError || !item || item.client_id !== client.id) {
      return { ok: false, error: "Item não encontrado." };
    }

    const metadata = {
      login: (payload.login ?? "").trim(),
      password: (payload.password ?? "").trim(),
      two_factor: Boolean(payload.twoFactor),
    };

    const { error: updateError } = await supabase
      .from("client_onboarding_items")
      .update({ completed: true, metadata } as never)
      .eq("id", itemId);
    if (updateError) return { ok: false, error: updateError.message };
    revalidatePath(`/portal/${clientSlug}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Erro ao salvar. Tente novamente." };
  }
}
