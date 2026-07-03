import { getOfficeState, simulateTick } from '@/lib/simulator'

/**
 * GET /api/stream
 * Server-Sent Events endpoint.
 * Pushes a new office state snapshot every 8 seconds.
 * The web dashboard connects here for real-time updates without polling.
 */
export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial snapshot immediately
      const sendState = () => {
        try {
          const data = JSON.stringify(getOfficeState())
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch {
          // Client disconnected
          clearInterval(tickInterval)
          clearInterval(sendInterval)
        }
      }

      // Tick the simulator every 8 seconds
      const tickInterval = setInterval(() => {
        simulateTick()
      }, 8000)

      // Send state every 4 seconds (so UI updates after each tick, plus a midpoint refresh)
      const sendInterval = setInterval(sendState, 4000)

      // Send first snapshot right away
      sendState()

      // Cleanup when stream closes
      return () => {
        clearInterval(tickInterval)
        clearInterval(sendInterval)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
