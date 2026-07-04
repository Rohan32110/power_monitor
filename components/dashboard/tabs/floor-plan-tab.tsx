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
    <div className="hero-glow relative overflow-hidden rounded-xl border border-border bg-card px-5 py-4 mb-4">
      <div className="pointer-events-none absolute -right-2 -top-2 h-24 w-24 text-primary">
        <GhostMap />
      </div>
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Office floor plan</p>
          <h1 className="text-xl font-bold text-foreground leading-snug">3D room overview</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Devices on', value: `${totalOn}/15` },
            { label: 'Fans on',    value: `${fansOn}/6` },
            { label: 'Lights on',  value: `${lightsOn}/9` },
            { label: 'Total draw', value: `${totalW}W` },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center rounded-lg border border-border bg-surface px-3 py-2 min-w-[60px]">
              <span className="text-sm font-bold tabular-nums text-foreground leading-none">{value}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 3D isometric room SVG ─────────────────────────────────────────────────────
// Isometric projection helpers
// Convert isometric grid (col, row, height) to SVG (x, y)
const ISO_TILE_W = 80   // width of one tile in iso space
const ISO_TILE_H = 40   // height of one tile in iso space
const WALL_H     = 36   // wall height in px

function isoProject(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * (ISO_TILE_W / 2),
    y: (col + row) * (ISO_TILE_H / 2),
  }
}

// Draw one isometric box (floor + left wall + right wall + ceiling)
interface IsoBoxProps {
  col: number
  row: number
  width: number   // in tiles
  depth: number   // in tiles
  floorFill: string
  leftFill: string
  rightFill: string
  topFill: string
  stroke: string
  opacity?: number
}

function isoBox({ col, row, width, depth, floorFill, leftFill, rightFill, topFill, stroke, opacity = 1 }: IsoBoxProps) {
  // Four floor corners
  const p00 = isoProject(col,         row)
  const p10 = isoProject(col + width, row)
  const p01 = isoProject(col,         row + depth)
  const p11 = isoProject(col + width, row + depth)

  const h = WALL_H

  // Top face (ceiling / roof)
  const topPath = `M${p00.x},${p00.y} L${p10.x},${p10.y} L${p11.x},${p11.y} L${p01.x},${p01.y} Z`

  // Left face (front-left wall): p01 → p00 (top) offset by -h, then floor
  const leftPath = `M${p01.x},${p01.y} L${p01.x},${p01.y - h} L${p00.x},${p00.y - h} L${p00.x},${p00.y} Z`

  // Right face (front-right wall): p10 → p11 (top) offset by -h, then floor
  const rightPath = `M${p10.x},${p10.y} L${p10.x},${p10.y - h} L${p11.x},${p11.y - h} L${p11.x},${p11.y} Z`

  return { topPath, leftPath, rightPath, floorFill, leftFill, rightFill, topFill, stroke, opacity }
}

// ── Device icon positions on room top face ────────────────────────────────────
interface DeviceIcon {
  x: number
  y: number
  type: 'fan' | 'light'
  on: boolean
  label: string
}

function deviceIcons(
  col: number, row: number, width: number, depth: number,
  fans: Device[], lights: Device[]
): DeviceIcon[] {
  const icons: DeviceIcon[] = []

  // Fans go in left columns, lights in right columns of the top face
  // Divide top face into a 2×(max) grid
  fans.forEach((d, i) => {
    // fans along left strip: col + 0.25*w, staggered rows
    const fracRow = (i + 0.5) / (fans.length || 1)
    const dc = col + 0.25 * width
    const dr = row + fracRow * depth * 0.8 + 0.1 * depth
    const pos = isoProject(dc, dr)
    icons.push({ x: pos.x, y: pos.y - WALL_H - 2, type: 'fan', on: d.status, label: `Fan ${d.device_number}` })
  })

  lights.forEach((d, i) => {
    // lights along right strip: col + 0.72*w, staggered rows
    const fracRow = (i + 0.5) / (lights.length || 1)
    const dc = col + 0.68 * width
    const dr = row + fracRow * depth * 0.8 + 0.1 * depth
    const pos = isoProject(dc, dr)
    icons.push({ x: pos.x, y: pos.y - WALL_H - 2, type: 'light', on: d.status, label: `Light ${d.device_number}` })
  })

  return icons
}

