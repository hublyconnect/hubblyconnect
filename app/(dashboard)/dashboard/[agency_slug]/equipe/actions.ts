"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type TeamMemberWithEmail = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
};

export type GetTeamMembersResult =
  | { ok: true; members: TeamMemberWithEmail[] }
  | { ok: false; error: string };

export async function getTeamMembersAction(
  agencySlug: string
): Promise<GetTeamMembersResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: agency, error: agencyError } = await supabase
    .from("agencies")
    .select("id")
    .eq("slug", agencySlug)
    .single();

  if (agencyError || !agency) return { ok: false, error: "Agência não encontrada." };

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("agency_id", agency.id)
    .order("role")
    .order("full_name");

  if (profilesError) return { ok: false, error: profilesError.message };
  if (!profiles || profiles.length === 0) return { ok: true, members: [] };

  const admin = createAdminClient();
  const members: TeamMemberWithEmail[] = [];

  for (const p of profiles) {
    let email: string | null = null;
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(p.id);
      email = authUser?.user?.email ?? null;
    } catch {
      // Fallback if auth lookup fails
    }
    members.push({
      id: p.id,
      full_name: p.full_name ?? null,
      email,
      role: p.role ?? "member",
    });
  }

  return { ok: true, members };
}
