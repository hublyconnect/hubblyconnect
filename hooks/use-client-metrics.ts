"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ClientMetricsSummary } from "@/lib/types/database";

const QUERY_KEY = "client-metrics";

export function useClientMetrics(clientId: string | null, days = 30) {
  const supabase = createClient();
  return useQuery({
    queryKey: [QUERY_KEY, clientId, days],
    queryFn: async (): Promise<ClientMetricsSummary & { series: Array<{ date: string; ctr: number | null; cpc: number | null; leads: number; impressions: number; clicks: number; spend: number }> }> => {
      if (!clientId) {
        return {
          ctr: null,
          cpc: null,
          leads: 0,
          impressions: 0,
          clicks: 0,
          spend: 0,
          series: [],
        };
      }
      const from = new Date();
      from.setDate(from.getDate() - days);
      const fromStr = from.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("client_metrics")
        .select("date, ctr, cpc, leads, impressions, clicks, spend")
        .eq("client_id", clientId)
        .gte("date", fromStr)
        .order("date", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        date: string;
        ctr: number | null;
        cpc: number | null;
        leads: number;
        impressions: number;
        clicks: number;
        spend: number;
      }>;
      const ctr =
        rows.length > 0
          ? rows.reduce((s, r) => s + (r.ctr ?? 0), 0) / rows.filter((r) => r.ctr != null).length || null
          : null;
      const cpc =
        rows.length > 0
          ? rows.reduce((s, r) => s + (r.cpc ?? 0), 0) / rows.filter((r) => r.cpc != null).length || null
          : null;
      const leads = rows.reduce((s, r) => s + r.leads, 0);
      const impressions = rows.reduce((s, r) => s + r.impressions, 0);
      const clicks = rows.reduce((s, r) => s + r.clicks, 0);
      const spend = rows.reduce((s, r) => s + Number(r.spend), 0);
      return {
        ctr: Number.isFinite(ctr) ? ctr : null,
        cpc: Number.isFinite(cpc) ? cpc : null,
        leads,
        impressions,
        clicks,
        spend,
        series: rows.map((r) => ({
          date: r.date,
          ctr: r.ctr,
          cpc: r.cpc,
          leads: r.leads,
          impressions: r.impressions,
          clicks: r.clicks,
          spend: Number(r.spend),
        })),
      };
    },
    enabled: !!clientId,
  });
}
