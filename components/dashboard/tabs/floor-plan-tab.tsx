'use client'

import { useMemo, useState } from 'react'
import type { Device, RoomId } from '@/types'
import { ROOM_LABELS } from '@/lib/config'

// ── Ghost icon for hero ───────────────────────────────────────────────────────
function GhostMap() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-full w-full" aria-hidden>
      <rect x="4" y="4" width="56" height="56" rx="4" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
      <line x1="24" y1="4" x2="24" y2="60" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
      <line x1="44" y1="4" x2="44" y2="60" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
      <line x1="4" y1="32" x2="24" y2="32" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
      <rect x="8" y="8" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" opacity="0.10" />
      <circle cx="34" cy="18" r="4" stroke="currentColor" strokeWidth="1.2" opacity="0.10" />
      <path d="M46 10l12 0M46 20h8" stroke="currentColor" strokeWidth="1.2" opacity="0.10" strokeLinecap="round" />
    </svg>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function HeroCard({ devices }: { devices: Device[] }) {
  const totalOn  = devices.filter((d) => d.status).length
  const totalW   = devices.reduce((s, d) => s + (d.status ? d.wattage : 0), 0)
  const fans     = devices.filter((d) => d.device_type === 'fan')
  const lights   = devices.filter((d) => d.device_type === 'light')
  const fansOn   = fans.filter((d) => d.status).length
  const lightsOn = lights.filter((d) => d.status).length

  return (
    <div className="hero-glow relative overflow-hidden rounded-xl border border-border bg-card p-6 mb-5">
      <div className="pointer-events-none absolute -right-2 -top-2 h-36 w-36 text-primary">
        <GhostMap />
      </div>
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Office floor plan</p>
          <h1 className="text-2xl font-bold text-foreground">Top-down view</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Click any device card to toggle. Live state reflects the real-time stream.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Total on', value: `${totalOn}/15` },
            { label: 'Fans on',  value: `${fansOn}/6` },
            { label: 'Lights on',value: `${lightsOn}/9` },
            { label: 'Total draw', value: `${totalW}W` },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center rounded-lg border border-border bg-surface px-4 py-2.5 min-w-[72px]">
              <span className="text-base font-bold tabular-nums text-foreground leading-none">{value}</span>
              <span className="text-[11px] text-muted-foreground mt-1 whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Device tile inside a room ─────────────────────────────────────────────────
function DeviceTile({ device }: { device: Device }) {
  const on = device.status
  const isFan = device.device_type === 'fan'

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 min-h-[88px] transition-all duration-300 select-none
        ${on
          ? isFan
            ? 'border-primary/40 bg-primary/8 shadow-sm'
            : 'border-warning/40 bg-warning/8 shadow-sm'
          : 'border-border bg-surface opacity-50'
        }`}
    >
      {/* Glow ring when on */}
      {on && (
        <span className={`absolute inset-0 rounded-xl pointer-events-none ring-1 ${isFan ? 'ring-primary/30' : 'ring-warning/30'}`} />
      )}

      {isFan ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
          className={`h-7 w-7 ${on ? 'text-primary fan-spin' : 'text-muted-foreground'}`}>
          <path d="M12 12c0-3 2-7.5 5.5-7.5S21.5 8 19 10c3 1.5 7.5 2 7.5 5.5s-3.5 4.5-5.5 2c-1.5 3-2 7.5-5.5 7.5S11 21.5 5 19c1.5-3 2-7.5 5.5-7.5S4.5 12 2 12 7.5 2 12 12z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
          className={`h-7 w-7 ${on ? 'text-warning' : 'text-muted-foreground'}`}>
          <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 4 12.65V18H8v-3.35A7 7 0 0 1 12 2z" />
        </svg>
      )}

      <span className={`text-[11px] font-medium leading-none ${on ? 'text-foreground' : 'text-muted-foreground'}`}>
        {isFan ? 'Fan' : 'Light'} {device.device_number}
      </span>
      {on && (
        <span className="text-[10px] font-mono tabular-nums text-muted-foreground">{device.wattage}W</span>
      )}
    </div>
  )
}

// ── Room block ────────────────────────────────────────────────────────────────
function RoomBlock({ room, devices, selected, onSelect }: {
  room: RoomId; devices: Device[]
  selected: boolean; onSelect: () => void
}) {
  const roomWatts = devices.reduce((s, d) => s + (d.status ? d.wattage : 0), 0)
  const onCount   = devices.filter((d) => d.status).length
  const fans      = devices.filter((d) => d.device_type === 'fan')
  const lights    = devices.filter((d) => d.device_type === 'light')

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border p-4 cursor-pointer transition-all duration-200
        ${selected
          ? 'border-primary/50 bg-card shadow-md ring-1 ring-primary/20'
          : 'border-border bg-card hover:border-border/80 hover:shadow-sm'
        }`}
    >
      {/* Room header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{ROOM_LABELS[room]}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{onCount}/{devices.length} active</p>
        </div>
        <div className="text-right">
          <span className="text-base font-bold tabular-nums text-foreground font-mono">{roomWatts}W</span>
          <div className="h-1 w-16 rounded-full bg-surface mt-1 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min((roomWatts / 165) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Fans row */}
      <div className="mb-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Fans</p>
        <div className="grid grid-cols-2 gap-1.5">
          {fans.map((d) => <DeviceTile key={d.id} device={d} />)}
        </div>
      </div>

      {/* Lights row */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Lights</p>
        <div className="grid grid-cols-3 gap-1.5">
          {lights.map((d) => <DeviceTile key={d.id} device={d} />)}
        </div>
      </div>
    </div>
  )
}

// ── Floor plan tab ────────────────────────────────────────────────────────────
const ROOMS: RoomId[] = ['drawing_room', 'work_room_1', 'work_room_2']

export function FloorPlanTab({ devices }: { devices: Device[] }) {
  const [selectedRoom, setSelectedRoom] = useState<RoomId | null>(null)

  const byRoom = useMemo(() => {
    const map: Record<string, Device[]> = {}
    for (const d of devices) {
      if (!map[d.room]) map[d.room] = []
      map[d.room].push(d)
    }
    return map
  }, [devices])

  const selectedDevices = selectedRoom ? (byRoom[selectedRoom] ?? []) : []

  return (
    <div className="flex flex-col gap-0">
      <HeroCard devices={devices} />

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 px-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary/20 border border-primary/40" />
          Fan ON
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-sm bg-warning/20 border border-warning/40" />
          Light ON
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-sm bg-surface border border-border opacity-50" />
          OFF
        </div>
        <span className="text-xs text-muted-foreground ml-auto">Click a room to inspect</span>
      </div>

      {/* 3-room grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ROOMS.map((room) => (
          <RoomBlock
            key={room}
            room={room}
            devices={byRoom[room] ?? []}
            selected={selectedRoom === room}
            onSelect={() => setSelectedRoom(selectedRoom === room ? null : room)}
          />
        ))}
      </div>

      {/* Room detail panel */}
      {selectedRoom && selectedDevices.length > 0 && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{ROOM_LABELS[selectedRoom]} — Detail</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Live device state snapshot</p>
            </div>
            <button
              onClick={() => setSelectedRoom(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {selectedDevices.map((d) => {
              const minutesOn = d.status
                ? Math.round((Date.now() - new Date(d.last_changed).getTime()) / 60000)
                : null
              return (
                <div key={d.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${d.status ? 'bg-on' : 'bg-border'}`} />
                    <span className="text-sm text-foreground">{d.label.split('—').at(-1)?.trim()}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                    {d.status && <span className="font-mono">{d.wattage}W</span>}
                    {minutesOn !== null && <span>{minutesOn}m on</span>}
                    <span className={`font-semibold ${d.status ? 'text-on' : 'text-muted-foreground'}`}>
                      {d.status ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
