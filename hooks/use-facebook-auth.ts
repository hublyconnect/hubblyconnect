"use client";

const META_OAUTH_BASE = "https://www.facebook.com/v18.0/dialog/oauth";
const SCOPES = "pages_show_list,instagram_basic,instagram_content_publish,pages_read_engagement,business_management";

const STATE_SEP = ":";

/**
 * Gera a URL de login OAuth da Meta para conectar conta Instagram.
 * state = agencySlug ou "agencySlug:clientId" quando conectando por cliente.
 */
export function getInstagramLoginUrl(agencySlug: string, clientId?: string | null): string {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const redirectUri = process.env.NEXT_PUBLIC_FB_REDIRECT_URI;

  if (!appId || !redirectUri) {
    console.warn("NEXT_PUBLIC_FACEBOOK_APP_ID ou NEXT_PUBLIC_FB_REDIRECT_URI não configurados.");
    return "#";
  }

  const state = clientId ? `${agencySlug}${STATE_SEP}${clientId}` : agencySlug;
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: SCOPES,
  });

  return `${META_OAUTH_BASE}?${params.toString()}`;
}

/**
 * Hook que expõe a URL de login e um handler de redirecionamento.
 * Pass clientId para persistir a conexão na tabela clients (por cliente).
 */
export function useFacebookAuth(agencySlug: string | null, clientId?: string | null) {
  const instagramLoginUrl = agencySlug ? getInstagramLoginUrl(agencySlug, clientId) : "#";
  const canConnect = Boolean(
    agencySlug &&
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID &&
    process.env.NEXT_PUBLIC_FB_REDIRECT_URI
  );

  const connectInstagram = (forClientId?: string | null) => {
    if (!canConnect) return;
    const url = getInstagramLoginUrl(agencySlug!, forClientId ?? clientId);
    window.location.href = url;
  };

  return { instagramLoginUrl, canConnect, connectInstagram };
}
