'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Device, Alert, EnergyLog, OfficeState } from '@/types'
import { DeviceStatusPanel } from './device-status-panel'
import { PowerMeter } from './power-meter'
import { AlertsPanel } from './alerts-panel'
import { OfficeLayoutView } from './office-layout-view'
import { KnowledgeGraph } from './knowledge-graph'
import { DiscordBotPanel } from './discord-bot-panel'

type Tab = 'dashboard' | 'layout' | 'knowledge-graph' | 'discord-bot'

// ── Theme toggle ───────────────────────────────────────────────
function useTheme() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('theme', next ? 'dark' : 'light')
      return next
    })
  }, [])

  return { dark, toggle }
}

// ── Live clock ────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="font-mono text-xs tabular-nums text-muted-foreground">{time}</span>
  )
}

// ── Nav tab ───────────────────────────────────────────────────
interface TabProps {
  active: boolean
  onClick: () => void
  label: string
  badge?: number
}
function NavTab({ active, onClick, label, badge }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={`relative px-1 pb-3 pt-1 text-sm font-medium transition-colors border-b-2 ${
        active
          ? 'border-foreground text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  )
}

// ── SSE hook: connects to /api/stream for real-time updates ────
function useOfficeStream(onUpdate: (state: OfficeState) => void) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    let es: EventSource
    let retryTimeout: ReturnType<typeof setTimeout>

    function connect() {
      es = new EventSource('/api/stream')

      es.onmessage = (event) => {
        try {
          const state = JSON.parse(event.data) as OfficeState
          onUpdateRef.current(state)
        } catch {
          // ignore parse errors
        }
      }

      es.onerror = () => {
        es.close()
        // Reconnect after 5s
        retryTimeout = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      es?.close()
      clearTimeout(retryTimeout)
    }
  }, [])
}

// ── Main dashboard ────────────────────────────────────────────
export function DashboardClient() {
  const { dark, toggle } = useTheme()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [devices, setDevices] = useState<Device[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [energy, setEnergy] = useState<EnergyLog | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const handleState = useCallback((state: OfficeState) => {
    setDevices(state.devices)
    setAlerts(state.alerts)
    setEnergy(state.energy)
    setConnected(true)
    setLastUpdate(new Date())
  }, [])

  useOfficeStream(handleState)

  const totalOn = devices.filter((d) => d.status).length
  const totalDevices = devices.length
  const alertCount = alerts.length
  const totalWatts = energy?.total_watts ?? 0

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top nav ───────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="mx-auto max-w-screen-xl px-6">
          {/* Brand + status row */}
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <svg viewBox="0 0 16 16" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M8 1L2 6v7h4v-4h4v4h4V6L8 1z" />
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight text-foreground">Office Pulse</span>
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-5">
              {/* Connection status */}
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-on live-dot' : 'bg-muted-foreground'}`} />
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {connected ? 'Live' : 'Connecting'}
                </span>
              </div>

              {/* Device count */}
              <span className="text-xs text-muted-foreground hidden sm:block">
                {totalOn}/{totalDevices} on
              </span>

              {/* Total watts */}
              <span className="font-mono text-xs text-muted-foreground hidden md:block">
                {totalWatts}W
              </span>

              {/* Alert badge */}
              {alertCount > 0 && (
                <button
                  onClick={() => setTab('dashboard')}
                  className="flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-danger live-dot" />
                  {alertCount} alert{alertCount !== 1 ? 's' : ''}
                </button>
              )}

              {/* Clock */}
              <LiveClock />

              {/* Theme toggle */}
              <button
                onClick={toggle}
                aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
              >
                {dark ? (
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <circle cx="8" cy="8" r="3" />
                    <path d="M8 1v1M8 14v1M1 8h1M14 8h1M3.22 3.22l.7.7M12.08 12.08l.7.7M3.22 12.78l.7-.7M12.08 3.92l.7-.7" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                    <path d="M6 0a6 6 0 1 0 6 6A6 6 0 0 0 6 0zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" transform="translate(2 2) scale(0.65)" />
                    <path d="M6 1a5 5 0 1 0 5 5A5 5 0 0 0 6 0z" transform="translate(2 3)" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Tab row */}
          <nav className="flex items-center gap-6" role="tablist">
            <NavTab active={tab === 'dashboard'} onClick={() => setTab('dashboard')} label="Dashboard" badge={alertCount} />
            <NavTab active={tab === 'layout'} onClick={() => setTab('layout')} label="Floor Plan" />
            <NavTab active={tab === 'knowledge-graph'} onClick={() => setTab('knowledge-graph')} label="Knowledge Graph" />
            <NavTab active={tab === 'discord-bot'} onClick={() => setTab('discord-bot')} label="Discord Bot" />
          </nav>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────── */}
      <main className="mx-auto max-w-screen-xl px-6 py-8">
        {tab === 'dashboard' && energy && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <PowerMeter energy={energy} />
              <div className="lg:col-span-2">
                <AlertsPanel alerts={alerts} />
              </div>
            </div>
            <DeviceStatusPanel devices={devices} />
          </div>
        )}
        {tab === 'dashboard' && !energy && (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            Connecting to live feed...
          </div>
        )}
        {tab === 'layout' && <OfficeLayoutView devices={devices} />}
        {tab === 'knowledge-graph' && <KnowledgeGraph devices={devices} />}
        {tab === 'discord-bot' && <DiscordBotPanel />}
      </main>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-border mt-auto">
        <div className="mx-auto max-w-screen-xl px-6 py-4 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-muted-foreground">
            Office Pulse · 3 rooms · 15 devices · Real-time via SSE
          </p>
          <p className="text-xs text-muted-foreground">
            {lastUpdate
              ? `Last update: ${lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}`
              : 'Connecting...'}
          </p>
        </div>
      </footer>
    </div>
  )
}
