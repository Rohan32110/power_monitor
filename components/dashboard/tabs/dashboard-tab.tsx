'use client'

import { useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import type { Device, Alert, EnergyLog } from '@/types'
import { ROOM_LABELS } from '@/lib/config'
import type { RoomId } from '@/types'

// ── Shared card wrapper ───────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({ title, description, icon }: { title: string; description?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {icon && <div className="text-muted-foreground/40">{icon}</div>}
    </div>
  )
}

// ── Ghost icons ───────────────────────────────────────────────────────────────
function GhostBolt() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-full w-full" aria-hidden>
      <path d="M26 4L6 28h18l-2 16 20-24H24l2-20z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" opacity="0.15" />
    </svg>
  )
}
function GhostBell() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-full w-full" aria-hidden>
      <path d="M24 4a4 4 0 0 0-4 4c0 0-8 4-8 14v6l-4 4v2h32v-2l-4-4v-6c0-10-8-14-8-14a4 4 0 0 0-4-4z" stroke="currentColor" strokeWidth="1.5" opacity="0.15" strokeLinejoin="round" />
      <path d="M20 38a4 4 0 0 0 8 0" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
    </svg>
  )
}
function GhostChip() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-full w-full" aria-hidden>
      <rect x="14" y="14" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
      <path d="M18 14v-4M24 14v-4M30 14v-4M18 38v-4M24 38v-4M30 38v-4M14 18h-4M14 24h-4M14 30h-4M38 18h-4M38 24h-4M38 30h-4" stroke="currentColor" strokeWidth="1.5" opacity="0.15" strokeLinecap="round" />
      <rect x="18" y="18" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" opacity="0.10" />
    </svg>
  )
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.value}{p.unit ?? 'W'}
        </p>
      ))}
    </div>
  )
}

