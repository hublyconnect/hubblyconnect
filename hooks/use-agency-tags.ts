"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type AgencyTag = {
  id: string;
  name: string;
  color: string;
  agency_id: string;
};

export function useAgencyTags() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["agency-tags"],
    queryFn: async (): Promise<AgencyTag[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from("profiles")
        .select("agency_id")
        .eq("id", user.id)
        .single();

      const agencyId = profile?.agency_id;
      if (!agencyId) return [];

      const { data, error } = await supabase
        .from("agency_tags")
        .select("id, name, color, agency_id")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as AgencyTag[];
    },
    staleTime: 60000,
  });
}

