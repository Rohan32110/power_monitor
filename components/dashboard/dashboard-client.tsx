'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Device, Alert, EnergyLog, OfficeState } from '@/types'
import { DashboardTab }     from './tabs/dashboard-tab'
import { AlertsTab }        from './tabs/alerts-tab'
import { FloorPlanTab }     from './tabs/floor-plan-tab'
import { KnowledgeGraphTab } from './tabs/knowledge-graph-tab'
import { DiscordBotTab }    from './tabs/discord-bot-tab'

// ── Types ────────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'alerts' | 'floor-plan' | 'knowledge-graph' | 'discord-bot'

interface NavItem {
  id: Tab
  label: string
  icon: React.ReactNode
  badge?: number
}

// ── Theme hook ────────────────────────────────────────────────────────────────
function useTheme() {
  // Lazy initializer: reads localStorage on the first render so state and DOM
  // class are in sync from frame 1 (the blocking script in layout.tsx already
  // set the class; we just mirror it into React state here).
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('op-theme') !== 'light'
  })

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('op-theme', next ? 'dark' : 'light')
      return next
    })
  }, [])

  return { dark, toggle }
}

// ── Live clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
    )
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="font-mono text-xs tabular-nums text-muted-foreground">{time}</span>
}

// ── SSE hook ──────────────────────────────────────────────────────────────────
function useOfficeStream(onUpdate: (state: OfficeState) => void) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate
  useEffect(() => {
    let es: EventSource
    let retry: ReturnType<typeof setTimeout>
    function connect() {
      es = new EventSource('/api/stream')
      es.onmessage = (evt) => {
        try { onUpdateRef.current(JSON.parse(evt.data) as OfficeState) } catch {}
      }
      es.onerror = () => { es.close(); retry = setTimeout(connect, 5000) }
    }
    connect()
    return () => { es?.close(); clearTimeout(retry) }
  }, [])
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconGrid({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <rect x="2" y="2" width="7" height="7" rx="1.5" /><rect x="11" y="2" width="7" height="7" rx="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" /><rect x="11" y="11" width="7" height="7" rx="1.5" />
    </svg>
  )
}
function IconMap({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <polygon points="1,4 7,1 13,4 19,1 19,16 13,19 7,16 1,19" />
      <line x1="7" y1="1" x2="7" y2="16" /><line x1="13" y1="4" x2="13" y2="19" />
    </svg>
  )
}
function IconGraph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <circle cx="10" cy="10" r="2.5" />
      <circle cx="4"  cy="5"  r="2"  />
      <circle cx="16" cy="5"  r="2"  />
      <circle cx="4"  cy="15" r="2"  />
      <circle cx="16" cy="15" r="2"  />
      <line x1="7.5" y1="8.5" x2="5.8" y2="6.5" />
      <line x1="12.5" y1="8.5" x2="14.2" y2="6.5" />
      <line x1="7.5" y1="11.5" x2="5.8" y2="13.5" />
      <line x1="12.5" y1="11.5" x2="14.2" y2="13.5" />
    </svg>
  )
}
// Discord logo (official mark, centered in 20×20 viewBox)
function IconDiscord({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.003.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  )
}
function IconChevron({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconSun({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.22 3.22l1.41 1.41M15.37 15.37l1.41 1.41M3.22 16.78l1.41-1.41M15.37 4.63l1.41-1.41" strokeLinecap="round" />
    </svg>
  )
}
function IconMoon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  )
}

