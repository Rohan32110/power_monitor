'use client'

import { useMemo } from 'react'
import type { Device, RoomId } from '@/types'
import { ROOM_LABELS } from '@/lib/config'

interface OfficeLayoutViewProps {
  devices: Device[]
}

interface RoomLayout {
  id: RoomId
  x: number
  y: number
  w: number
  h: number
}

const ROOMS: RoomLayout[] = [
  { id: 'drawing_room', x: 20, y: 20, w: 180, h: 230 },
  { id: 'work_room_1', x: 220, y: 20, w: 200, h: 230 },
  { id: 'work_room_2', x: 440, y: 20, w: 200, h: 230 },
]

function FanIcon({ x, y, isOn }: { x: number; y: number; isOn: boolean }) {
  const color = isOn ? '#3B82F6' : '#374151'
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="-20" y="-20" width="40" height="40" rx="8" fill={isOn ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)'} stroke={isOn ? 'rgba(59,130,246,0.3)' : '#252B37'} strokeWidth="1" />
      <g className={isOn ? 'fan-spin' : ''} style={{ transformOrigin: '0 0' }}>
        <path d="M0,0 C0,-8 5,-12 8,-10 C11,-8 8,-2 0,0" fill={color} />
        <path d="M0,0 C8,0 12,5 10,8 C8,11 2,8 0,0" fill={color} />
        <path d="M0,0 C0,8 -5,12 -8,10 C-11,8 -8,2 0,0" fill={color} />
        <path d="M0,0 C-8,0 -12,-5 -10,-8 C-8,-11 -2,-8 0,0" fill={color} />
        <circle r="3" fill={color} />
      </g>
      {isOn && <circle r="20" fill="none" stroke="#3B82F6" strokeWidth="0.5" opacity="0.4" className="glow-on" />}
    </g>
  )
}

function LightIcon({ x, y, isOn }: { x: number; y: number; isOn: boolean }) {
  const color = isOn ? '#F5A623' : '#374151'
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="-16" y="-16" width="32" height="32" rx="8" fill={isOn ? 'rgba(245,166,35,0.12)' : 'rgba(255,255,255,0.03)'} stroke={isOn ? 'rgba(245,166,35,0.35)' : '#252B37'} strokeWidth="1" />
      {isOn && (
        <circle r="18" fill="#F5A623" opacity="0.07" className="glow-on" />
      )}
      <svg x="-8" y="-9" width="16" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5}>
        <path d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2.5-1.5 4.5-3 6H9c-1.5-1.5-3-3.5-3-6a6 6 0 0 1 6-6Z" />
      </svg>
    </g>
  )
}

function Table({ x, y }: { x: number; y: number }) {
  return (
    <rect x={x} y={y} width="50" height="30" rx="4" fill="rgba(255,255,255,0.04)" stroke="#252B37" strokeWidth="1" />
  )
}

function Chair({ x, y, rotate = 0 }: { x: number; y: number; rotate?: number }) {
  return (
    <rect
      x={x - 7}
      y={y - 7}
      width="14"
      height="14"
      rx="3"
      fill="rgba(255,255,255,0.06)"
      stroke="#374151"
      strokeWidth="0.5"
      transform={`rotate(${rotate},${x},${y})`}
    />
  )
}

