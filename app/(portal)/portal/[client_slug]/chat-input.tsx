"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Mic, Send, Loader2, Trash2 } from "lucide-react";
import {
  uploadCommentAttachmentAction,
  submitAssetRevisionAction,
} from "./actions";
import type { PortalComment } from "./actions";

type Props = {
  assetId: string;
  clientSlug: string;
  value: string;
  onChange: (v: string) => void;
  onSubmitText: () => void;
  onAttachmentSuccess: (comment: PortalComment, assetId?: string) => void;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
};

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function ChatInputWithAttachments({
  assetId,
  clientSlug,
  value,
  onChange,
  onSubmitText,
  onAttachmentSuccess,
  disabled = false,
  inputRef,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingActionRef = useRef<"send" | "cancel" | null>(null);

  const stopRecording = useCallback((action: "send" | "cancel") => {
    pendingActionRef.current = action;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const fileList = Array.from(files);
    e.target.value = "";
    setUploading(true);
    const { toast } = await import("sonner");
    let successCount = 0;
    for (const file of fileList) {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await uploadCommentAttachmentAction(clientSlug, assetId, fd);
      if (!uploadRes.ok) {
        toast.error(uploadRes.error);
        continue;
      }
      const revRes = await submitAssetRevisionAction(
        clientSlug,
        assetId,
        uploadRes.url
      );
      if (revRes.ok) {
        onAttachmentSuccess(
          {
            id: `upload-${Date.now()}-${successCount}`,
            content: uploadRes.url,
            sender_type: "client",
            created_at: new Date().toISOString(),
          },
          assetId
        );
        successCount += 1;
      } else {
        toast.error(revRes.error);
      }
    }
    setUploading(false);
  };

  const processAudioBlob = useCallback(
    async (blob: Blob) => {
      if (blob.size < 100) {
        const { toast } = await import("sonner");
        toast.error("Gravação muito curta.");
        return;
      }
      setUploading(true);
      const mime = blob.type || "audio/webm";
      const ext = mime.includes("mp3") || mime.includes("mpeg") ? "mp3" : "webm";
      const file = new File([blob], `audio.${ext}`, { type: mime.split(";")[0] });
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await uploadCommentAttachmentAction(clientSlug, assetId, fd);
      if (!uploadRes.ok) {
        setUploading(false);
        const { toast } = await import("sonner");
        toast.error(uploadRes.error);
        return;
      }
      const revRes = await submitAssetRevisionAction(
        clientSlug,
        assetId,
        uploadRes.url
      );
      setUploading(false);
      if (revRes.ok) {
        onAttachmentSuccess(
          {
            id: `audio-${Date.now()}`,
            content: uploadRes.url,
            sender_type: "client",
            created_at: new Date().toISOString(),
          },
          assetId
        );
      } else {
        const { toast } = await import("sonner");
        toast.error(revRes.error);
      }
    },
    [clientSlug, assetId, onAttachmentSuccess]
  );

  const handleMicClick = async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      streamRef.current = stream;
      mr.onstop = async () => {
        if (pendingActionRef.current === "send") {
          const blob = new Blob(chunksRef.current, { type: mime.split(";")[0] });
          await processAudioBlob(blob);
        }
        pendingActionRef.current = null;
      };
      mr.start(100);
      setRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch (err) {
      const { toast } = await import("sonner");
      toast.error("Não foi possível acessar o microfone.");
    }
  };


  const handleSend = () => {
    if (value.trim()) onSubmitText();
  };

  const isSendDisabled =
    disabled || uploading || (!value.trim() && !recording);

  return (
    <div className="flex gap-2 items-end">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,image/*,audio/*"
        className="hidden"
        multiple
        onChange={handleFileSelect}
      />
      {/* Clipe à esquerda, próximo ao campo */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 shrink-0 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 self-end"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        aria-label="Anexar arquivo"
      >
        <Paperclip className="size-4" />
      </Button>
      {/* Área central: input ou barra de gravação */}
      <div className="flex-1 min-w-0 flex gap-2 items-end">
        {recording ? (
          <div className="flex items-center gap-3 py-2 px-3 rounded-xl border border-red-500/30 bg-red-500/5 animate-[recording-scale_1.5s_ease-in-out_infinite] flex-1 min-h-10">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/20"
              onClick={() => stopRecording("cancel")}
              disabled={uploading}
              aria-label="Cancelar gravação"
            >
              <Trash2 className="size-4" />
            </Button>
            <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
              <span
                className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0"
                aria-hidden
              />
              <span className="text-sm font-medium text-red-400 tabular-nums">
                {formatRecordingTime(recordingSeconds)}
              </span>
            </div>
          </div>
        ) : (
          <Textarea
            ref={inputRef}
            placeholder="Solicitar ajuste..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-10 resize-none bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-lg text-sm flex-1"
            disabled={disabled}
            rows={2}
          />
        )}
      </div>
      {/* Microfone e Enviar alinhados à direita */}
      <div className="flex items-center gap-1 shrink-0 self-end">
        {!recording && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-transform active:scale-95"
            onClick={handleMicClick}
            disabled={disabled || uploading}
            aria-label="Gravar áudio"
          >
            <Mic className="size-4" />
          </Button>
        )}
        <Button
          size="icon"
          className="h-10 w-10 shrink-0 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-lg shadow-amber-400/20"
          onClick={recording ? () => stopRecording("send") : handleSend}
          disabled={recording ? uploading : isSendDisabled}
          aria-label={recording ? "Enviar áudio" : "Enviar"}
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Send className="size-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
