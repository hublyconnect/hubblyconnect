"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type InstagramIntegration = {
  id: string;
  token_expires_at: string | null;
};

const QUERY_KEY = "instagram-integration";

function getQueryKey(agencyId: string | null) {
  return agencyId ? [QUERY_KEY, agencyId] : [QUERY_KEY];
}

export function useInstagramIntegration(agencyId: string | null) {
  const supabase = createClient();
  const query = useQuery({
    queryKey: getQueryKey(agencyId),
    queryFn: async (): Promise<InstagramIntegration | null> => {
      if (!agencyId) return null;
      const { data, error } = await supabase
        .from("agency_integrations")
        .select("id, token_expires_at")
        .eq("agency_id", agencyId)
        .eq("provider", "instagram")
        .maybeSingle();
      if (error) throw error;
      return data as InstagramIntegration | null;
    },
    enabled: !!agencyId,
  });

  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getQueryKey(agencyId) });

  const integration = query.data ?? null;
  const isTokenExpired =
    integration?.token_expires_at != null &&
    new Date(integration.token_expires_at) <= new Date();
  const hasValidIntegration = integration != null && !isTokenExpired;

  return {
    data: integration,
    isLoading: query.isLoading,
    error: query.error,
    invalidate,
    hasValidIntegration,
  };
}
