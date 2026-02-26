"use client";

import { useQuery } from "@tanstack/react-query";
import { getOnboardingProgressBulkAction } from "@/app/(dashboard)/dashboard/[agency_slug]/onboarding/actions";

export type ClientOnboardingProgress = {
  client_id: string;
  total: number;
  completed: number;
  pct: number;
};

const QUERY_KEY = "onboarding-progress-bulk";

export function useOnboardingProgressForClients(
  agencySlug: string | null,
  clientIds: string[]
) {
  return useQuery({
    queryKey: [QUERY_KEY, agencySlug, clientIds.sort().join(",")],
    queryFn: async (): Promise<ClientOnboardingProgress[]> => {
      if (!agencySlug || clientIds.length === 0) return [];
      const res = await getOnboardingProgressBulkAction(agencySlug, clientIds);
      if (!res.ok) throw new Error(res.error);
      return res.progress;
    },
    enabled: !!agencySlug && clientIds.length > 0,
    retry: (failureCount, error) => {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "Não autenticado.") return false;
      return failureCount < 2;
    },
  });
}
