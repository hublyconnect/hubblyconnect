import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GRAPH_API_VERSION = "v18.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function getRedirectUrl(origin: string, slug: string, success: boolean, error?: string): string {
  const path = slug ? `/dashboard/${slug}/agendamento-posts` : "/dashboard";
  const params = new URLSearchParams();
  if (success) params.set("success", "true");
  if (error) params.set("error", error);
  const query = params.toString();
  return `${origin}${path}${query ? `?${query}` : ""}`;
}

const STATE_SEP = ":";

function parseState(state: string | null): { agencySlug: string; clientId: string | null } {
  const raw = state?.trim() || "";
  const idx = raw.indexOf(STATE_SEP);
  if (idx === -1) return { agencySlug: raw, clientId: null };
  return {
    agencySlug: raw.slice(0, idx),
    clientId: raw.slice(idx + 1) || null,
  };
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const { agencySlug, clientId: stateClientId } = parseState(state);

  if (!code || !agencySlug) {
    console.error("[Facebook OAuth] Callback sem code ou state.", { hasCode: !!code, hasState: !!agencySlug });
    const redirectUrl = getRedirectUrl(origin, agencySlug || "", false, "callback_invalido");
    return NextResponse.redirect(redirectUrl);
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_FB_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    console.error("[Facebook OAuth] Variáveis de ambiente faltando: FACEBOOK_APP_ID, FACEBOOK_APP_SECRET ou NEXT_PUBLIC_FB_REDIRECT_URI");
    const redirectUrl = getRedirectUrl(origin, agencySlug, false, "config_invalida");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const shortLivedUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
    shortLivedUrl.searchParams.set("client_id", appId);
    shortLivedUrl.searchParams.set("redirect_uri", redirectUri);
    shortLivedUrl.searchParams.set("client_secret", appSecret);
    shortLivedUrl.searchParams.set("code", code);

    const shortRes = await fetch(shortLivedUrl.toString(), { method: "GET" });
    const shortData = await shortRes.json().catch(() => ({}));

    if (!shortRes.ok || shortData.error) {
      console.error("[Facebook OAuth] Erro ao trocar code por token de curta duração.", shortData);
      return NextResponse.redirect(getRedirectUrl(origin, agencySlug, false, "token_falhou"));
    }

    const shortLivedToken = shortData.access_token as string | undefined;
    if (!shortLivedToken) {
      console.error("[Facebook OAuth] Resposta sem access_token.", shortData);
      return NextResponse.redirect(getRedirectUrl(origin, agencySlug, false, "token_falhou"));
    }

    const longLivedUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", appId);
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", shortLivedToken);

    const longRes = await fetch(longLivedUrl.toString(), { method: "GET" });
    const longData = await longRes.json().catch(() => ({}));

    if (!longRes.ok || longData.error) {
      console.error("[Facebook OAuth] Erro ao obter token de longa duração.", longData);
      return NextResponse.redirect(getRedirectUrl(origin, agencySlug, false, "token_long_falhou"));
    }

    const longLivedToken = longData.access_token as string | undefined;
    const expiresIn = typeof longData.expires_in === "number" ? longData.expires_in : null;

    if (!longLivedToken) {
      console.error("[Facebook OAuth] Resposta de longa duração sem access_token.", longData);
      return NextResponse.redirect(getRedirectUrl(origin, agencySlug, false, "token_falhou"));
    }

    const supabase = createAdminClient();
    const { data: agencyData, error: agencyError } = await supabase
      .from("agencies")
      .select("id")
      .eq("slug", agencySlug)
      .single();
    const agency = agencyData as { id: string } | null;

    if (agencyError || !agency?.id) {
      console.error("[Facebook OAuth] Agência não encontrada pelo slug.", { slug: agencySlug, error: agencyError?.message });
      return NextResponse.redirect(getRedirectUrl(origin, agencySlug, false, "agencia_nao_encontrada"));
    }

    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    if (stateClientId) {
      const pagesRes = await fetch(
        `${GRAPH_BASE}/me/accounts?fields=instagram_business_account{id,username,profile_picture_url}&access_token=${encodeURIComponent(longLivedToken)}`
      ).then((r) => r.json()).catch(() => ({}));
      const pages = Array.isArray(pagesRes?.data) ? pagesRes.data : [];
      let instagramHandle: string | null = null;
      let instagramAvatarUrl: string | null = null;
      for (const page of pages) {
        const ig = page?.instagram_business_account;
        if (ig?.username) {
          instagramHandle = ig.username;
          instagramAvatarUrl = ig.profile_picture_url ?? null;
          break;
        }
      }
      const { error: clientUpdateError } = await supabase
        .from("clients")
        .update({
          instagram_access_token: longLivedToken,
          instagram_token_expires_at: tokenExpiresAt,
          instagram_handle: instagramHandle,
          instagram_avatar_url: instagramAvatarUrl,
        } as never)
        .eq("id", stateClientId)
        .eq("agency_id", agency.id);

      if (clientUpdateError) {
        console.error("[Facebook OAuth] Erro ao atualizar cliente.", clientUpdateError);
        return NextResponse.redirect(getRedirectUrl(origin, agencySlug, false, "persistencia_falhou"));
      }
    } else {
      const { error: upsertError } = await supabase
        .from("agency_integrations")
        .upsert(
          {
            agency_id: agency.id,
            provider: "instagram",
            access_token: longLivedToken,
            token_expires_at: tokenExpiresAt,
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: "agency_id,provider" }
        );

      if (upsertError) {
        console.error("[Facebook OAuth] Erro ao salvar integração no Supabase.", upsertError);
        return NextResponse.redirect(getRedirectUrl(origin, agencySlug, false, "persistencia_falhou"));
      }
    }

    return NextResponse.redirect(getRedirectUrl(origin, agencySlug, true));
  } catch (err) {
    console.error("[Facebook OAuth] Erro inesperado no callback.", err);
    const redirectUrl = getRedirectUrl(origin, agencySlug, false, "erro_interno");
    return NextResponse.redirect(redirectUrl);
  }
}