// ── Sidebar nav item ──────────────────────────────────────────────────────────
interface SideNavItemProps {
  item: NavItem
  active: boolean
  expanded: boolean
  onClick: () => void
}
function SideNavItem({ item, active, expanded, onClick }: SideNavItemProps) {
  return (
    <button
      onClick={onClick}
      title={!expanded ? item.label : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150
        ${active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-surface hover:text-foreground'
        }`}
    >
      <span className={`flex-shrink-0 h-5 w-5 ${active ? 'text-primary' : ''}`}>
        {item.icon}
      </span>
      {expanded && (
        <span className="slide-in-left truncate">{item.label}</span>
      )}
      {item.badge !== undefined && item.badge > 0 && (
        <span className={`flex-shrink-0 ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white
          ${expanded ? '' : 'absolute -top-1 -right-1 h-4 w-4 text-[9px]'}`}>
          {item.badge}
        </span>
      )}
      {/* Active indicator bar */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-primary" />
      )}
    </button>
  )
}

// ── Alert bell icon ───────────────────────────────────────────────────────────
function IconBell({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path d="M10 2a2 2 0 0 0-2 2c0 0-4 2-4 7v3l-2 2v1h16v-1l-2-2v-3c0-5-4-7-4-7a2 2 0 0 0-2-2z" strokeLinejoin="round" />
      <path d="M8 18a2 2 0 0 0 4 0" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function DashboardClient() {
  const { dark, toggle } = useTheme()
  const [tab, setTab]     = useState<Tab>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [devices, setDevices] = useState<Device[]>([])
  const [alerts, setAlerts]   = useState<Alert[]>([])
  const [energy, setEnergy]   = useState<EnergyLog | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const mainRef = useRef<HTMLElement>(null)

  const handleState = useCallback((state: OfficeState) => {
    setDevices(state.devices)
    setAlerts(state.alerts)
    setEnergy(state.energy)
    setConnected(true)
    setLastUpdate(new Date())
  }, [])

  useOfficeStream(handleState)

  // Reset scroll position to top whenever the active tab changes
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [tab])

  const totalOn     = devices.filter((d) => d.status).length
  const totalWatts  = energy?.total_watts ?? 0
  const alertCount  = alerts.length

  const navItems: NavItem[] = [
    { id: 'dashboard',       label: 'Dashboard',       icon: <IconGrid className="h-5 w-5" /> },
    { id: 'alerts',          label: 'Alerts',          icon: <IconBell className="h-5 w-5" />, badge: alertCount > 0 ? alertCount : undefined },
    { id: 'floor-plan',      label: 'Floor Plan',      icon: <IconMap className="h-5 w-5" /> },
    { id: 'knowledge-graph', label: 'Knowledge Graph', icon: <IconGraph className="h-5 w-5" /> },
    { id: 'discord-bot',     label: 'Discord Bot',     icon: <IconDiscord className="h-5 w-5" /> },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`sidebar-transition flex-shrink-0 flex flex-col border-r border-border bg-sidebar overflow-hidden
          ${sidebarOpen ? 'w-56' : 'w-[60px]'}`}
      >
        {/* Logo + toggle */}
        <div className={`flex h-14 flex-shrink-0 border-b border-border ${sidebarOpen ? 'items-center justify-between px-3' : 'flex-col items-center justify-center gap-1 py-2'}`}>
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm">
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M10 2L3 8v10h5v-5h4v5h5V8L10 2z" strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="slide-in-left truncate text-sm font-semibold text-foreground">
                  Power Monitor
                </span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Collapse sidebar"
                className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
              >
                <IconChevron className="h-4 w-4 transition-transform duration-200 rotate-180" />
              </button>
            </>
          ) : (
            <>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary shadow-sm">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth={1.8}>
                  <path d="M10 2L3 8v10h5v-5h4v5h5V8L10 2z" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
              </div>
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Expand sidebar"
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
              >
                <IconChevron className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 flex flex-col gap-0.5">
          {navItems.map((item) => (
            <SideNavItem
              key={item.id}
              item={item}
              active={tab === item.id}
              expanded={sidebarOpen}
              onClick={() => setTab(item.id)}
            />
          ))}
        </nav>

        {/* Bottom: status + theme */}
        <div className="flex-shrink-0 border-t border-border px-2 py-3 space-y-2">
          {/* Connection pill */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-surface ${sidebarOpen ? '' : 'justify-center'}`}>
            <span className={`h-2 w-2 flex-shrink-0 rounded-full ${connected ? 'bg-on live-dot' : 'bg-muted-foreground'}`} />
            {sidebarOpen && (
              <span className="text-xs text-muted-foreground truncate">
                {connected ? `Live · ${totalOn} on · ${totalWatts}W` : 'Connecting…'}
              </span>
            )}
          </div>
          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label={dark ? 'Light mode' : 'Dark mode'}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-surface transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}
          >
            {dark ? <IconSun className="h-4 w-4 flex-shrink-0" /> : <IconMoon className="h-4 w-4 flex-shrink-0" />}
            {sidebarOpen && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top header bar */}
        <header className="flex-shrink-0 flex h-16 items-center justify-between border-b border-border bg-background px-6 gap-4">
          <div className="flex flex-col justify-center min-w-0">
            <h1 className="text-base font-semibold text-foreground leading-tight">
              {navItems.find((n) => n.id === tab)?.label}
            </h1>
            <p className="text-xs text-muted-foreground leading-tight">
              3 rooms · 15 devices · Live monitoring
            </p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <LiveClock />
          </div>
        </header>

        {/* Page content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto p-6">
          {tab === 'dashboard' && (
            <DashboardTab devices={devices} alerts={alerts} energy={energy} connected={connected} />
          )}
          {tab === 'alerts' && (
            <AlertsTab alerts={alerts} onGoToDashboard={() => setTab('dashboard')} />
          )}
          {tab === 'floor-plan' && (
            <FloorPlanTab devices={devices} />
          )}
          {tab === 'knowledge-graph' && (
            <KnowledgeGraphTab devices={devices} />
          )}
          {tab === 'discord-bot' && (
            <DiscordBotTab />
          )}
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 border-t border-border bg-background px-6 py-2.5 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Power Monitor · Live monitoring · State persisted across sessions
          </p>
          <p className="text-xs text-muted-foreground font-mono tabular-nums">
            {lastUpdate
              ? `Updated ${lastUpdate.toLocaleTimeString('en-US', { hour12: true })}`
              : 'Awaiting data…'}
          </p>
        </footer>
      </div>
    </div>
  )
}
