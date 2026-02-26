"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AssetComment, AssetCommentWithAuthor } from "@/lib/types/database";

const QUERY_KEY = "asset-comments";

function getCommentsQueryKey(assetId: string | null) {
  return assetId ? [QUERY_KEY, assetId] : [QUERY_KEY];
}

function buildThread(flat: AssetComment[]): AssetCommentWithAuthor[] {
  const withReplies = flat.map((c) => ({
    ...c,
    author: { id: c.author_id, full_name: null as string | null },
    replies: [] as AssetCommentWithAuthor[],
  }));
  const byId = new Map(withReplies.map((c) => [c.id, c]));
  const roots: AssetCommentWithAuthor[] = [];
  for (const c of withReplies) {
    if (c.parent_id) {
      const parent = byId.get(c.parent_id);
      if (parent) parent.replies.push(c);
      else roots.push(c);
    } else roots.push(c);
  }
  roots.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  for (const r of roots) r.replies?.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return roots;
}

export function useAssetComments(assetId: string | null) {
  const supabase = createClient();
  const query = useQuery({
    queryKey: getCommentsQueryKey(assetId),
    queryFn: async (): Promise<AssetCommentWithAuthor[]> => {
      if (!assetId) return [];
      const { data: comments, error } = await supabase
        .from("asset_comments")
        .select("*")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const list = (comments ?? []) as AssetComment[];
      return buildThread(list);
    },
    enabled: !!assetId,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!assetId) return;
    const channel = supabase
      .channel(`asset_comments:${assetId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "asset_comments",
          filter: `asset_id=eq.${assetId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(assetId) });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [assetId, supabase, queryClient]);

  return query;
}

export function useAddAssetComment(assetId: string | null) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      content,
      parentId,
    }: {
      content: string;
      parentId?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !assetId) throw new Error("Não autorizado ou criativo não encontrado.");
      const { data, error } = await supabase
        .from("asset_comments")
        .insert({
          asset_id: assetId,
          author_id: user.id,
          parent_id: parentId ?? null,
          content,
        })
        .select()
        .single();
      if (error) throw error;
      return data as AssetComment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getCommentsQueryKey(assetId) });
    },
  });
}
