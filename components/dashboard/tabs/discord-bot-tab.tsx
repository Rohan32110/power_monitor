'use client'

import { useState } from 'react'

// ── Ghost icon ────────────────────────────────────────────────────────────────
function GhostBot() {
  return (
    <svg viewBox="0 0 64 64" fill="none" className="h-full w-full" aria-hidden>
      <rect x="12" y="20" width="40" height="30" rx="6" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
      <path d="M20 20V14a12 12 0 0 1 24 0v6" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
      <circle cx="22" cy="35" r="3.5" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
      <circle cx="42" cy="35" r="3.5" stroke="currentColor" strokeWidth="1.5" opacity="0.12" />
      <path d="M25 44h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.12" />
      <path d="M32 8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.12" />
    </svg>
  )
}

// ── Commands reference ────────────────────────────────────────────────────────
const COMMANDS = [
  { cmd: '!status',    desc: 'Show overall office status — devices on/off, total watts' },
  { cmd: '!usage',     desc: 'Energy usage summary — watts now + kWh today' },
  { cmd: '!room <name>', desc: 'Details for a specific room (drawing, work1, work2)' },
  { cmd: '!alerts',    desc: 'List all active alerts with severity and timestamp' },
  { cmd: '!help',      desc: 'Show all available commands' },
]

// ── Demo console ─────────────────────────────────────────────────────────────
interface Message { role: 'user' | 'bot'; content: string; ts: string }

function DemoConsole() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      content: 'Office Pulse bot online. Type a command like `!status` to query the live office state.',
      ts: new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function send() {
    const val = input.trim()
    if (!val || loading) return
    const ts = new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: val, ts }])
    setLoading(true)
    try {
      const parts = val.split(' ')
      const command = parts[0]
      const args = parts.slice(1).join(' ')
      const res = await fetch('/api/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, args }),
      })
      const data = await res.json()
      const botTs = new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })
      setMessages((m) => [...m, {
        role: 'bot',
        content: data.response ?? data.error ?? 'No response.',
        ts: botTs,
      }])
    } catch {
      setMessages((m) => [...m, { role: 'bot', content: 'Error: Could not reach the bot API.', ts }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[340px] rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-surface flex-shrink-0">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-on/60" />
        </div>
        <span className="text-xs text-muted-foreground font-mono">#office-pulse-bot</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-on">
          <span className="h-1.5 w-1.5 rounded-full bg-on" />
          Bot online
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'bot' && (
              <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} className="h-3.5 w-3.5 text-primary">
                  <rect x="3" y="5" width="10" height="8" rx="1.5" />
                  <path d="M5.5 5V3.5a2.5 2.5 0 0 1 5 0V5" />
                  <circle cx="6" cy="9" r="1" fill="currentColor" stroke="none" />
                  <circle cx="10" cy="9" r="1" fill="currentColor" stroke="none" />
                  <path d="M6.5 11.5h3" strokeLinecap="round" />
                </svg>
              </div>
            )}
            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words
              ${msg.role === 'bot'
                ? 'bg-surface text-foreground border border-border'
                : 'bg-primary text-primary-foreground'
              }`}
            >
              {msg.content}
              <span className="block text-[10px] opacity-50 mt-1 text-right">{msg.ts}</span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5 items-center">
            <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="h-1 w-1 rounded-full bg-primary animate-bounce" />
            </div>
            <div className="bg-surface border border-border rounded-xl px-3 py-2 text-xs text-muted-foreground">
              Processing…
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3 border-t border-border bg-surface">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) send() }}
          placeholder="Type !status, !usage, !alerts, !room drawing…"
          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40 font-mono"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-white disabled:opacity-40 transition-opacity hover:opacity-90"
        >
          Send
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
      <div className="hero-glow relative overflow-hidden rounded-xl border border-border bg-card p-6">
        <div className="pointer-events-none absolute -right-2 -top-2 h-36 w-36 text-primary">
          <GhostBot />
        </div>
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Discord integration</p>
            <h1 className="text-2xl font-bold text-foreground">Office Pulse Bot</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              A Discord bot that queries live office state via the{' '}
              <code className="font-mono bg-surface px-1 py-0.5 rounded text-xs">/api/discord</code>{' '}
              webhook. Deploy the standalone bot script with your token to bring it online in any server.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-xs text-muted-foreground flex-shrink-0 min-w-[200px]">
            <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wide mb-1.5">Setup</p>
              <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                <li>Add <code className="font-mono bg-card px-1 rounded">DISCORD_BOT_TOKEN</code></li>
                <li>Run <code className="font-mono bg-card px-1 rounded">node discord-bot/bot.js</code></li>
                <li>Invite bot to your server</li>
                <li>Use commands in any channel</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Demo console */}
        <div className="lg:col-span-3">
          <h2 className="text-sm font-semibold text-foreground mb-2.5">Live bot simulator</h2>
          <DemoConsole />
        </div>

        {/* Commands reference */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground mb-2.5">Available commands</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {COMMANDS.map((c, i) => (
              <div
                key={c.cmd}
                className={`flex flex-col gap-1 px-4 py-3 ${i < COMMANDS.length - 1 ? 'border-b border-border' : ''}`}
              >
                <code className="text-xs font-mono font-semibold text-primary">{c.cmd}</code>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Env vars needed */}
          <div className="mt-4 rounded-xl border border-warning/20 bg-warning/5 p-4">
            <p className="text-xs font-semibold text-warning mb-2">Required environment variables</p>
            <div className="space-y-1.5">
              {[
                { key: 'DISCORD_BOT_TOKEN', desc: 'Bot token from Discord Developer Portal' },
                { key: 'OPENAI_API_KEY',    desc: 'Optional — for AI-enhanced responses' },
              ].map(({ key, desc }) => (
                <div key={key}>
                  <code className="text-[11px] font-mono text-foreground bg-card border border-border px-1.5 py-0.5 rounded">{key}</code>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
