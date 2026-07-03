'use client'

import type { Alert } from '@/types'
import { ROOM_LABELS } from '@/lib/config'

interface AlertsPanelProps {
  alerts: Alert[]
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`
}

function AlertItem({ alert }: { alert: Alert }) {
  const isCritical = alert.severity === 'critical'
  const color = isCritical ? '#F0526B' : '#F5A623'
  const bg = isCritical ? 'rgba(240,82,107,0.06)' : 'rgba(245,166,35,0.06)'
  const border = isCritical ? 'rgba(240,82,107,0.25)' : 'rgba(245,166,35,0.25)'

  return (
    <div
      className="flex flex-col gap-1.5 rounded-xl p-3"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* severity icon */}
          <div
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
            style={{ background: `${color}22` }}
          >
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill={color}>
              {isCritical ? (
                <path d="M8 2L1 14h14L8 2Zm0 3v4m0 2v1" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
              ) : (
                <path d="M8 5v4M8 11v1" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
              )}
            </svg>
          </div>
          <div>
            <span
              className="text-[10px] uppercase tracking-widest font-bold"
              style={{ color }}
            >
              {alert.type === 'after_hours' ? 'After Hours' : 'Continuous 2h+'}
            </span>
            <p className="text-xs font-semibold mt-0.5" style={{ color: '#EAEDF2' }}>
              {ROOM_LABELS[alert.room]}
            </p>
          </div>
        </div>
        <span className="text-[10px] shrink-0 mt-0.5" style={{ color: '#8A93A3' }}>
          {timeAgo(alert.triggered_at)}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: '#8A93A3' }}>
        {alert.message}
      </p>
      <p className="text-[10px]" style={{ color: '#4B5563' }}>
        {new Date(alert.triggered_at).toLocaleString('en-BD', {
          hour: '2-digit',
          minute: '2-digit',
          day: 'numeric',
          month: 'short',
        })}
        {' · '}
        {alert.device_ids.length} device{alert.device_ids.length !== 1 ? 's' : ''} affected
      </p>
    </div>
  )
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  // Sort: newest first
  const sorted = [...alerts].sort(
    (a, b) => new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime()
  )

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: '#151A23', border: '1px solid #252B37' }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold" style={{ color: '#EAEDF2' }}>
          Active Alerts
        </h2>
        {sorted.length > 0 ? (
          <span
            className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(240,82,107,0.1)', color: '#F0526B', border: '1px solid rgba(240,82,107,0.2)' }}
          >
            <div className="h-1.5 w-1.5 rounded-full glow-on" style={{ background: '#F0526B' }} />
            {sorted.length} active
          </span>
        ) : (
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(34,211,166,0.1)', color: '#22D3A6', border: '1px solid rgba(34,211,166,0.2)' }}
          >
            All clear
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: 'rgba(34,211,166,0.08)' }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#22D3A6" strokeWidth={1.5}>
              <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#22D3A6' }}>No active alerts</p>
          <p className="text-xs text-center" style={{ color: '#8A93A3' }}>
            All devices are operating within normal parameters.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  )
}
