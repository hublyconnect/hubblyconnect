"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOnboardingItemsAction,
  toggleOnboardingItemAction,
} from "@/app/(dashboard)/dashboard/[agency_slug]/onboarding/actions";

export type OnboardingItem = {
  id: string;
  client_id: string;
  title: string;
  completed: boolean;
  updated_at: string;
};

const QUERY_KEY = "onboarding-checklist";

export function useOnboardingChecklist(
  agencySlug: string | null,
  clientId: string | null
) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [QUERY_KEY, agencySlug, clientId],
    queryFn: async (): Promise<OnboardingItem[]> => {
      if (!agencySlug || !clientId) return [];
      const res = await getOnboardingItemsAction(agencySlug, clientId);
      if (!res.ok) throw new Error(res.error);
      return res.items;
    },
    enabled: !!agencySlug && !!clientId,
    retry: (failureCount, error) => {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "Não autenticado.") return false;
      return failureCount < 2;
    },
  });
  const toggle = useMutation({
    mutationFn: async ({
      itemId,
      completed,
    }: {
      itemId: string;
      completed: boolean;
    }) => {
      if (!agencySlug) throw new Error("Agency slug não disponível.");
      const res = await toggleOnboardingItemAction(agencySlug, itemId, completed);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      if (clientId) {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY, agencySlug, clientId] });
      }
      queryClient.invalidateQueries({ queryKey: ["onboarding-progress-bulk"] });
    },
  });
  return { ...query, toggle };
}
