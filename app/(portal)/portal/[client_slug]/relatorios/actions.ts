"use server";

import { unstable_noStore } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GRAPH_VERSION = "v18.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type DateRangePreset = "today" | "7d" | "30d" | "month";

export type FacebookAdsReport = {
  dateRange: { start: string; end: string };
  summary: {
    spend: number;
    impressions: number;
    linkClicks: number;
    cpc: number;
    cpm: number;
    whatsappConversations: number;
    costPerConversation: number;
    ctr: number;
    conversionRate: number;
  };
  trend: { date: string; clicks: number; spend: number }[];
  campaigns: {
    id: string;
    name: string;
    status: "active" | "paused";
    spend: number;
    conversations: number;
    impressions: number;
    linkClicks: number;
    ctr: number;
    conversionRate: number;
  }[];
};

export type FacebookAdsReportResult =
  | { ok: true; data: FacebookAdsReport }
  | { ok: false; error: "not_connected"; message: string }
  | { ok: false; error: string; message: string };

type CampaignRow = {
  id: string;
  name: string;
  status: "active" | "paused";
  spend: number;
  conversations: number;
  impressions: number;
  linkClicks: number;
  ctr: number;
  conversionRate: number;
};

/** Meta date_preset to match Ads Manager (includes Today, uses account timezone) */
function getDatePreset(dateRange: DateRangePreset): string {
  if (dateRange === "today") return "today";
  if (dateRange === "7d") return "last_7d";
  if (dateRange === "30d") return "last_30d";
  if (dateRange === "month") return "this_month";
  return "last_7d";
}

/** Extract metric from actions array by action_type (substring match). Returns 0 if actions missing/invalid. */
function extractActionValue(
  actions: unknown,
  matchTypes: string[]
): number {
  if (!Array.isArray(actions)) return 0;
  let total = 0;
  for (const a of actions) {
    const obj = a as { action_type?: string; value?: string };
    const type = (obj.action_type ?? "").toLowerCase();
    if (matchTypes.some((t) => type.includes(t))) {
      total += parseInt(String(obj.value ?? "0"), 10) || 0;
    }
  }
  return total;
}

/** Extract metric by EXACT action_type match only. No fallbacks. Returns 0 if not found. */
function extractActionExact(actions: unknown, exactType: string): number {
  if (!Array.isArray(actions)) return 0;
  const want = exactType.toLowerCase();
  let total = 0;
  for (const a of actions) {
    const obj = a as { action_type?: string; value?: string };
    const type = (obj.action_type ?? "").toLowerCase();
    if (type === want) {
      total += parseInt(String(obj.value ?? "0"), 10) || 0;
    }
  }
  return total;
}

/** Sum all actions matching exact types (e.g. onsite_conversion.post_save) */
function extractActionExactMulti(actions: unknown, exactTypes: string[]): number {
  if (!Array.isArray(actions)) return 0;
  const wantSet = new Set(exactTypes.map((t) => t.toLowerCase()));
  let total = 0;
  for (const a of actions) {
    const obj = a as { action_type?: string; value?: string };
    const type = (obj.action_type ?? "").toLowerCase();
    if (wantSet.has(type)) {
      total += parseInt(String(obj.value ?? "0"), 10) || 0;
    }
  }
  return total;
}

/** WhatsApp conversations: sum ALL conversation start types (7d, onsite_conversion, etc.) */
function extractWhatsAppConversations(actions: unknown): number {
  return extractActionValue(actions, ["messaging_conversation_started"]);
}

/** Extract CPA from cost_per_action_type or cost_per_unique_action_type. Meta uses "Estimated Spend" for conversions. */
function extractCostPerConversation(
  costPerActionType: unknown,
  costPerUniqueActionType: unknown,
  fallbackSpend: number,
  fallbackConversations: number
): number {
  const fallback =
    fallbackConversations > 0
      ? Math.round((fallbackSpend / fallbackConversations) * 100) / 100
      : 0;

  const extract = (arr: unknown): number | null => {
    if (!Array.isArray(arr)) return null;
    for (const c of arr) {
      const obj = c as { action_type?: string; value?: string };
      const type = (obj.action_type ?? "").toLowerCase();
      if (type === "messaging_conversation_started_7d" || type === "onsite_conversion.messaging_conversation_started_7d") {
        const v = parseFloatSafe(obj.value);
        if (Number.isFinite(v) && v > 0) return Math.round(v * 100) / 100;
      }
    }
    for (const c of arr) {
      const obj = c as { action_type?: string; value?: string };
      const type = (obj.action_type ?? "").toLowerCase();
      if (type.includes("messaging_conversation_started")) {
        const v = parseFloatSafe(obj.value);
        if (Number.isFinite(v) && v > 0) return Math.round(v * 100) / 100;
      }
    }
    return null;
  };

  const fromUnique = extract(costPerUniqueActionType);
  if (fromUnique != null) return fromUnique;
  const fromRegular = extract(costPerActionType);
  if (fromRegular != null) return fromRegular;
  return fallback;
}

