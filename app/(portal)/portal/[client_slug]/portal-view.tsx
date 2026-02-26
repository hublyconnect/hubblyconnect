"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  CheckCircle2,
  ExternalLink,
  LayoutDashboard,
  FileUp,
  Calendar,
  Loader2,
  Wallet,
  MessageSquareText,
  Sparkles,
  Settings,
  RotateCcw,
  BarChart3,
  Clock,
  CheckCircle,
  FolderOpen,
  ThumbsUp,
  ThumbsDown,
  Download,
  X,
  PlayCircle,
} from "lucide-react";
import type { Client } from "@/lib/types/database";
import type { CreativeAsset } from "@/lib/types/database";
import type { CalendarEvent } from "@/hooks/use-calendar-events";
import type { PortalOnboardingItem } from "./portal-data";
import type { RevisionRequestedItem } from "./portal-data";
import type { PortalComment } from "./actions";
import {
  updateAssetStatusFromPortalAction,
  submitAssetRevisionAction,
  getAssetCommentsAction,
  completeOnboardingItemWithFileAction,
  completeOnboardingItemWithCredentialsAction,
} from "./actions";
import { getDownloadUrlAction } from "./actions-download";
import { ChatInputWithAttachments } from "./chat-input";
import { PortalAudioPlayer } from "@/components/portal-audio-player";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Tab = "dashboard" | "arquivos" | "agenda" | "revisao" | "mensagens" | "galeria";

const PORTAL_SETTINGS_KEY = "hubly_portal_settings";

type PortalSettings = {
  theme: "dark" | "light";
  notificationsBudget: boolean;
  notificationsCreatives: boolean;
  remindersMeeting: boolean;
};

function getDefaultSettings(): PortalSettings {
  return {
    theme: "dark",
    notificationsBudget: true,
    notificationsCreatives: true,
    remindersMeeting: true,
  };
}

function loadPortalSettings(clientSlug: string): PortalSettings {
  if (typeof window === "undefined") return getDefaultSettings();
  try {
    const raw = localStorage.getItem(`${PORTAL_SETTINGS_KEY}_${clientSlug}`);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PortalSettings>;
      return { ...getDefaultSettings(), ...parsed };
    }
  } catch {
    // ignore
  }
  return getDefaultSettings();
}

type Props = {
  client: Client;
  clientSlug: string;
  pendingAssets: CreativeAsset[];
  upcomingEvents: CalendarEvent[];
  onboardingItems: PortalOnboardingItem[];
  revisionRequested: RevisionRequestedItem[];
  creativesWithComments: CreativeAsset[];
  approvedCreatives: { approved: number; total: number; pendingReview: number };
  approvedAssetsGrouped: { demandName: string | null; assets: CreativeAsset[] }[];
};

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes("video");
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url) || url.includes("image");
}

function isAudioUrl(url: string): boolean {
  return /\.(webm|ogg|m4a|mp3|mp4)(\?|$)/i.test(url) || url.includes("audio");
}

function isPdfUrl(url: string): boolean {
  return /\.(pdf)(\?|$)/i.test(url) || url.includes("pdf");
}

/** Itens de onboarding que usam formulário de credenciais em vez de upload. */
const CREDENTIALS_KEYWORDS_REGEX = /(senha|login|acesso|gerenciador|wordpress|crm|redes sociais)/i;

function isCredentialsOnboardingItem(label: string): boolean {
  return CREDENTIALS_KEYWORDS_REGEX.test(label ?? "");
}

function isContentImageUrl(content: string): boolean {
  return (
    typeof content === "string" &&
    content.startsWith("https://") &&
    /\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(content)
  );
}

function isContentAudioUrl(content: string): boolean {
  return (
    typeof content === "string" &&
    content.startsWith("https://") &&
    /\.(webm|mp3)(\?|$)/i.test(content)
  );
}

