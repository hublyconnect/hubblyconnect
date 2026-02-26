import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getProfileWithRetry(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  retries = 2
) {
  for (let i = 0; i <= retries; i++) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) return data;
    if (i < retries) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return null;
}

function ProfileErrorPage({ userId }: { userId: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <h1 className="text-xl font-bold text-destructive">
        ERRO DE PERFIL: Usuário [{userId}] logado, mas perfil não encontrado no banco
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Verifique os logs do servidor (terminal) para detalhes da auditoria.
      </p>
    </div>
  );
}

export default async function DashboardRootPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  console.log("[Audit] Auth Check: getUser() result", {
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    error: userError?.message ?? null,
  });
  if (userError) {
    redirect("/login?callbackUrl=/dashboard");
  }
  if (!user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const supabaseCookies = allCookies.filter(
    (c) => c.name.includes("sb-") || c.name.includes("supabase")
  );
  console.log("[Audit] Cookie Check: session present?", {
    totalCookies: allCookies.length,
    supabaseCookieNames: supabaseCookies.map((c) => c.name),
    hasAnySupabaseCookie: supabaseCookies.length > 0,
  });

  const rawResult = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  console.log("[Audit] Raw Profile Query:", {
    data: rawResult.data,
    error: rawResult.error?.message ?? null,
    errorCode: rawResult.error?.code ?? null,
    errorDetails: rawResult.error ?? null,
  });

  let profile = await getProfileWithRetry(supabase, user.id);
  if (!profile) {
    const admin = createAdminClient();
    const { data: adminProfile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = adminProfile ?? null;
  }

  const role = profile?.role ?? null;
  const isAdmin = role === "admin";
  const isClient = role === "member" || role === "viewer";
  console.log("[Audit] Role Validation:", {
    profileRole: role,
    decision: isAdmin
      ? "Sistema tratou como ADMIN porque profile.role === 'admin'"
      : isClient
        ? "Sistema tratou como CLIENTE porque profile.role está em ['member', 'viewer']"
        : role === null
          ? "Perfil nulo: sem role, usuário pode cair em fluxo de fallback ou erro"
          : `Role '${role}' não mapeado explicitamente para admin nem cliente`,
  });

  const agenciesResult = await supabase
    .from("agencies")
    .select("id, slug")
    .limit(1);
  console.log("[Audit] RLS Debug (agencies, com cliente anon):", {
    data: agenciesResult.data,
    error: agenciesResult.error?.message ?? null,
    errorCode: agenciesResult.error?.code ?? null,
    success: !agenciesResult.error,
  });

  if (!profile) {
    return <ProfileErrorPage userId={user.id} />;
  }

  // Clients always go to their portal, never to the agency dashboard
  if (isClient && profile.client_id) {
    const admin = createAdminClient();
    const { data: client } = await admin
      .from("clients")
      .select("id, slug")
      .eq("id", profile.client_id)
      .single();
    if (client) {
      const portalSlug = client.slug ?? client.id;
      redirect(`/portal/${portalSlug}`);
    }
  }

  let agencyId = profile.agency_id ?? null;
  if (!agencyId) {
    const admin = createAdminClient();
    const { data: firstAgency } = await admin
      .from("agencies")
      .select("id, slug")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstAgency?.id) {
      await admin
        .from("profiles")
        .upsert(
          {
            id: user.id,
            agency_id: firstAgency.id,
            role: profile?.role ?? "admin",
            full_name: profile?.full_name ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      agencyId = firstAgency.id;
    }
  }
  if (!agencyId) {
    redirect("/login?error=no_agency&callbackUrl=/dashboard");
  }
  const supabaseForAgency = profile ? supabase : createAdminClient();
  const { data: agency } = await supabaseForAgency
    .from("agencies")
    .select("slug")
    .eq("id", agencyId)
    .single();
  if (!agency?.slug) {
    redirect("/login?error=no_agency&callbackUrl=/dashboard");
  }
  redirect(`/dashboard/${agency.slug}`);
}
