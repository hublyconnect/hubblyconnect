"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardStatsAction } from "@/app/(dashboard)/dashboard/[agency_slug]/actions-stats";

export type { DashboardStats } from "@/app/(dashboard)/dashboard/[agency_slug]/actions-stats";

const QUERY_KEY = "dashboard-stats";

export function useDashboardStats(agencyId: string | null) {
  return useQuery({
    queryKey: [QUERY_KEY, agencyId],
    queryFn: () => getDashboardStatsAction(agencyId),
    enabled: !!agencyId,
  });
}
