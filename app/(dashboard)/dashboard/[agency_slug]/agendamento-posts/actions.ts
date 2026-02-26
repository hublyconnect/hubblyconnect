"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const BUCKET = "portal-files";
const FOLDER = "post-scheduling";
const META_GRAPH_BASE = "https://graph.facebook.com/v18.0";

export type InstagramProfileAudit = {
  permissions: unknown;
  identity: unknown;
  accounts: unknown;
  businessPages?: unknown;
};

export type InstagramProfileResult =
  | { connected: true; username: string; name: string; profile_picture_url: string }
  | { connected: false; error?: string; noPages?: boolean; audit?: InstagramProfileAudit };

export type SchedulePostResult = { ok: true; id: string } | { ok: false; error: string };
export type DeleteScheduledPostResult = { ok: true } | { ok: false; error: string };

export async function schedulePostAction(
  agencySlug: string,
  formData: FormData
): Promise<SchedulePostResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await supabase.from("profiles").select("agency_id").eq("id", user.id).single();
  if (!profile?.agency_id) return { ok: false, error: "Sem permissão." };

  const clientId = formData.get("clientId") as string | null;
  const caption = (formData.get("caption") as string)?.trim() ?? "";
  const scheduledAt = formData.get("scheduledAt") as string | null;
  const isReels = formData.get("isReels") === "1";
  const file = formData.get("file") as File | null;

  if (!clientId || !scheduledAt) return { ok: false, error: "Cliente e data/hora são obrigatórios." };
  if (!file?.size) return { ok: false, error: "Selecione uma mídia (imagem ou vídeo)." };

  let mediaUrl: string;
  try {
    const admin = createAdminClient();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${FOLDER}/${profile.agency_id}/${clientId}/${Date.now()}.${ext}`;
    const { data: up, error: upErr } = await admin.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (upErr) return { ok: false, error: upErr.message };
    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(up!.path);
    mediaUrl = urlData.publicUrl;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao enviar mídia." };
  }

  const dados = {
    agency_id: profile.agency_id,
    client_id: clientId,
    media_url: mediaUrl,
    caption,
    scheduled_at: new Date(scheduledAt).toISOString(),
    is_reels: isReels,
    status: "scheduled",
  };
  console.log("Tentando salvar no banco:", dados);

  const { data: row, error } = await supabase
    .from("post_scheduling")
    .insert(dados)
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao salvar:", error);
    return { ok: false, error: error.message };
  }
  console.log("Salvo com sucesso!");
  revalidatePath(`/dashboard/${agencySlug}/agendamento-posts`, "page");
  revalidatePath(`/dashboard/${agencySlug}`, "layout");
  return { ok: true, id: row.id };
}

export async function deleteScheduledPostAction(
  agencySlug: string,
  postId: string
): Promise<DeleteScheduledPostResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { error } = await supabase.from("post_scheduling").delete().eq("id", postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/${agencySlug}/agendamento-posts`);
  revalidatePath(`/dashboard/${agencySlug}`);
  return { ok: true };
}

type AgencyRow = { id: string };
type IntegrationRow = { access_token: string; token_expires_at: string | null };

