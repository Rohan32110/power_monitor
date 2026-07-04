/**
 * Office Pulse — Discord Bot
 *
 * Setup:
 *   1. Create a Discord application at https://discord.com/developers/applications
 *   2. Create a bot, copy the token into .env as DISCORD_BOT_TOKEN=...
 *   3. Set OFFICE_PULSE_API_URL=https://your-deployed-url.vercel.app
 *   4. Invite the bot to your server with the "bot" scope + "Send Messages" permission
 *   5. Run: node discord-bot/bot.js
 *
 * Commands:
 *   !status          — Overview of all rooms
 *   !room <name>     — Status of a specific room (drawing, work1, work2)
 *   !usage           — Power consumption summary
 *
 * Proactive alerts:
 *   The bot polls /api/state every 60 seconds. When a new alert is detected,
 *   it posts a message to the DISCORD_ALERT_CHANNEL_ID channel automatically.
 */

const { Client, GatewayIntentBits } = require('discord.js')

const TOKEN = process.env.DISCORD_BOT_TOKEN
const API_URL = process.env.OFFICE_PULSE_API_URL ?? 'http://localhost:3000'
const ALERT_CHANNEL_ID = process.env.DISCORD_ALERT_CHANNEL_ID ?? ''

if (!TOKEN) {
  console.error('[Pulse Bot] Missing DISCORD_BOT_TOKEN in environment. Exiting.')
  process.exit(1)
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

// Track which alert IDs we have already announced
const announcedAlerts = new Set()

client.once('ready', () => {
  console.log(`[Pulse Bot] Logged in as ${client.user.tag}`)
  startAlertPolling()
})

client.on('messageCreate', async (message) => {
  if (message.author.bot) return

  const content = message.content.trim()
  if (!content.startsWith('!')) return

  const [rawCmd, ...argParts] = content.split(/\s+/)
  const command = rawCmd.toLowerCase()
  const args = argParts.join(' ')

  // Only handle known commands
  if (!['!status', '!room', '!usage'].includes(command)) return

  try {
    const res = await fetch(`${API_URL}/api/discord`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, args }),
    })

    if (!res.ok) throw new Error(`API returned ${res.status}`)

    const data = await res.json()
    await message.reply(data.response ?? 'Something went wrong on my end!')
  } catch (err) {
    console.error('[Pulse Bot] Error calling API:', err)
    await message.reply(
      "I couldn't reach the Office Pulse backend right now. Please try again in a moment!"
    )
  }
})

/**
 * Poll for new alerts every 60s and post to the designated channel if found.
 */
function startAlertPolling() {
  if (!ALERT_CHANNEL_ID) {
    console.log('[Pulse Bot] No DISCORD_ALERT_CHANNEL_ID set — proactive alerts disabled.')
    return
  }

  setInterval(async () => {
    try {
      const res = await fetch(`${API_URL}/api/state`)
      if (!res.ok) return

      const state = await res.json()
      const activeAlerts = state.alerts ?? []

      for (const alert of activeAlerts) {
        if (announcedAlerts.has(alert.id)) continue

        announcedAlerts.add(alert.id)

        const channel = client.channels.cache.get(ALERT_CHANNEL_ID)
        if (!channel || !channel.isTextBased()) continue

        const severity = alert.severity === 'critical' ? 'CRITICAL' : 'WARNING'
        const emoji = alert.severity === 'critical' ? '🚨' : '⚠️'
        const time = new Date(alert.triggered_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })

        await channel.send(
          `**${emoji} Office Pulse Alert [${severity}]**\n` +
          `${alert.message}\n` +
          `Triggered at: ${time}\n` +
          `Use \`!status\` to check the current state of all rooms.`
        )
      }
    } catch (err) {
      console.error('[Pulse Bot] Alert polling error:', err)
    }
  }, 60_000)
}

client.login(TOKEN)
