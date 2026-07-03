'use client'

import type { Device, RoomId } from '@/types'
import { ROOM_LIST, ROOM_LABELS, ROOM_DESCRIPTIONS } from '@/lib/config'
import { DeviceCard } from './device-card'

interface DeviceStatusPanelProps {
  devices: Device[]
}

function RoomSection({ room, devices }: { room: RoomId; devices: Device[] }) {
  const roomDevices = devices.filter((d) => d.room === room)
  const fans = roomDevices.filter((d) => d.device_type === 'fan')
  const lights = roomDevices.filter((d) => d.device_type === 'light')
  const onCount = roomDevices.filter((d) => d.status).length
  const totalWatts = roomDevices.reduce((s, d) => s + (d.status ? d.wattage : 0), 0)

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: '#151A23', border: '1px solid #252B37' }}
    >
      {/* Room header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold" style={{ color: '#EAEDF2' }}>
            {ROOM_LABELS[room]}
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: '#8A93A3' }}>
            {ROOM_DESCRIPTIONS[room]}
          </p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: onCount > 0 ? 'rgba(34,211,166,0.1)' : 'rgba(255,255,255,0.04)',
              color: onCount > 0 ? '#22D3A6' : '#8A93A3',
              border: `1px solid ${onCount > 0 ? 'rgba(34,211,166,0.25)' : '#252B37'}`,
            }}
          >
            {onCount}/{roomDevices.length} ON
          </span>
          {totalWatts > 0 && (
            <span className="text-[11px] font-mono font-bold" style={{ color: '#F5A623' }}>
              {totalWatts}W
            </span>
          )}
        </div>
      </div>

      {/* Fans row */}
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#4B5563' }}>
          Fans
        </p>
        <div className="grid grid-cols-2 gap-2">
          {fans.map((d) => (
            <DeviceCard key={d.id} device={d} />
          ))}
        </div>
      </div>

      {/* Lights row */}
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#4B5563' }}>
          Lights
        </p>
        <div className="grid grid-cols-3 gap-2">
          {lights.map((d) => (
            <DeviceCard key={d.id} device={d} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function DeviceStatusPanel({ devices }: DeviceStatusPanelProps) {
  const totalOn = devices.filter((d) => d.status).length

  return (
    <section className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold" style={{ color: '#EAEDF2' }}>
            Device Status
          </h2>
          <p className="text-xs mt-0.5" style={{ color: '#8A93A3' }}>
            {totalOn} of 15 devices currently on
          </p>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full glow-on" style={{ background: '#22D3A6' }} />
          <span className="text-[11px] font-semibold" style={{ color: '#22D3A6' }}>
            LIVE
          </span>
        </div>
      </div>

      {/* Room sections */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {ROOM_LIST.map((room) => (
          <RoomSection key={room} room={room} devices={devices} />
        ))}
      </div>
    </section>
  )
}
