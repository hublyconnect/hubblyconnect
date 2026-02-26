import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { ActiveClientProvider } from "@/contexts/active-client-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AgencyDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ agency_slug: string }>;
}) {
  const { agency_slug } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id, role, client_id")
      .eq("id", user.id)
      .single();
    const isClient = profile?.role === "member" || profile?.role === "viewer";
    if (isClient && profile?.client_id) {
      const { data: client } = await supabase
        .from("clients")
        .select("id, slug")
        .eq("id", profile.client_id)
        .single();
      if (client) {
        const portalSlug = client.slug ?? client.id;
        redirect(`/portal/${portalSlug}`);
      }
    }
  }
  return (
    <ActiveClientProvider>
      <SidebarProvider>
        <DashboardSidebar agencySlug={agency_slug} />
        <SidebarInset>
          <DashboardHeader agencySlug={agency_slug} />
          <div className="flex-1 overflow-auto bg-[#F8FAFC] p-4 md:p-6 transition-[background-color] duration-400">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </ActiveClientProvider>
  );
}
