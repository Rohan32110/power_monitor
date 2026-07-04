'use client'

import type { Device, RoomId } from '@/types'
import { ROOM_LIST, ROOM_LABELS, ROOM_DESCRIPTIONS } from '@/lib/config'
import { DeviceCard } from './device-card'

interface Props {
  devices: Device[]
}
// Receives a room ID and its list of devices as props.

function RoomCard({ room, devices }: { room: RoomId; devices: Device[] }) {
  const roomDevices = devices.filter((d) => d.room === room)
  const fans = roomDevices.filter((d) => d.device_type === 'fan')
  const lights = roomDevices.filter((d) => d.device_type === 'light')
  const onCount = roomDevices.filter((d) => d.status).length
  const watts = roomDevices.reduce((s, d) => s + (d.status ? d.wattage : 0), 0)

  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
      {/* Room header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{ROOM_LABELS[room]}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{ROOM_DESCRIPTIONS[room]}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
              onCount > 0 ? 'bg-on/10 text-on' : 'bg-surface text-muted-foreground'
            }`}
          >
            {onCount}/{roomDevices.length} on
          </span>
          {watts > 0 && (
            <span className="text-[11px] font-mono text-muted-foreground">{watts}W</span>
          )}
        </div>
      </div>

      {/* Fans */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Fans
        </p>
        <div className="flex flex-col gap-1.5">
          {fans.map((d) => (
            <DeviceCard key={d.id} device={d} />
          ))}
        </div>
      </div>

      {/* Lights */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Lights
        </p>
        <div className="flex flex-col gap-1.5">
          {lights.map((d) => (
            <DeviceCard key={d.id} device={d} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function DeviceStatusPanel({ devices }: Props) {
  const totalOn = devices.filter((d) => d.status).length

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Device Status</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {totalOn} of {devices.length} devices currently on
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-on live-dot" />
          <span className="text-[11px] font-medium text-on">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {ROOM_LIST.map((room) => (
          <RoomCard key={room} room={room} devices={devices} />
        ))}
      </div>
    </section>
  )
}
