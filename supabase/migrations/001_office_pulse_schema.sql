-- ============================================================
-- Office Pulse — Supabase Schema
-- Run this in your Supabase project SQL editor
-- ============================================================

-- ── device_states ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.device_states (
  id            TEXT PRIMARY KEY,
  room          TEXT NOT NULL,
  device_type   TEXT NOT NULL CHECK (device_type IN ('fan','light')),
  device_number INT  NOT NULL,
  label         TEXT NOT NULL,
  status        BOOLEAN NOT NULL DEFAULT false,
  wattage       INT  NOT NULL,
  last_changed  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── energy_logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.energy_logs (
  id           BIGSERIAL PRIMARY KEY,
  total_watts  INT NOT NULL,
  room_watts   JSONB NOT NULL DEFAULT '{}',
  today_kwh    NUMERIC(10,4) NOT NULL DEFAULT 0,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS energy_logs_recorded_at_idx
  ON public.energy_logs (recorded_at DESC);

-- ── alerts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.alerts (
  id           TEXT PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('after_hours','all_on_2hr')),
  room         TEXT NOT NULL,
  device_ids   TEXT[] NOT NULL DEFAULT '{}',
  message      TEXT NOT NULL,
  severity     TEXT NOT NULL CHECK (severity IN ('warning','critical')),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ
);

-- ── RLS: public monitoring data, no user auth required ─────────
ALTER TABLE public.device_states DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_logs   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts        DISABLE ROW LEVEL SECURITY;

-- ── Realtime ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_states;
ALTER PUBLICATION supabase_realtime ADD TABLE public.energy_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
