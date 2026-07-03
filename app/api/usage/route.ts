import { NextResponse } from 'next/server'
import { getEnergyData } from '@/lib/simulator'

/**
 * GET /api/usage
 * Returns power consumption data.
 * Used by the Discord bot for !usage command.
 */
export async function GET() {
  const energy = getEnergyData()

  return NextResponse.json(
    {
      total_watts: energy.total_watts,
      today_kwh: energy.today_kwh,
      room_watts: energy.room_watts,
      recorded_at: energy.recorded_at,
      // Estimated daily cost at $0.08/kWh (rough office rate)
      estimated_cost_usd: Number((energy.today_kwh * 0.08).toFixed(4)),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    }
  )
}