// ── Hero card ─────────────────────────────────────────────────────────────────
function HeroCard({
  totalOn, totalDevices, totalWatts, todayKwh, alertCount, connected
}: {
  totalOn: number; totalDevices: number; totalWatts: number
  todayKwh: number; alertCount: number; connected: boolean
}) {
  const loadPct = totalDevices > 0 ? Math.round((totalOn / totalDevices) * 100) : 0

  return (
    <div className="hero-glow relative overflow-hidden rounded-xl border border-border bg-card px-5 py-4">
      <div className="pointer-events-none absolute -right-2 -top-2 h-24 w-24 text-primary">
        <GhostBolt />
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        {/* Left: headline */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${connected ? 'bg-on live-dot' : 'bg-muted-foreground'}`} />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {connected ? 'Live monitoring' : 'Connecting…'}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-foreground tabular-nums">{totalWatts}</span>
            <span className="text-sm font-normal text-muted-foreground">W total draw</span>
          </div>
        </div>

        {/* Right: stat pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Devices on', value: `${totalOn}/${totalDevices}`, accent: false },
            { label: 'Load',       value: `${loadPct}%`,                 accent: loadPct > 80 },
            { label: 'Today kWh',  value: todayKwh.toFixed(3),           accent: false },
            { label: 'Alerts',     value: String(alertCount),             accent: alertCount > 0 },
          ].map(({ label, value, accent }) => (
            <div
              key={label}
              className={`flex flex-col items-center rounded-lg border px-3 py-2 min-w-[64px]
                ${accent ? 'border-danger/30 bg-danger/5' : 'border-border bg-surface'}`}
            >
              <span className={`text-sm font-bold tabular-nums leading-none ${accent ? 'text-danger' : 'text-foreground'}`}>{value}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Capacity bar */}
      <div className="mt-3">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>Office capacity</span>
          <span className="tabular-nums font-mono">{totalWatts} / 495W</span>
        </div>
        <div className="h-1 w-full rounded-full bg-surface overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${Math.min((totalWatts / 495) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Power area chart (last 20 ticks from SSE) ─────────────────────────────────
function PowerChart({ history }: { history: { time: string; watts: number }[] }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute right-3 top-3 h-16 w-16 text-primary">
        <GhostBolt />
      </div>
      <CardHeader
        title="Power draw history"
        description="Last 20 data points from live stream"
      />
      {history.length < 2 ? (
        <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
          Collecting data…
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={history} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} unit="W" />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="watts" stroke="var(--primary)" strokeWidth={2} fill="url(#powerGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

// ── Per-room bar chart ─────────────────────────────────────────────────────────
function RoomChart({ roomWatts }: { roomWatts: Record<string, number> }) {
  const data = Object.entries(roomWatts).map(([room, watts]) => ({
    name: ROOM_LABELS[room as RoomId] ?? room,
    watts,
  }))
  const COLORS = ['var(--primary)', '#6366F1', '#8B5CF6']
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute right-3 top-3 h-16 w-16 text-primary">
        <GhostChip />
      </div>
      <CardHeader title="Per-room power" description="Live watts breakdown by room" />
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} unit="W" />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="watts" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── Alerts card ───────────────────────────────────────────────────────────────
function AlertsCard({ alerts }: { alerts: Alert[] }) {
  const SEVERITY_STYLES: Record<string, string> = {
    critical: 'border-danger/30 bg-danger/5 text-danger',
    warning:  'border-warning/30 bg-warning/5 text-warning',
  }
  const TAG_STYLES: Record<string, string> = {
    after_hours: 'bg-warning/10 text-warning',
    all_on_2hr:  'bg-danger/10 text-danger',
  }
  const TAG_LABELS: Record<string, string> = {
    after_hours: 'After hours',
    all_on_2hr:  'Continuous 2h+',
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute right-3 top-3 h-16 w-16 text-primary">
        <GhostBell />
      </div>
      <CardHeader
        title="Active alerts"
        description="Auto-cleared when conditions resolve"
      />
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="h-10 w-10 rounded-full bg-on/10 flex items-center justify-center mb-3">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5 text-on">
              <path d="M5 10l4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">All clear</p>
          <p className="text-xs text-muted-foreground mt-0.5">No active alerts right now</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 ${SEVERITY_STYLES[a.severity] ?? 'border-border'}`}
            >
              <div className="flex items-start gap-2 min-w-0">
                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current live-dot" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold">{ROOM_LABELS[a.room] ?? a.room}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${TAG_STYLES[a.type] ?? ''}`}>
                      {TAG_LABELS[a.type] ?? a.type}
                    </span>
                  </div>
                  <p className="text-xs opacity-80 mt-0.5 truncate">{a.message}</p>
                </div>
              </div>
              <span className="flex-shrink-0 text-[10px] opacity-60 whitespace-nowrap">
                {new Date(a.triggered_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── Device grid ───────────────────────────────────────────────────────────────
function DeviceGrid({ devices }: { devices: Device[] }) {
  const byRoom = useMemo(() => {
    const map: Record<string, Device[]> = {}
    for (const d of devices) {
      if (!map[d.room]) map[d.room] = []
      map[d.room].push(d)
    }
    return map
  }, [devices])

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute right-3 top-3 h-16 w-16 text-primary">
        <GhostChip />
      </div>
      <CardHeader title="Device status" description="All 15 devices across 3 rooms" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Object.entries(byRoom).map(([room, devs]) => {
          const roomWatts = devs.reduce((s, d) => s + (d.status ? d.wattage : 0), 0)
          const roomOn = devs.filter((d) => d.status).length
          return (
            <div key={room}>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                  {ROOM_LABELS[room as RoomId] ?? room}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums font-mono">{roomWatts}W · {roomOn}/{devs.length}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {devs.map((d) => (
                  <div
                    key={d.id}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors
                      ${d.status ? 'bg-primary/5 border border-primary/15' : 'bg-surface border border-transparent'}`}
                  >
                    {/* Icon */}
                    <div className={`flex h-7 w-7 items-center justify-center rounded-md flex-shrink-0
                      ${d.status
                        ? d.device_type === 'fan' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'
                        : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {d.device_type === 'fan' ? (
                        <svg viewBox="0 0 24 24" fill="currentColor" className={`h-4 w-4 ${d.status ? (d.status ? 'text-primary' : 'text-muted-foreground') + ' fan-spin' : 'text-muted-foreground'}`}>
                          <circle cx="12" cy="12" r="2" />
                          <path d="M12 10 C10 7, 6 6, 6 10 C6 12, 9 13, 12 12 Z" opacity="0.9" />
                          <path d="M12 10 C10 7, 6 6, 6 10 C6 12, 9 13, 12 12 Z" opacity="0.9" transform="rotate(120 12 12)" />
                          <path d="M12 10 C10 7, 6 6, 6 10 C6 12, 9 13, 12 12 Z" opacity="0.9" transform="rotate(240 12 12)" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} className="h-4 w-4">
                          <path d="M8 2a4 4 0 0 1 2 7.46V12H6V9.46A4 4 0 0 1 8 2z" />
                          <path d="M6 13h4M7 15h2" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>
                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate leading-none ${d.status ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {d.device_type === 'fan' ? 'Fan' : 'Light'} {d.device_number}
                      </p>
                      {d.status && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums font-mono">{d.wattage}W</p>
                      )}
                    </div>
                    {/* Status dot */}
                    <span className={`flex-shrink-0 h-1.5 w-1.5 rounded-full ${d.status ? 'bg-on' : 'bg-border'}`} />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── DashboardTab ──────────────────────────────────────────────────────────────
interface Props {
  devices: Device[]
  alerts: Alert[]
  energy: EnergyLog | null
  connected: boolean
}

// Keep a rolling window of power history for the chart
const _powerHistory: { time: string; watts: number }[] = []

export function DashboardTab({ devices, alerts, energy, connected }: Props) {
  const totalOn    = devices.filter((d) => d.status).length
  const totalWatts = energy?.total_watts ?? 0

  // Append to rolling history
  if (energy && (_powerHistory.length === 0 || _powerHistory.at(-1)?.watts !== totalWatts)) {
    _powerHistory.push({
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      watts: totalWatts,
    })
    if (_powerHistory.length > 20) _powerHistory.shift()
  }

  if (!energy) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground">
        Connecting to live stream…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Hero */}
      <HeroCard
        totalOn={totalOn}
        totalDevices={devices.length}
        totalWatts={totalWatts}
        todayKwh={energy.today_kwh}
        alertCount={alerts.length}
        connected={connected}
      />

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <PowerChart history={[..._powerHistory]} />
        <RoomChart roomWatts={energy.room_watts as Record<string, number>} />
      </div>

      {/* Devices */}
      <DeviceGrid devices={devices} />
    </div>
  )
}
