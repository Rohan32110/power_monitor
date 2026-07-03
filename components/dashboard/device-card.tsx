'use client'

import type { Device } from '@/types'

interface Props {
  device: Device
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`
}

export function DeviceCard({ device }: Props) {
  const isFan = device.device_type === 'fan'
  const isOn = device.status

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-md px-3 py-2.5 border transition-colors duration-300 ${
        isOn ? 'bg-on/5 border-on/20' : 'bg-surface border-border'
      }`}
    >
      {/* Icon + label */}
      <div className="flex items-center gap-2 min-w-0">
        <div className={`shrink-0 ${isFan && isOn ? 'fan-spin' : ''}`}>
          {isFan ? (
            <svg viewBox="0 0 16 16" className={`h-4 w-4 ${isOn ? 'text-primary' : 'text-muted-foreground'}`} fill="currentColor">
              <path d="M8 8c0-1.5 1.2-2.4 2.4-2.4C11.7 5.6 12.4 7 11 8c-.7.5-1.2.8-1.2 1.6M8 8c0-1.5-1.2-2.4-2.4-2.4C4.3 5.6 3.6 7 5 8c.7.5 1.2.8 1.2 1.6M8 8c1.5 0 2.4 1.2 2.4 2.4 0 1.3-1.4 2-2.4.6-.5-.7-.8-1.2-1.6-1.2M8 8c1.5 0 2.4-1.2 2.4-2.4 0-1.3-1.4-2-2.4-.6-.5.7-.8 1.2-1.6 1.2" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="8" cy="8" r="1.2" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className={`h-4 w-4 ${isOn ? 'text-warning' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" strokeWidth={1.3}>
              <path d="M6 14h4M8 2a4 4 0 0 1 4 4c0 1.7-1 3-2 4H6c-1-1-2-2.3-2-4a4 4 0 0 1 4-4Z" />
            </svg>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground truncate">
            {isFan ? 'Fan' : 'Light'} {device.device_number}
          </p>
          <p className="text-[10px] text-muted-foreground tabular-nums">
            {timeAgo(device.last_changed)}
          </p>
        </div>
      </div>

      {/* Status + wattage */}
      <div className="shrink-0 flex flex-col items-end gap-0.5">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide ${
            isOn ? 'text-on' : 'text-muted-foreground'
          }`}
        >
          {isOn ? 'ON' : 'OFF'}
        </span>
        {isOn && (
          <span className="text-[10px] font-mono text-muted-foreground">{device.wattage}W</span>
        )}
      </div>
    </div>
  )
}
