CREATE TABLE public.location_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.location_nodes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('location', 'folder')),
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.location_nodes(business_id);
CREATE INDEX ON public.location_nodes(parent_id);

CREATE TABLE public.waitlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES public.location_nodes(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  google_refresh_token_encrypted TEXT,
  dedicated_calendar_id TEXT,
  calendar_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (calendar_status IN ('pending','connected','disconnected')),
  batch_size INTEGER NOT NULL DEFAULT 3,
  batch_interval_minutes INTEGER NOT NULL DEFAULT 60,
  min_notice_hours INTEGER NOT NULL DEFAULT 24,
  min_confirm_lead_hours INTEGER NOT NULL DEFAULT 2,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  public_slug TEXT UNIQUE NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.waitlists(node_id);
CREATE INDEX ON public.waitlists(business_id);

ALTER TABLE public.waitlist_entries
  ADD COLUMN waitlist_id UUID REFERENCES public.waitlists(id) ON DELETE CASCADE;
CREATE INDEX ON public.waitlist_entries(waitlist_id);
