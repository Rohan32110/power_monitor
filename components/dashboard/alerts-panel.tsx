'use client'

import type { Alert } from '@/types'
import { ROOM_LABELS } from '@/lib/config'

interface Props {
  alerts: Alert[]
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`
}

function AlertRow({ alert }: { alert: Alert }) {
  const isCritical = alert.severity === 'critical'

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      {/* Severity dot */}
      <div className="mt-0.5 shrink-0">
        <span
          className={`inline-flex h-1.5 w-1.5 rounded-full mt-1 ${isCritical ? 'bg-danger' : 'bg-warning'}`}
        />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-foreground">{ROOM_LABELS[alert.room]}</span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
              isCritical
                ? 'bg-danger/10 text-danger'
                : 'bg-warning/10 text-warning'
            }`}
          >
            {alert.type === 'after_hours' ? 'After Hours' : 'Continuous 2h+'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.message}</p>
      </div>

      {/* Time */}
      <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
        {timeAgo(alert.triggered_at)}
      </span>
    </div>
  )
}

export function AlertsPanel({ alerts }: Props) {
  const sorted = [...alerts].sort(
    (a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime()
  )

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Active Alerts
        </p>
        {sorted.length > 0 ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-danger">
            <span className="h-1.5 w-1.5 rounded-full bg-danger live-dot" />
            {sorted.length} active
          </span>
        ) : (
          <span className="text-[11px] font-medium text-on">All clear</span>
        )}
      </div>

      {/* List or empty */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 flex-1">
          <div className="h-8 w-8 rounded-full bg-on/10 flex items-center justify-center">
            <svg viewBox="0 0 16 16" className="h-4 w-4 text-on" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M3 8l3.5 3.5L13 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">No active alerts</p>
          <p className="text-xs text-muted-foreground text-center">
            All devices are operating within normal parameters.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {sorted.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {/* Info footer */}
      <div className="mt-auto pt-3 border-t border-border">
        <p className="text-[11px] text-muted-foreground">
          Alerts fire when devices are on after 17:00, or all devices in a room have been on for 2+ hours continuously.
        </p>
      </div>
    </div>
  )
}
