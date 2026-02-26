"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

const QUERY_KEY = "profile";

export function useProfile() {
  const supabase = createClient();
  const query = useQuery({
    queryKey: [QUERY_KEY],
    retry: 1,
    queryFn: async (): Promise<Profile | null> => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.warn("[Profile] Auth getUser failed:", userError.message);
          return null;
        }
        if (!user) return null;
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (error || !data) return null;
        return data as Profile;
      } catch (err) {
        console.warn("[Profile] Failed to load profile:", err);
        return null;
      }
    },
  });
  return query;
}

export function useRole() {
  const { data: profile, ...rest } = useProfile();
  const role = profile?.role ?? null;
  const isAdmin = role === "admin";
  const isClient = role === "member" || role === "viewer";
  return { profile, role, isAdmin, isClient, ...rest };
}

export function useInvalidateProfile() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
}
