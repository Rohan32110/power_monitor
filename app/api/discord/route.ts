import { NextRequest, NextResponse } from 'next/server'
import { getDevices, getActiveAlerts, getEnergyData } from '@/lib/simulator'
import { ROOM_LIST, ROOM_LABELS } from '@/lib/config'
import type { RoomId } from '@/types'
import OpenAI from 'openai'

// Instantiated lazily — avoid module-level crash when OPENAI_API_KEY is absent
let _openai: OpenAI | null = null
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

/**
 * POST /api/discord
 * Receives a parsed Discord command payload and returns a friendly text response.
 *
 * Request body:
 *   { command: "!status" | "!room <name>" | "!usage", args?: string }
 *
 * This endpoint acts as the brains behind the Discord bot.
 * The actual Discord bot (discord-bot.js) calls this endpoint and sends the
 * response back to the Discord channel.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { command = '', args = '' } = body as { command: string; args: string }

  let rawData = ''
  let systemPrompt = ''

  if (command === '!status') {
    const devices = getDevices()
    const roomSummaries = ROOM_LIST.map((roomId) => {
      const rd = devices.filter((d) => d.room === roomId)
      const fansOn = rd.filter((d) => d.device_type === 'fan' && d.status).length
      const lightsOn = rd.filter((d) => d.device_type === 'light' && d.status).length
      return `${ROOM_LABELS[roomId]}: ${fansOn} fan(s) ON, ${lightsOn} light(s) ON`
    })
    rawData = roomSummaries.join('\n')
    systemPrompt = `You are a friendly office assistant bot named Pulse. Give a concise, friendly summary of which devices are currently on in each room. Use the raw data below. Keep it under 3 sentences. Be conversational, not robotic. Don't use bullet points.`
  } else if (command === '!room') {
    const roomKey = normalizeRoomArg(args)
    if (!roomKey) {
      return NextResponse.json({
        response: `I don't recognize that room name. Try **!room drawing**, **!room work1**, or **!room work2**.`,
      })
    }
    const devices = getDevices().filter((d) => d.room === roomKey)
    const fansOn = devices.filter((d) => d.device_type === 'fan' && d.status)
    const lightsOn = devices.filter((d) => d.device_type === 'light' && d.status)
    const watts = devices.reduce((s, d) => s + (d.status ? d.wattage : 0), 0)
    rawData = `${ROOM_LABELS[roomKey]} status:\nFans ON: ${fansOn.length}/2\nLights ON: ${lightsOn.length}/3\nCurrent power draw: ${watts}W`
    systemPrompt = `You are a friendly office assistant bot named Pulse. Give a brief, friendly status report for this specific room. Include device counts and wattage. Keep it under 2 sentences. Be conversational.`
  } else if (command === '!usage') {
    const energy = getEnergyData()
    rawData = `Total power right now: ${energy.total_watts}W\nToday's estimated usage: ${energy.today_kwh} kWh\nDrawing Room: ${energy.room_watts.drawing_room}W\nWork Room 1: ${energy.room_watts.work_room_1}W\nWork Room 2: ${energy.room_watts.work_room_2}W`
    systemPrompt = `You are a friendly office assistant bot named Pulse. Summarize the office power usage in a friendly, informative way. Mention total watts, today's kWh estimate, and note which room is using the most. Keep it under 3 sentences. Be conversational.`
  } else {
    return NextResponse.json({
      response: `Hmm, I don't know that command! Try **!status**, **!room <name>**, or **!usage**.`,
    })
  }

  // Use OpenAI to generate a friendly response if key is set, otherwise use raw data
  const openai = getOpenAI()
  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawData },
        ],
        max_tokens: 200,
        temperature: 0.7,
      })
      const text = completion.choices[0]?.message?.content ?? rawData
      return NextResponse.json({ response: text })
    } catch {
      // Fall through to raw response if OpenAI fails
    }
  }

  // Fallback: return a formatted raw response
  return NextResponse.json({ response: formatFallback(command, rawData) })
}

function normalizeRoomArg(arg: string): RoomId | null {
  const a = arg.toLowerCase().replace(/\s+/g, '')
  if (a === 'drawing' || a === 'drawingroom') return 'drawing_room'
  if (a === 'work1' || a === 'workroom1' || a === 'wr1') return 'work_room_1'
  if (a === 'work2' || a === 'workroom2' || a === 'wr2') return 'work_room_2'
  return null
}

function formatFallback(command: string, raw: string): string {
  if (command === '!status') return `Here's the current office status:\n${raw}`
  if (command === '!usage') return `Here's the current power usage:\n${raw}`
  return raw
}
