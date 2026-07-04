import { type NextRequest, NextResponse } from 'next/server'

// Passthrough middleware — no auth protection required for this public dashboard.
// Supabase session refresh is handled server-side in API routes via the service role key.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
