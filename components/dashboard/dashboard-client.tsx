'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Device, Alert, EnergyLog } from '@/types'
import { simulateTick, getDevices, getActiveAlerts, getEnergyData } from '@/lib/simulator'
import { DeviceStatusPanel } from './device-status-panel'
import { PowerMeter } from './power-meter'
import { AlertsPanel } from './alerts-panel'
import { OfficeLayoutView } from './office-layout-view'
import { KnowledgeGraph } from './knowledge-graph'

type Tab = 'dashboard' | 'layout' | 'knowledge-graph'

function LiveClock() {
  const [time, setTime] = useState<string>('')

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString('en-BD', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="font-mono text-sm font-bold tabular-nums" style={{ color: '#22D3A6' }}>
      {time}
    </span>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
      style={{
        background: active ? '#22D3A6' : 'transparent',
        color: active ? '#0B0E14' : '#8A93A3',
        border: active ? '1px solid transparent' : '1px solid #252B37',
      }}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span
          className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
          style={{
            background: active ? '#0B0E14' : '#F0526B',
            color: active ? '#22D3A6' : '#fff',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

export function DashboardClient() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [devices, setDevices] = useState<Device[]>(getDevices())
  const [alerts, setAlerts] = useState<Alert[]>(getActiveAlerts())
  const [energy, setEnergy] = useState<EnergyLog>({ ...getEnergyData(), today_kwh: getEnergyData().today_kwh })
  const [tickCount, setTickCount] = useState(0)
  const [lastTick, setLastTick] = useState<string>('—')

  const refresh = useCallback(() => {
    setDevices([...getDevices()])
    setAlerts([...getActiveAlerts()])
    const ed = getEnergyData()
    setEnergy({ ...ed })
    setLastTick(
      new Date().toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    )
    setTickCount((c) => c + 1)
  }, [])

  // Simulate every 8 seconds in this demo (normally would be 60s via Vercel Cron)
  useEffect(() => {
    refresh() // initial
    const id = setInterval(() => {
      simulateTick()
      refresh()
    }, 8000)
    return () => clearInterval(id)
  }, [refresh])

  const totalOn = devices.filter((d) => d.status).length
  const activeAlertCount = alerts.length

  const TabIcon = {
    dashboard: (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
    layout: (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <rect x="1" y="1" width="14" height="14" rx="2" />
        <line x1="6" y1="1" x2="6" y2="15" />
        <line x1="11" y1="1" x2="11" y2="15" />
      </svg>
    ),
    'knowledge-graph': (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="8" cy="8" r="2" />
        <circle cx="2" cy="3" r="1.5" />
        <circle cx="14" cy="3" r="1.5" />
        <circle cx="2" cy="13" r="1.5" />
        <circle cx="14" cy="13" r="1.5" />
        <line x1="3.5" y1="3.5" x2="6" y2="7" />
        <line x1="12.5" y1="3.5" x2="10" y2="7" />
        <line x1="3.5" y1="12.5" x2="6" y2="9" />
        <line x1="12.5" y1="12.5" x2="10" y2="9" />
      </svg>
    ),
  }

  return (
    <div className="min-h-screen" style={{ background: '#0B0E14' }}>
      {/* Top header bar */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{ background: 'rgba(11,14,20,0.92)', backdropFilter: 'blur(12px)', borderColor: '#252B37' }}
      >
        <div className="mx-auto max-w-screen-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: 'rgba(34,211,166,0.1)', border: '1px solid rgba(34,211,166,0.2)' }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#22D3A6" strokeWidth={2}>
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight" style={{ color: '#EAEDF2' }}>
                Office Pulse
              </h1>
              <p className="text-[10px]" style={{ color: '#8A93A3' }}>Real-time Office Monitor</p>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full glow-on" style={{ background: '#22D3A6' }} />
              <span className="text-[11px]" style={{ color: '#8A93A3' }}>
                {totalOn}/15 devices ON
              </span>
            </div>
            <div
              className="h-4 w-px"
              style={{ background: '#252B37' }}
            />
            <span className="text-[11px] font-mono" style={{ color: '#F5A623' }}>
              {energy.total_watts}W
            </span>
            {activeAlertCount > 0 && (
              <>
                <div className="h-4 w-px" style={{ background: '#252B37' }} />
                <span className="text-[11px]" style={{ color: '#F0526B' }}>
                  {activeAlertCount} alert{activeAlertCount !== 1 ? 's' : ''}
                </span>
              </>
            )}
            <div className="h-4 w-px" style={{ background: '#252B37' }} />
            <LiveClock />
          </div>
        </div>

        {/* Tab bar */}
        <div className="mx-auto max-w-screen-xl px-4 pb-3 flex items-center gap-2">
          <TabButton
            active={tab === 'dashboard'}
            onClick={() => setTab('dashboard')}
            icon={TabIcon.dashboard}
            label="Dashboard"
            badge={activeAlertCount}
          />
          <TabButton
            active={tab === 'layout'}
            onClick={() => setTab('layout')}
            icon={TabIcon.layout}
            label="Floor Plan"
          />
          <TabButton
            active={tab === 'knowledge-graph'}
            onClick={() => setTab('knowledge-graph')}
            icon={TabIcon['knowledge-graph']}
            label="Knowledge Graph"
          />
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px]" style={{ color: '#4B5563' }}>
              Tick #{tickCount} · {lastTick}
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-screen-xl px-4 py-6">
        {tab === 'dashboard' && (
          <div className="flex flex-col gap-6">
            {/* Top row: alerts + power */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <PowerMeter energy={energy} />
              </div>
              <div className="lg:col-span-2">
                <AlertsPanel alerts={alerts} />
              </div>
            </div>

            {/* Device status - full width */}
            <DeviceStatusPanel devices={devices} />
          </div>
        )}

        {tab === 'layout' && (
          <OfficeLayoutView devices={devices} />
        )}

        {tab === 'knowledge-graph' && (
          <KnowledgeGraph devices={devices} />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t py-4" style={{ borderColor: '#1C2230' }}>
        <div className="mx-auto max-w-screen-xl px-4 flex items-center justify-between flex-wrap gap-2">
          <p className="text-[11px]" style={{ color: '#4B5563' }}>
            Office Pulse · 3 Rooms · 15 Devices · Simulated data refreshes every 8s
          </p>
          <p className="text-[11px]" style={{ color: '#4B5563' }}>
            Office hours: 09:00 – 17:00 · Fan: 60W · Light: 15W
          </p>
        </div>
      </footer>
    </div>
  )
}
