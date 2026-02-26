"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type ClientAccessPlatform = "instagram" | "facebook" | "google" | "assets";

export type InstagramAccess = {
  user: string;
  password: string;
  token: string;
};

export type FacebookAccess = {
  /** ID da conta de anúncios (ex: act_123456789) para relatórios Facebook Ads */
  ad_account_id?: string;
  bmId: string;
  perfil: string;
  pagina: string;
  whatsapp: string;
  instagram: string;
  pixelId: string;
  tokenConversao: string;
};

export type GoogleAccess = {
  accountId: string;
  email: string;
  tags: string;
};

export type AssetsAccess = {
  brandColor: string;
  brandTypography: string;
};

export type ClientAccessData = {
  instagram: InstagramAccess | null;
  facebook: FacebookAccess | null;
  google: GoogleAccess | null;
  assets: AssetsAccess | null;
};

const DEFAULT_INSTAGRAM: InstagramAccess = { user: "", password: "", token: "" };
const DEFAULT_FACEBOOK: FacebookAccess = {
  ad_account_id: "",
  bmId: "",
  perfil: "",
  pagina: "",
  whatsapp: "",
  instagram: "",
  pixelId: "",
  tokenConversao: "",
};
const DEFAULT_GOOGLE: GoogleAccess = { accountId: "", email: "", tags: "" };
const DEFAULT_ASSETS: AssetsAccess = { brandColor: "#2482fa", brandTypography: "" };

const QUERY_KEY = "client-access";

function parseRow(platform: ClientAccessPlatform, data: unknown): Record<string, string> {
  if (!data || typeof data !== "object") return {};
  const obj = data as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export function useClientAccess(clientId: string | null) {
  const supabase = createClient();

  const query = useQuery({
    queryKey: [QUERY_KEY, clientId],
    queryFn: async (): Promise<ClientAccessData> => {
      if (!clientId) {
        return {
          instagram: DEFAULT_INSTAGRAM,
          facebook: DEFAULT_FACEBOOK,
          google: DEFAULT_GOOGLE,
          assets: DEFAULT_ASSETS,
        };
      }
      const { data: rows, error } = await supabase
        .from("client_access")
        .select("platform, data")
        .eq("client_id", clientId);

      if (error) throw error;

      const result: ClientAccessData = {
        instagram: { ...DEFAULT_INSTAGRAM },
        facebook: { ...DEFAULT_FACEBOOK },
        google: { ...DEFAULT_GOOGLE },
        assets: { ...DEFAULT_ASSETS },
      };

      for (const row of rows ?? []) {
        const p = row.platform as ClientAccessPlatform;
        const parsed = parseRow(p, row.data);
        if (p === "instagram") {
          result.instagram = { ...DEFAULT_INSTAGRAM, ...parsed } as InstagramAccess;
        } else if (p === "facebook") {
          result.facebook = { ...DEFAULT_FACEBOOK, ...parsed, ad_account_id: parsed.ad_account_id ?? parsed.ad_accountId ?? "" } as FacebookAccess;
        } else if (p === "google") {
          result.google = { ...DEFAULT_GOOGLE, ...parsed } as GoogleAccess;
        } else if (p === "assets") {
          result.assets = {
            brandColor: parsed.brandColor ?? DEFAULT_ASSETS.brandColor,
            brandTypography: parsed.brandTypography ?? DEFAULT_ASSETS.brandTypography,
          };
        }
      }

      return result;
    },
    enabled: !!clientId,
  });

  return query;
}
