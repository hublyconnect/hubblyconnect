"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Client } from "@/lib/types/database";
import type { CalendarEvent } from "@/hooks/use-calendar-events";
import type { CreativeAsset } from "@/lib/types/database";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Busca cliente por slug (ou por id se clientSlug for UUID). Retorna null se não existir (para 404). */
export async function getClientBySlug(
  clientSlug: string
): Promise<Client | null> {
  const supabase = createAdminClient();
  const byId = UUID_REGEX.test(clientSlug);
  const { data, error } = byId
    ? await supabase.from("clients").select("*").eq("id", clientSlug).maybeSingle()
    : await supabase.from("clients").select("*").eq("slug", clientSlug).maybeSingle();
  if (error) return null;
  return data as Client | null;
}

/** Contagem de criativos aprovados, total e aguardando ajuste (Total - Approved). */
export async function getApprovedCreativesCount(
  clientId: string
): Promise<{ approved: number; total: number; pendingReview: number }> {
  const supabase = createAdminClient();
  const { count: total, error: totalErr } = await supabase
    .from("creative_assets")
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId);
  if (totalErr) return { approved: 0, total: 0, pendingReview: 0 };
  const { count: approved, error: approvedErr } = await supabase
    .from("creative_assets")
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("status", "approved");
  if (approvedErr) return { approved: 0, total: total ?? 0, pendingReview: total ?? 0 };
  const approvedCount = approved ?? 0;
  const totalCount = total ?? 0;
  const pendingReview = Math.max(0, totalCount - approvedCount);
  return { approved: approvedCount, total: totalCount, pendingReview };
}

/** Criativos aprovados do cliente, agrupados por demand_name (pasta). */
export async function getApprovedAssetsGroupedByDemand(
  clientId: string
): Promise<{ demandName: string | null; assets: CreativeAsset[] }[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("creative_assets")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error || !data?.length) return [];
  const byDemand = new Map<string | null, CreativeAsset[]>();
  for (const row of data as CreativeAsset[]) {
    const key = row.demand_name?.trim() || null;
    if (!byDemand.has(key)) byDemand.set(key, []);
    byDemand.get(key)!.push(row);
  }
  return Array.from(byDemand.entries()).map(([demandName, assets]) => ({
    demandName,
    assets,
  }));
}

/** Criativos pendentes de aprovação do cliente (status = pending). */
export async function getPendingAssetsForClient(
  clientId: string
): Promise<CreativeAsset[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("creative_assets")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as CreativeAsset[];
}

/** Todos os eventos futuros do calendário do cliente (Agenda). */
export async function getUpcomingEventsForClient(
  clientId: string
): Promise<CalendarEvent[]> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("client_id", clientId)
    .gte("starts_at", now)
    .order("starts_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as CalendarEvent[];
}

export type RevisionRequestedItem = {
  asset: CreativeAsset;
  lastClientComment: string | null;
};

/** Criativos em revisão (status = revision_requested) com último comentário do cliente. */
export async function getRevisionRequestedAssetsWithLastComment(
  clientId: string
): Promise<RevisionRequestedItem[]> {
  const supabase = createAdminClient();
  const { data: assets, error: assetsError } = await supabase
    .from("creative_assets")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "revision_requested")
    .order("updated_at", { ascending: false });
  if (assetsError || !assets?.length) return [];
  const assetIds = (assets as CreativeAsset[]).map((a) => a.id);
  const { data: comments } = await supabase
    .from("asset_comments")
    .select("asset_id, content")
    .in("asset_id", assetIds)
    .eq("sender_type", "client")
    .order("created_at", { ascending: false });
  const lastByAsset = new Map<string, string>();
  for (const c of comments ?? []) {
    const row = c as { asset_id: string; content: string };
    if (!lastByAsset.has(row.asset_id)) lastByAsset.set(row.asset_id, row.content);
  }
  return (assets as CreativeAsset[]).map((asset) => ({
    asset,
    lastClientComment: lastByAsset.get(asset.id) ?? null,
  }));
}

export type PortalOnboardingItem = {
  id: string;
  client_id: string;
  label: string;
  completed: boolean;
  sort_order: number;
};

