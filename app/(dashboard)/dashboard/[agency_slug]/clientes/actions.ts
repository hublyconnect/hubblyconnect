"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/** Senha inicial para novos clientes. Configure DEFAULT_CLIENT_PASSWORD no .env em produção. */
const DEFAULT_PASSWORD = process.env.DEFAULT_CLIENT_PASSWORD ?? "12345678";

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

async function ensureUniqueSlug(
  admin: ReturnType<typeof createAdminClient>,
  baseSlug: string,
  _agencyId: string,
  excludeClientId?: string
): Promise<string> {
  const slug = baseSlug || "cliente";
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    let query = admin.from("clients").select("id").eq("slug", candidate);
    if (excludeClientId) query = query.neq("id", excludeClientId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    suffix++;
  }
}

export type CreateClientResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function createClientAction(
  _agencySlug: string,
  formData: FormData
): Promise<CreateClientResult> {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const whatsapp = (formData.get("whatsapp") as string)?.trim() || null;
  const instagram = (formData.get("instagram") as string)?.trim() || null;
  const niche = (formData.get("niche") as string)?.trim() || null;

  if (!name || !email) {
    return { ok: false, error: "Nome e e-mail são obrigatórios." };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { ok: false, error: "E-mail inválido." };
  }

  const serverSupabase = await createServerSupabaseClient();
  const {
    data: { user: currentUser },
  } = await serverSupabase.auth.getUser();
  if (!currentUser) {
    return { ok: false, error: "Não autenticado." };
  }

  const { data: profile } = await serverSupabase
    .from("profiles")
    .select("agency_id, role")
    .eq("id", currentUser.id)
    .single();
  if (!profile || profile.role !== "admin") {
    return { ok: false, error: "Apenas administradores podem cadastrar clientes." };
  }
  const agencyId = profile.agency_id;

  const admin = createAdminClient();

  const {
    data: { user: newUser },
    error: authError,
  } = await admin.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
  });
  if (authError) {
    if (authError.message.includes("already been registered")) {
      return { ok: false, error: "Já existe um usuário com este e-mail." };
    }
    return { ok: false, error: authError.message };
  }
  if (!newUser?.id) {
    return { ok: false, error: "Falha ao criar usuário." };
  }

  const baseSlug = slugify(name);
  const slug = await ensureUniqueSlug(admin, baseSlug, agencyId);

  const { data: newClient, error: clientError } = await admin
    .from("clients")
    .insert({
      agency_id: agencyId,
      name,
      slug,
      niche: niche || null,
      contact_email: email,
      instagram_url: instagram || null,
      whatsapp: whatsapp || null,
      status: "active",
    })
    .select("id")
    .single();
  if (clientError || !newClient?.id) {
    await admin.auth.admin.deleteUser(newUser.id);
    return {
      ok: false,
      error: clientError?.message ?? "Falha ao criar registro do cliente.",
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: newUser.id,
    agency_id: agencyId,
    role: "member",
    full_name: name,
    client_id: newClient.id,
    whatsapp_number: whatsapp || null,
  });
  if (profileError) {
    await admin.from("clients").delete().eq("id", newClient.id);
    await admin.auth.admin.deleteUser(newUser.id);
    return {
      ok: false,
      error: profileError.message ?? "Falha ao criar perfil do cliente.",
    };
  }

  revalidatePath(`/dashboard/${_agencySlug}/clientes`);
  return {
    ok: true,
    message: `Cliente "${name}" cadastrado. Acesso: ${email} / senha padrão 12345678`,
  };
}

export type UpdateClientResult = { ok: true } | { ok: false; error: string };

export async function updateClientAction(
  agencySlug: string,
  clientId: string,
  formData: FormData
): Promise<UpdateClientResult> {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await serverSupabase.from("profiles").select("agency_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { ok: false, error: "Sem permissão." };

  const name = (formData.get("name") as string)?.trim();
  const contact_email = (formData.get("contact_email") as string)?.trim().toLowerCase() || null;
  const niche = (formData.get("niche") as string)?.trim() || null;
  const instagram_url = (formData.get("instagram_url") as string)?.trim() || null;
  const whatsapp = (formData.get("whatsapp") as string)?.trim() || null;
  if (!name) return { ok: false, error: "Nome é obrigatório." };

  const { error } = await serverSupabase
    .from("clients")
    .update({
      name,
      contact_email,
      niche,
      instagram_url,
      whatsapp,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId)
    .eq("agency_id", profile.agency_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/${agencySlug}/clientes`);
  return { ok: true };
}

export async function updateClientStatusAction(
  agencySlug: string,
  clientId: string,
  status: "active" | "inactive" | "churned"
): Promise<UpdateClientResult> {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await serverSupabase.from("profiles").select("agency_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { ok: false, error: "Sem permissão." };

  const { error } = await serverSupabase
    .from("clients")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", clientId)
    .eq("agency_id", profile.agency_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/${agencySlug}/clientes`);
  return { ok: true };
}

export async function deleteClientAction(
  agencySlug: string,
  clientId: string
): Promise<UpdateClientResult> {
  const serverSupabase = await createServerSupabaseClient();
  const { data: { user } } = await serverSupabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };
  const { data: profile } = await serverSupabase.from("profiles").select("agency_id, role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") return { ok: false, error: "Sem permissão." };

  const admin = createAdminClient();

  const { data: linkedProfiles } = await admin
    .from("profiles")
    .select("id")
    .eq("client_id", clientId)
    .eq("agency_id", profile.agency_id);

  for (const p of linkedProfiles ?? []) {
    try {
      await admin.auth.admin.deleteUser(p.id);
    } catch {
      // Ignora se o usuário já não existir
    }
  }

  const { error } = await admin
    .from("clients")
    .delete()
    .eq("id", clientId)
    .eq("agency_id", profile.agency_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/${agencySlug}/clientes`);
  return { ok: true };
}
