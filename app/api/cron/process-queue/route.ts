import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const META_GRAPH = "https://graph.facebook.com/v19.0";

/** Resolve Instagram Business User ID via Graph API (agency_integrations não tem a coluna). */
async function getInstagramBusinessId(accessToken: string): Promise<string | null> {
  const url = `${META_GRAPH}/me/accounts?fields=instagram_business_account{id}&limit=5&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  const json = (await res.json()) as {
    data?: Array<{ instagram_business_account?: { id: string } }>;
    error?: { message?: string };
  };
  if (!res.ok || json.error) {
    console.error("[Cron] getInstagramBusinessId failed:", json.error?.message);
    return null;
  }
  const pages = Array.isArray(json.data) ? json.data : [];
  for (const page of pages) {
    const id = page.instagram_business_account?.id;
    if (id) return id;
  }
  const bizUrl = `${META_GRAPH}/me/businesses?fields=owned_pages{instagram_business_account{id}}&access_token=${encodeURIComponent(accessToken)}`;
  const bizRes = await fetch(bizUrl);
  const bizJson = (await bizRes.json()) as {
    data?: Array<{ owned_pages?: { data?: Array<{ instagram_business_account?: { id: string } }> } }>;
    error?: { message?: string };
  };
  if (!bizRes.ok || bizJson.error) return null;
  const businesses = Array.isArray(bizJson.data) ? bizJson.data : [];
  for (const biz of businesses) {
    const pages = biz.owned_pages?.data;
    if (!Array.isArray(pages)) continue;
    for (const page of pages) {
      const id = page.instagram_business_account?.id;
      if (id) return id;
    }
  }
  return null;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    const { data: posts, error } = await supabase
      .from("post_scheduling")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString());

    if (error) throw error;
    if (!posts || posts.length === 0) {
      return NextResponse.json({ processed: 0, message: "Nenhum post na fila" });
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const post of posts) {
      try {
        console.log(
          `[Cron] Iniciando post ID: ${post.id} (${post.is_reels ? "REELS" : "FEED"})`
        );

        const { data: integration } = await supabase
          .from("agency_integrations")
          .select("access_token")
          .eq("agency_id", post.agency_id)
          .eq("provider", "instagram")
          .single();

        if (!integration?.access_token) {
          throw new Error("Integração com Instagram não encontrada ou incompleta.");
        }

        const access_token = integration.access_token;
        const instagram_business_id = await getInstagramBusinessId(access_token);
        if (!instagram_business_id) {
          throw new Error("Não foi possível obter o Instagram Business ID da agência.");
        }

        const mediaUrl = post.media_url;
        const caption = post.caption || "";

        // --- PASSO A: CRIAR CONTAINER ---
        const containerParams = new URLSearchParams({
          access_token,
          caption,
        });
        if (post.is_reels) {
          containerParams.append("media_type", "REELS");
          containerParams.append("video_url", mediaUrl);
        } else {
          containerParams.append("image_url", mediaUrl);
        }

        console.log("[Cron] Criando container no IG...");
        const containerRes = await fetch(
          `${META_GRAPH}/${instagram_business_id}/media?${containerParams.toString()}`,
          { method: "POST" }
        );
        const containerData = (await containerRes.json()) as {
          id?: string;
          error?: { message?: string };
        };

        if (!containerData.id) {
          console.error("[Cron] Erro Container:", containerData);
          throw new Error(
            containerData.error?.message || "Erro ao criar container (sem ID)"
          );
        }

        const creationId = containerData.id;
        console.log(`[Cron] Container criado com Sucesso! ID: ${creationId}`);

        // --- PASSO B: LOOP DE POLLING ATÉ CONTAINER FINISHED ---
        const maxAttempts = 60;
        const intervalMs = 5000;
        let statusCode: string | undefined;
        let attempt = 0;

        while (attempt < maxAttempts) {
          const statusUrl = `${META_GRAPH}/${creationId}?fields=status_code&access_token=${encodeURIComponent(access_token)}`;
          const statusRes = await fetch(statusUrl);
          const statusData = (await statusRes.json()) as {
            status_code?: string;
            error?: { message?: string };
          };

          if (statusData.error) {
            throw new Error(
              statusData.error.message || "Erro ao consultar status do container"
            );
          }

          statusCode = statusData.status_code;
          console.log(`Status: ${statusCode ?? "unknown"} - Tentativa ${attempt + 1}/${maxAttempts}`);
          console.log(`[Cron] Status do Container: ${statusCode ?? "unknown"} (tentativa ${attempt + 1}/${maxAttempts})`);

          if (statusCode === "FINISHED") {
            break;
          }
          if (statusCode === "ERROR") {
            throw new Error("Container em estado ERROR (mídia rejeitada ou falha no processamento).");
          }

          attempt++;
          if (attempt >= maxAttempts) {
            throw new Error(
              `Timeout: container não ficou FINISHED em ${(maxAttempts * intervalMs) / 1000}s (último status: ${statusCode ?? "unknown"})`
            );
          }

          console.log(`[Cron] Aguardando ${intervalMs / 1000}s para próxima verificação...`);
          await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }

        // --- PASSO C: PUBLICAR ---
        console.log(`[Cron] Publicando container ${creationId}...`);
        const publishParams = new URLSearchParams({
          creation_id: creationId,
          access_token,
        });
        const publishRes = await fetch(
          `${META_GRAPH}/${instagram_business_id}/media_publish?${publishParams.toString()}`,
          { method: "POST" }
        );
        const publishData = (await publishRes.json()) as {
          id?: string;
          error?: { message?: string };
        };

        if (!publishData.id) {
          console.error("[Cron] Erro Publicação:", publishData);
          throw new Error(
            publishData.error?.message || "Erro ao publicar mídia"
          );
        }

        console.log(`[Cron] PUBLICADO! ID do Post: ${publishData.id}`);

        // --- PASSO D: ATUALIZAR BANCO ---
        await supabase
          .from("post_scheduling")
          .update({
            status: "published",
            published_at: new Date().toISOString(),
            error_log: null,
          })
          .eq("id", post.id);

        processedCount++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Cron] Falha no post ${post.id}:`, message);
        errorCount++;

        await supabase
          .from("post_scheduling")
          .update({
            status: "failed",
            error_log: message,
          })
          .eq("id", post.id);
      }
    }

    return NextResponse.json({
      processed: processedCount,
      errors: errorCount,
    });
  } catch (globalError: unknown) {
    const message =
      globalError instanceof Error ? globalError.message : String(globalError);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
