"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

const BUCKET_LOGOS = "agency-logos";
const BUCKET_BOT_AVATARS = "bot-avatars";
/** Senha inicial para novos membros. Configure DEFAULT_CLIENT_PASSWORD no .env em produção. */
const DEFAULT_PASSWORD = process.env.DEFAULT_CLIENT_PASSWORD ?? "12345678";
const META_API_VERSION = "v21.0";

export type UpdateAgencyResult = { ok: true } | { ok: false; error: string };

export type UpdateWhatsAppProfileResult = { ok: true; avatarUrl?: string } | { ok: false; error: string };

export async function updateAgencyAction(
  agencySlug: string,
  formData: FormData
): Promise<UpdateAgencyResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await supabase.from("profiles").select("agency_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { ok: false, error: "Sem permissão." };

  const name = (formData.get("name") as string)?.trim();
  const slug = (formData.get("slug") as string)?.trim().toLowerCase().replace(/\s+/g, "-");
  let logo_url = (formData.get("logo_url") as string)?.trim() || null;
  const logoFile = formData.get("logo") as File | null;
  if (logoFile?.size && logoFile.size > 0) {
    const supabaseAdmin = createAdminClient();
    const ext = logoFile.name.split(".").pop() || "png";
    const path = `${profile.agency_id}/${Date.now()}.${ext}`;
    const { data: up, error: upErr } = await supabaseAdmin.storage
      .from(BUCKET_LOGOS)
      .upload(path, logoFile, { upsert: true });
    if (!upErr && up?.path) {
      const { data: urlData } = supabaseAdmin.storage.from(BUCKET_LOGOS).getPublicUrl(up.path);
      logo_url = urlData?.publicUrl ?? null;
    }
  }
  if (!name || !slug) return { ok: false, error: "Nome e slug são obrigatórios." };

  const { error } = await supabase
    .from("agencies")
    .update({ name, slug, logo_url, updated_at: new Date().toISOString() })
    .eq("id", profile.agency_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/${agencySlug}/configuracoes`);
  revalidatePath(`/dashboard/${agencySlug}`);
  return { ok: true };
}

export async function inviteMemberAction(
  agencySlug: string,
  formData: FormData
): Promise<UpdateAgencyResult> {
  const name = (formData.get("full_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const roleInput = (formData.get("role") as string) || "member";
  const role = roleInput === "admin" ? "admin" : "member";

  if (!name || !email) return { ok: false, error: "Nome e e-mail são obrigatórios." };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { ok: false, error: "E-mail inválido." };

  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await serverSupabase.from("profiles").select("agency_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { ok: false, error: "Apenas admins podem convidar." };

  const admin = createAdminClient();
  const { data: createData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
  });
  if (authError) {
    if (authError.message.includes("already been registered")) return { ok: false, error: "E-mail já cadastrado." };
    return { ok: false, error: authError.message };
  }
  const newUser = createData?.user;
  if (!newUser) return { ok: false, error: "Falha ao criar usuário." };

  const profilePayload = {
    id: newUser.id,
    agency_id: profile.agency_id,
    role,
    full_name: name,
  };
  const { error: profileError } = await admin
    .from("profiles")
    .insert(profilePayload as never);
  if (profileError) {
    await admin.auth.admin.deleteUser(newUser.id);
    return { ok: false, error: profileError.message };
  }
  revalidatePath(`/dashboard/${agencySlug}/configuracoes`);
  return { ok: true };
}

/** Merge client metadata.whatsapp with new fields. Preserves access_token and other existing keys. */
function mergeWhatsAppMetadata(
  current: Record<string, unknown> | null,
  updates: Partial<{ display_name: string; about: string; profile_picture_url: string }>
): Record<string, unknown> {
  const base = (current && typeof current === "object" ? { ...current } : {}) as Record<string, unknown>;
  if (updates.display_name !== undefined) base.display_name = updates.display_name;
  if (updates.about !== undefined) base.about = updates.about;
  if (updates.profile_picture_url !== undefined) base.profile_picture_url = updates.profile_picture_url;
  return base;
}

export async function updateWhatsAppProfileAction(
  agencySlug: string,
  clientId: string,
  formData: FormData
): Promise<UpdateWhatsAppProfileResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await supabase.from("profiles").select("agency_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { ok: false, error: "Sem permissão." };

  const { data: client } = await supabase
    .from("clients")
    .select("id, agency_id, metadata")
    .eq("id", clientId)
    .single();
  if (!client || client.agency_id !== profile.agency_id) return { ok: false, error: "Cliente não encontrado." };

  const display_name = (formData.get("display_name") as string)?.trim() ?? "";
  const about = (formData.get("about") as string)?.trim() ?? "";
  const logoFile = formData.get("avatar") as File | null;
  let profile_picture_url: string | undefined;

  if (logoFile?.size && logoFile.size > 0) {
    const admin = createAdminClient();
    const ext = logoFile.name.split(".").pop() || "png";
    const path = `${profile.agency_id}/${clientId}/${Date.now()}.${ext}`;
    const { data: up, error: upErr } = await admin.storage
      .from(BUCKET_BOT_AVATARS)
      .upload(path, logoFile, { upsert: true });
    if (upErr) return { ok: false, error: upErr.message };
    if (up?.path) {
      const { data: urlData } = admin.storage.from(BUCKET_BOT_AVATARS).getPublicUrl(up.path);
      profile_picture_url = urlData?.publicUrl ?? undefined;
    }
  }

  const metadata = (client.metadata ?? {}) as Record<string, unknown>;
  const whatsapp = mergeWhatsAppMetadata(
    (metadata.whatsapp ?? {}) as Record<string, unknown>,
    { display_name, about, ...(profile_picture_url && { profile_picture_url }) }
  );
  const newMetadata = { ...metadata, whatsapp };

  const { error } = await supabase
    .from("clients")
    .update({ metadata: newMetadata, updated_at: new Date().toISOString() })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/${agencySlug}/configuracoes`);
  return { ok: true, avatarUrl: profile_picture_url };
}

