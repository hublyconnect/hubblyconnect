"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CreativeAsset } from "@/lib/types/database";

const QUERY_KEY = "creative-assets";

function getAssetsQueryKey(clientId: string | null) {
  return clientId ? [QUERY_KEY, clientId] : [QUERY_KEY];
}

export function useCreativeAssets(clientId: string | null) {
  const supabase = createClient();
  const query = useQuery({
    queryKey: getAssetsQueryKey(clientId),
    queryFn: async (): Promise<CreativeAsset[]> => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("creative_assets")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CreativeAsset[];
    },
    enabled: !!clientId,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`creative_assets:${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "creative_assets",
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: getAssetsQueryKey(clientId) });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, supabase, queryClient]);

  return query;
}
