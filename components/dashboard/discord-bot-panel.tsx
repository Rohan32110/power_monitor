'use client'

import { useState } from 'react'

interface ApiResponse {
  response: string
}

const COMMANDS = [
  { cmd: '!status', args: '', description: 'Overview of all 3 rooms', label: '!status' },
  { cmd: '!room', args: 'drawing', description: 'Drawing Room details', label: '!room drawing' },
  { cmd: '!room', args: 'work1', description: 'Work Room 1 details', label: '!room work1' },
  { cmd: '!room', args: 'work2', description: 'Work Room 2 details', label: '!room work2' },
  { cmd: '!usage', args: '', description: 'Power consumption summary', label: '!usage' },
]

interface ChatMessage {
  from: 'user' | 'bot'
  text: string
  ts: Date
}

function BotAvatar() {
  return (
    <div className="h-7 w-7 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
      <svg viewBox="0 0 16 16" className="h-4 w-4 text-primary" fill="currentColor">
        <path d="M6 2a2 2 0 0 0-2 2v1H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1v1a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-1h1a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1V4a2 2 0 0 0-2-2H6zm0 1h4a1 1 0 0 1 1 1v1H5V4a1 1 0 0 1 1-1zM5.5 9a.5.5 0 1 1 1 0 .5.5 0 0 1-1 0zm4 0a.5.5 0 1 1 1 0 .5.5 0 0 1-1 0z" />
      </svg>
    </div>
  )
}

export function DiscordBotPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: 'bot',
      text: "Hey! I'm the Power Monitor Discord bot. Try any of the commands below to query live device data. In your Discord server, you'd type these commands directly in a channel — here you can preview what the bot would respond.",
      ts: new Date(),
    },
  ])
  const [loading, setLoading] = useState<string | null>(null)

  async function runCommand(cmd: string, args: string) {
    const label = args ? `${cmd} ${args}` : cmd
    if (loading) return

    // Add user message
    setMessages((prev) => [
      ...prev,
      { from: 'user', text: label, ts: new Date() },
    ])
    setLoading(label)

    try {
      const res = await fetch('/api/discord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd, args }),
      })
      const data: ApiResponse = await res.json()
      setMessages((prev) => [
        ...prev,
        { from: 'bot', text: data.response, ts: new Date() },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { from: 'bot', text: "Couldn't reach the backend right now. Please try again.", ts: new Date() },
      ])
    } finally {
      setLoading(null)
    }
  }

  function formatTime(d: Date) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left: commands + setup */}
      <div className="flex flex-col gap-4">
        {/* Commands */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Try a command
          </p>
          <div className="flex flex-col gap-1.5">
            {COMMANDS.map((c) => (
              <button
                key={c.label}
                onClick={() => runCommand(c.cmd, c.args)}
                disabled={!!loading}
                className="flex items-center justify-between w-full text-left rounded-md border border-border bg-surface px-3 py-2 hover:bg-card hover:border-primary/30 transition-colors disabled:opacity-50"
              >
                <div>
                  <p className="text-xs font-mono font-medium text-foreground">{c.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{c.description}</p>
                </div>
                {loading === c.label ? (
                  <svg viewBox="0 0 16 16" className="h-3 w-3 text-primary animate-spin shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M8 1v3M8 12v3M1 8h3M12 8h3" strokeLinecap="round" opacity={0.4} />
                    <path d="M3.05 3.05l2.12 2.12M10.83 10.83l2.12 2.12" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" className="h-3 w-3 text-muted-foreground shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Setup instructions */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Bot setup
          </p>
          <ol className="flex flex-col gap-2">
            {[
              'Create a Discord application at discord.com/developers',
              'Create a bot and copy the token to DISCORD_BOT_TOKEN in your .env',
              'Set OFFICE_PULSE_API_URL to your deployed URL',
              'Set DISCORD_ALERT_CHANNEL_ID for proactive alerts',
              'Run: node discord-bot/bot.js',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="shrink-0 h-4 w-4 rounded-full bg-surface border border-border text-[10px] font-semibold text-muted-foreground flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-[11px] text-muted-foreground leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              Proactive alerts post to your channel automatically when a device alert is triggered.
            </p>
          </div>
        </div>
      </div>

      {/* Right: chat preview */}
      <div className="lg:col-span-2 rounded-lg border border-border bg-card flex flex-col overflow-hidden" style={{ minHeight: 480 }}>
        {/* Discord-style header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface">
          <div className="h-2 w-2 rounded-full bg-on" />
          <p className="text-xs font-semibold text-foreground">#power-monitor-bot</p>
          <span className="ml-auto text-[10px] text-muted-foreground">Preview — calls live /api/discord</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.from === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.from === 'bot' ? (
                <BotAvatar />
              ) : (
                <div className="h-7 w-7 shrink-0 rounded-full bg-surface border border-border flex items-center justify-center">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-muted-foreground" fill="currentColor">
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 14s-1 0-1-1 1-4 7-4 7 3 7 4-1 1-1 1H2z" />
                  </svg>
                </div>
              )}
              <div className={`max-w-[80%] ${msg.from === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <div className={`flex items-baseline gap-2 ${msg.from === 'user' ? 'flex-row-reverse' : ''}`}>
                  <span className="text-[11px] font-semibold text-foreground">
                    {msg.from === 'bot' ? 'Pulse Bot' : 'You'}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{formatTime(msg.ts)}</span>
                </div>
                <div
                  className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    msg.from === 'user'
                      ? 'bg-primary text-primary-foreground font-mono'
                      : 'bg-surface text-foreground border border-border'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <BotAvatar />
              <div className="rounded-lg border border-border bg-surface px-3 py-2 flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input hint */}
        <div className="px-4 py-3 border-t border-border bg-surface">
          <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
            <p className="text-xs text-muted-foreground">Use the command buttons on the left to try the bot...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
