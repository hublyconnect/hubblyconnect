"use client";

import { useEffect } from "react";
import { useRole } from "@/hooks/use-profile";
import { useActiveClient } from "@/contexts/active-client-context";
import { ApprovalGallery } from "@/components/approval-gallery";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function MeuProjetoPage() {
  const { profile, isClient, isLoading } = useRole();
  const { setClientId } = useActiveClient();

  useEffect(() => {
    if (profile?.client_id) setClientId(profile.client_id);
  }, [profile?.client_id, setClientId]);

  if (!isClient) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Esta página é apenas para usuários com perfil de cliente.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!profile?.client_id) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhum projeto atribuído ao seu usuário. Entre em contato com a agência.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu Projeto</h1>
        <p className="text-muted-foreground">
          Criativos e revisões do seu projeto
        </p>
      </div>
      <ApprovalGallery clientId={profile.client_id} />
    </div>
  );
}
