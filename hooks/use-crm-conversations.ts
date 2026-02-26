"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const QUERY_KEY = "crm-conversations";

export type CrmConversation = {
  id: string;
  client_id: string;
  business_phone_id: string;
  lead_phone: string;
  lead_name: string | null;
  last_message_at: string;
  status: string;
  ad_id: string | null;
  campaign_id: string | null;
  created_at: string;
  clients: { id: string; name: string } | null;
  whatsapp_messages: Array<{
    sender_type: string;
    message_body: string;
    created_at: string;
  }>;
};

function getLatestSnippet(messages: CrmConversation["whatsapp_messages"]): string {
  if (!messages?.length) return "Sem mensagens";
  const latest = [...messages].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
  const body = latest?.message_body ?? "";
  return body.length > 50 ? body.slice(0, 50) + "…" : body;
}

export function useCrmConversations() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [QUERY_KEY],
    refetchInterval: 10000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    queryFn: async (): Promise<CrmConversation[]> => {
      try {
        const { data, error } = await supabase
          .from("whatsapp_conversations")
          .select(
            `
            *,
            clients(id, name, whatsapp_business_phone_id),
            whatsapp_messages(sender_type, message_body, created_at)
          `
          )
          .order("last_message_at", { ascending: false });

        if (error) throw error;
        return (data ?? []) as CrmConversation[];
      } catch (err) {
        console.error("[CRM] Failed to fetch conversations:", err);
        throw err;
      }
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("crm-conversations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_conversations",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const conversationsWithSnippet = (query.data ?? []).map((c) => ({
    ...c,
    lastMessageSnippet: getLatestSnippet(c.whatsapp_messages),
  }));

  return { ...query, conversations: conversationsWithSnippet };
}
