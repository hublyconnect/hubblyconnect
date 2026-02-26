"use client";

import React from "react";
import { ApprovalGallery } from "@/components/approval-gallery";
import { ClientSelector } from "@/components/client-selector";
import { Can } from "@/components/can";
import { useActiveClient } from "@/contexts/active-client-context";
import { useRole } from "@/hooks/use-profile";

export default function RevisaoPage({
  params,
}: {
  params: Promise<{ agency_slug: string }>;
}) {
  const [slug, setSlug] = React.useState<string | null>(null);
  React.useEffect(() => {
    params.then((p) => setSlug(p.agency_slug));
  }, [params]);
  const { clientId } = useActiveClient();
  const { profile, isAdmin } = useRole();
  const effectiveClientId = isAdmin ? clientId : profile?.client_id ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Aprovação de Criativos</h1>
          <p className="text-muted-foreground">
            Acompanhe aprovações por cliente e gere o link para o cliente aprovar
          </p>
        </div>
        <Can role="admin">
          {slug ? <ClientSelector agencySlug={slug} /> : null}
        </Can>
      </div>
      <ApprovalGallery clientId={effectiveClientId} agencySlug={slug ?? ""} />
    </div>
  );
}
