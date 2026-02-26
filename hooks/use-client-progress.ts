"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type ClientProgress = { total: number; approved: number; pending: number; revisionRequested: number };

const QUERY_KEY = "client-progress";

export function useClientProgress(agencyId: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: [QUERY_KEY, agencyId],
    queryFn: async (): Promise<Record<string, ClientProgress>> => {
      if (!agencyId) return {};
      const { data: clients } = await supabase
        .from("clients")
        .select("id")
        .eq("agency_id", agencyId);
      const clientIds = (clients ?? []).map((c) => c.id);
      if (clientIds.length === 0) return {};

      const { data: assets } = await supabase
        .from("creative_assets")
        .select("client_id, status")
        .in("client_id", clientIds);
      const list = (assets ?? []) as { client_id: string; status: string }[];

      const map: Record<string, ClientProgress> = {};
      for (const id of clientIds) map[id] = { total: 0, approved: 0, pending: 0, revisionRequested: 0 };
      for (const a of list) {
        if (!map[a.client_id]) map[a.client_id] = { total: 0, approved: 0, pending: 0, revisionRequested: 0 };
        map[a.client_id].total++;
        if (a.status === "approved") map[a.client_id].approved++;
        if (a.status === "pending") map[a.client_id].pending++;
        if (a.status === "revision_requested") map[a.client_id].revisionRequested++;
      }
      return map;
    },
    enabled: !!agencyId,
  });
}
