'use client'

import { useMemo } from 'react'
import type { Device, RoomId } from '@/types'
import { ROOM_LABELS } from '@/lib/config'

interface Props {
  devices: Device[]
}

// Room rectangles in SVG viewBox 680 × 300
const ROOMS: { id: RoomId; x: number; y: number; w: number; h: number }[] = [
  { id: 'drawing_room', x: 16, y: 16, w: 190, h: 264 },
  { id: 'work_room_1', x: 226, y: 16, w: 210, h: 264 },
  { id: 'work_room_2', x: 456, y: 16, w: 210, h: 264 },
]

function FanIcon({ x, y, on }: { x: number; y: number; on: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r="17" fill={on ? 'hsl(239 84% 67% / 0.12)' : 'hsl(240 5% 96% / 0.04)'} stroke={on ? 'hsl(239 84% 67% / 0.4)' : 'hsl(240 6% 83% / 0.3)'} strokeWidth="1" />
      <g style={{ transformOrigin: '0 0' }} className={on ? 'fan-spin' : ''}>
        <path d="M0-8 C2-10 7-11 8-8 C9-5 5-2 0 0" fill={on ? '#6366F1' : '#9CA3AF'} opacity={on ? 1 : 0.4} />
        <path d="M8 0 C10-2 11-7 8-8 C5-9 2-5 0 0" fill={on ? '#6366F1' : '#9CA3AF'} opacity={on ? 1 : 0.4} />
        <path d="M0 8 C-2 10-7 11-8 8 C-9 5-5 2 0 0" fill={on ? '#6366F1' : '#9CA3AF'} opacity={on ? 1 : 0.4} />
        <path d="M-8 0 C-10 2-11 7-8 8 C-5 9-2 5 0 0" fill={on ? '#6366F1' : '#9CA3AF'} opacity={on ? 1 : 0.4} />
        <circle r="2.5" fill={on ? '#6366F1' : '#9CA3AF'} opacity={on ? 1 : 0.4} />
      </g>
    </g>
  )
}

function LightIcon({ x, y, on }: { x: number; y: number; on: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {on && <circle r="20" fill="#F59E0B" opacity="0.08" />}
      <circle r="13" fill={on ? 'hsl(43 96% 56% / 0.18)' : 'hsl(240 5% 96% / 0.04)'} stroke={on ? 'hsl(43 96% 56% / 0.4)' : 'hsl(240 6% 83% / 0.3)'} strokeWidth="1" />
      <path
        d="M0-6a4 4 0 0 1 4 4c0 1.7-1 3-2 4H-2c-1-1-2-2.3-2-4a4 4 0 0 1 4-4Z M-1.5 5h3"
        fill="none"
        stroke={on ? '#F59E0B' : '#9CA3AF'}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={on ? 1 : 0.4}
      />
    </g>
  )
}

function Desk({ x, y, w = 52, h = 28 }: { x: number; y: number; w?: number; h?: number }) {
  return <rect x={x} y={y} width={w} height={h} rx="3" fill="hsl(240 5% 96% / 0.05)" stroke="hsl(240 6% 83% / 0.15)" strokeWidth="0.8" />
}

function Chair({ x, y }: { x: number; y: number }) {
  return <rect x={x - 7} y={y - 7} width="14" height="14" rx="3" fill="hsl(240 5% 96% / 0.07)" stroke="hsl(240 6% 83% / 0.15)" strokeWidth="0.8" />
}