export async function getInstagramProfileAction(
  agencySlug: string
): Promise<InstagramProfileResult> {
  try {
    const admin = createAdminClient();
    const { data: agency, error: agencyError } = await admin
      .from("agencies")
      .select("id")
      .eq("slug", agencySlug)
      .single();
    const agencyRow = agency as AgencyRow | null;
    if (agencyError || !agencyRow?.id) {
      console.error("[getInstagramProfileAction] Agência não encontrada.", {
        slug: agencySlug,
        error: agencyError?.message,
      });
      return { connected: false };
    }

    const { data: integration, error: intError } = await admin
      .from("agency_integrations")
      .select("access_token, token_expires_at")
      .eq("agency_id", agencyRow.id)
      .eq("provider", "instagram")
      .maybeSingle();
    const intRow = integration as IntegrationRow | null;
    if (intError || !intRow?.access_token) {
      console.error("[getInstagramProfileAction] Integração ou token não encontrado.", {
        agencyId: agencyRow.id,
        error: intError?.message,
      });
      return { connected: false };
    }
    if (
      intRow.token_expires_at &&
      new Date(intRow.token_expires_at) <= new Date()
    ) {
      console.error("[getInstagramProfileAction] Token expirado.", {
        expiresAt: intRow.token_expires_at,
      });
      return { connected: false };
    }

    const token = intRow.access_token;
    const tokenParam = encodeURIComponent(token);
    const graphV19 = "https://graph.facebook.com/v19.0";

    type IgAccount = { id: string; username?: string; name?: string; profile_picture_url?: string };
    const toProfile = (ig: IgAccount): InstagramProfileResult =>
      ig.username
        ? {
            connected: true,
            username: ig.username,
            name: ig.name ?? ig.username,
            profile_picture_url: ig.profile_picture_url ?? "",
          }
        : { connected: false, error: "NO_IG_ON_PAGES" };

    const accountsUrl = `${graphV19}/me/accounts?fields=name,id,tasks,is_published,instagram_business_account{id,username,name,profile_picture_url}&limit=100&access_token=${tokenParam}`;
    const accountsRes = await fetch(accountsUrl);
    const accountsJson = (await accountsRes.json()) as {
      data?: Array<{ instagram_business_account?: IgAccount }>;
      error?: { message?: string };
    };

    if (!accountsRes.ok || accountsJson.error) {
      console.error("[getInstagramProfileAction] me/accounts falhou.", accountsJson.error?.message);
      return { connected: false };
    }

    const pages = Array.isArray(accountsJson.data) ? accountsJson.data : [];
    for (const page of pages) {
      const ig = page.instagram_business_account;
      if (ig?.username) return toProfile(ig);
    }

    if (pages.length === 0) {
      const businessesUrl = `${graphV19}/me/businesses?fields=id,name,owned_pages{id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}}&access_token=${tokenParam}`;
      const businessesRes = await fetch(businessesUrl);
      const businessesJson = (await businessesRes.json()) as {
        data?: Array<{
          owned_pages?: { data?: Array<{ instagram_business_account?: IgAccount }> };
        }>;
        error?: { message?: string };
      };

      if (!businessesRes.ok || businessesJson.error) {
        console.error("[getInstagramProfileAction] me/accounts vazio e me/businesses falhou.", businessesJson.error?.message);
        return { connected: false, error: "EMPTY_PAGES" };
      }

      const businesses = Array.isArray(businessesJson.data) ? businessesJson.data : [];
      for (const business of businesses) {
        const ownedPages = business.owned_pages?.data;
        if (!Array.isArray(ownedPages)) continue;
        for (const page of ownedPages) {
          const ig = page.instagram_business_account;
          if (ig?.username) return toProfile(ig);
        }
      }

      console.error("[getInstagramProfileAction] Nenhuma página com Instagram (nem via BM).");
      return { connected: false, error: "EMPTY_PAGES" };
    }

    console.error("[getInstagramProfileAction] Páginas existem mas nenhuma tem Instagram Business.");
    return { connected: false, error: "NO_IG_ON_PAGES", noPages: false };
  } catch (err) {
    console.error("[getInstagramProfileAction] Erro inesperado.", err);
    return { connected: false };
  }
}

export type DisconnectInstagramResult = { ok: true } | { ok: false; error: string };

export async function disconnectInstagramAction(
  agencySlug: string
): Promise<DisconnectInstagramResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();
  if (!profile?.agency_id) return { ok: false, error: "Sem permissão." };

  const admin = createAdminClient();
  const { data: agency } = await admin
    .from("agencies")
    .select("id")
    .eq("slug", agencySlug)
    .single();
  const agencyRow = agency as AgencyRow | null;
  if (!agencyRow || agencyRow.id !== profile.agency_id)
    return { ok: false, error: "Sem permissão para esta agência." };

  const { error } = await admin
    .from("agency_integrations")
    .delete()
    .eq("agency_id", profile.agency_id)
    .eq("provider", "instagram");
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/${agencySlug}/agendamento-posts`);
  revalidatePath(`/dashboard/${agencySlug}`);
  return { ok: true };
}
