"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg"]);

function isImage(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext ? IMAGE_EXT.has(ext) : false;
}

export function LogoPreview({
  bucket,
  folder,
  className,
  onTriggerUpload,
}: {
  bucket: string;
  folder: string;
  className?: string;
  /** Se informado, o botão "Atualizar" dispara o seletor de arquivos em vez de só recarregar a lista */
  onTriggerUpload?: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: listError } = await supabase.storage.from(bucket).list(folder, { limit: 50 });
      if (listError) {
        setError(listError.message);
        setUrl(null);
        setPath(null);
        return;
      }
      const first = (data ?? []).find((f) => f.name && isImage(f.name));
      if (!first?.name) {
        setUrl(null);
        setPath(null);
        return;
      }
      const filePath = `${folder}/${first.name}`;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      setPath(filePath);
      setUrl(urlData.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
      setUrl(null);
      setPath(null);
    } finally {
      setLoading(false);
    }
  }, [bucket, folder]);

  // Recarrega quando a pasta (ex.: clientId no path) mudar
  useEffect(() => {
    load();
  }, [load, folder]);

  const handleDownload = async () => {
    if (!path || !url) return;
    try {
      const res = await fetch(url, { mode: "cors" });
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = path.split("/").pop() ?? "logo";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleAtualizar = () => {
    if (onTriggerUpload) onTriggerUpload();
    else load();
  };

  if (loading) {
    return (
      <div className={cn("flex aspect-video items-center justify-center rounded-xl border border-[#2482fa]/10 bg-muted/20", className)}>
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className={cn("flex flex-col aspect-video items-center justify-center gap-2 rounded-xl border border-[#2482fa]/10 bg-muted/20", className)}>
        <span className="text-sm text-muted-foreground">Nenhum logo enviado</span>
        <Button variant="ghost" size="sm" className="gap-1 cursor-pointer" onClick={handleAtualizar}>
          <RefreshCw className="size-4" />
          Atualizar
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-[#2482fa]/10 bg-muted/20", className)}>
      <div className="flex aspect-video items-center justify-center p-2">
        <img src={url} alt="Logo" className="max-h-full w-auto object-contain" />
      </div>
      <div className="absolute bottom-2 right-2 flex gap-1">
        <Button variant="secondary" size="sm" className="gap-1 rounded-lg shadow-soft cursor-pointer" onClick={handleDownload}>
          <Download className="size-4" />
          Baixar
        </Button>
        <Button variant="ghost" size="icon" className="size-8 rounded-lg cursor-pointer" onClick={handleAtualizar} aria-label="Atualizar ou enviar novo logo">
          <RefreshCw className="size-4" />
        </Button>
      </div>
    </div>
  );
}