/** Criativos que possuem comentários (para a aba Mensagens). */
export async function getCreativesWithCommentsForClient(
  clientId: string
): Promise<CreativeAsset[]> {
  const supabase = createAdminClient();
  const { data: clientAssets, error: caError } = await supabase
    .from("creative_assets")
    .select("id")
    .eq("client_id", clientId);
  if (caError || !clientAssets?.length) return [];
  const clientAssetIds = (clientAssets as { id: string }[]).map((a) => a.id);
  const { data: commentRows, error: commentsError } = await supabase
    .from("asset_comments")
    .select("asset_id")
    .in("asset_id", clientAssetIds);
  if (commentsError) return [];
  const idsWithComments = [...new Set((commentRows ?? []).map((r) => (r as { asset_id: string }).asset_id))];
  if (idsWithComments.length === 0) return [];
  const { data: assets, error } = await supabase
    .from("creative_assets")
    .select("*")
    .in("id", idsWithComments)
    .order("updated_at", { ascending: false });
  if (error) return [];
  return (assets ?? []) as CreativeAsset[];
}

/** Resposta da API Asaas para cobranças (campos relevantes). */
type AsaasPayment = {
  id: string;
  value: number;
  status: string;
  dueDate: string;
  paymentDate?: string | null;
};

type AsaasPaymentsResponse = {
  data?: AsaasPayment[];
  totalCount?: number;
};

export type AsaasFinancialData = {
  budgetUsed: number;
  nextBillingDate: string | null;
};

/**
 * Busca verba utilizada e próxima cobrança no Asaas.
 * - Verba: soma dos pagamentos RECEIVED/CONFIRMED do mês atual.
 * - Próxima cobrança: dueDate da próxima fatura PENDING.
 * Retorna null em caso de erro (fallback para dados do banco).
 */
export async function fetchAsaasFinancialData(
  asaasCustomerId: string
): Promise<AsaasFinancialData | null> {
  const apiKey = process.env.ASAAS_API_KEY;
  const apiUrl = process.env.ASAAS_API_URL ?? "https://api.asaas.com/v3";
  if (!apiKey) return null;

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const firstDay = `${y}-${m}-01`;
  const lastDay = new Date(y, today.getMonth() + 1, 0);
  const lastDayStr = `${y}-${m}-${String(lastDay.getDate()).padStart(2, "0")}`;
  const todayStr = today.toISOString().slice(0, 10);

  const asaasHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    access_token: apiKey,
    "User-Agent": "MyAgencyPortal/1.0",
  };

  try {
    let budgetUsed = 0;
    for (const status of ["RECEIVED", "CONFIRMED"]) {
      const url = `${apiUrl}/payments?customer=${encodeURIComponent(asaasCustomerId)}&status=${status}&paymentDate[ge]=${firstDay}&paymentDate[le]=${lastDayStr}`;
      const res = await fetch(url, {
        headers: asaasHeaders,
        next: { revalidate: 60 },
      });
      if (!res.ok) continue;
      const json = (await res.json()) as AsaasPaymentsResponse;
      const payments = json.data ?? [];
      for (const p of payments) {
        if (p.paymentDate) budgetUsed += Number(p.value) || 0;
      }
    }

    const pendingUrl = `${apiUrl}/payments?customer=${encodeURIComponent(asaasCustomerId)}&status=PENDING&dueDate[ge]=${todayStr}`;
    const pendingRes = await fetch(pendingUrl, {
      headers: asaasHeaders,
      next: { revalidate: 60 },
    });
    let nextBillingDate: string | null = null;
    if (pendingRes.ok) {
      const json = (await pendingRes.json()) as AsaasPaymentsResponse;
      const pendings = json.data ?? [];
      const dates = pendings.map((p) => p.dueDate).filter(Boolean) as string[];
      if (dates.length > 0) nextBillingDate = dates.sort()[0];
    }

    return { budgetUsed, nextBillingDate };
  } catch {
    return null;
  }
}

/** Itens de onboarding do cliente (Logo, Manual da Marca, etc.). Nunca retorna null. */
export async function getOnboardingItemsForClient(
  clientId: string
): Promise<PortalOnboardingItem[]> {
  if (!clientId?.trim()) return [];
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("client_onboarding_items")
      .select("id, client_id, title, completed, sort_order, created_at")
      .eq("client_id", clientId.trim())
      .order("sort_order", { ascending: true, nullsFirst: false });
    if (error) return [];
    const rows = (data ?? []) as { id: string; client_id: string; title?: string | null; completed?: boolean; sort_order?: number | null; created_at?: string | null }[];
    const items = rows.map((r) => ({
      id: r.id,
      client_id: r.client_id,
      label: r.title ?? "Item",
      completed: Boolean(r.completed),
      sort_order: r.sort_order ?? 0,
    }));
    return items ?? [];
  } catch {
    return [];
  }
}
