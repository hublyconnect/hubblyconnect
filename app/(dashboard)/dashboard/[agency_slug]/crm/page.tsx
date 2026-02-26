"use client";

import React, { useState, useRef, useEffect, useOptimistic, Component, type ReactNode } from "react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Send,
  MessageCircle,
  BadgeAlert,
  Loader2,
  CheckCheck,
  Paperclip,
  Mic,
  Square,
  FileText,
  Smile,
  Play,
  Pause,
  User,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCrmConversations } from "@/hooks/use-crm-conversations";
import { useCrmMessages, type CrmMessage } from "@/hooks/use-crm-messages";
import { sendWhatsAppReply, sendWhatsAppMedia } from "./actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

class MessageErrorBoundary extends Component<
  { fallback: ReactNode; messageId: string; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("MessageBubble render error:", this.props.messageId, error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 12) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length >= 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return d.toLocaleDateString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatBubbleTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitial(nameOrPhone: string): string {
  const n = nameOrPhone.trim();
  if (n.length === 0) return "?";
  const parts = n.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return n[0].toUpperCase();
}

export default function CrmPage({
  params,
}: {
  params: Promise<{ agency_slug: string }>;
}) {
  const [agencySlug, setAgencySlug] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [mediaPending, setMediaPending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    params.then((p) => setAgencySlug(p.agency_slug));
  }, [params]);

  const {
    conversations,
    isLoading: convLoading,
    isError: convError,
    error: convErrorDetail,
    refetch: refetchConversations,
  } = useCrmConversations();
  const {
    data: messages,
    isLoading: msgLoading,
    isError: msgError,
    refetch: refetchMessages,
  } = useCrmMessages(selectedId);

  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages ?? [],
    (state, newMsg: CrmMessage) => [...state, newMsg]
  );

  const displayMessages = selectedId ? optimisticMessages : [];

  const filtered = (conversations ?? []).filter((c) => {
    const q = search.toLowerCase();
    const name = (c.lead_name ?? "").toLowerCase();
    const phone = c.lead_phone.replace(/\D/g, "");
    const snippet = (c.lastMessageSnippet ?? "").toLowerCase();
    return name.includes(q) || phone.includes(q.replace(/\D/g, "")) || snippet.includes(q);
  });

  const selected = (conversations ?? []).find((c) => c.id === selectedId);
  const showChat = Boolean(selectedId && selected);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  const handleSend = () => {
    const body = messageInput.trim();
    if (!body || !selectedId) return;

    const tempMessage: CrmMessage = {
      id: `opt-${Date.now()}`,
      conversation_id: selectedId,
      sender_type: "agent",
      message_body: body,
      wa_message_id: null,
      created_at: new Date().toISOString(),
    };

    startTransition(async () => {
      addOptimisticMessage(tempMessage);
      setMessageInput("");

      const result = await sendWhatsAppReply(selectedId, body);
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ["crm-messages", selectedId] });
        queryClient.invalidateQueries({ queryKey: ["crm-conversations"] });
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    e.target.value = "";
    let mediaType: "image" | "audio" | "document" = "document";
    if (file.type.startsWith("image/")) mediaType = "image";
    else if (file.type.startsWith("audio/")) mediaType = "audio";

    const tempMessage: CrmMessage = {
      id: `opt-${Date.now()}`,
      conversation_id: selectedId,
      sender_type: "agent",
      message_body: mediaType === "image" ? "(imagem)" : mediaType === "audio" ? "(áudio)" : "(documento)",
      wa_message_id: null,
      media_url: URL.createObjectURL(file),
      media_type: mediaType,
      created_at: new Date().toISOString(),
    };

    startTransition(async () => {
      addOptimisticMessage(tempMessage);
      setMediaPending(true);
      try {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("mediaType", mediaType);
        const result = await sendWhatsAppMedia(selectedId, fd);
        if (result.ok) {
          queryClient.invalidateQueries({ queryKey: ["crm-messages", selectedId] });
          queryClient.invalidateQueries({ queryKey: ["crm-conversations"] });
          toast.success(result.message);
        } else {
          toast.error(result.error);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao enviar mídia.");
      } finally {
        setMediaPending(false);
      }
    });
  };

  const handleVoiceRecord = async () => {
    if (!selectedId) return;
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        setIsRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes("ogg") ? "ogg" : "webm";
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        const tempMessage: CrmMessage = {
          id: `opt-${Date.now()}`,
          conversation_id: selectedId!,
          sender_type: "agent",
          message_body: "(áudio)",
          wa_message_id: null,
          media_url: blobUrl,
          media_type: "audio",
          created_at: new Date().toISOString(),
        };
        startTransition(async () => {
          addOptimisticMessage(tempMessage);
          setMediaPending(true);
          try {
            const fd = new FormData();
            fd.set("file", file);
            fd.set("mediaType", "audio");
            const result = await sendWhatsAppMedia(selectedId!, fd);
            if (result.ok) {
              queryClient.invalidateQueries({ queryKey: ["crm-messages", selectedId] });
              queryClient.invalidateQueries({ queryKey: ["crm-conversations"] });
              toast.success(result.message);
            } else {
              toast.error(result.error);
            }
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao enviar áudio.");
          } finally {
            setMediaPending(false);
          }
        });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Microfone indisponível.");
    }
  };

  useEffect(() => {
    if (!isRecording) return;
    const r = mediaRecorderRef.current;
    return () => {
      if (r?.state === "recording") r.stop();
    };
  }, [isRecording]);

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[500px] gap-0 overflow-hidden rounded-xl border border-[#e9edef] bg-white shadow-sm">
      {/* Sidebar - WhatsApp Web style */}
      <aside className="flex w-80 shrink-0 flex-col border-r border-[#e9edef] bg-white">
        <div className="border-b border-[#e9edef] bg-[#f0f2f5] p-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#667781]" />
            <Input
              placeholder="Buscar ou iniciar nova conversa"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-lg border-0 bg-white pl-9 text-[15px] placeholder:text-[#667781] focus-visible:ring-1"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="divide-y divide-[#e9edef]">
            {convError ? (
              <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                <BadgeAlert className="size-10 text-amber-500" />
                <p className="text-sm text-zinc-600">
                  Não foi possível carregar as conversas.
                </p>
                <p className="text-xs text-zinc-400">
                  {convErrorDetail instanceof Error
                    ? convErrorDetail.message
                    : "Verifique sua conexão e tente novamente."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchConversations()}
                  className="mt-2"
                >
                  Tentar novamente
                </Button>
              </div>
            ) : convLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="size-[49px] rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-2 flex size-16 items-center justify-center rounded-full bg-[#dfe5e7]">
                  <User className="size-8 text-[#8696a0]" />
                </div>
                <p className="text-sm text-[#667781]">Nenhuma conversa ainda</p>
                <p className="mt-1 text-xs text-[#8696a0]">
                  Novas mensagens do WhatsApp aparecerão aqui
                </p>
              </div>
            ) : (
              filtered.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#f5f6f6]",
                    selectedId === conv.id && "bg-[#f0f2f5]"
                  )}
                >
                  <div className="flex size-[49px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dfe5e7] text-[17px] font-medium text-[#54656f]">
                    {getInitial(conv.lead_name || formatPhone(conv.lead_phone))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[17px] font-medium text-[#111b21]">
                        {conv.lead_name || formatPhone(conv.lead_phone)}
                      </span>
                      <span className="shrink-0 text-[12px] text-[#667781]">
                        {formatMessageTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <p className="truncate text-[14px] text-[#667781]">
                        {conv.lastMessageSnippet}
                      </p>
                      {conv.ad_id && (
                        <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800">
                          AD
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Main Chat */}
      <main className="flex flex-1 flex-col min-w-0">
        {!selected || !showChat ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-zinc-500">
            Selecione uma conversa
          </div>
        ) : (
          <>
            <header className="flex shrink-0 items-center gap-3 border-none bg-[#f0f2f5] px-4 py-3 shadow-[0_1px_0_0_rgba(0,0,0,0.08)]">
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dfe5e7] text-[17px] font-medium text-[#54656f]">
                {getInitial(selected.lead_name || formatPhone(selected.lead_phone))}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-zinc-900 dark:text-zinc-100">
                  {selected.lead_name || formatPhone(selected.lead_phone)}
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {formatPhone(selected.lead_phone)}
                  {selected.ad_id && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-900/50 dark:text-amber-400">
                      <BadgeAlert className="size-3" /> Anúncio
                    </span>
                  )}
                </p>
              </div>
              <span
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] font-medium text-zinc-500",
                  selected.status === "open" && "bg-zinc-200/80 text-zinc-600 dark:bg-zinc-700/50 dark:text-zinc-400"
                )}
              >
                {selected.status === "open" ? "Aberto" : selected.status}
              </span>
            </header>

            <ScrollArea
              className="relative flex-1 p-4"
              style={{
                backgroundColor: "#efeae2",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cg fill='%23d9d5d0' fill-opacity='0.2'%3E%3Ccircle cx='16' cy='16' r='0.8'/%3E%3Ccircle cx='48' cy='32' r='0.8'/%3E%3Ccircle cx='64' cy='64' r='0.8'/%3E%3Ccircle cx='32' cy='56' r='0.8'/%3E%3C/g%3E%3C/svg%3E")`,
                fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
              }}
            >
              <div className="space-y-1">
                {msgError ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <BadgeAlert className="size-10 text-amber-500" />
                    <p className="text-sm text-zinc-600">
                      Não foi possível carregar as mensagens.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchMessages()}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                ) : msgLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-zinc-400" />
                  </div>
                ) : displayMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageCircle className="mb-2 size-12 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm text-zinc-500">Nenhuma mensagem ainda</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Envie uma mensagem para iniciar a conversa
                    </p>
                  </div>
                ) : (
                  displayMessages.map((msg) => (
                    <MessageErrorBoundary
                      key={msg.id}
                      messageId={msg.id}
                      fallback={
                        <div className="flex w-full justify-center py-2">
                          <span className="rounded bg-zinc-200 px-3 py-1.5 text-xs text-zinc-500">
                            Mensagem indisponível
                          </span>
                        </div>
                      }
                    >
                      <MessageBubble
                        message={msg}
                        leadInitial={getInitial(selected.lead_name || formatPhone(selected.lead_phone))}
                      />
                    </MessageErrorBoundary>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <footer className="shrink-0 bg-[#f0f2f5] px-4 py-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="flex items-end gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 shrink-0 rounded-full text-[#54656f] hover:bg-[#e9edef] hover:text-[#111b21]"
                  disabled={pending || mediaPending}
                  aria-label="Emoji"
                >
                  <Smile className="size-6" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 shrink-0 rounded-full text-[#54656f] hover:bg-[#e9edef] hover:text-[#111b21]"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pending || mediaPending}
                  aria-label="Anexar arquivo"
                >
                  <Paperclip className="size-6" />
                </Button>
                <Textarea
                  placeholder="Digite uma mensagem"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={2}
                  className="min-h-[42px] flex-1 resize-none rounded-lg border-0 bg-white px-4 py-2.5 text-[15px] shadow-none placeholder:text-[#667781] focus-visible:ring-0"
                  style={{ fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif" }}
                  disabled={pending || mediaPending}
                />
                {messageInput.trim() ? (
                  <Button
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full bg-[#00a884] hover:bg-[#008f72]"
                    onClick={handleSend}
                    disabled={pending || mediaPending}
                    aria-label="Enviar"
                  >
                    {pending || mediaPending ? (
                      <Loader2 className="size-5 animate-spin text-white" />
                    ) : (
                      <Send className="size-5 rotate-[-45deg] text-white" />
                    )}
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-10 w-10 shrink-0 rounded-full",
                      isRecording
                        ? "bg-red-500 text-white hover:bg-red-600 hover:text-white"
                        : "text-[#54656f] hover:bg-[#e9edef] hover:text-[#111b21]"
                    )}
                    onClick={handleVoiceRecord}
                    disabled={pending || mediaPending}
                    aria-label={isRecording ? "Parar gravação" : "Enviar áudio"}
                  >
                    {isRecording ? (
                      <Square className="size-5 fill-current" />
                    ) : (
                      <Mic className="size-6" />
                    )}
                  </Button>
                )}
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

function WhatsAppAudioPlayer({
  src,
  isAgent,
  leadInitial,
}: {
  src: string;
  isAgent: boolean;
  leadInitial: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="flex min-w-[240px] max-w-[300px] items-center gap-3 py-1">
      {!isAgent && (
        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dfe5e7] text-xs font-medium text-[#54656f]">
          {leadInitial}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white hover:bg-[#008f72]"
            aria-label={isPlaying ? "Pausar" : "Reproduzir"}
          >
            {isPlaying ? (
              <Pause className="size-5 fill-current" />
            ) : (
              <Play className="size-5 fill-current" />
            )}
          </button>
          <div className="flex-1">
            <div className="h-1 w-full overflow-hidden rounded-full bg-[#e9edef]">
              <div
                className="h-full bg-[#00a884] transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <Mic
            className={cn(
              "size-5 shrink-0",
              isPlaying || progress > 0 ? "text-[#53bdeb]" : "text-[#8696a0]"
            )}
          />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, leadInitial }: { message: CrmMessage; leadInitial: string }) {
  if (!message || typeof message !== "object") return null;
  const isAgent = message.sender_type === "agent";
  const status = message.status ?? "sent";
  const isRead = status === "read";
  const mediaUrl = message.media_url ?? null;
  const mediaType = message.media_type ?? null;
  const messageBody = typeof message.message_body === "string" ? message.message_body : "";
  const createdAt = message.created_at && !Number.isNaN(Date.parse(String(message.created_at)))
    ? String(message.created_at)
    : new Date().toISOString();

  return (
    <div
      className={cn(
        "flex w-full",
        isAgent ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "relative max-w-[75%] px-2.5 py-1.5",
          isAgent
            ? "rounded-[8px_8px_2px_8px] bg-[#d9fdd3] [border-top-right-radius:2px]"
            : "rounded-[8px_8px_8px_2px] bg-white [border-top-left-radius:2px]"
        )}
        style={{
          boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
          fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
          fontSize: "14.2px",
        }}
      >
        {/* Tail - CSS pseudo-element style via span */}
        <span
          className={cn(
            "absolute top-0 size-0",
            isAgent ? "-right-[6px]" : "-left-[6px]"
          )}
          style={
            isAgent
              ? { borderStyle: "solid", borderColor: "transparent transparent transparent #d9fdd3", borderWidth: "6px 0 6px 6px" }
              : { borderStyle: "solid", borderColor: "transparent #ffffff transparent transparent", borderWidth: "6px 6px 6px 0" }
          }
          aria-hidden
        />
        {mediaType === "image" && mediaUrl && (
          <div className="relative overflow-hidden rounded-[4px] border border-[rgba(0,0,0,0.08)]">
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
              <img
                src={mediaUrl}
                alt={messageBody || "Imagem"}
                className="max-h-64 max-w-[300px] object-cover"
              />
            </a>
            <div className="absolute bottom-1 right-1 flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 text-[11px] text-white">
              <span>{formatBubbleTime(message.created_at)}</span>
              {isAgent && (
                <CheckCheck
                  className={cn("size-3.5 shrink-0", isRead ? "text-[#53bdeb]" : "text-white/80")}
                />
              )}
            </div>
          </div>
        )}
        {mediaType === "audio" && mediaUrl && (
          <WhatsAppAudioPlayer src={mediaUrl} isAgent={isAgent} leadInitial={leadInitial} />
        )}
        {mediaType === "document" && mediaUrl && (
          <a
            href={mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-1 flex items-center gap-2 text-[#0088cc] underline"
          >
            <FileText className="size-4 shrink-0" />
            <span className="truncate">{messageBody || "Documento"}</span>
          </a>
        )}
        {messageBody &&
          (mediaType !== "image" || messageBody !== "(imagem)") &&
          (mediaType !== "audio" || messageBody !== "(áudio)") && (
            <p className={cn("whitespace-pre-wrap break-words text-[#111b21]", mediaType === "image" && "mt-1")}>
              {messageBody}
            </p>
          )}
        {(mediaType !== "image" || !mediaUrl) && (
          <div className="mt-0.5 flex items-center justify-end gap-1.5">
            <span className="text-[11px] text-[#667781]">
              {formatBubbleTime(createdAt)}
            </span>
            {isAgent && mediaType !== "audio" && (
              <CheckCheck
                className={cn("size-3.5 shrink-0", isRead ? "text-[#53bdeb]" : "text-[#8696a0]")}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-24 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800/50">
        <MessageCircle className="size-12 text-zinc-400 dark:text-zinc-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          WhatsApp CRM
        </h3>
        <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          Selecione uma conversa na barra lateral para ver as mensagens e responder aos leads.
        </p>
      </div>
    </div>
  );
}
