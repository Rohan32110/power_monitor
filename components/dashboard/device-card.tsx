'use client'

import type { Device } from '@/types'

interface DeviceCardProps {
  device: Device
}

export function DeviceCard({ device }: DeviceCardProps) {
  const isFan = device.device_type === 'fan'
  const isOn = device.status

  const lastChanged = new Date(device.last_changed)
  const minutesAgo = Math.floor((Date.now() - lastChanged.getTime()) / 60000)
  const timeLabel =
    minutesAgo < 1
      ? 'Just now'
      : minutesAgo < 60
      ? `${minutesAgo}m ago`
      : `${Math.floor(minutesAgo / 60)}h ${minutesAgo % 60}m ago`

  return (
    <div
      className="relative flex flex-col gap-2 rounded-xl p-3 transition-all duration-300"
      style={{
        background: isOn ? 'rgba(34,211,166,0.06)' : '#1C2230',
        border: `1px solid ${isOn ? 'rgba(34,211,166,0.3)' : '#252B37'}`,
        boxShadow: isOn ? '0 0 12px rgba(34,211,166,0.08)' : 'none',
      }}
    >
      {/* Status dot */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
        <div
          className={`h-1.5 w-1.5 rounded-full ${isOn ? 'glow-on' : ''}`}
          style={{ background: isOn ? '#22D3A6' : '#4B5563' }}
        />
        <span
          className="text-[10px] font-semibold tracking-wide uppercase"
          style={{ color: isOn ? '#22D3A6' : '#8A93A3' }}
        >
          {isOn ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* Icon */}
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{
          background: isOn
            ? isFan
              ? 'rgba(59,130,246,0.15)'
              : 'rgba(245,166,35,0.15)'
            : 'rgba(255,255,255,0.04)',
        }}
      >
        {isFan ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className={`h-5 w-5 ${isOn ? 'fan-spin' : ''}`}
            style={{ color: isOn ? '#3B82F6' : '#4B5563' }}
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path d="M12 12c0-2.5 2-4 4-4s4 1.5 2 4c-1 1.5-2 2-2 3.5" />
            <path d="M12 12c0-2.5-2-4-4-4S4 9.5 6 12c1 1.5 2 2 2 3.5" />
            <path d="M12 12c2.5 0 4 2 4 4s-1.5 4-4 2c-1.5-1-2-2-3.5-2" />
            <path d="M12 12c2.5 0 4-2 4-4s-1.5-4-4-2c-1.5 1-2 2-3.5 2" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            style={{ color: isOn ? '#F5A623' : '#4B5563' }}
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2.5-1.5 4.5-3 6H9c-1.5-1.5-3-3.5-3-6a6 6 0 0 1 6-6Z" />
            {isOn && (
              <path d="M12 8v4M10 10l4 0" strokeLinecap="round" />
            )}
          </svg>
        )}
      </div>

      {/* Label */}
      <div>
        <p className="text-xs font-semibold leading-tight" style={{ color: '#EAEDF2' }}>
          {isFan ? 'Fan' : 'Light'} {device.device_number}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: '#8A93A3' }}>
          {isOn ? `${device.wattage}W` : 'Idle'} · {timeLabel}
        </p>
      </div>
    </div>
  )
}