export async function syncWhatsAppWithMetaAction(
  agencySlug: string,
  clientId: string
): Promise<UpdateAgencyResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await supabase.from("profiles").select("agency_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { ok: false, error: "Sem permissão." };

  const { data: client } = await supabase
    .from("clients")
    .select("id, agency_id, whatsapp_business_phone_id, metadata")
    .eq("id", clientId)
    .single();
  if (!client || client.agency_id !== profile.agency_id) return { ok: false, error: "Cliente não encontrado." };
  const phoneId = client.whatsapp_business_phone_id;
  if (!phoneId) return { ok: false, error: "Este cliente não possui WhatsApp Business conectado." };

  const metadata = (client.metadata ?? {}) as Record<string, unknown>;
  const whatsapp = (metadata.whatsapp ?? {}) as Record<string, unknown>;
  const accessToken = (whatsapp.access_token ?? (metadata.facebook_ads as Record<string, unknown>)?.access_token) as string | undefined;
  if (!accessToken) return { ok: false, error: "Token de acesso não encontrado. Conecte o WhatsApp Business ou Facebook Ads." };

  const about = (whatsapp.about as string)?.trim();
  const business_description = (whatsapp.display_name as string)?.trim() || (whatsapp.business_description as string)?.trim();
  const profile_picture_url = whatsapp.profile_picture_url as string | undefined;
  const baseUrl = `https://graph.facebook.com/${META_API_VERSION}/${phoneId}`;

  try {
    const profileUpdates: Record<string, string> = {};
    if (about) profileUpdates.about = about;
    if (business_description) profileUpdates.business_description = business_description;

    if (Object.keys(profileUpdates).length > 0) {
      const res = await fetch(`${baseUrl}/whatsapp_business_profile`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileUpdates),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, error: (err as { error?: { message?: string } })?.error?.message ?? res.statusText };
      }
    }

    if (profile_picture_url) {
      const imgRes = await fetch(profile_picture_url);
      if (imgRes.ok) {
        const blob = await imgRes.blob();
        const formData = new FormData();
        formData.append("file", blob, "profile.jpg");
        const picRes = await fetch(`${baseUrl}/profile_picture`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${accessToken}` },
          body: formData,
        });
        if (!picRes.ok) {
          const err = await picRes.json().catch(() => ({}));
          return { ok: false, error: `Foto: ${(err as { error?: { message?: string } })?.error?.message ?? picRes.statusText}` };
        }
      }
    }

    revalidatePath(`/dashboard/${agencySlug}/configuracoes`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao sincronizar com Meta." };
  }
}
