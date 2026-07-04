'use client'

import type { EnergyLog } from '@/types'
import { ROOM_LABELS } from '@/lib/config'

// 15 devices: 6 fans × 60W + 9 lights × 15W = 495W
const MAX_WATTS = 495

interface Props {
  energy: EnergyLog
}

export function PowerMeter({ energy }: Props) {
  const loadPct = Math.min(100, Math.round((energy.total_watts / MAX_WATTS) * 100))
  const rooms = [
    { id: 'drawing_room' as const, label: ROOM_LABELS.drawing_room },
    { id: 'work_room_1' as const, label: ROOM_LABELS.work_room_1 },
    { id: 'work_room_2' as const, label: ROOM_LABELS.work_room_2 },
  ]
  const maxRoom = Math.max(...rooms.map((r) => energy.room_watts[r.id]), 1)

  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Power Consumption
      </p>

      {/* Big wattage number */}
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-5xl font-semibold tabular-nums text-foreground leading-none transition-all duration-500">
            {energy.total_watts}
          </span>
          <span className="text-base text-muted-foreground">W</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">total draw right now</p>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-surface px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">Today</p>
          <p className="text-sm font-semibold tabular-nums text-foreground mt-0.5">
            {energy.today_kwh} <span className="text-xs font-normal text-muted-foreground">kWh</span>
          </p>
        </div>
        <div className="rounded-md bg-surface px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">Office load</p>
          <p className="text-sm font-semibold tabular-nums text-foreground mt-0.5">{loadPct}%</p>
        </div>
      </div>

      {/* Load bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground">Capacity</span>
          <span className="text-[11px] font-mono text-muted-foreground">
            {energy.total_watts} / {MAX_WATTS}W
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${loadPct}%` }}
          />
        </div>
      </div>

      {/* Per-room breakdown */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Per Room
        </p>
        <div className="flex flex-col gap-3">
          {rooms.map((room) => {
            const w = energy.room_watts[room.id]
            const pct = Math.round((w / maxRoom) * 100)
            return (
              <div key={room.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground">{room.label}</span>
                  <span className="text-xs font-mono text-muted-foreground">{w}W</span>
                </div>
                <div className="h-1 rounded-full bg-surface overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/50 transition-all duration-700 ease-out"
                    style={{ width: w > 0 ? `${pct}%` : '0%' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
