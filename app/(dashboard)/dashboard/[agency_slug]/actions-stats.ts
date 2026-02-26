"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type DashboardStats = {
  totalClients: number;
  pendingCreatives: number;
  approvalRate: number | null;
};

/** Conta criativos que exigem ação da agência (status = revision_requested). Executado no servidor para respeitar RLS com contexto da agência. */
export async function getDashboardStatsAction(
  agencyId: string | null
): Promise<DashboardStats> {
  if (!agencyId) {
    return { totalClients: 0, pendingCreatives: 0, approvalRate: null };
  }
  const supabase = await createServerSupabaseClient();
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("id")
    .eq("agency_id", agencyId);
  if (clientsError) {
    return { totalClients: 0, pendingCreatives: 0, approvalRate: null };
  }
  const clientIds = (clients ?? []).map((c) => c.id);
  const totalClients = clientIds.length;
  if (clientIds.length === 0) {
    return { totalClients: 0, pendingCreatives: 0, approvalRate: null };
  }
  const { data: assets, error: assetsError } = await supabase
    .from("creative_assets")
    .select("status")
    .in("client_id", clientIds);
  if (assetsError) {
    return { totalClients, pendingCreatives: 0, approvalRate: null };
  }
  const list = (assets ?? []) as { status: string }[];
  const pendingCreatives = list.filter((a) => a.status === "revision_requested").length;
  const approved = list.filter((a) => a.status === "approved").length;
  const total = list.length;
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : null;
  return {
    totalClients,
    pendingCreatives,
    approvalRate,
  };
}
