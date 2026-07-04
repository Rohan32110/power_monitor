'use client'

import { useEffect, useRef, useState } from 'react'

// ── Discord logo (from theSVG.org — please review Discord trademark guidelines) ──
function DiscordLogo({ className = '' }: { className?: string }) {
  return (
    <img
      src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/discord/default.svg"
      alt="Discord"
      className={className}
      draggable={false}
    />
  )
}

// ── Hash icon ─────────────────────────────────────────────────────────────────
function IconHash({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path d="M4 7h12M4 13h12M8 3l-2 14M14 3l-2 14" strokeLinecap="round" />
    </svg>
  )
}

// ── Bot avatar ────────────────────────────────────────────────────────────────
function BotAvatar() {
  return (
    <div className="h-8 w-8 rounded-full bg-[#5865F2] flex items-center justify-center flex-shrink-0 shadow-sm">
      <DiscordLogo className="h-4.5 w-4.5 invert brightness-200" />
    </div>
  )
}

// ── Command chips ─────────────────────────────────────────────────────────────
const COMMANDS = [
  { cmd: '!status',       desc: 'Overall office status' },
  { cmd: '!usage',        desc: 'Energy usage summary' },
  { cmd: '!room drawing', desc: 'Drawing Room details' },
  { cmd: '!room work1',   desc: 'Work Room 1 details' },
  { cmd: '!room work2',   desc: 'Work Room 2 details' },
]

// ── Messages ──────────────────────────────────────────────────────────────────
interface Message { role: 'user' | 'bot'; content: string; ts: string }

function now12() {
  return new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })
}

// ── Chat simulator ────────────────────────────────────────────────────────────
function ChatSimulator() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      content: 'Power Monitor is online. Try a command like **!status** to check the live office state, or click a quick command below.',
      ts: now12(),
    },
  ])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef             = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(raw?: string) {
    const val = (raw ?? input).trim()
    if (!val || loading) return
    const ts = now12()
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: val, ts }])
    setLoading(true)
    try {
      const parts   = val.split(' ')
      const command = parts[0]
      const args    = parts.slice(1).join(' ')
      const res     = await fetch('/api/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, args }),
      })
      const data = await res.json()
      setMessages((m) => [...m, {
        role: 'bot',
        content: data.response ?? data.error ?? 'No response.',
        ts: now12(),
      }])
    } catch {
      setMessages((m) => [...m, { role: 'bot', content: 'Error reaching the bot API.', ts: now12() }])
    } finally {
      setLoading(false)
    }
  }

  // Render bold (**text**) in bot messages
  function renderContent(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*)/)
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>
    )
  }

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden" style={{ height: 380 }}>
      {/* Discord-style channel header */}
      <div className="flex items-center gap-2.5 px-4 h-12 border-b border-border bg-surface flex-shrink-0">
        <IconHash className="h-4.5 w-4.5 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-semibold text-foreground">power-monitor-bot</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'bot' && <BotAvatar />}
            <div className={`flex flex-col gap-0.5 max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words
                  ${msg.role === 'bot'
                    ? 'bg-surface text-muted-foreground rounded-tl-sm'
                    : 'bg-muted text-foreground border border-border rounded-tr-sm'
                  }`}
              >
                {msg.role === 'bot' ? renderContent(msg.content) : msg.content}
              </div>
              <span className="text-[10px] text-muted-foreground px-1">{msg.ts}</span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <BotAvatar />
            <div className="bg-surface rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                  style={{ animation: `bounce 1.2s ease-in-out ${delay}ms infinite` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick commands */}
      <div className="flex-shrink-0 px-3 py-2 border-t border-border flex gap-1.5 overflow-x-auto scrollbar-none">
        {COMMANDS.map((c) => (
          <button
            key={c.cmd}
            onClick={() => send(c.cmd)}
            className="flex-shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            {c.cmd}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 pb-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) send()
          }}
          placeholder="Message #power-monitor-bot"
          className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40 transition-shadow"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border text-muted-foreground disabled:opacity-40 hover:text-foreground hover:border-border/80 transition-colors flex-shrink-0"
          aria-label="Send"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
            <path d="M14.5 1.5L1 6.5l4.5 2L10 4l-4 5 2.5 4.5z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── DiscordBotTab ─────────────────────────────────────────────────────────────
export function DiscordBotTab() {
  return (
    <div className="flex flex-col gap-5">
      {/* Hero card */}
      <div className="hero-glow relative overflow-hidden rounded-xl border border-border bg-card px-5 py-4">
        {/* Discord brand watermark — top right */}
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.06]">
          <DiscordLogo className="h-24 w-24 dark:invert" />
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5865F2] shadow-lg flex-shrink-0">
              <DiscordLogo className="h-5.5 w-5.5 invert brightness-200" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                Discord integration
              </p>
              <h1 className="text-xl font-bold text-foreground leading-snug">Power Monitor Bot</h1>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Commands', value: '6' },
              { label: 'Webhook', value: 'Live' },
              { label: 'Status', value: 'Ready' },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col items-center rounded-lg border border-border bg-surface px-3 py-2 min-w-[60px]">
                <span className="text-sm font-bold tabular-nums text-foreground leading-none">{value}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-muted-foreground mt-3 max-w-xl leading-relaxed">
          A Discord bot that queries live office state via the{' '}
          <code className="font-mono bg-surface border border-border px-1 py-0.5 rounded text-[11px]">/api/discord</code>{' '}
          webhook. Use the simulator below to try commands, or deploy the standalone bot to your server.
        </p>
      </div>

      {/* Grid: simulator + commands */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold text-foreground">Bot simulator</h2>
          <ChatSimulator />
        </div>

        {/* Commands reference */}
        <div className="lg:col-span-2 flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold text-foreground">Available commands</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {COMMANDS.map((c, i) => (
              <div
                key={c.cmd}
                className={`flex items-center gap-3 px-4 py-3 ${i < COMMANDS.length - 1 ? 'border-b border-border' : ''}`}
              >
                <code className="text-xs font-mono font-medium text-foreground min-w-[90px]">{c.cmd}</code>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Status card */}
          <div className="rounded-xl border border-border bg-card px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Bot status</span>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Operational</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-[11px]">
              <StatusRow label="API endpoint" value="/api/discord" ok />
              <StatusRow label="State sync"   value="Real-time"    ok />
              <StatusRow label="AI responses" value="Enabled"      ok />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0 bg-muted-foreground" />
        <span className="text-foreground">{value}</span>
      </div>
    </div>
  )
}