// ── Fan SVG (3-blade, 14×14 centered at 0,0) ─────────────────────────────────
function FanIcon({ on }: { on: boolean }) {
  const color = on ? '#CBD5E1' : '#3A4560'
  const opacity = on ? 1 : 0.35
  return (
    <g opacity={opacity}>
      {/* hub */}
      <circle r={2} fill={color} />
      {/* 3 blades, each a rounded path rotated 120° */}
      {[0, 120, 240].map((deg) => (
        <path
          key={deg}
          d="M0 -1.5 C-1.5 -4, -5.5 -4, -5.5 -1.5 C-5.5 0.5, -2.5 1.5, 0 0 Z"
          fill={color}
          fillOpacity={0.9}
          transform={`rotate(${deg})`}
        />
      ))}
    </g>
  )
}

// ── Light-bulb SVG (14×16, centered at 0,0) ──────────────────────────────────
function LightIcon({ on }: { on: boolean }) {
  return (
    <g opacity={on ? 1 : 0.35}>
      {/* Outer glow — only when ON */}
      {on && <circle r={11} fill="#FFFBEB" fillOpacity={0.18} />}
      {on && <circle r={8}  fill="#FEF9C3" fillOpacity={0.28} />}
      {/* bulb body */}
      <path
        d="M0 -6 A4.5 4.5 0 0 1 4.5 -1.5 L3 2 L-3 2 L-4.5 -1.5 A4.5 4.5 0 0 1 0 -6 Z"
        fill={on ? '#FEFCE8' : '#3A4560'}
        fillOpacity={on ? 1 : 0.8}
      />
      {/* base collar */}
      <rect x="-3"   y="2"   width="6" height="1.5" rx="0.5" fill={on ? '#FDE68A' : '#3A4560'} fillOpacity={on ? 0.9 : 0.6} />
      <rect x="-2.5" y="3.5" width="5" height="1.5" rx="0.5" fill={on ? '#FCD34D' : '#3A4560'} fillOpacity={on ? 0.7 : 0.5} />
      {/* bright filament core when on */}
      {on && <circle r={2} cy={-1.5} fill="#FFFFFF" fillOpacity={1} />}
      {on && <circle r={1} cy={-1.5} fill="#FEF9C3" fillOpacity={1} />}
    </g>
  )
}

interface IsoFloorPlanProps {
  byRoom: Record<string, Device[]>
  selectedRoom: RoomId | null
  onSelectRoom: (room: RoomId) => void
}

