"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Check,
  MessageSquare,
  RefreshCw,
  Loader2,
  Send as SendIcon,
  Plus,
  Trash2,
  Replace,
  Link2,
  Upload,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Pencil,
  PlayCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PortalAudioPlayer } from "@/components/portal-audio-player";
import { useCreativeAssets } from "@/hooks/use-creative-assets";
import { useAssetComments } from "@/hooks/use-asset-comments";
import { useUpdateAssetStatus } from "@/hooks/use-update-asset-status";
import { useAddAssetComment } from "@/hooks/use-asset-comments";
import { useUploadCreativeAsset } from "@/hooks/use-upload-creative-asset";
import { useRole } from "@/hooks/use-profile";
import { useClients, useAgencyBySlug } from "@/hooks/use-clients";
import { useQueryClient } from "@tanstack/react-query";
import type { CreativeAsset, AssetStatus, AssetType } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { deleteCreativeAssetAction, deleteFolderAction, updateFolderNameAction, resubmitAssetToPendingAction } from "@/app/(dashboard)/dashboard/[agency_slug]/revisao/actions";

const STATUS_LABEL: Record<AssetStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  revision_requested: "Ajuste Solicitado",
};

type FilterTab = "all" | "pending" | "approved" | "revision";

function filterAssetsByTab(assets: CreativeAsset[], tab: FilterTab): CreativeAsset[] {
  if (tab === "all") return assets;
  if (tab === "pending") return assets.filter((a) => a.status === "pending");
  if (tab === "approved") return assets.filter((a) => a.status === "approved");
  if (tab === "revision") return assets.filter((a) => a.status === "revision_requested");
  return assets;
}

const ACCEPT_MEDIA = "image/*,video/*";

function getAssetTypeFromFile(file: File): AssetType {
  return file.type.startsWith("video/") ? "video" : "image";
}

function titleFromFileName(name: string): string {
  return name.replace(/\.[^/.]+$/, "").trim() || name;
}

type BulkItemStatus = "pending" | "uploading" | "done" | "error";

interface BulkUploadItem {
  id: string;
  file: File;
  status: BulkItemStatus;
  error?: string;
}

function defaultDemandName(): string {
  return `Upload ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`;
}

