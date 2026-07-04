import { NextResponse } from 'next/server'
import { getDevices, getActiveAlerts } from '@/lib/simulator'
import { ROOM_LIST, ROOM_LABELS } from '@/lib/config'

/**
 * GET /api/status
 * Returns a human-readable status summary per room.
 * Used by the Discord bot for !status command.
 */
export async function GET() {
  const devices = getDevices()
  const alerts = getActiveAlerts()

  const rooms = ROOM_LIST.map((roomId) => {
    const roomDevices = devices.filter((d) => d.room === roomId)
    const fans = roomDevices.filter((d) => d.device_type === 'fan')
    const lights = roomDevices.filter((d) => d.device_type === 'light')
    const fansOn = fans.filter((d) => d.status).length
    const lightsOn = lights.filter((d) => d.status).length
    const totalOn = roomDevices.filter((d) => d.status).length
    const watts = roomDevices.reduce((s, d) => s + (d.status ? d.wattage : 0), 0)

    return {
      id: roomId,
      name: ROOM_LABELS[roomId],
      fans_on: fansOn,
      fans_total: fans.length,
      lights_on: lightsOn,
      lights_total: lights.length,
      devices_on: totalOn,
      devices_total: roomDevices.length,
      watts,
      summary: buildRoomSummary(ROOM_LABELS[roomId], fansOn, lightsOn),
    }
  })

  const totalOn = devices.filter((d) => d.status).length
  const totalWatts = devices.reduce((s, d) => s + (d.status ? d.wattage : 0), 0)

  return NextResponse.json(
    {
      rooms,
      total_devices_on: totalOn,
      total_devices: devices.length,
      total_watts: totalWatts,
      active_alerts: alerts.length,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}

function buildRoomSummary(name: string, fansOn: number, lightsOn: number): string {
  if (fansOn === 0 && lightsOn === 0) return `${name}: all off.`
  const parts: string[] = []
  if (fansOn > 0) parts.push(`${fansOn} fan${fansOn > 1 ? 's' : ''} ON`)
  if (lightsOn > 0) parts.push(`${lightsOn} light${lightsOn > 1 ? 's' : ''} ON`)
  return `${name}: ${parts.join(', ')}.`
}