function ChatMessageBubble({ c, theme = "dark" }: { c: PortalComment; theme?: "light" | "dark" }) {
  const isClient = c.sender_type === "client";
  const hasFile = c.file_url && c.file_url.trim();
  const isImage = hasFile && isImageUrl(c.file_url!);
  const isContentImage = !hasFile && c.content && isContentImageUrl(c.content);
  const isAudio = hasFile && isAudioUrl(c.file_url!);
  const isContentAudio = !hasFile && c.content && isContentAudioUrl(c.content);
  const isPdf = hasFile && (isPdfUrl(c.file_url!) || (!isImage && !isAudio));
  const imgSrc = isImage ? c.file_url! : isContentImage ? c.content! : null;
  const audioSrc = isAudio ? c.file_url! : isContentAudio ? c.content! : null;

  return (
    <div
      className={`max-w-[85%] md:max-w-[280px] rounded-xl px-3 py-2 border border-zinc-800 shadow-lg ${
        isClient ? "bg-amber-500/10 text-amber-100 border-amber-500/20" : "bg-zinc-800/80 text-zinc-200"
      }`}
    >
      {imgSrc && (
        <a href={imgSrc} target="_blank" rel="noopener noreferrer" className="block mb-2 rounded-lg overflow-hidden max-w-[280px]">
          <img src={imgSrc} alt="Anexo" className="w-full h-auto object-contain max-h-48" />
        </a>
      )}
      {audioSrc && (
        <div className="mb-2 max-w-[280px]">
          <PortalAudioPlayer src={audioSrc} theme={theme} />
        </div>
      )}
      {!imgSrc && isPdf && (
        <a
          href={c.file_url!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-amber-400 hover:underline text-sm mb-1"
        >
          <FileUp className="size-4" />
          Abrir PDF
        </a>
      )}
      {c.content && !imgSrc && !audioSrc && <p className="text-sm">{c.content}</p>}
      <p className="text-[10px] text-zinc-500 mt-1">
        {new Date(c.created_at).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
        {isClient ? " · Você" : " · Agência"}
      </p>
    </div>
  );
}

function formatCountdown(startsAt: string): string {
  const now = new Date();
  const start = new Date(startsAt);
  const diff = start.getTime() - now.getTime();
  if (diff <= 0) return "Agora";
  const d = Math.floor(diff / (24 * 60 * 60 * 1000));
  const h = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const m = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

/** Gera ID único; evita crypto.randomUUID em contexto inseguro (HTTP, etc.). */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Math.random().toString(36).substring(2)}${Date.now().toString(36)}${Math.random().toString(36).substring(2)}`;
}

const SWIPE_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 500;

function SwipeableApprovalStack({
  assets,
  onApprove,
  onRequestRevision,
  updatingId,
  isVideoUrl,
  settingsTheme,
}: {
  assets: CreativeAsset[];
  onApprove: (assetId: string) => void;
  onRequestRevision: (asset: CreativeAsset) => void;
  updatingId: string | null;
  isVideoUrl: (url: string) => boolean;
  settingsTheme: "dark" | "light";
}) {
  const [exitingCard, setExitingCard] = useState<{ asset: CreativeAsset; direction: "left" | "right" } | null>(null);
  const topAsset = assets[0];
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const approveOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const rejectOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!topAsset) return;
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const shouldApprove = offset > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD;
    const shouldReject = offset < -SWIPE_THRESHOLD || velocity < -SWIPE_VELOCITY_THRESHOLD;

    if (shouldApprove) {
      setExitingCard({ asset: topAsset, direction: "right" });
    } else if (shouldReject) {
      setExitingCard({ asset: topAsset, direction: "left" });
    }
  };

  const handleExitComplete = () => {
    if (!exitingCard) return;
    if (exitingCard.direction === "right") {
      onApprove(exitingCard.asset.id);
    } else {
      onRequestRevision(exitingCard.asset);
    }
    setExitingCard(null);
  };

  const displayAsset = exitingCard ? exitingCard.asset : topAsset;
  if (!displayAsset) return null;

  const borderClass = settingsTheme === "light" ? "border-slate-200 bg-white" : "border-zinc-800 bg-zinc-900/50";
  const isExiting = exitingCard !== null;
  const exitX = exitingCard?.direction === "right" ? 400 : -400;

  return (
    <div className="relative w-full max-w-sm mx-auto min-h-[420px] flex items-center justify-center touch-none">
      {/* Cards empilhados (segundo e terceiro) */}
      {assets.slice(1, 3).map((asset, i) => (
        <motion.div
          key={asset.id}
          className={cn(
            "absolute inset-x-4 rounded-2xl border overflow-hidden shadow-lg",
            borderClass
          )}
          style={{
            width: "calc(100% - 2rem)",
            top: `${12 + i * 8}px`,
            bottom: `${12 + i * 8}px`,
            zIndex: assets.length - 1 - i,
            scale: 1 - (i + 1) * 0.05,
          }}
        >
          <div className="relative w-full h-0 pb-[56.25%] overflow-hidden rounded-t-2xl bg-zinc-800">
            {asset.type === "video" || isVideoUrl(asset.file_url) ? (
              <>
                <video
                  src={asset.file_url}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline={true}
                  muted={true}
                  autoPlay={true}
                  loop={true}
                  {...({ "webkit-playsinline": "true" } as React.HTMLAttributes<HTMLVideoElement>)}
                />
                <div className="absolute inset-0 w-full h-full z-10 flex items-center justify-center bg-black/20 pointer-events-none">
                  <PlayCircle strokeWidth={1.5} className="w-12 h-12 text-white/80" />
                </div>
              </>
            ) : (
              <img src={asset.file_url} alt={asset.title} className="absolute inset-0 w-full h-full object-cover" />
            )}
          </div>
          <div className="p-2 border-t border-zinc-800">
            <p className="text-xs font-medium text-zinc-200 truncate">{asset.title}</p>
          </div>
        </motion.div>
      ))}

      {/* Card principal (arrastável) */}
      <motion.div
        key={displayAsset.id}
        drag={!isExiting ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        onDragEnd={handleDragEnd}
        onDrag={(_, info) => {
          if (!isExiting) x.set(info.offset.x);
        }}
        onDragStart={() => x.set(0)}
        initial={{ x: 0, opacity: 1 }}
        animate={
          isExiting
            ? { x: exitX, opacity: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }
            : { x: 0, opacity: 1 }
        }
        onAnimationComplete={() => {
          if (isExiting) handleExitComplete();
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "absolute inset-x-4 rounded-2xl border overflow-hidden shadow-xl",
          !isExiting && "cursor-grab active:cursor-grabbing",
          borderClass
        )}
        style={{
          width: "calc(100% - 2rem)",
          zIndex: assets.length,
          rotate: isExiting ? 0 : rotate,
          x: isExiting ? undefined : x,
        }}
      >
        <div className="relative w-full h-0 pb-[56.25%] overflow-hidden rounded-t-2xl bg-zinc-800">
          {displayAsset.type === "video" || isVideoUrl(displayAsset.file_url) ? (
            <>
              <video
                src={displayAsset.file_url}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                playsInline={true}
                muted={true}
                autoPlay={true}
                loop={true}
                {...({ "webkit-playsinline": "true" } as React.HTMLAttributes<HTMLVideoElement>)}
              />
              <div className="absolute inset-0 w-full h-full z-10 flex items-center justify-center bg-black/20 pointer-events-none">
                <PlayCircle strokeWidth={1.5} className="w-12 h-12 text-white/80" />
              </div>
            </>
          ) : (
            <img
              src={displayAsset.file_url}
              alt={displayAsset.title}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
          )}
            {/* Overlays de direção */}
            <motion.div
              className="absolute inset-0 flex items-center justify-start pl-6 pointer-events-none"
              style={{ opacity: rejectOpacity }}
            >
              <div className="rounded-xl border-2 border-amber-500/80 bg-amber-500/20 px-4 py-2 -rotate-12">
                <span className="text-amber-400 font-bold text-sm">Ajustar</span>
              </div>
            </motion.div>
            <motion.div
              className="absolute inset-0 flex items-center justify-end pr-6 pointer-events-none"
              style={{ opacity: approveOpacity }}
            >
              <div className="rounded-xl border-2 border-emerald-500/80 bg-emerald-500/20 px-4 py-2 rotate-12">
                <span className="text-emerald-400 font-bold text-sm">Aprovar</span>
              </div>
            </motion.div>
          </div>
          <div className="p-3 border-t border-zinc-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-100 truncate flex-1">{displayAsset.title}</p>
            {updatingId === displayAsset.id && (
              <Loader2 className="size-5 animate-spin text-amber-400 shrink-0 ml-2" />
            )}
          </div>
        </motion.div>

      {/* Legenda */}
      <p className="absolute -bottom-8 left-0 right-0 text-center text-xs text-zinc-500">
        Deslize para a direita para aprovar · Esquerda para solicitar ajuste
      </p>
    </div>
  );
}

export function PortalView({
  client,
  clientSlug,
  pendingAssets,
  upcomingEvents,
  onboardingItems,
  revisionRequested,
  creativesWithComments,
  approvedCreatives,
  approvedAssetsGrouped,
}: Props) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [optimisticPending, setOptimisticPending] = useState<CreativeAsset[]>(pendingAssets);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<PortalSettings>(() => getDefaultSettings());

  useEffect(() => {
    setSettings(loadPortalSettings(clientSlug));
  }, [clientSlug]);

  // Aplica o tema via classes no root e no body (evita data-portal-theme que pode falhar no mobile)
  const themeClass = settings.theme === "light" ? "portal-theme-light" : "portal-theme-dark";
  useEffect(() => {
    document.body.classList.remove("portal-theme-light", "portal-theme-dark", "dark");
    document.body.classList.add(themeClass);
    if (settings.theme === "dark") document.body.classList.add("dark");
    return () => {
      document.body.classList.remove("portal-theme-light", "portal-theme-dark", "dark");
    };
  }, [themeClass, settings.theme]);

  const persistSettings = (next: PortalSettings) => {
    setSettings(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`${PORTAL_SETTINGS_KEY}_${clientSlug}`, JSON.stringify(next));
      } catch {
        // ignore
      }
    }
  };
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxAsset, setLightboxAsset] = useState<CreativeAsset | null>(null);
  const [downloadingAssetId, setDownloadingAssetId] = useState<string | null>(null);

  const [revisionSheetOpen, setRevisionSheetOpen] = useState(false);
  const [revisionAsset, setRevisionAsset] = useState<CreativeAsset | null>(null);
  const [mensagensSelectedAsset, setMensagensSelectedAsset] = useState<CreativeAsset | null>(null);
  const [revisionComment, setRevisionComment] = useState("");
  const [revisionSubmitting, setRevisionSubmitting] = useState(false);

  const [chatComments, setChatComments] = useState<PortalComment[]>([]);
  const [chatCommentsAssetId, setChatCommentsAssetId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  const router = useRouter();
  const onboardingFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingOnboardingId, setUploadingOnboardingId] = useState<string | null>(null);
  const [optimisticOnboarding, setOptimisticOnboarding] = useState<PortalOnboardingItem[]>(onboardingItems);
  const [credentialsItem, setCredentialsItem] = useState<PortalOnboardingItem | null>(null);
  const [credentialsLogin, setCredentialsLogin] = useState("");
  const [credentialsPassword, setCredentialsPassword] = useState("");
  const [credentialsTwoFactor, setCredentialsTwoFactor] = useState(false);
  const [credentialsSubmitting, setCredentialsSubmitting] = useState(false);

  useEffect(() => {
    setOptimisticOnboarding(onboardingItems);
  }, [onboardingItems]);

  const hasPending = optimisticPending.length > 0;

  const assetToLoadComments =
    revisionSheetOpen && revisionAsset
      ? revisionAsset
      : tab === "mensagens" && mensagensSelectedAsset
        ? mensagensSelectedAsset
        : null;

  useEffect(() => {
    if (!assetToLoadComments) {
      setChatComments([]);
      setChatCommentsAssetId(null);
      return;
    }
    setChatLoading(true);
    setChatCommentsAssetId(assetToLoadComments.id);
    getAssetCommentsAction(clientSlug, assetToLoadComments.id).then((res) => {
      setChatLoading(false);
      if (res.ok) setChatComments(res.comments);
      else setChatComments([]);
    });
  }, [assetToLoadComments?.id, clientSlug]);

  const openRevisionSheet = (asset: CreativeAsset) => {
    setRevisionAsset(asset);
    setRevisionComment("");
    setRevisionSheetOpen(true);
  };

  const closeRevisionSheet = () => {
    setRevisionSheetOpen(false);
    setRevisionAsset(null);
    setRevisionComment("");
  };

  const handleApprove = async (assetId: string) => {
    setUpdatingId(assetId);
    const result = await updateAssetStatusFromPortalAction(clientSlug, assetId, "approved");
    setUpdatingId(null);
    if (result.ok) {
      setOptimisticPending((prev) => prev.filter((a) => a.id !== assetId));
      toast.success("Aprovado!");
    } else toast.error(result.error);
  };

  const handleSubmitRevision = async () => {
    const targetAsset = revisionAsset ?? mensagensSelectedAsset ?? null;
    if (!targetAsset) return;
    setRevisionSubmitting(true);
    const result = await submitAssetRevisionAction(
      clientSlug,
      targetAsset.id,
      revisionComment
    );
    setRevisionSubmitting(false);
    if (result.ok) {
      setChatComments((prev) => [
        ...prev,
        {
          id: generateUUID(),
          content: revisionComment,
          sender_type: "client" as const,
          created_at: new Date().toISOString(),
        },
      ]);
      setRevisionComment("");
      if (revisionSheetOpen) {
        setOptimisticPending((prev) => prev.filter((a) => a.id !== targetAsset.id));
        setRevisionAsset(null);
        setRevisionSheetOpen(false);
      }
      toast.success("Ajuste enviado.");
    } else toast.error(result.error);
  };

  const onboardingPct =
    optimisticOnboarding.length > 0
      ? Math.round(
          (optimisticOnboarding.filter((i) => i.completed).length / optimisticOnboarding.length) * 100
        )
      : 0;

  const now = new Date();
  const calendarYear = now.getFullYear();
  const calendarMonth = now.getMonth();
  const calendarDays = useMemo(
    () => getCalendarDays(calendarYear, calendarMonth),
    [calendarYear, calendarMonth]
  );
  const eventDays = useMemo(() => {
    const set = new Set<number>();
    upcomingEvents.forEach((ev) => {
      const d = new Date(ev.starts_at);
      if (d.getFullYear() === calendarYear && d.getMonth() === calendarMonth)
        set.add(d.getDate());
    });
    return set;
  }, [upcomingEvents, calendarYear, calendarMonth]);

  const navItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "arquivos", label: "Onboarding", icon: FileUp },
    { id: "revisao", label: "Revisão", icon: RotateCcw },
    { id: "galeria", label: "Galeria", icon: FolderOpen },
    { id: "mensagens", label: "Mensagens", icon: MessageSquareText },
    { id: "agenda", label: "Agenda", icon: Calendar },
  ];

  const handleAttachmentSuccess = (comment: PortalComment, assetId?: string) => {
    setChatComments((prev) => [...prev, comment]);
    setRevisionComment("");
    if (assetId) {
      setOptimisticPending((prev) => prev.filter((a) => a.id !== assetId));
    }
  };

  const handleOnboardingEnviarClick = (item: PortalOnboardingItem) => {
    if (isCredentialsOnboardingItem(item.label)) {
      setCredentialsItem(item);
      setCredentialsLogin("");
      setCredentialsPassword("");
      setCredentialsTwoFactor(false);
      return;
    }
    setUploadingOnboardingId(item.id);
    onboardingFileInputRef.current?.click();
  };

  const handleCredentialsSubmit = async () => {
    if (!credentialsItem) return;
    setCredentialsSubmitting(true);
    try {
      const res = await completeOnboardingItemWithCredentialsAction(clientSlug, credentialsItem.id, {
        login: credentialsLogin,
        password: credentialsPassword,
        twoFactor: credentialsTwoFactor,
      });
      if (res.ok) {
        setOptimisticOnboarding((prev) =>
          prev.map((i) => (i.id === credentialsItem.id ? { ...i, completed: true } : i))
        );
        setCredentialsItem(null);
        toast.success("Credenciais enviadas com sucesso!");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setCredentialsSubmitting(false);
    }
  };

  const handleOnboardingFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const itemId = uploadingOnboardingId;
    setUploadingOnboardingId(null);
    if (!itemId) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !itemId) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await completeOnboardingItemWithFileAction(clientSlug, itemId, fd);
    if (res.ok) {
      setOptimisticOnboarding((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, completed: true } : i))
      );
      toast.success("Arquivo enviado!");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  };

  const handleGalleryDownload = async (asset: CreativeAsset) => {
    setDownloadingAssetId(asset.id);
    const res = await getDownloadUrlAction(clientSlug, asset.id, asset.file_url);
    if (!res.ok) {
      toast.error(res.error);
      setDownloadingAssetId(null);
      return;
    }
    try {
      const resp = await fetch(res.url);
      if (!resp.ok) throw new Error("Falha ao baixar");
      const blob = await resp.blob();
      const ext = asset.file_url.split(".").pop()?.split("?")[0] || (asset.type === "video" ? "mp4" : "jpg");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${asset.title.replace(/[^a-zA-Z0-9-_]/g, "_")}.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Download iniciado!");
    } catch {
      toast.error("Erro ao baixar o arquivo.");
    }
    setDownloadingAssetId(null);
  };

  const openMensagensChat = (asset: CreativeAsset) => {
    setTab("mensagens");
    setMensagensSelectedAsset(asset);
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setRevisionAsset(asset);
      setRevisionSheetOpen(true);
    }
  };

  const budgetTotal = Number(client.ad_budget_total) || 0;
  const budgetUsed = Number(client.ad_budget_used) || 0;
  const budgetPct = budgetTotal > 0 ? Math.min(100, (budgetUsed / budgetTotal) * 100) : 0;
  const budgetLow = budgetTotal > 0 && budgetPct >= 80;

  return (
    <div
      className={cn(
        "portal-root portal-theme-" + settings.theme,
        "flex flex-col flex-1 min-h-0 bg-black md:flex-row",
        settings.theme === "dark" && "dark"
      )}
    >
      {/* Sidebar — Desktop only */}
      <aside className="portal-sidebar hidden md:flex md:flex-col w-64 shrink-0 border-r border-zinc-800 bg-zinc-900/50 shadow-sm rounded-r-2xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400/90">
              Hubly
            </span>
            <p className="mt-1 text-sm font-medium text-zinc-400">Portal do Cliente</p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            aria-label="Configurações"
          >
            <Settings className="size-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors border border-transparent ${
                tab === item.id
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              <item.icon className="size-5 shrink-0" />
              {item.label}
            </button>
          ))}
          <Link
            href={`/portal/${clientSlug}/relatorios`}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          >
            <BarChart3 className="size-5 shrink-0" />
            Relatórios
          </Link>
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 truncate" title={client.name}>
            {client.name}
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <header className="md:hidden shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-800 gap-2">
          <span className="text-base font-semibold text-zinc-100 truncate min-w-0">
            {client.name}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              aria-label="Configurações"
            >
              <Settings className="size-5" />
            </button>
            <span className="text-[10px] font-medium text-amber-400/90 uppercase tracking-wider">
              Hubly
            </span>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden touch-pan-y flex flex-col">
          {/* ——— Dashboard (Overview + Aprovações + Tinder) ——— */}
          {tab === "dashboard" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto touch-pan-y">
              <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0 px-4 md:px-6 py-4 md:py-6" style={{ touchAction: "pan-y" }}>
                {/* Verba — full width */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Wallet className="size-5 text-amber-400" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-zinc-200">Verba de anúncios</h2>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {budgetTotal > 0
                            ? `R$ ${Number(budgetUsed).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R$ ${Number(budgetTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                            : "Não informado"}
                        </p>
                      </div>
                    </div>
                    {budgetLow && (
                      <span className="shrink-0 rounded-md bg-amber-500/20 px-2 py-1 text-[10px] font-semibold text-amber-400 uppercase tracking-wider border border-amber-500/30">
                        Verba acabando
                      </span>
                    )}
                  </div>
                  {budgetTotal > 0 && (
                    <div className="mt-4">
                      <Progress value={budgetPct} className="h-2 rounded-full" />
                    </div>
                  )}
                </div>

                {/* Cards: Aguardando Aprovação | Criativos Aprovados | Progresso do Onboarding */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-4">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-sm">
                    <Clock className="size-5 text-amber-400/80 mb-2" />
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Aguardando Aprovação</p>
                    <p className="text-lg font-bold text-zinc-100 mt-0.5">
                      {approvedCreatives.pendingReview}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-1">Total − Aprovados</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-sm">
                    <CheckCircle className="size-5 text-emerald-400/80 mb-2" />
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Criativos Aprovados</p>
                    <p className="text-lg font-bold text-zinc-100 mt-0.5">
                      {approvedCreatives.approved}/{approvedCreatives.total}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-sm">
                    <FileUp className="size-5 text-amber-400/80 mb-2" />
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Progresso do Onboarding</p>
                    <p className="text-sm font-bold text-zinc-100 mt-0.5">
                      {onboardingPct}%
                    </p>
                    <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${onboardingPct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1.5">
                      {optimisticOnboarding.length > 0
                        ? `${optimisticOnboarding.filter((i) => i.completed).length}/${optimisticOnboarding.length} itens`
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Grid de aprovações */}
                <div className="mt-4 md:mt-6 border-t border-zinc-800 pt-4 md:pt-6">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-300 mb-3">Criativos pendentes de aprovação</h3>
                    {hasPending ? (
                      <>
                        {/* Mobile: Tinder-style swipe stack */}
                        <div className="block md:hidden">
                          <SwipeableApprovalStack
                            assets={optimisticPending}
                            onApprove={handleApprove}
                            onRequestRevision={openRevisionSheet}
                            updatingId={updatingId}
                            isVideoUrl={isVideoUrl}
                            settingsTheme={settings.theme}
                          />
                        </div>
                        {/* Desktop: Grid com botões */}
                        <div className="hidden md:block">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {optimisticPending.map((asset) => (
                              <div
                                key={asset.id}
                                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden shadow-sm"
                              >
                                <div className="relative w-full h-0 pb-[56.25%] overflow-hidden rounded-t-2xl bg-zinc-800">
                                  {asset.type === "video" || isVideoUrl(asset.file_url) ? (
                                    <>
                                      <video
                                        src={asset.file_url}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        playsInline={true}
                                        muted={true}
                                        autoPlay={true}
                                        loop={true}
                                        {...({ "webkit-playsinline": "true" } as React.HTMLAttributes<HTMLVideoElement>)}
                                      />
                                      <div className="absolute inset-0 w-full h-full z-10 flex items-center justify-center bg-black/20 pointer-events-none">
                                        <PlayCircle strokeWidth={1.5} className="w-12 h-12 text-white/80" />
                                      </div>
                                    </>
                                  ) : (
                                    <img src={asset.file_url} alt={asset.title} className="absolute inset-0 w-full h-full object-cover" />
                                  )}
                                </div>
                                <div className="p-3 border-t border-zinc-800">
                                  <p className="font-semibold text-zinc-100 truncate text-sm">{asset.title}</p>
                                  {asset.demand_name && (
                                    <p className="text-xs text-zinc-500 truncate">{asset.demand_name}</p>
                                  )}
                                  <div className="flex gap-2 mt-3">
                                    <Button
                                      size="sm"
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                                      onClick={() => handleApprove(asset.id)}
                                      disabled={updatingId === asset.id}
                                    >
                                      {updatingId === asset.id ? (
                                        <Loader2 className="size-4 animate-spin" />
                                      ) : (
                                        <>
                                          <ThumbsUp className="size-4 mr-1" />
                                          Aprovar
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={
                                        settings.theme === "light"
                                          ? "flex-1 border-slate-300 text-slate-700 hover:bg-slate-100"
                                          : "flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                                      }
                                      onClick={() => openRevisionSheet(asset)}
                                    >
                                      <ThumbsDown className="size-4 mr-1" />
                                      Solicitar Ajuste
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 flex items-center justify-center">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-center"
                        >
                          <Sparkles className="size-12 text-amber-400/80 mx-auto mb-3" />
                          <h3 className="text-lg font-bold text-zinc-100">Pauta limpa!</h3>
                          <p className="text-sm text-zinc-500 mt-1">Nada pendente de aprovação.</p>
                        </motion.div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ——— Onboarding (Arquivos) ——— */}
          {tab === "arquivos" && (
            <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto touch-pan-y" style={{ touchAction: "pan-y" }}>
              <input
                ref={onboardingFileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                className="hidden"
                onChange={handleOnboardingFileSelect}
              />
              <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-sm">
                <p className="text-sm font-medium text-zinc-400">
                  {optimisticOnboarding.length > 0 ? (
                    <>Seu Onboarding está <span className="text-amber-400 font-semibold">{onboardingPct}%</span> concluído</>
                  ) : (
                    <>Nenhum item de onboarding solicitado pela agência.</>
                  )}
                </p>
                {optimisticOnboarding.length > 0 && (
                  <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-500"
                      style={{ width: `${onboardingPct}%` }}
                    />
                  </div>
                )}
              </div>
              <h1 className="text-xl font-bold text-zinc-100 mb-1">Arquivos solicitados</h1>
              <p className="text-sm text-zinc-500 mb-6">Envie os itens que a agência precisa.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {optimisticOnboarding.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-500 text-sm shadow-sm">
                    Nenhum item no momento.
                  </div>
                ) : (
                  optimisticOnboarding.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-sm hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border border-zinc-800 ${
                              item.completed
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            <FileUp className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-100 truncate">{item.label}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {item.completed ? "Enviado" : "Pendente"}
                            </p>
                          </div>
                        </div>
                        {!item.completed && (
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => handleOnboardingEnviarClick(item)}
                            disabled={uploadingOnboardingId === item.id}
                            className={cn(
                              "shrink-0 rounded-lg text-white",
                              settings.theme === "light"
                                ? "bg-[#0052FF] hover:bg-[#0046d9]"
                                : "bg-amber-500 hover:bg-amber-400 text-zinc-950"
                            )}
                          >
                            {uploadingOnboardingId === item.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : isCredentialsOnboardingItem(item.label) ? (
                              "Preencher"
                            ) : (
                              "Enviar"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ——— Revisão ——— */}
          {tab === "revisao" && (
            <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-5xl mx-auto touch-pan-y" style={{ touchAction: "pan-y" }}>
              <h1 className="text-xl font-bold text-zinc-100 mb-1">Em revisão pela agência</h1>
              <p className="text-sm text-zinc-500 mb-6">Criativos que você pediu para ajustar. Clique para abrir o chat.</p>
              {revisionRequested.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center text-zinc-500 text-sm shadow-sm">
                  Nenhum criativo em ajuste no momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {revisionRequested.map(({ asset, lastClientComment }) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => openMensagensChat(asset)}
                      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-0 overflow-hidden shadow-sm text-left hover:border-zinc-700 transition-colors"
                    >
                      <div className="relative w-full h-0 pb-[56.25%] overflow-hidden rounded-t-2xl bg-zinc-800">
                        {asset.type === "video" || isVideoUrl(asset.file_url) ? (
                          <>
                            <video
                              src={asset.file_url}
                              className="absolute inset-0 w-full h-full object-cover"
                              playsInline={true}
                              muted={true}
                              autoPlay={true}
                              loop={true}
                              {...({ "webkit-playsinline": "true" } as React.HTMLAttributes<HTMLVideoElement>)}
                            />
                            <div className="absolute inset-0 w-full h-full z-10 flex items-center justify-center bg-black/20 pointer-events-none">
                              <PlayCircle strokeWidth={1.5} className="w-12 h-12 text-white/80" />
                            </div>
                          </>
                        ) : (
                          <img src={asset.file_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="p-3 border-t border-zinc-800">
                        <p className="text-sm font-semibold text-zinc-100 truncate">{asset.title}</p>
                        {asset.demand_name && (
                          <p className="text-xs text-zinc-500 truncate">{asset.demand_name}</p>
                        )}
                        {lastClientComment && (
                          <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2" title={lastClientComment}>
                            <span className="text-zinc-500 font-medium">Seu pedido:</span> {lastClientComment}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ——— Galeria (Drive) ——— */}
          {tab === "galeria" && (
            <div className="p-4 md:p-6 pb-24 md:pb-6 max-w-6xl mx-auto touch-pan-y" style={{ touchAction: "pan-y" }}>
              <h1 className="text-xl font-bold text-zinc-100 mb-1">Galeria</h1>
              <p className="text-sm text-zinc-500 mb-6">Seus criativos aprovados, organizados por pasta.</p>
              {!approvedAssetsGrouped?.length ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-12 text-center text-zinc-500 text-sm shadow-sm">
                  Nenhum criativo aprovado ainda.
                </div>
              ) : (
                <div className="space-y-8">
                  {approvedAssetsGrouped.map(({ demandName, assets }) => (
                    <section key={demandName ?? "sem-pasta"}>
                      <div className="flex items-center gap-2 mb-4">
                        <FolderOpen className="size-5 text-zinc-500" />
                        <h2 className="text-sm font-semibold text-zinc-300">
                          {demandName ?? "Sem pasta"}
                        </h2>
                        <span className="text-xs text-zinc-500">({assets.length} arquivo{assets.length !== 1 ? "s" : ""})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {assets.map((asset) => (
                          <div
                            key={asset.id}
                            className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden shadow-sm hover:border-zinc-700 transition-colors flex flex-col"
                          >
                            <button
                              type="button"
                              onClick={() => setLightboxAsset(asset)}
                              className="flex-1 min-h-0 w-full text-left cursor-pointer"
                            >
                              <div className="relative w-full h-0 pb-[56.25%] overflow-hidden rounded-t-2xl bg-zinc-800">
                                {asset.type === "video" || isVideoUrl(asset.file_url) ? (
                                  <>
                                    <video
                                      src={asset.file_url}
                                      className="absolute inset-0 w-full h-full object-cover"
                                      playsInline={true}
                                      muted={true}
                                      autoPlay={true}
                                      loop={true}
                                      {...({ "webkit-playsinline": "true" } as React.HTMLAttributes<HTMLVideoElement>)}
                                    />
                                    <div className="absolute inset-0 w-full h-full z-10 flex items-center justify-center bg-black/20 pointer-events-none">
                                      <PlayCircle strokeWidth={1.5} className="w-12 h-12 text-white/80" />
                                    </div>
                                  </>
                                ) : (
                                  <img
                                    src={asset.file_url}
                                    alt={asset.title}
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <div className="p-2.5 border-t border-zinc-800">
                                <p className="text-xs font-medium text-zinc-200 truncate group-hover:text-zinc-100" title={asset.title}>
                                  {asset.title}
                                </p>
                              </div>
                            </button>
                            <div className="p-2.5 border-t border-zinc-800/50">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-amber-500 dark:text-zinc-950 dark:hover:bg-amber-400 shadow-sm transition-colors border-transparent"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleGalleryDownload(asset);
                                }}
                                disabled={downloadingAssetId === asset.id}
                              >
                                {downloadingAssetId === asset.id ? (
                                  <Loader2 className="size-4 animate-spin shrink-0" />
                                ) : (
                                  <Download className="size-4 shrink-0" />
                                )}
                                <span className="ml-2">Fazer Download</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ——— Mensagens ——— */}
          {tab === "mensagens" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 md:p-4 pb-24 md:pb-6">
              <h1 className="text-xl font-bold text-zinc-100 mb-1 shrink-0">Mensagens</h1>
              <p className="text-sm text-zinc-500 mb-4 shrink-0">Central de comunicação. Selecione um criativo para ver o chat.</p>
              {creativesWithComments.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-500 text-sm shadow-sm flex-1 flex items-center justify-center">
                  Nenhuma conversa no momento.
                </div>
              ) : (
                <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden max-w-4xl mx-auto w-full">
                  <div className="md:w-72 lg:w-80 shrink-0 overflow-y-auto space-y-2 pr-2">
                    {creativesWithComments.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => {
                          setMensagensSelectedAsset(asset);
                          if (typeof window !== "undefined" && window.innerWidth < 768) {
                            setRevisionAsset(asset);
                            setRevisionSheetOpen(true);
                          }
                        }}
                        className={`w-full rounded-xl border p-3 flex items-center gap-3 text-left transition-colors ${
                          mensagensSelectedAsset?.id === asset.id
                            ? "border-amber-500/40 bg-amber-500/10"
                            : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden shrink-0 relative">
                          {asset.type === "video" || isVideoUrl(asset.file_url) ? (
                            <>
                              <video
                                src={asset.file_url}
                                className="w-full h-full object-cover"
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
                            <img src={asset.file_url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-100 truncate">{asset.title}</p>
                          {asset.demand_name && (
                            <p className="text-xs text-zinc-500 truncate">{asset.demand_name}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="hidden md:flex flex-1 flex-col min-w-0 rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-sm overflow-hidden h-[calc(100vh-250px)]">
                    {mensagensSelectedAsset ? (
                      <>
                        <div className="shrink-0 px-4 py-3 border-b border-zinc-800">
                          <h3 className="text-sm font-semibold text-zinc-200">
                            Comentários · {mensagensSelectedAsset.title}
                          </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                          {chatLoading ? (
                            <div className="flex justify-center py-8">
                              <Loader2 className="size-6 animate-spin text-amber-400" />
                            </div>
                          ) : chatComments.length === 0 ? (
                            <p className="text-sm text-zinc-500">Nenhum comentário.</p>
                          ) : (
                            chatComments.map((c) => (
                              <div
                                key={c.id}
                                className={`flex ${c.sender_type === "client" ? "justify-start" : "justify-end"}`}
                              >
                                <ChatMessageBubble c={c} theme={settings.theme} />
                              </div>
                            ))
                          )}
                        </div>
                        <div className="shrink-0 p-4 border-t border-zinc-800">
                          <ChatInputWithAttachments
                            assetId={mensagensSelectedAsset.id}
                            clientSlug={clientSlug}
                            value={revisionComment}
                            onChange={setRevisionComment}
                            onSubmitText={handleSubmitRevision}
                            onAttachmentSuccess={handleAttachmentSuccess}
                            disabled={revisionSubmitting}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-8 text-zinc-500 text-sm">
                        Selecione um criativo para ver o chat.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ——— Agenda ——— */}
          {tab === "agenda" && (
            <div className="p-6 pb-24 md:pb-6 max-w-2xl mx-auto touch-pan-y" style={{ touchAction: "pan-y" }}>
              <h1 className="text-xl font-bold text-zinc-100 mb-1">Agenda</h1>
              <p className="text-sm text-zinc-500 mb-6">Próximos eventos.</p>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 mb-8 shadow-sm">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                  {new Date(calendarYear, calendarMonth).toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                    <span key={i} className="text-[10px] text-zinc-500 font-medium">
                      {d}
                    </span>
                  ))}
                  {calendarDays.map((d, i) =>
                    d === null ? (
                      <span key={`e-${i}`} />
                    ) : (
                      <span
                        key={d}
                        className={`inline-flex items-center justify-center h-8 w-8 rounded-lg text-sm ${
                          eventDays.has(d)
                            ? "bg-amber-500/20 text-amber-400 font-semibold"
                            : "text-zinc-500"
                        } ${d === now.getDate() && calendarMonth === now.getMonth() ? "ring-1 ring-amber-400/50" : ""}`}
                      >
                        {d}
                      </span>
                    )
                  )}
                </div>
              </div>

              {upcomingEvents.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-500 text-sm shadow-sm">
                  Nenhum evento agendado.
                </div>
              ) : (
                <ul className="space-y-3">
                  {upcomingEvents.map((ev, i) => {
                    const isNext = i === 0;
                    return (
                      <li
                        key={ev.id}
                        className={`rounded-2xl border p-4 shadow-sm ${
                          isNext
                            ? "border-amber-500/30 bg-amber-500/5 shadow-amber-500/5"
                            : "border-zinc-800 bg-zinc-900/50 shadow-black/10"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-zinc-800 ${
                              isNext ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            <Calendar className="size-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-zinc-100">{ev.title}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {new Date(ev.starts_at).toLocaleDateString("pt-BR", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            {isNext && (
                              <p className="text-amber-400 text-sm font-medium mt-1.5">
                                Em {formatCountdown(ev.starts_at)}
                              </p>
                            )}
                            {ev.meeting_url && (
                              <a
                                href={ev.meeting_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-amber-400 hover:underline mt-2 text-xs font-medium"
                              >
                                <ExternalLink className="size-3.5" />
                                Link da reunião
                              </a>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </main>

        {/* Bottom nav — Mobile only */}
        <nav className="md:hidden shrink-0 border-t border-zinc-800 bg-zinc-950/95">
          <div className="flex items-stretch">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${
                  tab === item.id ? "text-amber-400 portal-bottom-nav-active" : "text-zinc-500"
                }`}
              >
                <item.icon className="size-5" />
                {item.label}
              </button>
            ))}
            <Link
              href={`/portal/${clientSlug}/relatorios`}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium text-zinc-500 transition-colors"
            >
              <BarChart3 className="size-5" />
              Relatórios
            </Link>
          </div>
        </nav>
      </div>

      {/* Lightbox Galeria */}
      <Dialog open={!!lightboxAsset} onOpenChange={(open) => !open && setLightboxAsset(null)}>
        <DialogContent
          className={cn(
            "max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 overflow-hidden",
            settings.theme === "light"
              ? "border-slate-200 bg-white"
              : "border-zinc-800 bg-zinc-950"
          )}
        >
          {lightboxAsset && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{lightboxAsset.title}</DialogTitle>
              </DialogHeader>
              <div className="relative flex flex-col">
                <div
                  className={cn(
                    "flex items-center justify-center min-h-[50vh] max-h-[80vh] p-4",
                    settings.theme === "light" ? "bg-slate-50" : "bg-zinc-900"
                  )}
                >
                  {lightboxAsset.type === "video" || isVideoUrl(lightboxAsset.file_url) ? (
                    <video
                      src={lightboxAsset.file_url}
                      className="max-w-full max-h-[75vh] object-contain"
                      controls
                      autoPlay
                      playsInline={true}
                      {...({ "webkit-playsinline": "true" } as React.HTMLAttributes<HTMLVideoElement>)}
                    />
                  ) : (
                    <img
                      src={lightboxAsset.file_url}
                      alt={lightboxAsset.title}
                      className="max-w-full max-h-[75vh] object-contain"
                    />
                  )}
                </div>
                <div
                  className={cn(
                    "flex items-center justify-between gap-4 p-4 border-t",
                    settings.theme === "light" ? "border-slate-200" : "border-zinc-800"
                  )}
                >
                  <p
                    className={cn(
                      "text-sm font-medium truncate flex-1",
                      settings.theme === "light" ? "text-slate-900" : "text-zinc-200"
                    )}
                  >
                    {lightboxAsset.title}
                  </p>
                  <Button
                    onClick={() => handleGalleryDownload(lightboxAsset)}
                    disabled={downloadingAssetId === lightboxAsset.id}
                    className="shrink-0 bg-blue-600 text-white hover:bg-blue-700 dark:bg-amber-500 dark:text-zinc-950 dark:hover:bg-amber-400 shadow-sm transition-colors border-transparent"
                  >
                    {downloadingAssetId === lightboxAsset.id ? (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    ) : (
                      <Download className="size-4 mr-2" />
                    )}
                    Fazer Download
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: credenciais (login/senha) para itens de onboarding específicos */}
      <Dialog open={!!credentialsItem} onOpenChange={(open) => !open && setCredentialsItem(null)}>
        <DialogContent
          className={cn(
            "sm:max-w-md",
            settings.theme === "light"
              ? "border-slate-200 bg-white text-slate-900"
              : "border-zinc-800 bg-zinc-950 text-zinc-100"
          )}
        >
          <DialogHeader>
            <DialogTitle className={settings.theme === "light" ? "text-slate-900" : "text-zinc-100"}>
              {credentialsItem?.label ?? "Credenciais"}
            </DialogTitle>
            <DialogDescription className={settings.theme === "light" ? "text-slate-500" : "text-zinc-400"}>
              Preencha os dados solicitados pela agência. As informações são armazenadas de forma segura.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cred-login" className={settings.theme === "light" ? "text-slate-700" : "text-zinc-300"}>
                Usuário / Login
              </Label>
              <Input
                id="cred-login"
                type="text"
                value={credentialsLogin}
                onChange={(e) => setCredentialsLogin(e.target.value)}
                placeholder="Seu usuário ou e-mail"
                className={cn(
                  settings.theme === "light"
                    ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                    : "border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
                )}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cred-password" className={settings.theme === "light" ? "text-slate-700" : "text-zinc-300"}>
                Senha
              </Label>
              <Input
                id="cred-password"
                type="password"
                value={credentialsPassword}
                onChange={(e) => setCredentialsPassword(e.target.value)}
                placeholder="Sua senha"
                className={cn(
                  settings.theme === "light"
                    ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                    : "border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
                )}
                autoComplete="current-password"
              />
            </div>
            <div
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2",
                settings.theme === "light"
                  ? "border border-slate-200 bg-slate-50"
                  : "border border-zinc-800 bg-zinc-900/50"
              )}
            >
              <Label
                htmlFor="cred-2fa"
                className={cn("cursor-pointer flex-1", settings.theme === "light" ? "text-slate-700" : "text-zinc-300")}
              >
                Possui autenticação de 2 fatores?
              </Label>
              <Switch
                id="cred-2fa"
                checked={credentialsTwoFactor}
                onCheckedChange={setCredentialsTwoFactor}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className={
                settings.theme === "light"
                  ? "border-slate-300 text-slate-700 hover:bg-slate-100"
                  : "border-zinc-600 text-zinc-300 hover:bg-zinc-800"
              }
              onClick={() => setCredentialsItem(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className={cn(
                settings.theme === "light"
                  ? "bg-[#0052FF] hover:bg-[#0046d9]"
                  : "bg-amber-500 hover:bg-amber-400 text-zinc-950"
              )}
              onClick={handleCredentialsSubmit}
              disabled={credentialsSubmitting}
            >
              {credentialsSubmitting ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet: Chat de Ajuste — Mobile only */}
      <Sheet open={revisionSheetOpen} onOpenChange={(open) => !open && closeRevisionSheet()}>
        <SheetContent
          side="bottom"
          showCloseButton={true}
          className={cn(
            "h-[85vh] max-h-[85vh] rounded-t-2xl border-t p-0 flex flex-col",
            settings.theme === "light" ? "border-slate-200 bg-white" : "border-zinc-800 bg-zinc-950"
          )}
        >
          <SheetHeader
            className={cn(
              "p-4 border-b shrink-0",
              settings.theme === "light" ? "border-slate-200" : "border-zinc-800"
            )}
          >
            <SheetTitle
              className={cn(
                "text-left text-base",
                settings.theme === "light" ? "text-slate-900" : "text-zinc-100"
              )}
            >
              Ajuste: {revisionAsset?.title ?? ""}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-8 animate-spin text-amber-400" />
              </div>
            ) : (
              chatComments.map((c) => (
                <div
                  key={c.id}
                  className={`flex ${c.sender_type === "client" ? "justify-start" : "justify-end"}`}
                >
                  <div className="max-w-[85%]">
                    <ChatMessageBubble c={c} theme={settings.theme} />
                  </div>
                </div>
              ))
            )}
          </div>
          {revisionAsset && (
            <div
              className={cn(
                "p-4 border-t shrink-0",
                settings.theme === "light" ? "border-slate-200" : "border-zinc-800"
              )}
            >
              <ChatInputWithAttachments
                assetId={revisionAsset.id}
                clientSlug={clientSlug}
                value={revisionComment}
                onChange={setRevisionComment}
                onSubmitText={handleSubmitRevision}
                onAttachmentSuccess={handleAttachmentSuccess}
                disabled={revisionSubmitting}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet: Configurações */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent
          side="right"
          className={cn(
            "w-full max-w-sm",
            settings.theme === "light" ? "border-slate-200 bg-white" : "border-zinc-800 bg-zinc-950"
          )}
        >
          <SheetHeader
            className={cn(
              "border-b pb-4",
              settings.theme === "light" ? "border-slate-200" : "border-zinc-800"
            )}
          >
            <SheetTitle className={settings.theme === "light" ? "text-slate-900" : "text-zinc-100"}>
              Configurações
            </SheetTitle>
          </SheetHeader>
          <div className="p-6 space-y-6">
            {/* Tema */}
            <div className="flex items-center justify-between gap-4">
              <span className={cn("text-sm", settings.theme === "light" ? "text-slate-600" : "text-zinc-300")}>
                Tema
              </span>
              <div
                className={cn(
                  "flex rounded-lg overflow-hidden",
                  settings.theme === "light"
                    ? "border border-slate-200 bg-slate-100"
                    : "border border-zinc-700 bg-zinc-800/50"
                )}
              >
                <button
                  type="button"
                  onClick={() => persistSettings({ ...settings, theme: "dark" })}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    settings.theme === "dark" ? "bg-amber-500/20 text-amber-400" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Escuro
                </button>
                <button
                  type="button"
                  onClick={() => persistSettings({ ...settings, theme: "light" })}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    settings.theme === "light" ? "bg-amber-500/20 text-amber-400" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Claro
                </button>
              </div>
            </div>
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className={cn("text-sm", settings.theme === "light" ? "text-slate-600" : "text-zinc-300")}>
                Receber notificações de verba
              </span>
              <Switch
                checked={settings.notificationsBudget}
                onCheckedChange={(checked) => persistSettings({ ...settings, notificationsBudget: checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className={cn("text-sm", settings.theme === "light" ? "text-slate-600" : "text-zinc-300")}>
                Novos criativos disponíveis
              </span>
              <Switch
                checked={settings.notificationsCreatives}
                onCheckedChange={(checked) => persistSettings({ ...settings, notificationsCreatives: checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span className={cn("text-sm", settings.theme === "light" ? "text-slate-600" : "text-zinc-300")}>
                Lembretes de reunião
              </span>
              <Switch
                checked={settings.remindersMeeting}
                onCheckedChange={(checked) => persistSettings({ ...settings, remindersMeeting: checked })}
              />
            </label>
          </div>
          <p
            className={cn(
              "text-xs px-6 pb-6 pt-0 border-t",
              settings.theme === "light"
                ? "text-slate-500 border-slate-200"
                : "text-zinc-500 border-zinc-800"
            )}
          >
            Preferências salvas neste dispositivo.
          </p>
        </SheetContent>
      </Sheet>
    </div>
  );
}
