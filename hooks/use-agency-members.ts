"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type AgencyMember = {
  id: string;
  full_name: string | null;
  role: string;
};

const QUERY_KEY = "agency-members";

export function useAgencyMembers(agencyId: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: [QUERY_KEY, agencyId],
    queryFn: async (): Promise<AgencyMember[]> => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("agency_id", agencyId)
        .order("role")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as AgencyMember[];
    },
    enabled: !!agencyId,
  });
}
