# Power Monitor

A real-time office device monitoring dashboard built with Next.js 16, Supabase, and Groq. Simulates 15 devices (fans and lights) across 3 rooms, tracking live power consumption, triggering smart alerts, and exposing a Discord bot command interface — all without any physical hardware.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Configuration](#configuration)
- [Alert Rules](#alert-rules)
- [Discord Bot](#discord-bot)

---

## Overview

Power Monitor is a simulated IoT dashboard for a 3-room office. It continuously simulates device state changes (fans toggling on/off, lights turning on during office hours), computes per-room and total power draw in watts, accumulates a daily kWh estimate, and evaluates two alert rules on every tick. All state is persisted to Supabase and streamed to the browser via Server-Sent Events.

The UI has five views accessible from a collapsible sidebar:

| View | Description |
|---|---|
| Dashboard | Live power stats, draw history chart, per-room bar chart, device grid, and active alerts |
| Alerts | Full alert log with severity badges, room tags, and triggered timestamps |
| Floor Plan | Isometric 3D SVG floor plan showing device positions with real light glow effects |
| Knowledge Graph | D3-powered force-directed graph of the office entity hierarchy |
| Discord Bot | In-browser Discord simulator; also exposes a POST endpoint for a real bot |

---

## Features

- **Live simulation** — 15 devices across 3 rooms tick every 8 seconds with time-of-day weighted randomness
- **Server-Sent Events stream** — browser receives state updates every 4 seconds with zero polling
- **Supabase persistence** — device states, energy logs, and alerts are written to Postgres on every tick
- **Realtime-ready** — all 3 tables are enrolled in the `supabase_realtime` publication
- **Smart alerts** — two rule-based alert types with auto-resolution
- **Energy accounting** — per-tick watt accumulation produces a live kWh estimate
- **Isometric floor plan** — SVG 3D room view with warm white light glow when devices are ON
- **D3 knowledge graph** — force-directed entity map with draggable nodes and hover tooltips
- **Discord bot interface** — `/api/discord` POST endpoint powers real Discord bot commands; also includes an in-browser simulator
- **Groq AI responses** — bot replies are AI-phrased via `llama3-8b-8192` when `GROQ_API_KEY` is set; falls back to formatted raw data without it
- **Dark / light theme** — user preference persisted in `localStorage`, applied before first paint via a blocking script to prevent flash
- **Fully typed** — end-to-end TypeScript with shared interfaces in `types/index.ts`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix UI |
| Charts | Recharts |
| Graph | D3 v7 |
| Database | Supabase (PostgreSQL) |
| AI | Groq SDK — `llama3-8b-8192` |
| Package Manager | pnpm |

---

## Project Structure

```
power_monitor/
├── app/
│   ├── api/
│   │   ├── discord/route.ts   # POST — Discord bot command handler + Groq AI
│   │   ├── state/route.ts     # GET snapshot / POST manual tick
│   │   ├── status/route.ts    # GET health check
│   │   ├── stream/route.ts    # GET SSE stream (tick every 8s, push every 4s)
│   │   └── usage/route.ts     # GET energy summary
│   ├── globals.css            # Tailwind v4 theme tokens (dark + light)
│   ├── layout.tsx             # Root layout, metadata, blocking theme script
│   └── page.tsx               # Entry — renders DashboardClient
│
├── components/
│   └── dashboard/
│       ├── dashboard-client.tsx         # Root shell: sidebar, nav, theme toggle
│       └── tabs/
│           ├── dashboard-tab.tsx        # Main dashboard view
│           ├── alerts-tab.tsx           # Alerts log view
│           ├── floor-plan-tab.tsx       # Isometric 3D SVG floor plan
│           ├── knowledge-graph-tab.tsx  # D3 force-directed graph
│           └── discord-bot-tab.tsx      # In-browser Discord simulator
│
├── lib/
│   ├── config.ts              # Wattage, office hours, room list constants
│   ├── simulator.ts           # Device simulation engine (singleton, module-level)
│   └── supabase/
│       ├── client.ts          # Browser Supabase client (anon key)
│       ├── server.ts          # Server Supabase client (service role)
│       ├── persistor.ts       # Write helpers: device_states, energy_logs, alerts
│       └── proxy.ts           # Supabase SSR cookie proxy
│
├── types/
│   └── index.ts               # Shared TypeScript interfaces
│
├── middleware.ts              # Next.js middleware (Supabase SSR session refresh)
├── public/
│   └── logo.png               # App logo
└── .env.development.local     # Local environment variables (not committed)
```

---

## Architecture

```
Browser
  │
  ├── EventSource → GET /api/stream  ←──── SSE (every 4s)
  │                     │
  │                     ├── simulateTick()  (every 8s)
  │                     │       └── lib/simulator.ts  (in-memory singleton)
  │                     │
  │                     └── persistCurrentState()
  │                             ├── device_states   → Supabase upsert
  │                             ├── energy_logs     → Supabase insert
  │                             └── alerts          → Supabase upsert
  │
  ├── POST /api/discord
  │       ├── Parse command (!status, !room, !usage)
  │       ├── Build raw data from simulator
  │       └── Groq llama3-8b-8192 → friendly reply (optional)
  │
  └── GET /api/state   (snapshot — used by Discord bot on demand)
```

### Simulator Engine

`lib/simulator.ts` is a **module-level singleton** — it lives in the Next.js server process memory for the lifetime of the process. On each `simulateTick()` call:

1. Every device independently rolls a random number against a toggle probability (5% during office hours 09:00–17:00, 1% after hours).
2. If toggled, the direction is biased: 65% toward ON during hours, 20% toward ON after hours.
3. Total watts and per-room watts are computed by summing `device.wattage` for all `status === true` devices.
4. The watt value is pushed to `_energyLog[]` (capped at 1,440 entries — 24h at 1 tick/minute). kWh is accumulated as `watts × (1/60) / 1000` per tick.
5. Alert rules are evaluated against the updated device list.

---

## Database Schema

Three tables in the `public` schema. RLS is **disabled** — all writes use the service role key server-side.

### `device_states`

Stores the latest snapshot of all 15 devices. Upserted on every tick (conflict on `id`).

| Column | Type | Description |
|---|---|---|
| `id` | `text` PK | `{room}-{type}-{number}` e.g. `work_room_1-fan-2` |
| `room` | `text` | `drawing_room` / `work_room_1` / `work_room_2` |
| `device_type` | `text` | `fan` or `light` |
| `device_number` | `int` | 1-based index within type/room |
| `label` | `text` | Human-readable label |
| `status` | `boolean` | `true` = ON |
| `wattage` | `int` | Fans: 60W, Lights: 15W |
| `last_changed` | `timestamptz` | When status last toggled |
| `updated_at` | `timestamptz` | Tick timestamp |

### `energy_logs`

Append-only time-series. Indexed on `recorded_at DESC` for efficient history queries.

| Column | Type | Description |
|---|---|---|
| `id` | `bigserial` PK | Auto-increment |
| `total_watts` | `int` | Sum of all active device wattages |
| `room_watts` | `jsonb` | `{ drawing_room: N, work_room_1: N, work_room_2: N }` |
| `today_kwh` | `numeric(10,4)` | Accumulated kWh estimate since process start |
| `recorded_at` | `timestamptz` | Tick timestamp |

### `alerts`

Active and resolved alerts. Upserted on conflict by `id`.

| Column | Type | Description |
|---|---|---|
| `id` | `text` PK | Auto-incrementing counter string |
| `type` | `text` | `after_hours` or `all_on_2hr` |
| `room` | `text` | Which room triggered the alert |
| `device_ids` | `text[]` | Array of device IDs involved |
| `message` | `text` | Human-readable alert message |
| `severity` | `text` | `warning` or `critical` |
| `triggered_at` | `timestamptz` | When the alert first fired |
| `resolved_at` | `timestamptz` / `null` | `null` = still active |

### SQL to recreate tables

```sql
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

CREATE TABLE IF NOT EXISTS public.energy_logs (
  id           BIGSERIAL PRIMARY KEY,
  total_watts  INT NOT NULL,
  room_watts   JSONB NOT NULL DEFAULT '{}',
  today_kwh    NUMERIC(10,4) NOT NULL DEFAULT 0,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS energy_logs_recorded_at_idx
  ON public.energy_logs (recorded_at DESC);

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

ALTER TABLE public.device_states DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_logs   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts        DISABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE public.device_states;
ALTER PUBLICATION supabase_realtime ADD TABLE public.energy_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
```

---

## API Reference

All routes are under `/api`. No authentication required.

### `GET /api/stream`

Server-Sent Events stream. Connect once — the server pushes a new `OfficeState` JSON payload every 4 seconds. The simulator ticks every 8 seconds; state is sent twice per tick (immediately after tick + a midpoint refresh).

**Response format** (event `data` field, JSON):
```json
{
  "devices": [ { "id": "...", "room": "...", "status": true, "wattage": 60 } ],
  "energy":  { "total_watts": 180, "room_watts": { "drawing_room": 75, "work_room_1": 60, "work_room_2": 45 }, "today_kwh": 0.045 },
  "alerts":  [ { "id": "1", "type": "all_on_2hr", "severity": "critical", "message": "..." } ]
}
```

### `GET /api/state`

Returns the current `OfficeState` snapshot as JSON. No side effects.

### `POST /api/state`

Manually triggers one simulator tick. Returns `{ ok: true, state: OfficeState }`. Useful for testing or external integrations.

### `GET /api/status`

Health check. Returns `{ ok: true }`.

### `GET /api/usage`

Returns current energy summary: total watts, per-room watts, and today's kWh.

### `POST /api/discord`

Discord bot command handler. Accepts a JSON body and returns a plain-text bot response.

**Request body:**
```json
{ "command": "!status", "args": "" }
{ "command": "!room",   "args": "work1" }
{ "command": "!usage",  "args": "" }
```

**Supported commands:**

| Command | Args | Description |
|---|---|---|
| `!status` | — | Summary of all 3 rooms |
| `!room` | `drawing`, `work1`, `work2` | Single-room device breakdown |
| `!usage` | — | Total watts + today's kWh |

**Response:**
```json
{ "response": "Work Room 1 has 2 fans and 1 light on, drawing 135W." }
```

If `GROQ_API_KEY` is set, the response is AI-phrased via `llama3-8b-8192`. Otherwise a formatted raw string is returned — all commands still work.

---

## Environment Variables

Create a `.env.development.local` file in the project root. Only the three Supabase keys are strictly required.

```env
# Supabase — required
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Groq — optional (bot works without it, responses will be plain text)
GROQ_API_KEY=your-groq-api-key
```

| Variable | Required | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser + server Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side persistor (bypasses RLS) |
| `GROQ_API_KEY` | No | Discord bot AI response generation |

---

## Local Development

**Prerequisites:** Node.js 20+, pnpm 9+, a Supabase project with the schema applied (see SQL above).

```bash
# 1. Clone the repository
git clone https://github.com/Rohan32110/power_monitor.git
cd power_monitor

# 2. Install dependencies
pnpm install

# 3. Create environment file and fill in your keys
cp .env.development.local.example .env.development.local

# 4. Apply the database schema in the Supabase SQL Editor
# (copy the SQL from the Database Schema section above)

# 5. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The simulator starts immediately and begins streaming to the browser.

---

## Deployment

The project is configured for Vercel (Next.js 16, no custom server needed).

1. Push to GitHub.
2. Import the repo in Vercel.
3. Add the 4 environment variables under **Vercel Project → Settings → Environment Variables**.
4. Deploy.

The SSE stream (`/api/stream`) works on Vercel's Node.js runtime out of the box. No WebSocket server or separate process is needed.

> **Note on simulator state:** `lib/simulator.ts` is a module-level singleton. State resets on each cold start or serverless function invocation. For production use with state surviving restarts, replace the in-memory `_devices` array with a cold-start hydration step that reads the latest snapshot from the `device_states` Supabase table.

---

## Configuration

All simulation parameters live in `lib/config.ts`. Change values here without touching simulator logic.

```ts
// Wattage per device type (watts)
export const WATTAGE = { fan: 60, light: 15 }

// Office hours window (24h format, inclusive start, exclusive end)
export const OFFICE_HOURS = { start: 9, end: 17 }

// Hours all devices must be ON before triggering a critical alert
export const ALL_ON_ALERT_THRESHOLD_HOURS = 2

// Rooms in the office
export const ROOM_LIST: RoomId[] = ['drawing_room', 'work_room_1', 'work_room_2']
```

---

## Alert Rules

Two rules are evaluated on every simulator tick, per room. Alerts auto-resolve the moment the triggering condition clears.

### `after_hours` — Warning

**Trigger:** One or more devices are ON outside office hours (before 09:00 or at/after 17:00).

**Resolves:** All devices in the room turn OFF, or office hours resume.

### `all_on_2hr` — Critical

**Trigger:** All 5 devices in a room (2 fans + 3 lights) have been continuously ON for 2 or more hours. The threshold is computed from `last_changed` — the oldest "turned ON" timestamp across all 5 devices in the room.

**Resolves:** Any single device in the room turns OFF.

---

## Discord Bot

The `/api/discord` POST endpoint is designed to be called by a real Discord.js bot running separately. A minimal integration:

```js
// bot.js — run with: node bot.js
const { Client, GatewayIntentBits } = require('discord.js')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

const API = 'https://your-deployment.vercel.app/api/discord'

client.on('messageCreate', async (message) => {
  if (message.author.bot) return
  const [command, ...args] = message.content.trim().split(/\s+/)
  if (!['!status', '!room', '!usage'].includes(command)) return

  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, args: args.join(' ') }),
  })
  const { response } = await res.json()
  message.reply(response)
})

client.login(process.env.DISCORD_TOKEN)
```

The in-browser **Discord Bot** tab simulates this interaction without needing a real Discord server or token — type commands or click the quick-action chips to see exactly what the bot would reply.
