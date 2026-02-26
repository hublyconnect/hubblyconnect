"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, ImageIcon, Upload, Link2, RefreshCw, Trash2, Loader2, Info, Check, AlertCircle, PlusCircle, MoreVertical, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useActiveClient } from "@/contexts/active-client-context";
import { useRole } from "@/hooks/use-profile";
import { useClients, useAgencyBySlug } from "@/hooks/use-clients";
import { useScheduledPosts } from "@/hooks/use-scheduled-posts";
import { useFacebookAuth } from "@/hooks/use-facebook-auth";
import { useInstagramIntegration } from "@/hooks/use-instagram-integration";
import { schedulePostAction, deleteScheduledPostAction, getInstagramProfileAction, disconnectInstagramAction } from "./actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { InstagramMockup } from "@/components/InstagramMockup";
import type { ScheduledPost } from "@/hooks/use-scheduled-posts";
import type { Client } from "@/lib/types/database";

const BENTO_STATUS: Record<
  string,
  {
    label: (date?: string) => string;
    className: string;
    borderClassName: string;
    pulse: boolean;
    icon: React.ComponentType<{ className?: string }>;
    spinner?: boolean;
  }
> = {
  scheduled: {
    label: (date) => (date ? `Agendado para ${date}` : "Agendado"),
    className: "bg-[#E0F2FE]/90 text-[#0EA5E9] border-[#0EA5E9]/30 backdrop-blur-sm",
    borderClassName: "border-[#0EA5E9]/40",
    pulse: true,
    icon: CalendarIcon,
  },
  published: {
    label: () => "Publicado",
    className: "bg-emerald-50/90 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 backdrop-blur-sm",
    borderClassName: "border-emerald-500/40",
    pulse: false,
    icon: Check,
  },
  failed: {
    label: () => "Erro no envio",
    className: "bg-red-50/90 text-red-700 dark:text-red-400 border-red-500/30 backdrop-blur-sm",
    borderClassName: "border-red-500/40",
    pulse: false,
    icon: AlertCircle,
  },
  cancelled: {
    label: () => "Cancelado",
    className: "bg-slate-100/90 text-slate-600 border-slate-200 backdrop-blur-sm",
    borderClassName: "border-slate-200",
    pulse: false,
    icon: ImageIcon,
  },
  processing: {
    label: () => "Processando...",
    className: "bg-[#E0F2FE]/90 text-[#0EA5E9] border-[#0EA5E9]/30 backdrop-blur-sm",
    borderClassName: "border-[#0EA5E9]/40",
    pulse: false,
    icon: Loader2,
    spinner: true,
  },
};

function formatScheduledTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Hoje, ${time}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function KanbanMiniCard({
  post,
  clientName,
  onOpenDetail,
  onDelete,
  isDeleting,
}: {
  post: ScheduledPost;
  clientName?: string | null;
  onOpenDetail: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusConfig = BENTO_STATUS[post.status] ?? BENTO_STATUS.scheduled;
  const StatusIcon = statusConfig.icon;
  const timeLabel = formatScheduledTime(post.scheduled_at);
  const isVideo = !!post.media_url.match(/\.(mp4|webm|mov)$/i);
  const isReelsOrVideo = post.is_reels || isVideo;
  const caption = post.caption || "Sem legenda";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpenDetail()}
      className={cn(
        "flex flex-row items-center gap-3 w-full rounded-xl border-2 border-transparent bg-white p-2.5 shadow-sm transition-all duration-200",
        "hover:border-[#3B82F6] hover:shadow-md cursor-pointer"
      )}
    >
      {/* Miniatura: 9:16 para vídeo/Reels (Agendados e Publicados), quadrado para imagem; object-cover em ambos */}
      <div
        className={cn(
          "shrink-0 overflow-hidden rounded-lg bg-slate-100",
          isReelsOrVideo ? "aspect-[9/16] h-12" : "size-12 aspect-square"
        )}
      >
        {isVideo ? (
          <video src={post.media_url} className="size-full object-cover" muted playsInline />
        ) : (
          <img src={post.media_url} alt="" className="size-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 truncate" title={caption}>
          {caption}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{timeLabel}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span
          className={cn(
            "inline-flex items-center rounded-full p-1",
            post.status === "published" && "text-emerald-600",
            post.status === "failed" && "text-red-600",
            (post.status === "scheduled" || post.status === "processing") && "text-[#0EA5E9]",
            post.status === "cancelled" && "text-slate-500",
            statusConfig.pulse && "animate-pulse"
          )}
          title={statusConfig.label()}
        >
          {statusConfig.spinner ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin" />
          ) : (
            <StatusIcon className="size-3.5 shrink-0" />
          )}
        </span>
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={(e) => e.stopPropagation()}
              aria-label="Opções"
            >
              <MoreVertical className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-1" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 cursor-pointer"
              onClick={() => {
                setMenuOpen(false);
                onOpenDetail();
              }}
            >
              <Info className="size-4" />
              Ver detalhes
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Excluir
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function KanbanColumn({
  title,
  count,
  posts,
  clients,
  onOpenDetail,
  onDelete,
  deletingId,
}: {
  title: string;
  count: number;
  posts: ScheduledPost[];
  clients: Client[];
  onOpenDetail: (post: ScheduledPost) => void;
  onDelete: (postId: string) => void;
  deletingId: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 min-h-[200px]">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        {title} ({count})
      </h3>
      <div className="space-y-2">
        {posts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Nenhum item</p>
        ) : (
          posts.map((post) => {
            const postClient = clients.find((c) => c.id === post.client_id);
            return (
              <KanbanMiniCard
                key={post.id}
                post={post}
                clientName={postClient?.name}
                onOpenDetail={() => onOpenDetail(post)}
                onDelete={() => onDelete(post.id)}
                isDeleting={deletingId === post.id}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function KanbanColumnSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4 min-h-[200px]">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm">
            <Skeleton className="size-12 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="size-8 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AgendamentoPostsPage({
  params,
}: {
  params: Promise<{ agency_slug: string }>;
}) {
  const [slug, setSlug] = useState<string | null>(null);
  const { clientId: activeClientId, setClientId } = useActiveClient();
  const { profile, isAdmin } = useRole();
  const { data: agency } = useAgencyBySlug(slug);
  const { data: clients = [], invalidate: invalidateClients } = useClients(agency?.id ?? null);
  const clientId = isAdmin ? activeClientId : profile?.client_id ?? null;
  const activeClient = clients.find((c) => c.id === clientId) ?? null;
  const { data: scheduledPosts = [], isLoading: queueLoading, invalidate } = useScheduledPosts(clientId);
  const searchParams = useSearchParams();
  const { connectInstagram, canConnect } = useFacebookAuth(slug, clientId);
  const agencyId = agency?.id ?? null;
  const { invalidate: invalidateIntegration } = useInstagramIntegration(agencyId);

  useEffect(() => {
    params.then((p) => setSlug(p.agency_slug));
  }, [params]);
  useEffect(() => {
    if (isAdmin && clients.length > 0 && !activeClientId) setClientId(clients[0].id);
  }, [isAdmin, clients, activeClientId, setClientId]);

  useEffect(() => {
    const success = searchParams.get("success") === "true";
    if (success && slug) {
      toast.success("Conta conectada com sucesso!");
      window.history.replaceState({}, "", window.location.pathname);
      invalidateIntegration();
      invalidateClients?.();
    }
  }, [searchParams, slug, invalidateClients, invalidateClients]);

  const [caption, setCaption] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isReels, setIsReels] = useState(false);
  const [isVideoFile, setIsVideoFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sheetPost, setSheetPost] = useState<ScheduledPost | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const newPostCardRef = useRef<HTMLDivElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      selectedFileRef.current = file;
      const isVideo = file.type.startsWith("video/");
      setIsVideoFile(isVideo);
      setIsReels(isVideo);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleReplaceMedia = () => {
    fileInputRef.current?.click();
  };

  const resetForm = () => {
    setCaption("");
    setDateTime("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setIsReels(false);
    setIsVideoFile(false);
    selectedFileRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !clientId) {
      toast.error("Selecione um cliente para agendar.");
      return;
    }
    const file = selectedFileRef.current;
    if (!file?.size) {
      toast.error("Selecione uma mídia (imagem ou vídeo).");
      return;
    }
    if (!dateTime) {
      toast.error("Informe a data e hora do agendamento.");
      return;
    }
    setSubmitting(true);
    const formData = new FormData();
    formData.append("clientId", clientId);
    formData.append("caption", caption);
    formData.append("scheduledAt", dateTime);
    formData.append("isReels", isReels ? "1" : "0");
    formData.append("file", file);
    const result = await schedulePostAction(slug, formData);
    setSubmitting(false);
    if (result.ok) {
      toast.success("Post agendado com sucesso.");
      resetForm();
      invalidate();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!slug) return;
    setDeletingId(postId);
    const result = await deleteScheduledPostAction(slug, postId);
    setDeletingId(null);
    if (result.ok) {
      toast.success("Agendamento excluído.");
      invalidate();
    } else toast.error(result.error);
  };

  return (
    <div className="space-y-8 transition-all duration-[400ms]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Agendamento de Posts</h1>
        <p className="text-muted-foreground">
          Agende publicações com mídia, legenda e data. Conecte o Instagram do cliente no preview para publicar.
        </p>
        {isAdmin && !clientId && clients.length > 0 && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-500">
            Selecione um cliente no cabeçalho para agendar e ver a fila.
          </p>
        )}
      </div>

      {/* Linha 1: Formulário (esquerda) + Mockup iPhone (direita) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div ref={newPostCardRef}>
          <Card className="rounded-3xl border border-slate-200/60 bg-white shadow-sm shadow-blue-500/5 transition-all duration-[400ms] hover:shadow-md hover:shadow-blue-500/10">
          <CardHeader>
            <CardTitle>Novo post</CardTitle>
            <CardDescription>
              Envie a mídia, escreva a legenda e escolha data e hora
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSchedule} className="space-y-4">
              <div className="space-y-2">
                <Label>Mídia (imagem ou vídeo)</Label>
                <input
                  ref={fileInputRef}
                  id="agendamento-media"
                  type="file"
                  accept="image/*,video/*"
                  className="sr-only"
                  onChange={handleFile}
                />
                {!previewUrl ? (
                  <label
                    htmlFor="agendamento-media"
                    className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200/80 bg-gradient-to-b from-slate-50 to-white py-10 transition-all duration-[400ms] hover:from-sky-50/80 hover:to-blue-50/50 hover:border-sky-200/60 hover:shadow-sm hover:shadow-sky-500/10"
                  >
                    <Upload className="size-10 text-slate-400 transition-colors duration-[400ms] group-hover:text-sky-500" />
                    <span className="mt-2 text-sm font-medium text-slate-600">Clique para enviar</span>
                  </label>
                ) : (
                  <div className="relative rounded-xl border bg-muted/30 overflow-hidden">
                    <div className="aspect-video max-h-48 flex items-center justify-center bg-muted">
                      {previewUrl && (
                        isVideoFile ? (
                          <video src={previewUrl} className="max-h-48 w-full object-cover" controls playsInline />
                        ) : (
                          <img src={previewUrl} alt="Preview" className="max-h-48 object-contain" />
                        )
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-2 right-2 gap-1"
                      onClick={handleReplaceMedia}
                    >
                      <RefreshCw className="size-4" />
                      Substituir mídia
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                  <Info className="size-3.5 shrink-0 opacity-70" aria-hidden />
                  💡 Dica: Suportamos vídeos de até 200MB para garantir a melhor performance.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">Formato Reels (9:16)</Label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isReels}
                  onClick={() => setIsReels((v) => !v)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isReels ? "bg-primary" : "bg-input"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
                      isReels ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="caption">Legenda</Label>
                <Textarea
                  id="caption"
                  placeholder="Escreva a legenda do post..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                  className="rounded-lg resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="datetime">Data e hora</Label>
                <Input
                  id="datetime"
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="rounded-lg"
                />
              </div>
              {submitting && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-full animate-pulse rounded-full bg-primary/60" role="progressbar" aria-valuetext="Enviando mídia…" />
                </div>
              )}
              <Button
                type="submit"
                className="w-full rounded-xl gap-2 bg-[#3B82F6] hover:bg-[#2563EB] transition-all duration-[400ms]"
                disabled={submitting || !clientId}
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <CalendarIcon className="size-4" />}
                {submitting
                  ? (selectedFileRef.current?.size ?? 0) > 10 * 1024 * 1024
                    ? "Enviando mídia pesada…"
                    : "Agendando…"
                  : "Agendar post"}
              </Button>
            </form>
          </CardContent>
        </Card>
        </div>

        <Card className="rounded-3xl overflow-hidden border border-slate-200/60 bg-white shadow-sm shadow-blue-500/5 transition-all duration-[400ms] hover:shadow-md hover:shadow-blue-500/10">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Preview {isReels ? "(Reels)" : "(feed)"}
            </CardTitle>
            <CardDescription>
              {isReels
                ? "Simulação no formato Reels (9:16)"
                : "Simulação do post no feed"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center bg-gray-50/50 p-8">
            {/* Mockup usa apenas dados do cliente ativo (activeClient). Nunca fallback para conta Hubly/agência. */}
            <InstagramMockup
              mode={isReels ? "reels" : "feed"}
              username={
                activeClient?.instagram_handle
                  ? activeClient.instagram_handle
                  : clientId
                    ? "Perfil não conectado"
                    : undefined
              }
              profileImage={activeClient?.instagram_avatar_url ?? undefined}
              mediaUrl={previewUrl}
              isVideo={isVideoFile}
              caption={caption}
              isDisconnected={!!clientId && !activeClient?.instagram_handle}
              onConnectClick={
                clientId && canConnect
                  ? () => connectInstagram(clientId)
                  : undefined
              }
            />
          </CardContent>
        </Card>
      </div>

      <section>
        {/* Kanban: Agendados | Publicados */}
        <h2 className="text-lg font-semibold mb-4">Fluxo de Publicações</h2>
        {!clientId ? (
          <p className="text-sm text-muted-foreground">Selecione um cliente para ver a fila.</p>
        ) : queueLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <KanbanColumnSkeleton title="Agendados" />
            <KanbanColumnSkeleton title="Publicados" />
          </div>
        ) : scheduledPosts.length === 0 ? (
          <EmptyQueueState onCtaClick={() => newPostCardRef.current?.scrollIntoView({ behavior: "smooth" })} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <KanbanColumn
              title="Agendados"
              count={scheduledPosts.filter((p) => p.status !== "published").length}
              posts={scheduledPosts.filter((p) => p.status !== "published")}
              clients={clients}
              onOpenDetail={setSheetPost}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
            <KanbanColumn
              title="Publicados"
              count={scheduledPosts.filter((p) => p.status === "published").length}
              posts={scheduledPosts.filter((p) => p.status === "published")}
              clients={clients}
              onOpenDetail={setSheetPost}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          </div>
        )}
      </section>

      <Dialog open={!!sheetPost} onOpenChange={(open) => !open && setSheetPost(null)}>
        <DialogContent className={cn(
          "overflow-hidden p-0 gap-0",
          sheetPost && (sheetPost.is_reels || !!sheetPost.media_url?.match(/\.(mp4|webm|mov)$/i))
            ? "sm:max-w-[340px] md:max-w-[360px]"
            : "sm:max-w-md md:max-w-lg"
        )}>
          {sheetPost && (() => {
            const isReelsOrVideo = sheetPost.is_reels || !!sheetPost.media_url.match(/\.(mp4|webm|mov)$/i);
            const isVideo = !!sheetPost.media_url.match(/\.(mp4|webm|mov)$/i);
            return (
            <>
              <DialogHeader className="p-6 pb-0">
                <DialogTitle>Detalhes do agendamento</DialogTitle>
                <DialogDescription>
                  {(() => {
                    const c = clients.find((x) => x.id === sheetPost.client_id);
                    return c?.name ? `Cliente: ${c.name}` : "Agendamento";
                  })()}
                </DialogDescription>
              </DialogHeader>
              <div className="p-6 space-y-4 overflow-y-auto max-h-[85vh]">
                {/* Container de mídia: 9:16 para Reels/vídeo, quadrado para imagem */}
                <div
                  className={cn(
                    "relative w-full overflow-hidden rounded-2xl bg-slate-100 flex items-center justify-center",
                    isReelsOrVideo
                      ? "aspect-[9/16] max-h-[70vh] mx-auto w-full"
                      : "aspect-square max-h-[70vh] mx-auto w-full"
                  )}
                >
                  {isVideo ? (
                    <video
                      src={sheetPost.media_url}
                      className={cn(
                        "size-full rounded-2xl",
                        isReelsOrVideo ? "object-contain" : "object-cover"
                      )}
                      controls
                      playsInline
                    />
                  ) : (
                    <img
                      src={sheetPost.media_url}
                      alt=""
                      className="size-full object-cover rounded-2xl"
                    />
                  )}
                </div>
                <div className="space-y-3 pt-1">
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Legenda</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                      {sheetPost.caption || "Sem legenda"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CalendarIcon className="size-4 shrink-0" />
                    {new Date(sheetPost.scheduled_at).toLocaleString("pt-BR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  {sheetPost.status === "failed" && sheetPost.error_log && (
                    <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
                      <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-1">Log de erro</p>
                      <p className="text-xs text-red-700 dark:text-red-400 break-words">{sheetPost.error_log}</p>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="p-6 pt-4 flex-row gap-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setSheetPost(null);
                    // Editar: por ora só fecha; pode abrir form depois
                  }}
                >
                  <Pencil className="size-4" />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={async () => {
                    if (!sheetPost) return;
                    await handleDelete(sheetPost.id);
                    setSheetPost(null);
                  }}
                >
                  <Trash2 className="size-4" />
                  Excluir
                </Button>
              </DialogFooter>
            </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IPhoneMockup({
  isReels,
  previewUrl,
  isVideoFile,
  caption,
  dateTime,
  instagramUsername,
  instagramProfilePictureUrl,
}: {
  isReels: boolean;
  previewUrl: string | null;
  isVideoFile: boolean;
  caption: string;
  dateTime: string;
  instagramUsername?: string;
  instagramProfilePictureUrl?: string;
}) {
  const displayName = instagramUsername ?? "sua_conta";
  const displaySubtitle = instagramUsername ? "Instagram" : "Agência";

  return (
    <div
      className={cn(
        "relative mx-auto shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)]",
        isReels ? "w-full max-w-[280px]" : "max-w-[320px]"
      )}
    >
      {/* Corpo iPhone 16 Pro — Apple grade */}
      <div className="rounded-[3.5rem] border-[12px] border-[#0a0a0a] bg-[#121212] p-1.5 ring-2 ring-zinc-800">
        {/* Tela */}
        <div className="relative overflow-hidden rounded-[2.4rem] bg-white">
          {/* Dynamic Island */}
          <div className="absolute top-4 left-1/2 z-30 -translate-x-1/2" aria-hidden>
            <div className="h-7 w-28 rounded-full bg-black shadow-inner" />
          </div>
          {/* Reflexo de vidro */}
          <div className="pointer-events-none absolute top-0 left-0 h-1/2 w-full bg-gradient-to-tr from-white/10 to-transparent" aria-hidden />

          {/* Conteúdo do post — abaixo da Dynamic Island */}
          <div className="relative overflow-hidden pt-12">
            <div className="flex items-center gap-3 border-b p-3">
              {instagramProfilePictureUrl ? (
                <Avatar className="size-9 shrink-0 rounded-full border-2 border-border">
                  <AvatarImage src={instagramProfilePictureUrl} alt={displayName} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="size-9 shrink-0 rounded-full bg-gradient-to-br from-amber-400 via-pink-500 via-purple-500 to-primary p-[2px]">
                  <div className="flex size-full items-center justify-center rounded-full bg-muted">
                    <ImageIcon className="size-4 text-muted-foreground" />
                  </div>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground">{displaySubtitle}</p>
              </div>
            </div>
            <div
              className={
                isReels
                  ? "aspect-[9/16] bg-muted flex items-center justify-center overflow-hidden"
                  : "aspect-square bg-muted flex items-center justify-center overflow-hidden"
              }
            >
              {previewUrl ? (
                isVideoFile ? (
                  <video
                    src={previewUrl}
                    className="size-full object-cover"
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="size-full object-cover"
                  />
                )
              ) : (
                <span className="text-muted-foreground text-sm text-center px-4">
                  Mídia do post
                </span>
              )}
            </div>
            <div className="p-3 space-y-1">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                {caption || "Legenda do post aparecerá aqui."}
              </p>
              {dateTime && (
                <p className="text-xs text-muted-foreground pt-2">
                  Agendado: {new Date(dateTime).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyQueueState({ onCtaClick }: { onCtaClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/60 bg-white py-16 px-6 text-center shadow-sm shadow-blue-500/5 ring-1 ring-inset ring-slate-900/5">
      <div className="rounded-full bg-sky-50 p-6 mb-4">
        <PlusCircle className="size-12 text-[#3B82F6]" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">Nenhum agendamento na fila</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Crie seu primeiro agendamento para publicar no Instagram no horário que você escolher.
      </p>
      <Button
        type="button"
        onClick={onCtaClick}
        className="gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-lg shadow-sky-200 rounded-full px-8 transition-all duration-[400ms]"
      >
        <PlusCircle className="size-4" />
        Criar Primeiro Agendamento
      </Button>
    </div>
  );
}