export function OfficeLayoutView({ devices }: OfficeLayoutViewProps) {
  const deviceMap = useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const d of devices) {
      map[d.id] = d.status
    }
    return map
  }, [devices])

  const totalWatts = devices.reduce((s, d) => s + (d.status ? d.wattage : 0), 0)
  const onCount = devices.filter((d) => d.status).length

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-4"
      style={{ background: '#151A23', border: '1px solid #252B37' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold" style={{ color: '#EAEDF2' }}>
            Office Floor Plan
          </h2>
          <p className="text-xs mt-0.5" style={{ color: '#8A93A3' }}>
            Top-view · Live device states
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono font-bold" style={{ color: '#F5A623' }}>{totalWatts}W</p>
          <p className="text-[10px]" style={{ color: '#8A93A3' }}>{onCount}/15 ON</p>
        </div>
      </div>

      {/* SVG floor plan */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox="0 0 660 270"
          className="w-full"
          style={{ minWidth: 480, maxHeight: 280 }}
        >
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1C2230" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="660" height="270" fill="url(#grid)" />

          {/* Rooms */}
          {ROOMS.map((room) => {
            const roomDevices = devices.filter((d) => d.room === room.id)
            const onCount = roomDevices.filter((d) => d.status).length
            const watts = roomDevices.reduce((s, d) => s + (d.status ? d.wattage : 0), 0)

            return (
              <g key={room.id}>
                {/* Room outline */}
                <rect
                  x={room.x}
                  y={room.y}
                  width={room.w}
                  height={room.h}
                  rx="10"
                  fill="rgba(21,26,35,0.8)"
                  stroke={onCount > 0 ? 'rgba(34,211,166,0.2)' : '#252B37'}
                  strokeWidth="1.5"
                />

                {/* Room label */}
                <text
                  x={room.x + room.w / 2}
                  y={room.y + 18}
                  textAnchor="middle"
                  fill="#EAEDF2"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="system-ui"
                >
                  {ROOM_LABELS[room.id]}
                </text>

                {/* Wattage */}
                {watts > 0 && (
                  <text
                    x={room.x + room.w - 8}
                    y={room.y + room.h - 8}
                    textAnchor="end"
                    fill="#F5A623"
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="monospace"
                  >
                    {watts}W
                  </text>
                )}
              </g>
            )
          })}

          {/* Drawing Room devices: fans at top, lights at bottom, table + chairs in middle */}
          <FanIcon x={75} y={65} isOn={deviceMap['drawing_room-fan-1']} />
          <FanIcon x={140} y={65} isOn={deviceMap['drawing_room-fan-2']} />
          {/* Waiting area chairs */}
          <Chair x={55} y={130} />
          <Chair x={80} y={130} />
          <Chair x={55} y={155} />
          <Chair x={80} y={155} />
          <Chair x={130} y={130} />
          <Chair x={155} y={130} />
          <Chair x={130} y={155} />
          <Chair x={155} y={155} />
          <LightIcon x={70} y={195} isOn={deviceMap['drawing_room-light-1']} />
          <LightIcon x={107} y={195} isOn={deviceMap['drawing_room-light-2']} />
          <LightIcon x={144} y={195} isOn={deviceMap['drawing_room-light-3']} />

          {/* Work Room 1 devices */}
          <FanIcon x={285} y={65} isOn={deviceMap['work_room_1-fan-1']} />
          <FanIcon x={355} y={65} isOn={deviceMap['work_room_1-fan-2']} />
          {/* Work desks */}
          <Table x={240} y={100} />
          <Chair x={265} y={95} rotate={0} />
          <Table x={310} y={100} />
          <Chair x={335} y={95} rotate={0} />
          <Table x={380} y={100} />
          <Chair x={405} y={95} rotate={0} />
          <Table x={240} y={150} />
          <Chair x={265} y={145} rotate={0} />
          <Table x={310} y={150} />
          <Chair x={335} y={145} rotate={0} />
          <LightIcon x={275} y={200} isOn={deviceMap['work_room_1-light-1']} />
          <LightIcon x={320} y={200} isOn={deviceMap['work_room_1-light-2']} />
          <LightIcon x={365} y={200} isOn={deviceMap['work_room_1-light-3']} />

          {/* Work Room 2 devices */}
          <FanIcon x={503} y={65} isOn={deviceMap['work_room_2-fan-1']} />
          <FanIcon x={573} y={65} isOn={deviceMap['work_room_2-fan-2']} />
          {/* Work desks */}
          <Table x={455} y={100} />
          <Chair x={480} y={95} rotate={0} />
          <Table x={525} y={100} />
          <Chair x={550} y={95} rotate={0} />
          <Table x={595} y={100} />
          <Chair x={620} y={95} rotate={0} />
          <Table x={455} y={150} />
          <Chair x={480} y={145} rotate={0} />
          <Table x={525} y={150} />
          <Chair x={550} y={145} rotate={0} />
          <LightIcon x={490} y={200} isOn={deviceMap['work_room_2-light-1']} />
          <LightIcon x={537} y={200} isOn={deviceMap['work_room_2-light-2']} />
          <LightIcon x={584} y={200} isOn={deviceMap['work_room_2-light-3']} />

          {/* Corridor */}
          <line x1="200" y1="20" x2="200" y2="250" stroke="#252B37" strokeWidth="1" strokeDasharray="4,4" />
          <line x1="420" y1="20" x2="420" y2="250" stroke="#252B37" strokeWidth="1" strokeDasharray="4,4" />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 flex-wrap" style={{ borderTop: '1px solid #252B37', paddingTop: 12 }}>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ background: 'rgba(59,130,246,0.3)', border: '1px solid #3B82F6' }} />
          <span className="text-[10px]" style={{ color: '#8A93A3' }}>Fan ON</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ background: 'rgba(245,166,35,0.3)', border: '1px solid #F5A623' }} />
          <span className="text-[10px]" style={{ color: '#8A93A3' }}>Light ON</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #252B37' }} />
          <span className="text-[10px]" style={{ color: '#8A93A3' }}>Device OFF</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid #374151' }} />
          <span className="text-[10px]" style={{ color: '#8A93A3' }}>Desk / Chair</span>
        </div>
      </div>
    </div>
  )
}
