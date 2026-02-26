import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardRootPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();
  if (!profile?.agency_id) {
    redirect("/login?error=no_agency");
  }
  const { data: agency } = await supabase
    .from("agencies")
    .select("slug")
    .eq("id", profile.agency_id)
    .single();
  if (!agency?.slug) {
    redirect("/login?error=no_agency");
  }
  redirect(`/dashboard/${agency.slug}`);
}
