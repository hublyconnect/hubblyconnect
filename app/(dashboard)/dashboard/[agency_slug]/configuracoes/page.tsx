"use client";

import React, { useEffect, useState } from "react";
import { useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/hooks/use-profile";
import { useUpdateProfile } from "@/hooks/use-update-profile";
import { useAgencyBySlug, useClients } from "@/hooks/use-clients";
import { updateAgencyAction, updateWhatsAppProfileAction, syncWhatsAppWithMetaAction } from "./actions";
import { Loader2, Upload, MessageCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function ConfiguracoesPage({
  params,
}: {
  params: Promise<{ agency_slug: string }>;
}) {
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => {
    params.then((p) => setSlug(p.agency_slug));
  }, [params]);
  const { profile, isAdmin, isLoading } = useRole();
  const updateProfile = useUpdateProfile();
  const { data: agency } = useAgencyBySlug(slug);
  const [pending, startTransition] = useTransition();
  const [whatsappInput, setWhatsappInput] = React.useState(
    () => profile?.whatsapp_number ?? ""
  );
  React.useEffect(() => {
    setWhatsappInput(profile?.whatsapp_number ?? "");
  }, [profile?.whatsapp_number]);

  const queryClient = useQueryClient();
  const handleAgencySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!slug) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await updateAgencyAction(slug, formData);
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ["agency", slug] });
        toast.success("Agência atualizada.");
      } else toast.error(result.error);
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Carregando…</p>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações da Agência</h1>
          <p className="text-muted-foreground">
            Edite nome, logo, slug e configurações do WhatsApp Business
          </p>
        </div>

        <Tabs defaultValue="agencia" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="agencia">Dados da agência</TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageCircle className="mr-2 size-4" />
              WhatsApp Business
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agencia">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Dados da agência</CardTitle>
                <CardDescription>Nome, logo e slug da URL do portal</CardDescription>
              </CardHeader>
              <CardContent>
                {agency ? (
                  <form onSubmit={handleAgencySubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="agency-name">Nome da agência</Label>
                      <Input
                        id="agency-name"
                        name="name"
                        defaultValue={agency.name}
                        required
                        disabled={pending}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agency-slug">Slug (URL)</Label>
                      <Input
                        id="agency-slug"
                        name="slug"
                        defaultValue={agency.slug}
                        required
                        disabled={pending}
                        placeholder="minha-agencia"
                        className="rounded-lg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Usado na URL: /dashboard/{agency.slug}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Logo da agência</Label>
                      <div className="flex items-center gap-3">
                        {agency.logo_url && (
                          <img src={agency.logo_url} alt="Logo" className="size-16 rounded-lg object-cover border" />
                        )}
                        <label className="cursor-pointer">
                          <input type="file" name="logo" accept="image/*" className="sr-only" />
                          <span className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent">
                            <Upload className="size-4" />
                            Enviar imagem
                          </span>
                        </label>
                      </div>
                      <input type="hidden" name="logo_url" value={agency.logo_url ?? ""} />
                    </div>
                    <Button type="submit" disabled={pending} className="rounded-lg">
                      {pending ? <Loader2 className="size-4 animate-spin" /> : "Salvar alterações"}
                    </Button>
                  </form>
                ) : (
                  <Skeleton className="h-32 w-full" />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Configurações do WhatsApp (Agência)</CardTitle>
                <CardDescription>
                  Configure o token e o Phone Number ID usados para enviar mensagens
                </CardDescription>
              </CardHeader>
              <CardContent>
                {agency ? (
                  <form onSubmit={handleAgencySubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="wa-access-token">Access Token</Label>
                      <Input
                        id="wa-access-token"
                        name="whatsapp_access_token"
                        defaultValue={agency.whatsapp_access_token ?? ""}
                        placeholder="Token de acesso do WhatsApp Business"
                        disabled={pending}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wa-phone-id">Phone Number ID</Label>
                      <Input
                        id="wa-phone-id"
                        name="whatsapp_phone_number_id"
                        defaultValue={agency.whatsapp_phone_number_id ?? ""}
                        placeholder="Ex: 1063335686858744"
                        disabled={pending}
                        className="rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wa-waba-id">WABA ID</Label>
                      <Input
                        id="wa-waba-id"
                        name="whatsapp_waba_id"
                        defaultValue={agency.whatsapp_waba_id ?? ""}
                        placeholder="Ex: 1078459368673714"
                        disabled={pending}
                        className="rounded-lg"
                      />
                    </div>
                    <Button type="submit" disabled={pending} className="rounded-lg">
                      {pending ? <Loader2 className="size-4 animate-spin" /> : "Salvar configurações"}
                    </Button>
                  </form>
                ) : (
                  <Skeleton className="h-32 w-full" />
                )}
              </CardContent>
            </Card>
            <WhatsAppBusinessSection agencySlug={slug} agencyId={agency?.id ?? null} queryClient={queryClient} />
          </TabsContent>
        </Tabs>
    </div>
  );
}

function WhatsAppBusinessSection({
  agencySlug,
  agencyId,
  queryClient,
}: {
  agencySlug: string | null;
  agencyId: string | null;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const { data: clients } = useClients(agencyId);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [about, setAbout] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [syncPending, setSyncPending] = useState(false);

  const selectedClient = clients?.find((c) => c.id === selectedClientId);
  const metadata = (selectedClient as { metadata?: Record<string, unknown> } | undefined)?.metadata as Record<string, unknown> | undefined;
  const whatsapp = (metadata?.whatsapp ?? {}) as Record<string, unknown>;
  const currentDisplayName = (whatsapp.display_name as string) ?? "";
  const currentAbout = (whatsapp.about as string) ?? "";
  const currentAvatarUrl = (whatsapp.profile_picture_url as string) ?? null;

  useEffect(() => {
    if (selectedClientId) {
      setDisplayName(currentDisplayName);
      setAbout(currentAbout);
      setAvatarPreview(currentAvatarUrl);
    }
  }, [selectedClientId, currentDisplayName, currentAbout, currentAvatarUrl]);

  const handleWhatsAppSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!agencySlug || !selectedClientId) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("client_id", selectedClientId);
    startTransition(async () => {
      const result = await updateWhatsAppProfileAction(agencySlug, selectedClientId, formData);
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ["clients", agencyId] });
        if (result.avatarUrl) setAvatarPreview(result.avatarUrl);
        toast.success("Perfil do bot atualizado.");
      } else toast.error(result.error);
    });
  };

  const handleSyncWithMeta = () => {
    if (!agencySlug || !selectedClientId) return;
    setSyncPending(true);
    syncWhatsAppWithMetaAction(agencySlug, selectedClientId).then((result) => {
      setSyncPending(false);
      if (result.ok) toast.success("Sincronizado com Meta.");
      else toast.error(result.error);
    });
  };

  const clientsWithWhatsApp = clients?.filter((c) => (c as { whatsapp_business_phone_id?: string }).whatsapp_business_phone_id) ?? [];
  const allClients = clients ?? [];

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>WhatsApp Business</CardTitle>
        <CardDescription>
          Configure nome, descrição e foto do bot para cada cliente conectado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select
              value={selectedClientId ?? ""}
              onValueChange={(v) => setSelectedClientId(v || null)}
            >
              <SelectTrigger className="max-w-xs rounded-lg">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {allClients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {(c as { whatsapp_business_phone_id?: string }).whatsapp_business_phone_id
                      ? " (WhatsApp conectado)"
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clientsWithWhatsApp.length === 0 && allClients.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Nenhum cliente com WhatsApp Business conectado. Conecte via integrações para configurar o bot.
              </p>
            )}
          </div>

          {selectedClientId && (
            <form onSubmit={handleWhatsAppSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wa-display-name">Nome do bot (Display Name)</Label>
                <Input
                  id="wa-display-name"
                  name="display_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex: Suporte Empresa"
                  disabled={pending}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wa-about">Descrição / Sobre (About)</Label>
                <Textarea
                  id="wa-about"
                  name="about"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Ex: Atendimento via WhatsApp"
                  disabled={pending}
                  rows={3}
                  className="rounded-lg"
                />
                <p className="text-xs text-muted-foreground">Máx. 139 caracteres no perfil do WhatsApp</p>
              </div>
              <div className="space-y-2">
                <Label>Foto do bot (Profile Picture)</Label>
                <div className="flex items-center gap-4">
                  {(avatarPreview || currentAvatarUrl) && (
                    <img
                      src={avatarPreview || currentAvatarUrl || ""}
                      alt="Avatar"
                      className="size-20 rounded-full object-cover border"
                    />
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      name="avatar"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setAvatarPreview(URL.createObjectURL(f));
                      }}
                    />
                    <span className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-accent">
                      <Upload className="size-4" />
                      Enviar imagem
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={pending} className="rounded-lg">
                  {pending ? <Loader2 className="size-4 animate-spin" /> : "Salvar perfil"}
                </Button>
                {(selectedClient as { whatsapp_business_phone_id?: string })?.whatsapp_business_phone_id && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSyncWithMeta}
                    disabled={syncPending}
                    className="rounded-lg"
                  >
                    {syncPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Sync com Meta
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu perfil</h1>
        <p className="text-muted-foreground">
          Notificações e preferências
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Notificações Inteligentes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Controle como deseja receber avisos de novos criativos (Dica de Ouro).
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="whatsapp-alerts" className="flex-1 cursor-pointer pr-4">
              Receber avisos de novos criativos por WhatsApp
            </Label>
            <Switch
              id="whatsapp-alerts"
              checked={profile?.whatsapp_alerts ?? false}
              onCheckedChange={(checked) =>
                updateProfile.mutate({ whatsapp_alerts: checked })
              }
              disabled={updateProfile.isPending}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications" className="flex-1 cursor-pointer pr-4">
              Receber avisos por E-mail
            </Label>
            <Switch
              id="email-notifications"
              checked={profile?.email_notifications ?? true}
              onCheckedChange={(checked) =>
                updateProfile.mutate({ email_notifications: checked })
              }
              disabled={updateProfile.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp-number">Número do WhatsApp</Label>
            <Input
              id="whatsapp-number"
              type="tel"
              placeholder="Ex: 5511999999999"
              value={whatsappInput}
              onChange={(e) => setWhatsappInput(e.target.value)}
              onBlur={() => {
                const v = whatsappInput.trim();
                if (v !== (profile?.whatsapp_number ?? "")) {
                  updateProfile.mutate({ whatsapp_number: v || null });
                }
              }}
              disabled={updateProfile.isPending}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              Informe com DDD e sem espaços (ex.: 5511999999999) para receber avisos por WhatsApp.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
