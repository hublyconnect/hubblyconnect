"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { AccessCredential } from "@/components/access-credential";
import { LogoPreview } from "@/components/logo-preview";
import {
  FileText,
  Image,
  Instagram,
  Facebook,
  BarChart3,
  Palette,
  FileType,
  LayoutGrid,
  Filter,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveClient } from "@/contexts/active-client-context";
import { useRole } from "@/hooks/use-profile";
import { useClients, useAgencyBySlug } from "@/hooks/use-clients";
import { useQueryClient } from "@tanstack/react-query";
import { useClientAccess } from "@/hooks/use-client-access";
import { saveClientAccessAction } from "./actions";
import { toast } from "sonner";

const BUCKET = "portal-files";
const CARD_CLASS =
  "rounded-2xl border border-[#2482fa]/10 bg-card shadow-soft transition-all duration-200 hover:scale-[1.02] hover:shadow-deep";

function useHasSupabase() {
  const [hasSupabase, setHasSupabase] = useState(true);
  useEffect(() => {
    setHasSupabase(
      Boolean(
        typeof window !== "undefined" &&
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
    );
  }, []);
  return hasSupabase;
}

export default function ArquivosPage({
  params,
}: {
  params: Promise<{ agency_slug: string }>;
}) {
  const hasSupabase = useHasSupabase();
  const [slug, setSlug] = useState<string | null>(null);
  const { clientId: activeClientId, setClientId } = useActiveClient();
  const { profile, isAdmin } = useRole();
  const { data: agency } = useAgencyBySlug(slug);
  const { data: clients = [] } = useClients(agency?.id ?? null);
  const clientId = isAdmin ? activeClientId : profile?.client_id ?? null;
  const queryClient = useQueryClient();
  const { data: accessData, isLoading: accessLoading } = useClientAccess(clientId);

  useEffect(() => {
    params.then((p) => setSlug(p.agency_slug));
  }, [params]);
  useEffect(() => {
    if (isAdmin && clients.length > 0 && !activeClientId) setClientId(clients[0].id);
  }, [isAdmin, clients, activeClientId, setClientId]);

  const [googleAdsView, setGoogleAdsView] = useState<"contas" | "pixels">("contas");
  const [brandColor, setBrandColor] = useState("#2482fa");
  const [brandTypography, setBrandTypography] = useState("");

  const [instagram, setInstagram] = useState({ user: "", password: "", token: "" });
  const [facebookBm, setFacebookBm] = useState({
    ad_account_id: "",
    bmId: "",
    perfil: "",
    pagina: "",
    whatsapp: "",
    instagram: "",
    pixelId: "",
    tokenConversao: "",
  });
  const [googleAds, setGoogleAds] = useState({ accountId: "", email: "", tags: "" });

  useEffect(() => {
    if (!accessData) return;
    if (accessData.instagram) setInstagram(accessData.instagram);
    if (accessData.facebook)
      setFacebookBm({
        ...accessData.facebook,
        ad_account_id: accessData.facebook.ad_account_id ?? "",
        bmId: accessData.facebook.bmId ?? "",
        perfil: accessData.facebook.perfil ?? "",
        pagina: accessData.facebook.pagina ?? "",
        whatsapp: accessData.facebook.whatsapp ?? "",
        instagram: accessData.facebook.instagram ?? "",
        pixelId: accessData.facebook.pixelId ?? "",
        tokenConversao: accessData.facebook.tokenConversao ?? "",
      });
    if (accessData.google) setGoogleAds(accessData.google);
    if (accessData.assets) {
      setBrandColor(accessData.assets.brandColor || "#2482fa");
      setBrandTypography(accessData.assets.brandTypography || "");
    }
  }, [accessData]);

  const [savingPlatform, setSavingPlatform] = useState<"instagram" | "facebook" | "google" | "assets" | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [logoRefreshKey, setLogoRefreshKey] = useState(0);

  const handleSaveAccess = async (platform: "instagram" | "facebook" | "google", payload: Record<string, string>) => {
    if (!slug || !clientId) {
      toast.error("Selecione um cliente para salvar.");
      return;
    }
    setSavingPlatform(platform);
    const result = await saveClientAccessAction(slug, clientId, platform, payload);
    setSavingPlatform(null);
    if (result.ok) {
      queryClient.invalidateQueries({ queryKey: ["client-access", clientId] });
      toast.success("Acesso salvo.");
    } else toast.error(result.error);
  };

  const handleSaveIdentity = async () => {
    if (!slug || !clientId) {
      toast.error("Selecione um cliente para salvar.");
      return;
    }
    setSavingPlatform("assets");
    const result = await saveClientAccessAction(slug, clientId, "assets", {
      brandColor,
      brandTypography,
    });
    setSavingPlatform(null);
    if (result.ok) {
      queryClient.invalidateQueries({ queryKey: ["client-access", clientId] });
      toast.success("Identidade salva.");
    } else toast.error(result.error);
  };

  const formatAccountId = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const fileKey = clientId ?? "no-client";
  const contratosFolder = `contratos/${fileKey}`;
  const instagramFolder = `client-docs/${fileKey}/instagram`;
  const facebookFolder = `client-docs/${fileKey}/facebook-bm`;
  const googleFolder = `client-docs/${fileKey}/google-ads`;
  const logoFolder = `assets/logo/${fileKey}`;
  const brandbookFolder = `materiais/${fileKey}/brandbook`;
  const manuaisFolder = `materiais/${fileKey}/manuais`;

  if (!hasSupabase) {
    return (
      <div className="min-h-[60vh] rounded-2xl bg-muted/20 p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Arquivos e Acessos</h1>
          <p className="text-muted-foreground">
            Gerenciador de pastas: contratos, acessos e assets
          </p>
        </div>
        <Card className={cn("mt-8", CARD_CLASS)}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Configure <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
              <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no .env.local e crie o bucket{" "}
              <code className="rounded bg-muted px-1">portal-files</code> no Supabase Storage.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] rounded-2xl bg-muted/20 p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Arquivos e Acessos</h1>
        <p className="text-muted-foreground">
          Contratos, acessos (Instagram, Facebook BM, Google Ads) e identidade visual
        </p>
        {isAdmin && !clientId && clients.length > 0 && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-500">
            Selecione um cliente no cabeçalho para carregar e salvar os acessos.
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Contratos */}
        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-[#2482fa]" />
              Contratos
            </CardTitle>
            <CardDescription>Contratos e aditivos</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload key={fileKey} bucket={BUCKET} folder={contratosFolder} />
          </CardContent>
        </Card>

        {/* Acesso Instagram */}
        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Instagram className="size-4 text-[#2482fa]" />
              Acesso Instagram
            </CardTitle>
            <CardDescription>Usuário, senha ou token de acesso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AccessCredential label="Usuário / E-mail" value={instagram.user} onChange={(v) => setInstagram((p) => ({ ...p, user: v }))} placeholder="usuário ou e-mail" />
            <AccessCredential label="Senha" value={instagram.password} onChange={(v) => setInstagram((p) => ({ ...p, password: v }))} placeholder="••••••••" secret />
            <AccessCredential label="Token (opcional)" value={instagram.token} onChange={(v) => setInstagram((p) => ({ ...p, token: v }))} placeholder="Token de acesso" secret />
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-lg gap-2"
              disabled={!clientId || savingPlatform === "instagram"}
              onClick={() => handleSaveAccess("instagram", instagram)}
            >
              {savingPlatform === "instagram" && <Loader2 className="size-4 animate-spin" />}
              {savingPlatform === "instagram" ? "Salvando…" : "Salvar acesso"}
            </Button>
            <FileUpload key={fileKey} bucket={BUCKET} folder={instagramFolder} />
          </CardContent>
        </Card>

        {/* Acesso Facebook BM */}
        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Facebook className="size-4 text-[#2482fa]" />
              Acesso Facebook BM
            </CardTitle>
            <CardDescription>Business Manager e ativos conectados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AccessCredential label="ID da BM" value={facebookBm.bmId} onChange={(v) => setFacebookBm((p) => ({ ...p, bmId: v }))} placeholder="ID do Business Manager" />
            <AccessCredential label="ID da Conta de Anúncios" value={facebookBm.ad_account_id ?? ""} onChange={(v) => setFacebookBm((p) => ({ ...p, ad_account_id: v || "" }))} placeholder="act_123456789 (para Relatórios)" />
            <AccessCredential label="Perfil de Acesso" value={facebookBm.perfil} onChange={(v) => setFacebookBm((p) => ({ ...p, perfil: v }))} placeholder="Perfil com acesso" />
            <AccessCredential label="Nome da Página" value={facebookBm.pagina} onChange={(v) => setFacebookBm((p) => ({ ...p, pagina: v }))} placeholder="Nome da página Facebook" />
            <AccessCredential label="WhatsApp Conectado" value={facebookBm.whatsapp} onChange={(v) => setFacebookBm((p) => ({ ...p, whatsapp: v }))} placeholder="Número ou link" />
            <AccessCredential label="Instagram Conectado" value={facebookBm.instagram} onChange={(v) => setFacebookBm((p) => ({ ...p, instagram: v }))} placeholder="@conta ou ID" />
            <AccessCredential label="Pixel ID" value={facebookBm.pixelId} onChange={(v) => setFacebookBm((p) => ({ ...p, pixelId: v }))} placeholder="ID do Pixel" secret />
            <AccessCredential
              label="Token de Conversão"
              value={facebookBm.tokenConversao}
              onChange={(v) => setFacebookBm((p) => ({ ...p, tokenConversao: v }))}
              placeholder="Cole o código do token de conversão"
              secret
              multiline
              rows={4}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-lg gap-2"
              disabled={!clientId || savingPlatform === "facebook"}
              onClick={() => handleSaveAccess("facebook", facebookBm)}
            >
              {savingPlatform === "facebook" && <Loader2 className="size-4 animate-spin" />}
              {savingPlatform === "facebook" ? "Salvando…" : "Salvar acesso"}
            </Button>
            <FileUpload key={fileKey} bucket={BUCKET} folder={facebookFolder} />
          </CardContent>
        </Card>

        {/* Acesso Google Ads */}
        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-[#2482fa]" />
              Acesso Google Ads
            </CardTitle>
            <CardDescription>Conta e tags de conversão</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-[#2482fa]/10 bg-muted/20 p-2">
              <Filter className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Visualização:</span>
              <div className="flex rounded-md bg-background p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setGoogleAdsView("contas")}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    googleAdsView === "contas"
                      ? "bg-[#2482fa] text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Contas de Anúncio
                </button>
                <button
                  type="button"
                  onClick={() => setGoogleAdsView("pixels")}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    googleAdsView === "pixels"
                      ? "bg-[#2482fa] text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Tags de Conversão
                </button>
              </div>
            </div>
            {googleAdsView === "contas" && (
              <>
                <AccessCredential
                  label="ID da Conta"
                  value={googleAds.accountId}
                  onChange={(v) => setGoogleAds((p) => ({ ...p, accountId: v.replace(/\D/g, "").slice(0, 10) }))}
                  placeholder="000-000-0000"
                  secret
                  maskFormat={formatAccountId}
                />
                <AccessCredential label="E-mail de Acesso" value={googleAds.email} onChange={(v) => setGoogleAds((p) => ({ ...p, email: v }))} placeholder="email@conta.com" />
              </>
            )}
            {googleAdsView === "pixels" && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Tags de conversão</Label>
                <Input
                  value={googleAds.tags}
                  onChange={(e) => setGoogleAds((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="Ex: AW-123456789/AbCdEfGhIjKlMnOp"
                  className="rounded-lg font-mono text-sm"
                />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-lg gap-2"
              disabled={!clientId || savingPlatform === "google"}
              onClick={() => handleSaveAccess("google", googleAds)}
            >
              {savingPlatform === "google" && <Loader2 className="size-4 animate-spin" />}
              {savingPlatform === "google" ? "Salvando…" : "Salvar acesso"}
            </Button>
            <FileUpload key={fileKey} bucket={BUCKET} folder={googleFolder} />
          </CardContent>
        </Card>

        {/* Logotipo */}
        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Image className="size-4 text-[#2482fa]" />
              Logotipo
            </CardTitle>
            <CardDescription>Preview, download e substituição</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LogoPreview
              key={`${fileKey}-${logoRefreshKey}`}
              bucket={BUCKET}
              folder={logoFolder}
              onTriggerUpload={() => logoFileInputRef.current?.click()}
            />
            <FileUpload
              key={fileKey}
              bucket={BUCKET}
              folder={logoFolder}
              inputRef={logoFileInputRef}
              onUploadSuccess={() => setLogoRefreshKey((k) => k + 1)}
            />
          </CardContent>
        </Card>

        {/* Identidade Visual */}
        <Card className={CARD_CLASS}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="size-4 text-[#2482fa]" />
              Identidade Visual
            </CardTitle>
            <CardDescription>Cor principal e tipografia da marca</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Cor principal</Label>
              <div className="flex items-center gap-3">
                <div
                  className="size-10 shrink-0 rounded-full border-2 border-[#2482fa]/20 shadow-soft"
                  style={{ backgroundColor: brandColor }}
                />
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="size-9 cursor-pointer rounded border-0 bg-transparent p-0"
                    aria-label="Cor da marca"
                  />
                  <Input
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="max-w-[120px] rounded-lg font-mono text-sm uppercase"
                    placeholder="#2482fa"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Tipografia da marca</Label>
              <Input
                value={brandTypography}
                onChange={(e) => setBrandTypography(e.target.value)}
                placeholder="Ex: Montserrat, Inter, Poppins"
                className="rounded-lg"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-lg gap-2"
              disabled={!clientId || savingPlatform === "assets"}
              onClick={handleSaveIdentity}
            >
              {savingPlatform === "assets" && <Loader2 className="size-4 animate-spin" />}
              {savingPlatform === "assets" ? "Salvando…" : "Salvar identidade"}
            </Button>
          </CardContent>
        </Card>

        {/* Materiais */}
        <Card className={cn(CARD_CLASS, "lg:col-span-2 xl:col-span-3")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutGrid className="size-4 text-[#2482fa]" />
              Materiais
            </CardTitle>
            <CardDescription>Brandbook, manuais e PDFs da marca</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#2482fa]/10 bg-muted/10 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <FileType className="size-4" />
                  Brandbook
                </div>
                <FileUpload key={fileKey} bucket={BUCKET} folder={brandbookFolder} />
              </div>
              <div className="rounded-xl border border-[#2482fa]/10 bg-muted/10 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                  <FileText className="size-4" />
                  Manuais da marca
                </div>
                <FileUpload key={fileKey} bucket={BUCKET} folder={manuaisFolder} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