function parseFloatSafe(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === "string" ? parseFloat(val) : Number(val);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Fetches real Facebook Ads report for the client.
 * Uses clients.metadata->facebook_ads (ad_account_id, access_token).
 */
export async function getFacebookAdsReportAction(
  clientSlug: string,
  dateRange: DateRangePreset
): Promise<FacebookAdsReportResult> {
  unstable_noStore();
  try {
    const supabase = createAdminClient();

    // 1. Get client by slug or id, fetch metadata
    const byId = UUID_REGEX.test(clientSlug);
    const clientQuery = byId
      ? supabase.from("clients").select("metadata").eq("id", clientSlug)
      : supabase.from("clients").select("metadata").eq("slug", clientSlug);
    const { data: client, error: clientError } = await clientQuery.maybeSingle();

    if (clientError || !client) {
      return { ok: false, error: "client_not_found", message: "Cliente não encontrado." };
    }

    const metadata = (client.metadata ?? {}) as Record<string, unknown>;
    const facebookAds = (metadata.facebook_ads ?? {}) as Record<string, unknown>;
    const adAccountId = String(facebookAds.ad_account_id ?? "").trim();
    const token = String(facebookAds.access_token ?? "").trim();

    if (!adAccountId || !token) {
      return {
        ok: false,
        error: "not_connected",
        message: "Facebook Ads não conectado para este cliente.",
      };
    }

    const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
    const datePreset = getDatePreset(dateRange);

    // 4. Fetch account-level insights (daily breakdown)
    // date_preset matches Ads Manager (includes Today, account timezone)
    // use_unified_attribution_setting=true aligns with Ads Manager attribution
    const insightsUrl = new URL(`${GRAPH_BASE}/${actId}/insights`);
    insightsUrl.searchParams.set("access_token", token);
    insightsUrl.searchParams.set("date_preset", datePreset);
    insightsUrl.searchParams.set("time_increment", "1");
    insightsUrl.searchParams.set("use_unified_attribution_setting", "true");
    insightsUrl.searchParams.set(
      "fields",
      "date_start,date_stop,spend,impressions,inline_link_clicks,actions,cost_per_action_type"
    );

    const insightsRes = await fetch(insightsUrl.toString(), { cache: "no-store" });
    const insightsJson = await insightsRes.json().catch(() => ({}));

    if (insightsJson.error) {
      const errMsg = insightsJson.error.message ?? "Erro na API do Facebook.";
      return { ok: false, error: "api_error", message: errMsg };
    }

    const insightRows = Array.isArray(insightsJson.data) ? insightsJson.data : [];

    // Aggregated row for Meta's native cost_per_action_type and cost_per_unique_action_type (Estimated Spend)
    const aggUrl = new URL(`${GRAPH_BASE}/${actId}/insights`);
    aggUrl.searchParams.set("access_token", token);
    aggUrl.searchParams.set("date_preset", datePreset);
    aggUrl.searchParams.set("use_unified_attribution_setting", "true");
    aggUrl.searchParams.set(
      "fields",
      "date_start,date_stop,spend,impressions,inline_link_clicks,actions,cost_per_action_type,cost_per_unique_action_type"
    );
    const aggRes = await fetch(aggUrl.toString(), { cache: "no-store" });
    const aggJson = await aggRes.json().catch(() => ({}));
    const aggRows = Array.isArray(aggJson?.data) ? aggJson.data : [];
    const aggRow = aggRows[0] as Record<string, unknown> | undefined;

    const trend: { date: string; clicks: number; spend: number }[] = insightRows.map(
      (row: Record<string, unknown>) => {
        const dateStr = (row.date_start ?? "") as string;
        return {
          date: dateStr,
          clicks: parseInt(String(row.inline_link_clicks ?? 0), 10) || 0,
          spend: parseFloatSafe(row.spend),
        };
      }
    );

    const totalSpend = trend.reduce((s, t) => s + t.spend, 0);
    const totalClicks = trend.reduce((s, t) => s + t.clicks, 0);
    const totalImpressions = insightRows.reduce(
      (s: number, r: Record<string, unknown>) => s + (parseInt(String(r.impressions ?? 0), 10) || 0),
      0
    );
    const totalWhatsAppConversations = insightRows.reduce(
      (s: number, r: Record<string, unknown>) => s + extractWhatsAppConversations(r.actions),
      0
    );

    // CPC = Spend / Clicks
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

    // CPM = (Spend / Impressions) * 1000
    const cpm =
      totalImpressions > 0
        ? Math.round((totalSpend / totalImpressions) * 1000 * 100) / 100
        : 0;

    // 5. Identify messaging campaigns (objective MESSAGES or optimization_goal CONVERSATIONS)
    const messagingCampaignIds = new Set<string>();
    const campaignIdToStatus = new Map<string, "active" | "paused">();
    try {
      const campsUrl = new URL(`${GRAPH_BASE}/${actId}/campaigns`);
      campsUrl.searchParams.set("access_token", token);
      campsUrl.searchParams.set("fields", "id,status,objective");
      campsUrl.searchParams.set("limit", "500");
      const campsRes = await fetch(campsUrl.toString(), { cache: "no-store" });
      const campsData = await campsRes.json().catch(() => ({}));
      const camps = Array.isArray(campsData?.data) ? campsData.data : [];
      for (const c of camps) {
        const cid = String(c.id ?? "");
        const status = String(c.status ?? "ACTIVE").toUpperCase();
        campaignIdToStatus.set(cid, status === "ACTIVE" ? "active" : "paused");
        const obj = String(c.objective ?? "").toUpperCase();
        if (obj.includes("MESSAGE") || obj.includes("CONVERSATION")) {
          messagingCampaignIds.add(cid);
        }
      }
      const adsetsUrl = new URL(`${GRAPH_BASE}/${actId}/adsets`);
      adsetsUrl.searchParams.set("access_token", token);
      adsetsUrl.searchParams.set("fields", "campaign_id,optimization_goal");
      adsetsUrl.searchParams.set("limit", "500");
      const adsetsRes = await fetch(adsetsUrl.toString(), { cache: "no-store" });
      const adsetsData = await adsetsRes.json().catch(() => ({}));
      const adsets = Array.isArray(adsetsData?.data) ? adsetsData.data : [];
      for (const a of adsets) {
        const goal = String(a.optimization_goal ?? "").toUpperCase();
        if (goal === "CONVERSATIONS" || goal.includes("MESSAGE")) {
          messagingCampaignIds.add(String(a.campaign_id ?? ""));
        }
      }
    } catch {
      // Fallback: campaigns with conversations treated as messaging when no classification
    }

    // 6. Fetch campaign-level insights (standard actions array, no action_breakdowns)
    const filteringAll = JSON.stringify([
      {
        field: "campaign.effective_status",
        operator: "IN",
        value: ["ACTIVE", "PAUSED", "ARCHIVED", "DELETED"],
      },
    ]);
    const campaignsUrl = new URL(`${GRAPH_BASE}/${actId}/insights`);
    campaignsUrl.searchParams.set("access_token", token);
    campaignsUrl.searchParams.set("date_preset", datePreset);
    campaignsUrl.searchParams.set("use_unified_attribution_setting", "true");
    campaignsUrl.searchParams.set("level", "campaign");
    campaignsUrl.searchParams.set("filtering", filteringAll);
    campaignsUrl.searchParams.set(
      "fields",
      "campaign_id,campaign_name,spend,impressions,inline_link_clicks,actions"
    );

    const campaignsRes = await fetch(campaignsUrl.toString(), { cache: "no-store" });
    const campaignsJson = await campaignsRes.json().catch(() => ({}));

    const campaignRows = (Array.isArray(campaignsJson?.data) ? campaignsJson.data : []) as Array<{
      campaign_id?: string;
      campaign_name?: string;
      spend?: unknown;
      impressions?: unknown;
      inline_link_clicks?: unknown;
      actions?: unknown;
    }>;

    const ctr =
      totalImpressions > 0
        ? Math.round((totalClicks / totalImpressions) * 10000) / 100
        : 0;
    const conversionRate =
      totalClicks > 0
        ? Math.round((totalWhatsAppConversations / totalClicks) * 10000) / 100
        : 0;

    let messagingSpend = 0;
    let messagingConversations = 0;
    const campaigns: CampaignRow[] = campaignRows.map((row) => {
      const id = String(row.campaign_id ?? "");
      const actions = row.actions;
      const spend = parseFloatSafe(row.spend);
      const impressions = parseInt(String(row.impressions ?? 0), 10) || 0;
      const clicks = parseInt(String(row.inline_link_clicks ?? 0), 10) || 0;
      const convs = extractWhatsAppConversations(actions);

      const campCtr =
        impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
      const campConversionRate =
        clicks > 0 ? Math.round((convs / clicks) * 10000) / 100 : 0;

      if (messagingCampaignIds.has(id) || (messagingCampaignIds.size === 0 && convs > 0)) {
        messagingSpend += spend;
        messagingConversations += convs;
      }

      return {
        id: id || `c-${Date.now().toString(36)}`,
        name: (row.campaign_name ?? "Sem nome") as string,
        status: (campaignIdToStatus.get(id) ?? "active") as "active" | "paused",
        spend,
        conversations: convs,
        impressions,
        linkClicks: clicks,
        ctr: campCtr,
        conversionRate: campConversionRate,
      };
    });

    // Isolated CPA: messaging spend / messaging conversations (fallback to Meta native or account-level)
    let costPerConversation = 0;
    if (messagingConversations > 0 && messagingSpend > 0) {
      costPerConversation = Math.round((messagingSpend / messagingConversations) * 100) / 100;
    } else if (aggRow) {
      costPerConversation = extractCostPerConversation(
        aggRow.cost_per_action_type,
        aggRow.cost_per_unique_action_type,
        totalSpend,
        totalWhatsAppConversations
      );
    } else if (totalWhatsAppConversations > 0) {
      costPerConversation = Math.round((totalSpend / totalWhatsAppConversations) * 100) / 100;
    }

    // Extract date range from API response; fallback from preset if empty
    let dateStart =
      (aggRow?.date_start as string) ??
      (insightRows[0] as Record<string, unknown> | undefined)?.date_start ??
      "";
    let dateEnd =
      (aggRow?.date_stop as string) ??
      (insightRows[insightRows.length - 1] as Record<string, unknown> | undefined)?.date_stop ??
      "";
    if (!dateStart || !dateEnd) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const today = `${y}-${m}-${d}`;
      if (dateRange === "today") {
        dateStart = dateEnd = today;
      } else if (dateRange === "7d") {
        const past = new Date(now);
        past.setDate(past.getDate() - 6);
        dateStart = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}-${String(past.getDate()).padStart(2, "0")}`;
        dateEnd = today;
      } else if (dateRange === "30d") {
        const past = new Date(now);
        past.setDate(past.getDate() - 29);
        dateStart = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}-${String(past.getDate()).padStart(2, "0")}`;
        dateEnd = today;
      } else if (dateRange === "month") {
        dateStart = `${y}-${m}-01`;
        dateEnd = today;
      }
    }

    const report: FacebookAdsReport = {
      dateRange: { start: String(dateStart), end: String(dateEnd) },
      summary: {
        spend: Math.round(totalSpend * 100) / 100,
        impressions: totalImpressions,
        linkClicks: totalClicks,
        cpc: Math.round(cpc * 100) / 100,
        cpm,
        whatsappConversations: totalWhatsAppConversations,
        costPerConversation,
        ctr,
        conversionRate,
      },
      trend: trend.sort((a, b) => a.date.localeCompare(b.date)),
      campaigns: campaigns
        .filter((c: CampaignRow) => !!c.name)
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 20),
    };

    return { ok: true, data: report };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao buscar relatórios.";
    return { ok: false, error: "api_error", message: msg };
  }
}
