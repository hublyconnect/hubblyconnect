"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type CalendarEvent = {
  id: string;
  agency_id: string;
  client_id: string | null;
  title: string;
  event_type: string;
  event_color: string | null;
  starts_at: string;
  end_time: string | null;
  start_time?: string | null;
  meeting_url: string | null;
  duration_minutes: number | null;
  whatsapp_status: string | null;
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
};

const QUERY_KEY = "calendar-events";

export function useCalendarEvents(agencyId: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: [QUERY_KEY, agencyId],
    queryFn: async (): Promise<CalendarEvent[]> => {
      if (!agencyId) return [];
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("agency_id", agencyId)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CalendarEvent[];
    },
    enabled: !!agencyId,
  });
}

/** Eventos com starts_at >= agora, ordenados por starts_at ascendente (próximos eventos). */
export function useUpcomingCalendarEvents(agencyId: string | null) {
  const supabase = createClient();
  return useQuery({
    queryKey: [QUERY_KEY, agencyId, "upcoming"],
    queryFn: async (): Promise<CalendarEvent[]> => {
      if (!agencyId) return [];
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("agency_id", agencyId)
        .gte("starts_at", now)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CalendarEvent[];
    },
    enabled: !!agencyId,
  });
}
