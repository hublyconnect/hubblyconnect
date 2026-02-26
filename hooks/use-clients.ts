"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Client } from "@/lib/types/database";

const QUERY_KEY = "clients";

function getClientsQueryKey(agencyId: string | null) {
  return agencyId ? [QUERY_KEY, agencyId] : [QUERY_KEY];
}

export function useClients(agencyId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: getClientsQueryKey(agencyId),
    queryFn: async (): Promise<Client[]> => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("agency_id", agencyId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Client[];
    },
    enabled: !!agencyId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getClientsQueryKey(agencyId) });
  return { ...query, invalidate };
}

export function useAgencyBySlug(slug: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: ["agency", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("agencies")
        .select("id, name, slug, logo_url")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data as { id: string; name: string; slug: string; logo_url: string | null };
    },
    enabled: !!slug,
  });
}
