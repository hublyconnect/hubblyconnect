"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Upload, FileIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FileUploadProps = {
  bucket: string;
  folder: string;
  className?: string;
  /** Se true, apenas lista arquivos (ex.: arquivos enviados pela agência) */
  readOnly?: boolean;
  /** Ref opcional para o input file (ex.: para disparar clique do card de Logotipo) */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /** Chamado após upload concluído com sucesso (ex.: para atualizar preview do logo) */
  onUploadSuccess?: () => void;
};

type FileItem = {
  name: string;
  path: string;
  id: string;
};

function getSupabaseClient() {
  try {
    return createClient();
  } catch {
    return null;
  }
}

export function FileUpload({
  bucket,
  folder,
  className,
  readOnly = false,
  inputRef,
  onUploadSuccess,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const supabase = getSupabaseClient();
  const localInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    if (!supabase) {
      setError("Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local");
      setLoaded(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: listError } = await supabase.storage
        .from(bucket)
        .list(folder, { limit: 100 });

      if (listError) {
        setError(listError.message);
        setFiles([]);
        return;
      }

      const items: FileItem[] = (data ?? [])
        .filter((f) => f.name && !f.name.startsWith("."))
        .map((f) => ({
          name: f.name,
          path: `${folder}/${f.name}`,
          id: f.id ?? f.name,
        }));
      setFiles(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar arquivos");
      setFiles([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [bucket, folder, supabase]);

  // Reset lista e recarrega quando a pasta (ex.: clientId no path) mudar
  useEffect(() => {
    setLoaded(false);
    setFiles([]);
    setError(null);
  }, [folder]);

  useEffect(() => {
    if (!loaded && readOnly) {
      loadFiles().finally(() => setLoaded(true));
    } else if (!loaded && !readOnly) {
      loadFiles().finally(() => setLoaded(true));
    }
  }, [readOnly, loaded, loadFiles]);

  const handleDownload = useCallback(
    async (path: string) => {
      if (!supabase) return;
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    },
    [bucket, supabase]
  );

  if (readOnly) {
    return (
      <FileList
        bucket={bucket}
        folder={folder}
        onLoad={loadFiles}
        loading={loading}
        files={files}
        error={error}
        loaded={loaded}
        onDownload={handleDownload}
        className={className}
      />
    );
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const selected = input.files;
    if (!selected?.length || !supabase) return;

    setUploading(true);
    setError(null);

    let uploaded = 0;
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      const path = `${folder}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: false });

      if (uploadError) {
        setError(uploadError.message);
        toast.error(uploadError.message);
        break;
      }
      uploaded++;
    }

    setUploading(false);
    input.value = "";
    await loadFiles();
    if (uploaded > 0) {
      toast.success("Arquivo(s) enviado(s) com sucesso.");
      onUploadSuccess?.();
    }
  }

  async function handleRemove(path: string) {
    if (!supabase) return;
    setError(null);
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove([path]);
    if (removeError) setError(removeError.message);
    else setFiles((prev) => prev.filter((f) => f.path !== path));
  }

  return (
    <div className={cn("space-y-4", className)}>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <FileList
        bucket={bucket}
        folder={folder}
        onLoad={loadFiles}
        loading={loading}
        files={files}
        error={null}
        loaded={loaded}
        onRemove={readOnly ? undefined : handleRemove}
        onDownload={handleDownload}
      />
      {!readOnly && (
        <>
          <input
            ref={(el) => {
              (localInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
              if (inputRef) (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
            }}
            type="file"
            multiple
            className="sr-only"
            onChange={handleUpload}
            disabled={uploading || !supabase}
            aria-label="Selecionar arquivo"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!supabase || uploading}
            className="w-full border-dashed cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              localInputRef.current?.click();
            }}
          >
            <span className="flex items-center justify-center gap-2">
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {uploading ? "Enviando…" : "Adicionar Arquivo"}
            </span>
          </Button>
        </>
      )}
    </div>
  );
}

function FileList({
  bucket,
  folder,
  onLoad,
  loading,
  files,
  error,
  loaded,
  onRemove,
  onDownload,
  className,
}: {
  bucket: string;
  folder: string;
  onLoad: () => void;
  loading: boolean;
  files: FileItem[];
  error: string | null;
  loaded: boolean;
  onRemove?: (path: string) => void;
  onDownload?: (path: string) => void;
  className?: string;
}) {
  if (!loaded && loading) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Carregando arquivos…</span>
      </div>
    );
  }

  if (files.length === 0 && !error) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground",
          className
        )}
      >
        Nenhum arquivo nesta pasta.
        {onRemove && " Use o botão abaixo para adicionar."}
      </div>
    );
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {files.map((f) => (
        <li
          key={f.id}
          className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
        >
          <div className="flex min-w-0 items-center gap-2">
            <FileIcon className="size-4 shrink-0 text-muted-foreground" />
            <button
              type="button"
              onClick={() => onDownload?.(f.path)}
              className="truncate font-medium hover:underline cursor-pointer"
            >
              {f.name}
            </button>
          </div>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 cursor-pointer"
              onClick={() => onRemove(f.path)}
              aria-label="Remover arquivo"
            >
              <X className="size-4" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
