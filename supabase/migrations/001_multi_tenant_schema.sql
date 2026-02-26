-- =============================================================================
-- Multi-tenant Marketing SaaS – Schema & RLS
-- Run in Supabase SQL Editor or via Supabase CLI.
-- =============================================================================

-- Extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Agencies (tenants)
-- -----------------------------------------------------------------------------
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agencies_slug ON public.agencies(slug);

-- -----------------------------------------------------------------------------
-- 2. User profiles (links auth.users to agency for RLS)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_agency_id ON public.profiles(agency_id);

-- Trigger: create profile on signup (optional – or create via app)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Profile must be created by app with agency_id; no auto-insert here.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 3. Clients (per agency)
-- -----------------------------------------------------------------------------
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  niche TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'onboarding')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_agency_id ON public.clients(agency_id);

-- -----------------------------------------------------------------------------
-- 4. Creative assets (per client)
-- -----------------------------------------------------------------------------
CREATE TYPE public.asset_type AS ENUM ('image', 'video');
CREATE TYPE public.asset_status AS ENUM ('pending', 'approved', 'revision_requested');

CREATE TABLE public.creative_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  type public.asset_type NOT NULL,
  status public.asset_status NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_creative_assets_client_id ON public.creative_assets(client_id);
CREATE INDEX idx_creative_assets_status ON public.creative_assets(status);

-- -----------------------------------------------------------------------------
-- 5. Asset comments (threaded feedback)
-- -----------------------------------------------------------------------------
CREATE TABLE public.asset_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES public.creative_assets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.asset_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_asset_comments_asset_id ON public.asset_comments(asset_id);
CREATE INDEX idx_asset_comments_parent_id ON public.asset_comments(parent_id);

-- -----------------------------------------------------------------------------
-- 6. Client metrics (KPIs: CTR, CPC, Leads)
-- -----------------------------------------------------------------------------
CREATE TABLE public.client_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  ctr NUMERIC(10, 4),
  cpc NUMERIC(10, 2),
  leads INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  spend NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, date)
);

CREATE INDEX idx_client_metrics_client_date ON public.client_metrics(client_id, date DESC);

-- -----------------------------------------------------------------------------
-- RLS: Helper to get current user's agency_id
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_agency_id()
RETURNS UUID AS $$
  SELECT agency_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- RLS: Enable on all tenant-scoped tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_metrics ENABLE ROW LEVEL SECURITY;

-- Agencies: user can only see their own agency
CREATE POLICY "agencies_select_own"
  ON public.agencies FOR SELECT
  TO authenticated
  USING (id = public.current_user_agency_id());

-- Profiles: user can only see own profile and profiles in same agency
CREATE POLICY "profiles_select_own_agency"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (agency_id = public.current_user_agency_id());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Clients: only from user's agency
CREATE POLICY "clients_all_own_agency"
  ON public.clients FOR ALL
  TO authenticated
  USING (agency_id = public.current_user_agency_id())
  WITH CHECK (agency_id = public.current_user_agency_id());

-- Creative assets: only via client belonging to user's agency
CREATE POLICY "creative_assets_all_own_agency"
  ON public.creative_assets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = creative_assets.client_id
      AND c.agency_id = public.current_user_agency_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = creative_assets.client_id
      AND c.agency_id = public.current_user_agency_id()
    )
  );

-- Asset comments: only on assets from user's agency
CREATE POLICY "asset_comments_all_own_agency"
  ON public.asset_comments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.creative_assets a
      JOIN public.clients c ON c.id = a.client_id
      WHERE a.id = asset_comments.asset_id
      AND c.agency_id = public.current_user_agency_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creative_assets a
      JOIN public.clients c ON c.id = a.client_id
      WHERE a.id = asset_comments.asset_id
      AND c.agency_id = public.current_user_agency_id()
    )
  );

-- Client metrics: only for clients in user's agency
CREATE POLICY "client_metrics_select_own_agency"
  ON public.client_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_metrics.client_id
      AND c.agency_id = public.current_user_agency_id()
    )
  );

-- Service role can manage metrics (for ingestion)
CREATE POLICY "client_metrics_insert_service"
  ON public.client_metrics FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "client_metrics_update_service"
  ON public.client_metrics FOR UPDATE
  TO service_role
  USING (true);

-- -----------------------------------------------------------------------------
-- Realtime: enable for creative_assets and asset_comments (Supabase Dashboard:
-- Database > Replication > add tables creative_assets, asset_comments)
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- Updated_at trigger (optional)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- EXECUTE PROCEDURE is compatible with Postgres 12–15; use EXECUTE FUNCTION on 16+
CREATE TRIGGER agencies_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER creative_assets_updated_at
  BEFORE UPDATE ON public.creative_assets
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