function IsoFloorPlan({ byRoom, selectedRoom, onSelectRoom }: IsoFloorPlanProps) {
  // Layout: 3 rooms side by side in iso grid
  // Drawing Room: cols 0–3, rows 0–3
  // Work Room 1:  cols 4–7, rows 0–3
  // Work Room 2:  cols 0–3, rows 4–7
  const rooms: { id: RoomId; col: number; row: number; w: number; d: number }[] = [
    { id: 'drawing_room', col: 0, row: 0, w: 3, d: 3 },
    { id: 'work_room_1',  col: 3.2, row: 0, w: 3, d: 3 },
    { id: 'work_room_2',  col: 1.6, row: 3.2, w: 3, d: 3 },
  ]

  // Dark theme palette
  const roomDef: Record<RoomId, { top: string; left: string; right: string }> = {
    drawing_room: { top: '#1E2436', left: '#252D42', right: '#1A2035' },
    work_room_1:  { top: '#1A2035', left: '#20283C', right: '#161D30' },
    work_room_2:  { top: '#1E2436', left: '#252D42', right: '#1A2035' },
  }
  const selectedDef: Record<RoomId, { top: string; left: string; right: string }> = {
    drawing_room: { top: '#272E4A', left: '#2E3655', right: '#222944' },
    work_room_1:  { top: '#272E4A', left: '#2E3655', right: '#222944' },
    work_room_2:  { top: '#272E4A', left: '#2E3655', right: '#222944' },
  }

  // Compute SVG bounds
  const allPts = rooms.flatMap(({ col, row, w, d }) => [
    isoProject(col,     row),
    isoProject(col + w, row),
    isoProject(col,     row + d),
    isoProject(col + w, row + d),
  ])
  const minX = Math.min(...allPts.map((p) => p.x)) - 20
  const maxX = Math.max(...allPts.map((p) => p.x)) + 20
  const minY = Math.min(...allPts.map((p) => p.y)) - WALL_H - 20
  const maxY = Math.max(...allPts.map((p) => p.y)) + 20
  const vw = maxX - minX
  const vh = maxY - minY

  return (
    <svg
      viewBox={`${minX} ${minY} ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full"
      style={{ maxHeight: 320 }}
      aria-label="3D isometric floor plan"
    >
      {/* Defs: glow filter for selected room */}
      <defs>
        <filter id="iso-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="iso-glow-sel" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {rooms.map(({ id, col, row, w, d }) => {
        const isSel = selectedRoom === id
        const def = isSel ? selectedDef[id] : roomDef[id]
        const strokeColor = isSel ? '#475569' : '#2A3350'
        const strokeW = isSel ? 1.5 : 0.8

        const box = isoBox({
          col, row, width: w, depth: d,
          floorFill: def.top, leftFill: def.left, rightFill: def.right,
          topFill: def.top, stroke: strokeColor,
        })

        const fans   = (byRoom[id] ?? []).filter((d) => d.device_type === 'fan')
        const lights = (byRoom[id] ?? []).filter((d) => d.device_type === 'light')
        const icons  = deviceIcons(col, row, w, d, fans, lights)

        // Clickable hit area over top face
        const p00 = isoProject(col,     row)
        const p10 = isoProject(col + w, row)
        const p01 = isoProject(col,     row + d)
        const p11 = isoProject(col + w, row + d)

        // Label position: center of top face, raised above walls
        const cx = (p00.x + p10.x + p01.x + p11.x) / 4
        const cy = (p00.y + p10.y + p01.y + p11.y) / 4 - WALL_H - 12

        return (
          <g
            key={id}
            onClick={() => onSelectRoom(id)}
            style={{ cursor: 'pointer' }}
            filter={isSel ? 'url(#iso-glow-sel)' : undefined}
          >
            {/* Right wall */}
            <path d={box.rightPath} fill={box.rightFill} stroke={strokeColor} strokeWidth={strokeW} />
            {/* Left wall */}
            <path d={box.leftPath} fill={box.leftFill} stroke={strokeColor} strokeWidth={strokeW} />
            {/* Top face */}
            <path d={box.topPath} fill={box.topFill} stroke={strokeColor} strokeWidth={strokeW} />

            {/* Floor grid lines on top face */}
            {[0.33, 0.66].map((f) => {
              const pa = isoProject(col + f * w, row)
              const pb = isoProject(col + f * w, row + d)
              const pc = isoProject(col,         row + f * d)
              const pd = isoProject(col + w,     row + f * d)
              return (
                <g key={f}>
                  <line x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke={strokeColor} strokeWidth={0.4} strokeOpacity={0.4} />
                  <line x1={pc.x} y1={pc.y} x2={pd.x} y2={pd.y} stroke={strokeColor} strokeWidth={0.4} strokeOpacity={0.4} />
                </g>
              )
            })}

            {/* Device icons — fan blades + light bulbs */}
            {icons.map((icon, i) => (
              <g key={i} transform={`translate(${icon.x}, ${icon.y})`}>
                {icon.type === 'fan'
                  ? <FanIcon on={icon.on} />
                  : <LightIcon on={icon.on} />
                }
              </g>
            ))}

            {/* Room label */}
            <text
              x={cx} y={cy}
              textAnchor="middle"
              fontSize={isSel ? 8.5 : 7.5}
              fontWeight={isSel ? 700 : 500}
              fill={isSel ? '#94A3B8' : '#64748B'}
              letterSpacing="0.02em"
            >
              {ROOM_LABELS[id]}
            </text>

            {/* Power badge on top face center */}
            {(() => {
              const watts = (byRoom[id] ?? []).reduce((s, d) => s + (d.status ? d.wattage : 0), 0)
              if (watts === 0) return null
              const bx = (p00.x + p10.x + p01.x + p11.x) / 4
              const by = (p00.y + p10.y + p01.y + p11.y) / 4 - 6
              return (
                <text x={bx} y={by} textAnchor="middle" fontSize={7} fill="#64748B" fontWeight={500} opacity={0.8}>
                  {watts}W
                </text>
              )
            })()}

            {/* Transparent hit area */}
            <path
              d={box.topPath}
              fill="transparent"
              stroke="none"
            />
          </g>
        )
      })}

      {/* Legend */}
      <g transform={`translate(${minX + 4}, ${maxY - 18})`}>
        <g transform="translate(0,0)">
          <g transform="translate(5,0) scale(0.7)"><FanIcon on={true} /></g>
          <text x={13} y={4} fontSize={7} fill="#94A3B8">Fan ON</text>
        </g>
        <g transform="translate(60,0)">
          <g transform="translate(5,-3) scale(0.7)"><LightIcon on={true} /></g>
          <text x={13} y={4} fontSize={7} fill="#94A3B8">Light ON</text>
        </g>
        <g transform="translate(126,0)">
          <g transform="translate(5,0) scale(0.7)"><FanIcon on={false} /></g>
          <text x={13} y={4} fontSize={7} fill="#94A3B8">OFF</text>
        </g>
      </g>
    </svg>
  )
}

// ── Device tile inside a room ─────────────────────────────────────────────────
function DeviceTile({ device }: { device: Device }) {
  const on = device.status
  const isFan = device.device_type === 'fan'

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 min-h-[80px] transition-all duration-300 select-none
        ${on
          ? isFan
            ? 'border-border bg-surface shadow-sm'
            : 'border-yellow-200/30 dark:border-yellow-400/20 bg-yellow-50/60 dark:bg-yellow-900/10 shadow-sm'
          : 'border-border/40 bg-surface opacity-40'}`}
    >
      {isFan ? (
        <svg viewBox="0 0 24 24" fill="currentColor"
          className={`h-6 w-6 ${on ? 'fan-spin text-foreground' : 'text-muted-foreground'}`}>
          <circle cx="12" cy="12" r="2" />
          <path d="M12 10 C10 7, 6 6, 6 10 C6 12, 9 13, 12 12 Z" opacity="0.9" />
          <path d="M12 10 C10 7, 6 6, 6 10 C6 12, 9 13, 12 12 Z" opacity="0.9" transform="rotate(120 12 12)" />
          <path d="M12 10 C10 7, 6 6, 6 10 C6 12, 9 13, 12 12 Z" opacity="0.9" transform="rotate(240 12 12)" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}
          className={`h-6 w-6 ${on ? 'text-yellow-400 dark:text-yellow-300' : 'text-muted-foreground'}`}>
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
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{ROOM_LABELS[room]}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{onCount}/{devices.length} active</p>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold tabular-nums text-foreground font-mono">{roomWatts}W</span>
          <div className="h-1 w-14 rounded-full bg-surface mt-1 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min((roomWatts / 165) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mb-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Fans</p>
        <div className="grid grid-cols-2 gap-1.5">
          {fans.map((d) => <DeviceTile key={d.id} device={d} />)}
        </div>
      </div>

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
    <div className="flex flex-col gap-4">
      <HeroCard devices={devices} />

      {/* 3D Isometric floor plan */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">3D floor view</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary inline-block" />
              Fan
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-warning inline-block" />
              Light
            </span>
            <span className="text-muted-foreground/60">Click a room to inspect</span>
          </div>
        </div>
        <IsoFloorPlan
          byRoom={byRoom}
          selectedRoom={selectedRoom}
          onSelectRoom={(r) => setSelectedRoom(selectedRoom === r ? null : r)}
        />
      </div>

      {/* Legend strip */}
      <div className="flex items-center gap-4 px-1">
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
      </div>

      {/* 3-room device grid */}
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
        <div className="rounded-xl border border-primary/20 bg-card p-5">
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
                ? Math.max(0, Math.round((Date.now() - new Date(d.last_changed).getTime()) / 60000))
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