function BulkDropzone({
  clientId,
  uploadAsset,
  onAllComplete,
  onNotifyAfterUpload,
  onNotifyWhenComplete,
  disabled,
}: {
  clientId: string;
  uploadAsset: ReturnType<typeof useUploadCreativeAsset>;
  onAllComplete: (folderName: string, count: number) => void;
  onNotifyAfterUpload?: (folderName: string, count: number) => void;
  /** Chamado automaticamente ao chegar a 100% se o checkbox "Notificar cliente após o upload" estiver marcado */
  onNotifyWhenComplete?: (folderName: string, count: number) => void;
  disabled?: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [items, setItems] = useState<BulkUploadItem[]>([]);
  const [demandName, setDemandName] = useState("");
  const [notifyAfterUpload, setNotifyAfterUpload] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveDemandName = demandName.trim() || defaultDemandName();

  const processNext = async () => {
    const next = items.find((i) => i.status === "pending");
    if (!next) {
      const allDone = items.every((i) => i.status === "done" || i.status === "error");
      const doneCount = items.filter((i) => i.status === "done").length;
      if (allDone) {
        onAllComplete(effectiveDemandName, doneCount);
        if (notifyAfterUpload && doneCount > 0 && onNotifyWhenComplete) {
          onNotifyWhenComplete(effectiveDemandName, doneCount);
        }
      }
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === next.id ? { ...i, status: "uploading" as BulkItemStatus } : i))
    );
    const title = titleFromFileName(next.file.name);
    const type = getAssetTypeFromFile(next.file);
    try {
      await uploadAsset.mutateAsync({
        title,
        type,
        file: next.file,
        demandName: effectiveDemandName,
        silent: true,
      });
      setItems((prev) =>
        prev.map((i) => (i.id === next.id ? { ...i, status: "done" as BulkItemStatus } : i))
      );
    } catch (err) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === next.id
            ? { ...i, status: "error" as BulkItemStatus, error: err instanceof Error ? err.message : "Erro ao enviar" }
            : i
        )
      );
    }
    // Próximo arquivo será iniciado pelo useEffect ao atualizar o state
  };

  const statusKey = items.map((i) => i.status).join(",");
  useEffect(() => {
    if (items.length === 0) return;
    const hasPending = items.some((i) => i.status === "pending");
    const hasUploading = items.some((i) => i.status === "uploading");
    if (hasPending && !hasUploading) processNext();
  }, [items.length, statusKey]);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (files.length === 0) {
      toast.error("Selecione apenas imagens ou vídeos.");
      return;
    }
    const newItems: BulkUploadItem[] = files.map((f, i) => ({
      id: `${f.name}-${Date.now()}-${i}`,
      file: f,
      status: "pending" as BulkItemStatus,
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const clearCompleted = () => {
    setItems((prev) => prev.filter((i) => i.status !== "done" && i.status !== "error"));
  };

  const doneCount = items.filter((i) => i.status === "done").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const pendingOrUploading = items.filter((i) => i.status === "pending" || i.status === "uploading").length;

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-2">
        <Label htmlFor="bulk-demand-name" className="text-xs font-medium text-slate-600">
          Nome da Pasta / Campanha (opcional)
        </Label>
        <Input
          id="bulk-demand-name"
          placeholder={defaultDemandName()}
          value={demandName}
          onChange={(e) => setDemandName(e.target.value)}
          className="h-9 text-sm"
        />
        <div className="flex items-center gap-2 pt-2">
          <Switch
            id="bulk-notify-after"
            checked={notifyAfterUpload}
            onCheckedChange={setNotifyAfterUpload}
          />
          <Label htmlFor="bulk-notify-after" className="text-xs font-normal cursor-pointer">
            Notificar cliente após o upload
          </Label>
        </div>
      </div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-6 px-4 transition-colors cursor-pointer",
          isDragOver && "border-[#3B82F6] bg-[#3B82F6]/5",
          !isDragOver && "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_MEDIA}
          multiple
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="size-8 text-slate-400 mb-2" />
        <p className="text-sm font-medium text-slate-600">
          Arraste criativos aqui ou clique para selecionar
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Imagens e vídeos · múltiplos arquivos · pasta: {effectiveDemandName}
        </p>
      </div>
      {items.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-slate-200/80 bg-white p-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-slate-600">
              {pendingOrUploading > 0
                ? `Enviando ${doneCount + errorCount + (items.length - doneCount - errorCount)} de ${items.length}`
                : `${items.length} arquivo(s)`}
            </span>
            {doneCount + errorCount === items.length && (
              <div className="flex items-center gap-2">
                {onNotifyAfterUpload && doneCount > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                    onClick={() => onNotifyAfterUpload(effectiveDemandName, doneCount)}
                  >
                    <SendIcon className="size-4" />
                    Notificar Cliente Agora
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs cursor-pointer"
                  onClick={clearCompleted}
                >
                  Limpar
                </Button>
              </div>
            )}
          </div>
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50/50 px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-800 truncate" title={item.file.name}>
                  {item.file.name}
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      item.status === "done" && "w-full bg-emerald-500",
                      item.status === "uploading" && "w-2/3 bg-[#3B82F6] animate-pulse",
                      item.status === "error" && "w-full bg-red-500",
                      item.status === "pending" && "w-0"
                    )}
                  />
                </div>
              </div>
              <span className="shrink-0">
                {item.status === "pending" && (
                  <span className="text-[10px] text-slate-400">na fila</span>
                )}
                {item.status === "uploading" && (
                  <Loader2 className="size-4 animate-spin text-[#3B82F6]" />
                )}
                {item.status === "done" && (
                  <Check className="size-4 text-emerald-600" />
                )}
                {item.status === "error" && (
                  <span title={item.error} className="inline-flex">
                    <AlertCircle className="size-4 text-red-500" />
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadAssetDialog({
  clientId,
  open,
  onOpenChange,
  uploadAsset,
  fileInputRef,
  trigger,
  isAdmin,
  demandOptions,
}: {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadAsset: ReturnType<typeof useUploadCreativeAsset>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  trigger: React.ReactNode;
  isAdmin?: boolean;
  demandOptions?: string[];
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AssetType>("image");
  const [file, setFile] = useState<File | null>(null);
  const [demandName, setDemandName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !file) {
      toast.error("Preencha o título e selecione um arquivo.");
      return;
    }
    uploadAsset.mutate(
      { title: title.trim(), type, file, demandName: demandName.trim() || null },
      {
        onSuccess: () => {
          setTitle("");
          setType("image");
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          onOpenChange(false);
        },
        onError: (err: Error) => toast.error(err.message),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar criativo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asset-title">Título</Label>
            <Input
              id="asset-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Banner 728x90"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === "image" ? "default" : "outline"}
                size="sm"
                onClick={() => setType("image")}
              >
                Imagem
              </Button>
              <Button
                type="button"
                variant={type === "video" ? "default" : "outline"}
                size="sm"
                onClick={() => setType("video")}
              >
                Vídeo
              </Button>
            </div>
          </div>
          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="asset-demand">Pasta / Demanda</Label>
              <select
                id="asset-demand"
                value={demandName}
                onChange={(e) => setDemandName(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {(demandOptions && demandOptions.length > 0 ? demandOptions : ["Sem pasta"]).map((d) => (
                  <option key={d} value={d === "Sem pasta" ? "" : d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="asset-file">Arquivo</Label>
            <Input
              id="asset-file"
              ref={fileInputRef}
              type="file"
              accept={type === "image" ? "image/*" : "video/*"}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={uploadAsset.isPending}>
              {uploadAsset.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              <span className="ml-1">Enviar</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Mini-card na lista (padrão Fila de Agendamento): thumbnail quadrado ou 9:16, nome, data, versão, status, ícone de comentário se em revisão */
function CreativeMiniCard({
  asset,
  isSelected,
  onSelect,
  onOpenComments,
  onResubmit,
  resubmitting,
}: {
  asset: CreativeAsset;
  isSelected: boolean;
  onSelect: () => void;
  onOpenComments: (e: React.MouseEvent) => void;
  onResubmit?: (e: React.MouseEvent) => void;
  resubmitting?: boolean;
}) {
  const isVideo = asset.type === "video";
  const statusStyle =
    asset.status === "approved"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
      : asset.status === "revision_requested"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
        : "bg-slate-100 text-slate-600 dark:text-slate-400 border-slate-200";
  const dateLabel = new Date(asset.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      className={cn(
        "flex flex-row items-center gap-3 w-full rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-sm transition-all duration-200",
        "hover:border-[#3B82F6] hover:shadow-md cursor-pointer",
        isSelected && "ring-2 ring-[#3B82F6] border-[#3B82F6]"
      )}
    >
      <div
        className={cn(
          "shrink-0 overflow-hidden rounded-lg bg-slate-100 relative",
          isVideo ? "aspect-[9/16] h-12" : "size-12 aspect-square"
        )}
      >
        {isVideo ? (
          <>
            <video
              src={asset.file_url}
              className="size-full object-cover"
              playsInline={true}
              muted={true}
              autoPlay={true}
              loop={true}
              {...({ "webkit-playsinline": "true" } as React.HTMLAttributes<HTMLVideoElement>)}
            />
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 pointer-events-none">
              <PlayCircle strokeWidth={1.5} className="w-6 h-6 text-white/80" />
            </div>
          </>
        ) : (
          <Image
            src={asset.file_url}
            alt={asset.title}
            width={48}
            height={48}
            className="size-full object-cover"
            unoptimized={asset.file_url.startsWith("blob:") || asset.file_url.includes("supabase")}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 truncate" title={asset.title}>
          {asset.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {dateLabel} · V{asset.version}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
            statusStyle
          )}
        >
          {STATUS_LABEL[asset.status]}
        </span>
        {asset.status === "revision_requested" && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-full text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 cursor-pointer"
              onClick={onOpenComments}
              aria-label="Ver comentários do cliente"
            >
              <MessageSquare className="size-4" />
            </Button>
            {onResubmit && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 text-xs"
                onClick={(e) => { e.stopPropagation(); onResubmit(e); }}
                disabled={resubmitting}
                aria-label="Enviar para nova aprovação"
              >
                {resubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                <span className="ml-1 hidden sm:inline">Enviar para nova aprovação</span>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export interface ApprovalGalleryProps {
  clientId: string | null;
  agencySlug?: string;
}

export function ApprovalGallery({ clientId, agencySlug }: ApprovalGalleryProps) {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [demandFilter, setDemandFilter] = useState<string>("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [revisionCommentAssetId, setRevisionCommentAssetId] = useState<string | null>(null);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [notifyPayload, setNotifyPayload] = useState<{ folderName: string; count: number } | null>(null);
  const [renameFolder, setRenameFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<string | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [resubmittingId, setResubmittingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isAdmin } = useRole();
  const { data: agency } = useAgencyBySlug(agencySlug || null);
  const { data: clients = [] } = useClients(agency?.id ?? null);
  const activeClient = clientId ? (clients.find((c) => c.id === clientId) ?? null) : null;
  const { data: assets = [], isLoading: assetsLoading } =
    useCreativeAssets(clientId);
  const { data: comments = [], isLoading: commentsLoading } =
    useAssetComments(selectedAssetId);
  const updateStatus = useUpdateAssetStatus(clientId);
  const addComment = useAddAssetComment(selectedAssetId);
  const uploadAsset = useUploadCreativeAsset(clientId);
  const queryClient = useQueryClient();

  const demandsRaw = Array.from(new Set(assets.map((a) => a.demand_name).filter((n): n is string => n != null && n.trim() !== "")));
  const demands = demandsRaw.slice().sort((a, b) => a.localeCompare(b));
  const demandOptionsForSelect = ["Sem pasta", ...demands];
  const filteredByDemand = demandFilter
    ? assets.filter((a) => a.demand_name === demandFilter)
    : assets;
  const filteredAssets = filterAssetsByTab(filteredByDemand, filterTab);
  const selectedAsset = assets.find((a) => a.id === selectedAssetId) ?? null;

  const assetsByFolder = useMemo(() => {
    const map = new Map<string, CreativeAsset[]>();
    for (const a of filteredAssets) {
      const key = a.demand_name?.trim() || "Sem pasta";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredAssets]);

  useEffect(() => {
    setSelectedAssetId(null);
    setRevisionCommentAssetId(null);
    setExpandedFolder(null);
    setNotifyPayload(null);
    setRenameFolder(null);
    setRenameValue("");
    setDeleteFolderConfirm(null);
    setReplyToId(null);
    setCommentDraft("");
  }, [clientId]);

  const handleCopyClientLink = () => {
    if (!agencySlug || !clientId) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/${agencySlug}/revisao?clientId=${clientId}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copiado para a área de transferência."),
      () => toast.error("Não foi possível copiar o link.")
    );
  };

  const handleApprove = () => {
    if (!selectedAssetId) return;
    updateStatus.mutate({ assetId: selectedAssetId, status: "approved" });
  };

  const handleReject = () => {
    if (!selectedAssetId) return;
    updateStatus.mutate({
      assetId: selectedAssetId,
      status: "revision_requested",
    });
  };

  const handleResubmit = async (assetId: string) => {
    if (!agencySlug) return;
    setResubmittingId(assetId);
    try {
      const result = await resubmitAssetToPendingAction(agencySlug, assetId);
      if (result.ok) {
        toast.success("Criativo enviado para nova aprovação.");
        queryClient.invalidateQueries({ queryKey: ["creative-assets", clientId] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      } else {
        toast.error(result.error);
      }
    } finally {
      setResubmittingId(null);
    }
  };

  const handleSubmitComment = () => {
    if (!commentDraft.trim() || !selectedAssetId) return;
    addComment.mutate(
      { content: commentDraft.trim(), parentId: replyToId },
      {
        onSuccess: () => {
          setCommentDraft("");
          setReplyToId(null);
        },
      }
    );
  };

  const handleBulkUploadComplete = (_folderName: string, _count: number) => {
    queryClient.invalidateQueries({ queryKey: ["creative-assets", clientId] });
    toast.success("Upload em massa concluído. Lista atualizada.");
  };

  const portalLink =
    agencySlug && clientId && typeof window !== "undefined"
      ? `${window.location.origin}/dashboard/${agencySlug}/revisao?clientId=${clientId}`
      : "";

  const buildNotifyMessage = (folderName: string, count: number) => {
    const clientName = activeClient?.name || "Cliente";
    return `Ei ${clientName}, tudo bem? Acabamos de subir a pasta "${folderName}", com ${count} arte${count !== 1 ? "s" : ""}. Já está disponível para aprovação aqui: ${portalLink}`;
  };

  const handleNotifyClient = (folderName: string, count: number) => {
    const portalUrl =
      agencySlug && clientId && typeof window !== "undefined"
        ? `${window.location.origin}/dashboard/${agencySlug}/revisao?clientId=${clientId}`
        : "";
    const clientName = activeClient?.name || "Cliente";
    const mensagem = `Ei ${clientName}, tudo bem? Acabamos de subir a pasta "${folderName}", com ${count} arte${count !== 1 ? "s" : ""}. Já está disponível para aprovação aqui: ${portalUrl}`;
    const phone = activeClient?.whatsapp?.replace(/\D/g, "") || "";
    if (!phone) {
      toast.error("Cliente não possui WhatsApp cadastrado.");
      return;
    }
    window.open(
      `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(mensagem)}`,
      "_blank"
    );
    setNotifyPayload(null);
  };

  const openWhatsApp = (folderName: string, count: number) => handleNotifyClient(folderName, count);

  const handleRenameFolder = async () => {
    if (!agencySlug || !clientId || !renameFolder || !renameValue.trim()) return;
    const oldNameForDb = renameFolder === "Sem pasta" ? "" : renameFolder;
    setRenaming(true);
    const result = await updateFolderNameAction(
      agencySlug,
      clientId,
      oldNameForDb,
      renameValue.trim()
    );
    setRenaming(false);
    setRenameFolder(null);
    setRenameValue("");
    if (result.ok) {
      toast.success("Pasta renomeada.");
      queryClient.invalidateQueries({ queryKey: ["creative-assets", clientId] });
    } else toast.error(result.error);
  };

  const openDeleteFolderConfirm = () => {
    if (renameFolder) setDeleteFolderConfirm(renameFolder);
  };

  const handleDeleteFolder = async () => {
    if (!agencySlug || !clientId || !deleteFolderConfirm) return;
    const demandNameForDb = deleteFolderConfirm === "Sem pasta" ? "" : deleteFolderConfirm;
    setDeletingFolder(true);
    const result = await deleteFolderAction(agencySlug, clientId, demandNameForDb);
    setDeletingFolder(false);
    setDeleteFolderConfirm(null);
    setRenameFolder(null);
    setRenameValue("");
    if (result.ok) {
      toast.success("Pasta e arquivos excluídos.");
      queryClient.invalidateQueries({ queryKey: ["creative-assets", clientId] });
    } else toast.error(result.error);
  };

  const handleRemove = () => {
    if (!selectedAssetId || !agencySlug) return;
    deleteCreativeAssetAction(agencySlug, selectedAssetId).then((r) => {
      if (r.ok) {
        toast.success("Criativo removido.");
        setSelectedAssetId(null);
        queryClient.invalidateQueries({ queryKey: ["creative-assets", clientId] });
      } else toast.error(r.error);
    });
  };

  if (!clientId && !isAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhum projeto atribuído.</p>
        </CardContent>
      </Card>
    );
  }

  if (!clientId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">Selecione um cliente para ver os criativos.</p>
        </CardContent>
      </Card>
    );
  }

  if (assetsLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Carregando criativos…
          </p>
        </CardContent>
      </Card>
    );
  }

  const emptyState = (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">Nenhum criativo para revisar.</p>
        {isAdmin && (
          <UploadAssetDialog
            clientId={clientId}
            open={uploadOpen}
            onOpenChange={setUploadOpen}
            uploadAsset={uploadAsset}
            fileInputRef={fileInputRef}
            trigger={
              <Button className="mt-4" size="sm">
                <Plus className="size-4" />
                <span className="ml-1">Enviar criativo</span>
              </Button>
            }
            isAdmin={isAdmin}
            demandOptions={demands}
          />
        )}
      </CardContent>
    </Card>
  );

  if (assets.length === 0) {
    return emptyState;
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "pending", label: "Pendentes" },
    { key: "approved", label: "Aprovados" },
    { key: "revision", label: "Em Revisão" },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-slate-200/80 bg-slate-50/50 p-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterTab(key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              filterTab === key
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista de mini-cards */}
        <div className="space-y-2 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/30 p-3 min-h-[200px]">
            {isAdmin && (
              <div className="mb-3 space-y-2">
                <BulkDropzone
                  clientId={clientId}
                  uploadAsset={uploadAsset}
                  onAllComplete={handleBulkUploadComplete}
                  onNotifyAfterUpload={(folderName, count) => setNotifyPayload({ folderName, count })}
                  onNotifyWhenComplete={handleNotifyClient}
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">ou</span>
                  <UploadAssetDialog
                    clientId={clientId}
                    open={uploadOpen}
                    onOpenChange={setUploadOpen}
                    uploadAsset={uploadAsset}
                    fileInputRef={fileInputRef}
                    trigger={
                      <Button type="button" variant="outline" size="sm" className="gap-1.5 cursor-pointer">
                        <Plus className="size-4" />
                        Enviar um criativo (título personalizado)
                      </Button>
                    }
                    isAdmin={isAdmin}
                    demandOptions={demands}
                  />
                </div>
              </div>
            )}
            <div className="space-y-1">
              {assetsByFolder.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum criativo nesta aba.
                </p>
              ) : (
                assetsByFolder.map(([folderName, folderAssets]) => {
                  const isOpen = expandedFolder === folderName;
                  const hasPending = folderAssets.some((a) => a.status === "pending");
                  const hasRevision = folderAssets.some((a) => a.status === "revision_requested");
                  const allApproved = folderAssets.every((a) => a.status === "approved");
                  const approvedCount = folderAssets.filter((a) => a.status === "approved").length;
                  const folderStatus = hasPending
                    ? "Pendente"
                    : hasRevision
                      ? "Ajuste Solicitado"
                      : allApproved
                        ? "Concluído"
                        : "Pendente";
                  const folderStatusClass =
                    folderStatus === "Concluído"
                      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
                      : folderStatus === "Ajuste Solicitado"
                        ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                        : "bg-slate-100 text-slate-600 border-slate-200";
                  const hasPendingInFolder = folderAssets.some((a) => a.status === "pending");
                  const canNotify = isAdmin && hasPendingInFolder;
                  return (
                    <div
                      key={folderName}
                      className="rounded-xl border border-slate-200/80 bg-white overflow-hidden"
                    >
                      <div className="flex w-full items-center gap-2 px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => setExpandedFolder((f) => (f === folderName ? null : folderName))}
                          className="flex flex-1 min-w-0 items-center gap-2 text-left hover:bg-slate-50/80 rounded-md transition-colors py-0.5 -mx-1 px-1"
                        >
                          {isOpen ? (
                            <ChevronDown className="size-4 shrink-0 text-slate-500" />
                          ) : (
                            <ChevronRight className="size-4 shrink-0 text-slate-500" />
                          )}
                          <FolderOpen
                            className={cn(
                              "size-4 shrink-0",
                              allApproved ? "text-emerald-500" : "text-slate-400"
                            )}
                          />
                          <span className="flex-1 truncate text-sm font-medium text-slate-800">
                            {folderName}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {folderAssets.length} arquivo{folderAssets.length !== 1 ? "s" : ""} • {approvedCount} aprovado{approvedCount !== 1 ? "s" : ""}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                              folderStatusClass
                            )}
                          >
                            {folderStatus}
                          </span>
                        </button>
                        {isAdmin && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 size-7 cursor-pointer text-muted-foreground hover:text-slate-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenameFolder(folderName);
                              setRenameValue(folderName);
                            }}
                            aria-label="Renomear pasta"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                        )}
                        {canNotify && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 h-7 text-xs gap-1.5 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotifyPayload({ folderName, count: folderAssets.length });
                            }}
                          >
                            <SendIcon className="size-3.5" />
                            Enviar p/ Aprovação
                          </Button>
                        )}
                      </div>
                      {isOpen && (
                        <div className="border-t border-slate-100 bg-slate-50/30 p-2 space-y-2">
                          {folderAssets.map((asset) => (
                            <CreativeMiniCard
                              key={asset.id}
                              asset={asset}
                              isSelected={asset.id === selectedAssetId}
                              onSelect={() => setSelectedAssetId(asset.id)}
                              onOpenComments={(e) => {
                                e.stopPropagation();
                                setRevisionCommentAssetId(asset.id);
                              }}
                              onResubmit={isAdmin && agencySlug ? (e) => { e.stopPropagation(); handleResubmit(asset.id); } : undefined}
                              resubmitting={resubmittingId === asset.id}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
          {/* Painel de detalhe do criativo selecionado */}
          {selectedAsset && (
            <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {selectedAsset.title}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    v{selectedAsset.version} · {STATUS_LABEL[selectedAsset.status]}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    "relative overflow-hidden rounded-xl bg-slate-100",
                    selectedAsset.type === "video"
                      ? "aspect-[9/16] max-h-[50vh] mx-auto w-full"
                      : "aspect-video max-h-[50vh] mx-auto w-full"
                  )}
                >
                  {selectedAsset.type === "image" ? (
                    <Image
                      src={selectedAsset.file_url}
                      alt={selectedAsset.title}
                      fill
                      className="object-contain"
                      unoptimized={selectedAsset.file_url.startsWith("blob:") || selectedAsset.file_url.includes("supabase")}
                      sizes="(max-width: 768px) 100vw, 66vw"
                    />
                  ) : (
                    <video
                      src={selectedAsset.file_url}
                      controls
                      className="size-full object-contain rounded-xl"
                      playsInline={true}
                      {...({ "webkit-playsinline": "true" } as React.HTMLAttributes<HTMLVideoElement>)}
                    />
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {isAdmin ? (
                    <>
                      {selectedAsset.status === "revision_requested" && (
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-2 bg-[#3B82F6] hover:bg-[#2563EB]"
                          onClick={() => handleResubmit(selectedAsset.id)}
                          disabled={resubmittingId === selectedAsset.id}
                        >
                          {resubmittingId === selectedAsset.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <RefreshCw className="size-4" />
                          )}
                          <span className="ml-1">Enviar para nova aprovação</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-2 bg-[#3B82F6] hover:bg-[#2563EB]"
                        onClick={handleCopyClientLink}
                      >
                        <Link2 className="size-4" />
                        Gerar Link para Cliente
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setUploadOpen(true)}
                      >
                        <Replace className="size-4" />
                        <span className="ml-1">Substituir</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={handleRemove}
                      >
                        <Trash2 className="size-4" />
                        <span className="ml-1">Remover</span>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleApprove}
                        disabled={
                          selectedAsset.status === "approved" ||
                          updateStatus.isPending
                        }
                      >
                        {updateStatus.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        <span className="ml-1">Aprovar</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleReject}
                        disabled={
                          selectedAsset.status === "revision_requested" ||
                          updateStatus.isPending
                        }
                      >
                        <RefreshCw className="size-4" />
                        <span className="ml-1">Solicitar revisão</span>
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: comentários (só quando criativo selecionado) */}
        <div className="lg:col-span-1">
          <Card className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white">
            <CardHeader className="border-b border-slate-100 py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4" />
                Comentários
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
              {!selectedAssetId ? (
                <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
                  Selecione um criativo para ver e adicionar comentários.
                </div>
              ) : (
                <>
                  <ScrollArea className="flex-1 px-4 py-2">
                    {commentsLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        Nenhum comentário ainda.
                      </p>
                    ) : (
                      <ul className="space-y-3 pb-4">
                        {comments.map((c) => (
                          <CommentThread
                            key={c.id}
                            comment={c}
                            onReply={() => {
                              setReplyToId(c.id);
                              setCommentDraft("");
                            }}
                          />
                        ))}
                      </ul>
                    )}
                  </ScrollArea>
                  <div className="border-t border-slate-100 p-3">
                    {replyToId && (
                      <p className="mb-2 text-xs text-muted-foreground">
                        Respondendo…
                      </p>
                    )}
                    <Textarea
                      placeholder="Adicione um comentário..."
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                    <Button
                      size="sm"
                      className="mt-2 w-full"
                      onClick={handleSubmitComment}
                      disabled={!commentDraft.trim() || addComment.isPending}
                    >
                      {addComment.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <SendIcon className="size-4" />
                      )}
                      <span className="ml-1">Enviar</span>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: comentários do cliente (quando clica no ícone de revisão) */}
      <Dialog open={!!revisionCommentAssetId} onOpenChange={(open) => !open && setRevisionCommentAssetId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="size-4" />
              O que o cliente escreveu
            </DialogTitle>
          </DialogHeader>
          {revisionCommentAssetId && (
            <RevisionCommentsList assetId={revisionCommentAssetId} />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: notificar cliente (mensagem para WhatsApp) */}
      <Dialog open={!!notifyPayload} onOpenChange={(open) => !open && setNotifyPayload(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar p/ Aprovação</DialogTitle>
            <DialogDescription>
              Mensagem que será enviada ao cliente:
            </DialogDescription>
          </DialogHeader>
          {notifyPayload && (
            <>
              <p className="text-sm text-slate-700 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 border border-slate-200">
                {buildNotifyMessage(notifyPayload.folderName, notifyPayload.count)}
              </p>
              <DialogFooter className="flex-row gap-2 sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setNotifyPayload(null)}>
                  Fechar
                </Button>
                <Button
                  type="button"
                  className="gap-2 bg-[#25D366] hover:bg-[#20BD5A] cursor-pointer"
                  onClick={() => openWhatsApp(notifyPayload.folderName, notifyPayload.count)}
                >
                  <SendIcon className="size-4" />
                  Enviar via WhatsApp
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: renomear pasta */}
      <Dialog open={!!renameFolder} onOpenChange={(open) => !open && setRenameFolder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear pasta</DialogTitle>
            <DialogDescription>
              Altere o nome da pasta. Todos os criativos desta pasta serão atualizados.
            </DialogDescription>
          </DialogHeader>
          {renameFolder && (
            <>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Nome da pasta"
                className="mt-2"
              />
              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between pt-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={openDeleteFolderConfirm}
                  disabled={renaming}
                  className="sm:mr-auto"
                >
                  <Trash2 className="size-4 mr-2" />
                  Excluir Pasta e Arquivos
                </Button>
                <div className="flex gap-2 sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => setRenameFolder(null)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleRenameFolder}
                    disabled={!renameValue.trim() || renaming}
                  >
                    {renaming ? <Loader2 className="size-4 animate-spin" /> : null}
                    Salvar
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão de pasta */}
      <Dialog open={!!deleteFolderConfirm} onOpenChange={(open) => !open && setDeleteFolderConfirm(null)}>
        <DialogContent className="sm:max-w-md" showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>Excluir pasta e arquivos</DialogTitle>
            <DialogDescription>
              Atenção: Esta ação é irreversível. Todos os {deleteFolderConfirm ? assets.filter((a) => (a.demand_name?.trim() || "Sem pasta") === deleteFolderConfirm).length : 0} arquivos desta pasta serão apagados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setDeleteFolderConfirm(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteFolder}
              disabled={deletingFolder}
            >
              {deletingFolder ? <Loader2 className="size-4 animate-spin" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function isAudioUrl(url: string): boolean {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    /\.(webm|mp3)(\?|$)/i.test(url)
  );
}

function CommentContent({
  content,
  fileUrl,
}: {
  content: string;
  fileUrl?: string | null;
}) {
  const audioSrc = fileUrl && isAudioUrl(fileUrl) ? fileUrl : content && isAudioUrl(content) ? content : null;
  if (audioSrc) {
    return <PortalAudioPlayer src={audioSrc} theme="light" className="mt-1" />;
  }
  return <p className="text-sm text-slate-800">{content}</p>;
}

function RevisionCommentsList({ assetId }: { assetId: string }) {
  const { data: comments = [], isLoading } = useAssetComments(assetId);
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (comments.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Nenhum comentário registrado.
      </p>
    );
  }
  return (
    <ScrollArea className="max-h-[50vh] pr-2">
      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">
              {new Date(c.created_at).toLocaleString("pt-BR")}
            </p>
            <CommentContent content={c.content} fileUrl={(c as { file_url?: string | null }).file_url} />
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}

function CommentThread({
  comment,
  onReply,
}: {
  comment: {
    id: string;
    content: string;
    created_at: string;
    file_url?: string | null;
    author?: { id: string; full_name: string | null } | null;
    replies?: Array<{
      id: string;
      content: string;
      created_at: string;
      file_url?: string | null;
      author?: { id: string; full_name: string | null } | null;
    }>;
  };
  onReply: () => void;
}) {
  const name =
    comment.author?.full_name ?? comment.author?.id?.slice(0, 8) ?? "Usuário";
  return (
    <li className="space-y-2">
      <div className="flex gap-2">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="text-xs">
            {name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium">{name}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(comment.created_at).toLocaleString("pt-BR")}
          </p>
          <div className="mt-0.5">
            <CommentContent content={comment.content} fileUrl={comment.file_url} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onReply}
          >
            Responder
          </Button>
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <ul className="ml-6 space-y-2 border-l-2 border-muted pl-3">
          {comment.replies.map((r) => (
            <li key={r.id} className="flex gap-2">
              <Avatar className="size-6 shrink-0">
                <AvatarFallback className="text-[10px]">
                  {(r.author?.full_name ?? r.author?.id?.slice(0, 8) ?? "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("pt-BR")}
                </p>
                <CommentContent content={r.content} fileUrl={r.file_url} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
