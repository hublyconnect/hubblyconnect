"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type ScheduledPostStatus = "scheduled" | "processing" | "published" | "failed" | "cancelled";

export type ScheduledPost = {
  id: string;
  agency_id: string;
  client_id: string;
  media_url: string;
  caption: string | null;
  scheduled_at: string;
  is_reels: boolean;
  status: ScheduledPostStatus;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  error_log?: string | null;
};

const QUERY_KEY = "scheduled-posts";

export function useScheduledPosts(clientId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, clientId],
    queryFn: async (): Promise<ScheduledPost[]> => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("post_scheduling")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ScheduledPost[];
    },
    enabled: !!clientId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY, clientId] });

  return { ...query, invalidate };
}
