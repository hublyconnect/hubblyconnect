/**
 * Strict TypeScript interfaces for multi-tenant schema.
 * Mirror of Supabase public tables and enums.
 */

export type AssetType = "image" | "video";
export type AssetStatus = "pending" | "approved" | "revision_requested";
export type ClientStatus = "active" | "inactive" | "onboarding" | "churned";
export type ProfileRole = "admin" | "member" | "viewer";

export interface Agency {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  agency_id: string;
  role: ProfileRole;
  full_name: string | null;
  client_id: string | null;
  email_notifications: boolean;
  whatsapp_alerts: boolean;
  whatsapp_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  agency_id: string;
  name: string;
  /** Slug para URL do portal público (ex: espaco-nobre) */
  slug?: string | null;
  niche: string | null;
  status: ClientStatus;
  contact_email: string | null;
  instagram_url: string | null;
  /** @description Handle do Instagram vinculado ao cliente (ex: @cliente) */
  instagram_handle?: string | null;
  /** @description URL da foto de perfil do Instagram do cliente */
  instagram_avatar_url?: string | null;
  /** @description Token de acesso OAuth Instagram (persistido por cliente) */
  instagram_access_token?: string | null;
  /** @description Expiração do token Instagram */
  instagram_token_expires_at?: string | null;
  whatsapp: string | null;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  /** Verba total contratada (anúncios) */
  ad_budget_total?: number | null;
  /** Verba já gasta */
  ad_budget_used?: number | null;
  /** Data da próxima fatura */
  next_billing_date?: string | null;
  /** Custo médio por conversa/lead */
  avg_cost_per_conversa?: number | null;
  /** Total de leads/conversas */
  total_conversas?: number | null;
  /** ID do cliente no Asaas para integração de cobrança */
  asaas_customer_id?: string | null;
  /** Phone Number ID for SENDING messages via Meta Graph API */
  whatsapp_business_phone_id?: string | null;
  /** WABA/Phone Number ID from webhook - used to identify client on incoming messages */
  whatsapp_waba_id?: string | null;
  /** Metadados extras (ex: whatsapp.access_token, whatsapp.display_name, whatsapp.about, whatsapp.profile_picture_url) */
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreativeAsset {
  id: string;
  client_id: string;
  title: string;
  file_url: string;
  type: AssetType;
  status: AssetStatus;
  version: number;
  demand_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetComment {
  id: string;
  asset_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
}

export interface ClientMetric {
  id: string;
  client_id: string;
  date: string;
  ctr: number | null;
  cpc: number | null;
  leads: number;
  impressions: number;
  clicks: number;
  spend: number;
  created_at: string;
}

/** DB row types (e.g. with joined relations) */
export interface CreativeAssetWithClient extends CreativeAsset {
  client?: Client | null;
}

export interface AssetCommentWithAuthor extends AssetComment {
  author?: { id: string; full_name: string | null } | null;
  replies?: AssetCommentWithAuthor[];
}

export interface ClientMetricsSummary {
  ctr: number | null;
  cpc: number | null;
  leads: number;
  impressions: number;
  clicks: number;
  spend: number;
}
