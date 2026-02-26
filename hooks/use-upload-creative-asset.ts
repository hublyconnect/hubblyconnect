"use client";

import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AssetType } from "@/lib/types/database";

const BUCKET = "portal-files";
const FOLDER = "creative-assets";
const STORAGE_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000; // 5 min para vídeos grandes

function isRetriableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes("timeout") ||
    lower.includes("payload too large") ||
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("econnreset") ||
    lower.includes("connection") ||
    lower.includes("413")
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Timeout no upload. Tente novamente.")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

export function useUploadCreativeAsset(clientId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      type,
      file,
      demandName,
      silent,
    }: {
      title: string;
      type: AssetType;
      file: File;
      demandName?: string | null;
      /** Se true, não dispara toast nem invalida cache (uso em upload em massa) */
      silent?: boolean;
    }) => {
      if (!clientId) throw new Error("Selecione um cliente");
      const ext = file.name.split(".").pop() ?? "";
      const basePath = `${FOLDER}/${clientId}/${Date.now()}-${title.replace(/\s+/g, "-")}`;
      const path = `${basePath}.${ext}`;

      const doUpload = async (uploadPath: string) => {
        const uploadPromise = supabase.storage
          .from(BUCKET)
          .upload(uploadPath, file, { upsert: false });
        const { error: uploadError } = await withTimeout(
          uploadPromise,
          STORAGE_UPLOAD_TIMEOUT_MS
        );
        if (uploadError) throw uploadError;
      };

      let finalPath = path;
      try {
        await doUpload(path);
      } catch (firstErr) {
        if (isRetriableError(firstErr)) {
          finalPath = `${basePath}-retry.${ext}`;
          await doUpload(finalPath);
        } else {
          throw firstErr;
        }
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(finalPath);
      const file_url = urlData.publicUrl;

      const { data, error } = await supabase
        .from("creative_assets")
        .insert({
          client_id: clientId,
          title,
          type,
          file_url,
          status: "pending",
          demand_name: demandName?.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      return { ...data, _silent: silent };
    },
    onSuccess: (_data, variables) => {
      if (variables.silent) return;
      queryClient.invalidateQueries({ queryKey: ["creative-assets", clientId] });
      toast.success("Novo criativo pronto para revisão", {
        description: variables.title,
      });
      triggerNewCreativeNotification(variables.title).catch(() => {});
    },
  });
}

async function triggerNewCreativeNotification(assetTitle: string) {
  const url = process.env.NEXT_PUBLIC_NOTIFY_NEW_CREATIVE_URL;
  if (!url) return;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "new_creative_ready_for_review",
      payload: { title: assetTitle },
    }),
  });
}
