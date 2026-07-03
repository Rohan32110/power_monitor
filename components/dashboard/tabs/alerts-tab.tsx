'use client'

import type { Alert } from '@/types'
import { ROOM_LABELS } from '@/lib/config'
import type { RoomId } from '@/types'

// ── Ghost icon ────────────────────────────────────────────────────────────────
function GhostBell() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-full w-full" aria-hidden>
      <path d="M24 4a4 4 0 0 0-4 4c0 0-8 4-8 14v6l-4 4v2h32v-2l-4-4v-6c0-10-8-14-8-14a4 4 0 0 0-4-4z"
        stroke="currentColor" strokeWidth="1.5" opacity="0.15" strokeLinejoin="round" />
      <path d="M20 38a4 4 0 0 0 8 0" stroke="currentColor" strokeWidth="1.5" opacity="0.15" />
    </svg>
  )
}

// ── Type definitions ──────────────────────────────────────────────────────────
const SEVERITY_ROW: Record<string, string> = {
  critical: 'border-danger/30 bg-danger/5',
  warning:  'border-warning/30 bg-warning/5',
}
const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-danger',
  warning:  'bg-warning',
}
const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  after_hours: { label: 'After Hours',    cls: 'bg-warning/15 text-warning border border-warning/25' },
  all_on_2hr:  { label: 'Continuous 2h+', cls: 'bg-danger/15 text-danger border border-danger/25' },
}

const TYPE_DESCRIPTION: Record<string, string> = {
  after_hours: 'Devices are active outside of office hours (09:00–17:00). These should be turned off to conserve energy.',
  all_on_2hr:  'All 5 devices in this room have been ON continuously for 2+ hours. Consider turning some off.',
}

// ── Single alert card ─────────────────────────────────────────────────────────
function AlertCard({ alert }: { alert: Alert }) {
  const badge  = TYPE_BADGE[alert.type]
  const rowCls = SEVERITY_ROW[alert.severity] ?? 'border-border'
  const dotCls = SEVERITY_DOT[alert.severity] ?? 'bg-muted-foreground'
  const desc   = TYPE_DESCRIPTION[alert.type] ?? alert.message
  const triggeredAt = new Date(alert.triggered_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  })
  const triggeredDate = new Date(alert.triggered_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric'
  })
  const minutesAgo = Math.max(0, Math.round((Date.now() - new Date(alert.triggered_at).getTime()) / 60000))

  return (
    <div className={`rounded-xl border p-4 ${rowCls}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2.5">
          <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full live-dot ${dotCls}`} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">
                {ROOM_LABELS[alert.room as RoomId] ?? alert.room}
              </span>
              {badge && (
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${badge.cls}`}>
                  {badge.label}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-xs font-mono tabular-nums text-muted-foreground">{triggeredAt}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{triggeredDate} · {minutesAgo}m ago</p>
        </div>
      </div>

      {/* Affected devices */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="text-[10px] text-muted-foreground mr-1">Devices affected:</span>
        {alert.device_ids.map((id) => {
          const parts = id.split('-')
          const type = parts.find((p) => p === 'fan' || p === 'light') ?? ''
          const num  = parts.at(-1) ?? ''
          const label = type ? `${type.charAt(0).toUpperCase() + type.slice(1)} ${num}` : id
          return (
            <span
              key={id}
              className="rounded bg-surface border border-border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
            >
              {label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── AlertsTab ─────────────────────────────────────────────────────────────────
interface Props {
  alerts: Alert[]
  onGoToDashboard: () => void
}

export function AlertsTab({ alerts, onGoToDashboard }: Props) {
  const afterHours  = alerts.filter((a) => a.type === 'after_hours')
  const allOn2hr    = alerts.filter((a) => a.type === 'all_on_2hr')
  const totalAlerts = alerts.length

  return (
    <div className="flex flex-col gap-5">
      {/* Hero */}
      <div className="hero-glow relative overflow-hidden rounded-xl border border-border bg-card px-5 py-4">
        <div className="pointer-events-none absolute -right-2 -top-2 h-28 w-28 text-primary">
          <GhostBell />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
              Real-time alert monitor
            </p>
            <h1 className="text-xl font-bold text-foreground leading-snug">Active alerts</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Auto-cleared when conditions resolve. Updated with every data tick.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {[
              { label: 'Total',      value: String(totalAlerts), accent: totalAlerts > 0 },
              { label: 'After hrs',  value: String(afterHours.length),  accent: afterHours.length > 0 },
              { label: '2h+ on',     value: String(allOn2hr.length),    accent: allOn2hr.length > 0 },
            ].map(({ label, value, accent }) => (
              <div
                key={label}
                className={`flex flex-col items-center rounded-lg border px-3 py-2 min-w-[58px]
                  ${accent ? 'border-danger/30 bg-danger/5' : 'border-border bg-surface'}`}
              >
                <span className={`text-sm font-bold tabular-nums leading-none ${accent ? 'text-danger' : 'text-foreground'}`}>
                  {value}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {totalAlerts === 0 ? (
        /* All clear state */
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-on/10 flex items-center justify-center mb-4">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6 text-on">
              <path d="M5 10l4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-base font-semibold text-foreground">All clear</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            No active alerts at this time. All devices are operating within expected parameters.
          </p>
          <button
            onClick={onGoToDashboard}
            className="mt-4 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Back to dashboard
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* After hours section */}
          {afterHours.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2 w-2 rounded-full bg-warning flex-shrink-0" />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  After hours — devices left on ({afterHours.length})
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {afterHours.map((a) => <AlertCard key={a.id} alert={a} />)}
              </div>
            </section>
          )}

          {/* Continuous 2h+ section */}
          {allOn2hr.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2 w-2 rounded-full bg-danger flex-shrink-0" />
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Continuous 2h+ — all devices on ({allOn2hr.length})
                </h2>
              </div>
              <div className="flex flex-col gap-3">
                {allOn2hr.map((a) => <AlertCard key={a.id} alert={a} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Rule reference */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Alert rules</h2>
        <div className="flex flex-col gap-2">
          {[
            {
              type: 'After Hours',
              cls: 'bg-warning/10 text-warning border-warning/20',
              rule: 'Any device active outside office hours (before 09:00 or after 17:00). Clears when all devices in the room are turned off.',
            },
            {
              type: 'Continuous 2h+',
              cls: 'bg-danger/10 text-danger border-danger/20',
              rule: 'All 5 devices in a room (2 fans + 3 lights) have been ON continuously for 2 or more hours. Clears when any device turns off.',
            },
          ].map(({ type, cls, rule }) => (
            <div key={type} className="flex items-start gap-3 text-xs">
              <span className={`flex-shrink-0 rounded border px-2 py-0.5 font-bold text-[10px] uppercase ${cls}`}>{type}</span>
              <span className="text-muted-foreground leading-relaxed">{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