export function OfficeLayoutView({ devices }: Props) {
  const map = useMemo(() => {
    const m: Record<string, boolean> = {}
    for (const d of devices) m[d.id] = d.status
    return m
  }, [devices])

  const totalWatts = devices.reduce((s, d) => s + (d.status ? d.wattage : 0), 0)
  const onCount = devices.filter((d) => d.status).length

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Floor Plan</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Top-view · live device states</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">{totalWatts}W</span>
          <span className="text-[11px] font-medium text-on">{onCount}/15 on</span>
        </div>
      </div>

      {/* SVG */}
      <div className="w-full overflow-x-auto rounded-md bg-surface p-2">
        <svg viewBox="0 0 680 300" className="w-full" style={{ minWidth: 440 }}>
          {/* Grid */}
          <defs>
            <pattern id="floor-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0L0 0 0 20" fill="none" stroke="hsl(240 6% 83% / 0.06)" strokeWidth="0.5" />
            </pattern>
            <pattern id="floor-grid-dark" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M20 0L0 0 0 20" fill="none" stroke="hsl(240 6% 83% / 0.04)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="680" height="300" fill="url(#floor-grid)" />

          {/* Entry corridor at bottom */}
          <rect x="16" y="290" width="650" height="8" rx="2" fill="hsl(240 6% 83% / 0.05)" stroke="hsl(240 6% 83% / 0.1)" strokeWidth="0.5" />
          <text x="340" y="298" textAnchor="middle" fill="hsl(240 6% 83% / 0.3)" fontSize="7" fontFamily="system-ui">ENTRY</text>

          {/* Rooms */}
          {ROOMS.map((room) => {
            const rd = devices.filter((d) => d.room === room.id)
            const rOn = rd.filter((d) => d.status).length
            const rW = rd.reduce((s, d) => s + (d.status ? d.wattage : 0), 0)
            return (
              <g key={room.id}>
                <rect
                  x={room.x} y={room.y} width={room.w} height={room.h} rx="6"
                  fill="hsl(240 5% 96% / 0.02)"
                  stroke={rOn > 0 ? 'hsl(239 84% 67% / 0.25)' : 'hsl(240 6% 83% / 0.15)'}
                  strokeWidth="1"
                />
                {/* Room name */}
                <text x={room.x + room.w / 2} y={room.y + 15} textAnchor="middle" fill="hsl(240 6% 83% / 0.7)" fontSize="9.5" fontWeight="600" fontFamily="system-ui">
                  {ROOM_LABELS[room.id]}
                </text>
                {/* Wattage badge */}
                {rW > 0 && (
                  <text x={room.x + room.w - 8} y={room.y + room.h - 8} textAnchor="end" fill="#F59E0B" fontSize="8.5" fontWeight="600" fontFamily="monospace">
                    {rW}W
                  </text>
                )}
                {/* Windows along top wall */}
                <rect x={room.x + 25} y={room.y} width="20" height="3" rx="1" fill="hsl(240 6% 83% / 0.2)" />
                <rect x={room.x + room.w - 45} y={room.y} width="20" height="3" rx="1" fill="hsl(240 6% 83% / 0.2)" />
                {/* Door at bottom */}
                <path d={`M${room.x + room.w / 2 - 10} ${room.y + room.h} Q${room.x + room.w / 2 - 10} ${room.y + room.h - 14} ${room.x + room.w / 2 + 10} ${room.y + room.h - 14}`} fill="none" stroke="hsl(240 6% 83% / 0.2)" strokeWidth="0.8" />
              </g>
            )
          })}

          {/* ── Drawing Room furniture + devices ── */}
          {/* Sofa area */}
          <Desk x={36} y={82} w={70} h={36} />
          <Chair x={50} y={76} />
          <Chair x={80} y={76} />
          <Chair x={110} y={76} />
          {/* Small table */}
          <Desk x={64} y={130} w={40} h={24} />
          <Chair x={58} y={166} />
          <Chair x={90} y={166} />
          {/* Plant corners */}
          <circle cx="30" cy="36" r="5" fill="hsl(142 71% 45% / 0.2)" stroke="hsl(142 71% 45% / 0.3)" strokeWidth="0.8" />
          <circle cx="196" cy="36" r="5" fill="hsl(142 71% 45% / 0.2)" stroke="hsl(142 71% 45% / 0.3)" strokeWidth="0.8" />
          {/* Fans */}
          <FanIcon x={80} y={54} on={map['drawing_room-fan-1']} />
          <FanIcon x={150} y={54} on={map['drawing_room-fan-2']} />
          {/* Lights */}
          <LightIcon x={55} y={210} on={map['drawing_room-light-1']} />
          <LightIcon x={107} y={210} on={map['drawing_room-light-2']} />
          <LightIcon x={159} y={210} on={map['drawing_room-light-3']} />

          {/* ── Work Room 1 furniture + devices ── */}
          <Desk x={244} y={80} />
          <Chair x={270} y={74} />
          <Chair x={270} y={114} />
          <Desk x={310} y={80} />
          <Chair x={336} y={74} />
          <Chair x={336} y={114} />
          <Desk x={376} y={80} />
          <Chair x={402} y={74} />
          <Chair x={402} y={114} />
          <Desk x={244} y={148} />
          <Chair x={270} y={142} />
          <Chair x={270} y={182} />
          <Desk x={310} y={148} />
          <Chair x={336} y={142} />
          <Chair x={336} y={182} />
          {/* Fans */}
          <FanIcon x={290} y={54} on={map['work_room_1-fan-1']} />
          <FanIcon x={376} y={54} on={map['work_room_1-fan-2']} />
          {/* Lights */}
          <LightIcon x={267} y={216} on={map['work_room_1-light-1']} />
          <LightIcon x={328} y={216} on={map['work_room_1-light-2']} />
          <LightIcon x={390} y={216} on={map['work_room_1-light-3']} />

          {/* ── Work Room 2 furniture + devices ── */}
          <Desk x={474} y={80} />
          <Chair x={500} y={74} />
          <Chair x={500} y={114} />
          <Desk x={540} y={80} />
          <Chair x={566} y={74} />
          <Chair x={566} y={114} />
          <Desk x={606} y={80} />
          <Chair x={632} y={74} />
          <Chair x={632} y={114} />
          <Desk x={474} y={148} />
          <Chair x={500} y={142} />
          <Chair x={500} y={182} />
          <Desk x={540} y={148} />
          <Chair x={566} y={142} />
          <Chair x={566} y={182} />
          {/* Water cooler */}
          <circle cx="648" cy="198" r="6" fill="hsl(210 100% 60% / 0.1)" stroke="hsl(210 100% 60% / 0.3)" strokeWidth="0.8" />
          {/* Fans */}
          <FanIcon x={518} y={54} on={map['work_room_2-fan-1']} />
          <FanIcon x={606} y={54} on={map['work_room_2-fan-2']} />
          {/* Lights */}
          <LightIcon x={497} y={216} on={map['work_room_2-light-1']} />
          <LightIcon x={559} y={216} on={map['work_room_2-light-2']} />
          <LightIcon x={621} y={216} on={map['work_room_2-light-3']} />

          {/* Divider walls */}
          <line x1="216" y1="16" x2="216" y2="284" stroke="hsl(240 6% 83% / 0.2)" strokeWidth="1" />
          <line x1="446" y1="16" x2="446" y2="284" stroke="hsl(240 6% 83% / 0.2)" strokeWidth="1" />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 flex-wrap border-t border-border pt-4">
        {[
          { color: 'bg-primary', label: 'Fan ON' },
          { color: 'bg-warning', label: 'Light ON' },
          { color: 'bg-muted-foreground/30', label: 'Device OFF' },
          { color: 'bg-on/30', label: 'Plant' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${item.color}`} />
            <span className="text-[11px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
