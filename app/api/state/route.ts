import { NextResponse } from 'next/server'
import { getOfficeState, simulateTick } from '@/lib/simulator'

// Return the full office state snapshot
export async function GET() {
  return NextResponse.json(getOfficeState(), {
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

// POST triggers a manual tick (useful for Discord bot or testing)
export async function POST() {
  simulateTick()
  return NextResponse.json({ ok: true, state: getOfficeState() })
}
