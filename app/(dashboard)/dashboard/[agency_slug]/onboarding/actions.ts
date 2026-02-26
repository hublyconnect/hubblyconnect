"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const DEFAULT_ITEMS = [
  { title: "Logotipo em alta resolução (Vetor/PNG)", sort_order: 0 },
  { title: "Acesso às Redes Sociais (Instagram/Facebook)", sort_order: 1 },
  { title: "Acesso ao Gerenciador de Anúncios (Meta/Google)", sort_order: 2 },
  { title: "Manual da Marca / Brandbook", sort_order: 3 },
  { title: "Acesso ao Site / WordPress / Plataforma", sort_order: 4 },
  { title: "Fotos da Fachada, Produtos ou Equipe", sort_order: 5 },
];

export type EnsureResult = { ok: true; count: number } | { ok: false; error: string };

export async function ensureOnboardingItemsAction(
  agencySlug: string,
  clientId: string
): Promise<EnsureResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: existing } = await supabase
    .from("client_onboarding_items")
    .select("id")
    .eq("client_id", clientId)
    .limit(1);
  if (existing && existing.length > 0) {
    return { ok: true, count: 0 };
  }
  const { data: inserted, error } = await supabase
    .from("client_onboarding_items")
    .insert(
      DEFAULT_ITEMS.map((item) => ({
        client_id: clientId,
        title: item.title,
        label: item.title, // compat: label NOT NULL em schemas antigos
        sort_order: item.sort_order,
      }))
    )
    .select("id");
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/${agencySlug}/onboarding`);
  return { ok: true, count: inserted?.length ?? 0 };
}

export type AddOnboardingItemResult = { ok: true; id: string } | { ok: false; error: string };
export type DeleteOnboardingItemResult = { ok: true } | { ok: false; error: string };

export async function addOnboardingItemAction(
  agencySlug: string,
  clientId: string,
  title: string
): Promise<AddOnboardingItemResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Título é obrigatório." };

  const { data: inserted, error } = await supabase
    .from("client_onboarding_items")
    .insert({ client_id: clientId, title: trimmed, label: trimmed }) // compat: label em schemas antigos
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/${agencySlug}/onboarding`);
  return { ok: true, id: inserted.id };
}

export async function deleteOnboardingItemAction(
  agencySlug: string,
  itemId: string
): Promise<DeleteOnboardingItemResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { error } = await supabase
    .from("client_onboarding_items")
    .delete()
    .eq("id", itemId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/${agencySlug}/onboarding`);
  return { ok: true };
}

export type OnboardingItemFromServer = {
  id: string;
  client_id: string;
  title: string;
  completed: boolean;
  updated_at: string;
  sort_order: number;
};

export type GetOnboardingItemsResult =
  | { ok: true; items: OnboardingItemFromServer[] }
  | { ok: false; error: string };

/** Busca itens de onboarding via servidor (evita Failed to fetch no cliente). */
export async function getOnboardingItemsAction(
  agencySlug: string,
  clientId: string
): Promise<GetOnboardingItemsResult> {
  if (!clientId?.trim()) return { ok: false, error: "client_id é obrigatório." };
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data, error } = await supabase
    .from("client_onboarding_items")
    .select("id, client_id, title, completed, sort_order, created_at")
    .eq("client_id", clientId.trim())
    .order("sort_order", { ascending: true, nullsFirst: false });

  if (error) return { ok: false, error: error.message };
  const items = (data ?? []).map((r) => {
    const row = r as { id: string; client_id: string; title?: string | null; completed?: boolean; sort_order?: number | null; created_at?: string };
    return {
      id: row.id,
      client_id: row.client_id,
      title: row.title ?? "",
      completed: row.completed ?? false,
      updated_at: row.created_at ?? new Date().toISOString(),
      sort_order: row.sort_order ?? 0,
    };
  });
  return { ok: true, items };
}

export type ToggleOnboardingItemResult = { ok: true } | { ok: false; error: string };

/** Marca/desmarca item de onboarding via servidor. */
export async function toggleOnboardingItemAction(
  agencySlug: string,
  itemId: string,
  completed: boolean
): Promise<ToggleOnboardingItemResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { error } = await supabase
    .from("client_onboarding_items")
    .update({ completed })
    .eq("id", itemId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/dashboard/${agencySlug}/onboarding`);
  return { ok: true };
}

export type ClientOnboardingProgress = {
  client_id: string;
  total: number;
  completed: number;
  pct: number;
};

export type GetOnboardingProgressBulkResult =
  | { ok: true; progress: ClientOnboardingProgress[] }
  | { ok: false; error: string };

/** Busca progresso de onboarding em lote via servidor. */
export async function getOnboardingProgressBulkAction(
  agencySlug: string,
  clientIds: string[]
): Promise<GetOnboardingProgressBulkResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  if (clientIds.length === 0) return { ok: true, progress: [] };

  const { data, error } = await supabase
    .from("client_onboarding_items")
    .select("client_id, completed")
    .in("client_id", clientIds);

  if (error) return { ok: false, error: error.message };

  const byClient = new Map<string, { total: number; completed: number }>();
  for (const id of clientIds) {
    byClient.set(id, { total: 0, completed: 0 });
  }
  for (const row of data ?? []) {
    const cur = byClient.get(row.client_id);
    if (cur) {
      cur.total += 1;
      if (row.completed) cur.completed += 1;
    }
  }
  const progress = Array.from(byClient.entries()).map(([client_id, { total, completed }]) => ({
    client_id,
    total,
    completed,
    pct: total > 0 ? Math.round((completed / total) * 100) : 0,
  }));

  return { ok: true, progress };
}
