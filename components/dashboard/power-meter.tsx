'use client'

import type { EnergyLog } from '@/types'
import { ROOM_LABELS } from '@/lib/config'

interface PowerMeterProps {
  energy: EnergyLog
}

const MAX_OFFICE_WATTS = (60 * 2 + 15 * 3) * 3 // 3 rooms × (2 fans + 3 lights)

function RoomBar({
  label,
  watts,
  maxWatts,
  color,
}: {
  label: string
  watts: number
  maxWatts: number
  color: string
}) {
  const pct = maxWatts > 0 ? Math.min((watts / maxWatts) * 100, 100) : 0

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: '#8A93A3' }}>
          {label}
        </span>
        <span className="text-xs font-mono font-bold" style={{ color: '#EAEDF2' }}>
          {watts}W
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full" style={{ background: '#252B37' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

export function PowerMeter({ energy }: PowerMeterProps) {
  const { total_watts, room_watts, today_kwh } = energy
  const pct = Math.min((total_watts / MAX_OFFICE_WATTS) * 100, 100)

  const roomMaxWatts = (60 * 2 + 15 * 3) // per room max

  // Color based on load
  const loadColor =
    pct < 40 ? '#22D3A6' : pct < 70 ? '#F5A623' : '#F0526B'

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-5"
      style={{ background: '#151A23', border: '1px solid #252B37' }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold" style={{ color: '#EAEDF2' }}>
          Power Consumption
        </h2>
        <span
          className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(34,211,166,0.1)', color: '#22D3A6', border: '1px solid rgba(34,211,166,0.2)' }}
        >
          Live
        </span>
      </div>

      {/* Big total */}
      <div className="flex items-end gap-3">
        <span
          className="text-5xl font-black font-mono live-number tabular-nums"
          style={{ color: loadColor }}
        >
          {total_watts}
        </span>
        <div className="mb-1 flex flex-col gap-0.5">
          <span className="text-sm font-bold" style={{ color: '#8A93A3' }}>W</span>
          <span className="text-[10px]" style={{ color: '#4B5563' }}>total</span>
        </div>
        <div className="ml-auto text-right mb-1">
          <p className="text-xl font-black font-mono" style={{ color: '#3B82F6' }}>
            {today_kwh}
          </p>
          <p className="text-[10px]" style={{ color: '#8A93A3' }}>kWh today</p>
        </div>
      </div>

      {/* Overall load bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: '#8A93A3' }}>
            Office Load
          </span>
          <span className="text-[11px] font-mono" style={{ color: loadColor }}>
            {pct.toFixed(0)}% of max {MAX_OFFICE_WATTS}W
          </span>
        </div>
        <div className="h-2 w-full rounded-full" style={{ background: '#252B37' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: loadColor, boxShadow: `0 0 8px ${loadColor}66` }}
          />
        </div>
      </div>

      {/* Per-room breakdown */}
      <div className="flex flex-col gap-3 pt-1" style={{ borderTop: '1px solid #252B37' }}>
        <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: '#4B5563' }}>
          Per Room
        </p>
        <RoomBar
          label={ROOM_LABELS.drawing_room}
          watts={room_watts.drawing_room}
          maxWatts={roomMaxWatts}
          color="#22D3A6"
        />
        <RoomBar
          label={ROOM_LABELS.work_room_1}
          watts={room_watts.work_room_1}
          maxWatts={roomMaxWatts}
          color="#3B82F6"
        />
        <RoomBar
          label={ROOM_LABELS.work_room_2}
          watts={room_watts.work_room_2}
          maxWatts={roomMaxWatts}
          color="#F5A623"
        />
      </div>
    </div>
  )
}
