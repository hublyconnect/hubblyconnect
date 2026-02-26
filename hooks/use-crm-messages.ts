"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type CrmMessage = {
  id: string;
  conversation_id: string;
  sender_type: "lead" | "agent";
  message_body: string;
  wa_message_id: string | null;
  status?: string;
  media_url?: string | null;
  media_type?: string | null;
  created_at: string;
};

function getMessagesQueryKey(conversationId: string | null) {
  return ["crm-messages", conversationId];
}

export function useCrmMessages(conversationId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: getMessagesQueryKey(conversationId),
    refetchInterval: 5000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    queryFn: async (): Promise<CrmMessage[]> => {
      if (!conversationId) return [];
      try {
        const { data, error } = await supabase
          .from("whatsapp_messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        return (data ?? []) as CrmMessage[];
      } catch (err) {
        console.error("[CRM] Failed to fetch messages:", err);
        throw err;
      }
    },
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`crm-messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: getMessagesQueryKey(conversationId) });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whatsapp_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: getMessagesQueryKey(conversationId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase, queryClient]);

  return query;
}
