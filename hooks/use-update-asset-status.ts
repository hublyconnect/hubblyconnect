"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AssetStatus, CreativeAsset } from "@/lib/types/database";
const QUERY_KEY = "creative-assets";

function getAssetsQueryKey(clientId: string | null) {
  return clientId ? [QUERY_KEY, clientId] : [QUERY_KEY];
}

export function useUpdateAssetStatus(clientId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assetId,
      status,
    }: {
      assetId: string;
      status: AssetStatus;
    }) => {
      const { data, error } = await supabase
        .from("creative_assets")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", assetId)
        .select()
        .single();
      if (error) throw error;
      return data as CreativeAsset;
    },
    onMutate: async ({ assetId, status }) => {
      const key = getAssetsQueryKey(clientId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CreativeAsset[]>(key);
      queryClient.setQueryData<CreativeAsset[]>(key, (old) =>
        old
          ? old.map((a) => (a.id === assetId ? { ...a, status } : a))
          : []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          getAssetsQueryKey(clientId),
          context.previous
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: getAssetsQueryKey(clientId) });
    },
  });
}
