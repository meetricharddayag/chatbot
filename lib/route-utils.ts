import { NextResponse } from 'next/server'
import { DifyConsoleError } from './dify-console'
import { DifyServiceError, isChatError } from './dify-service'

/**
 * Converts a known Dify error into a JSON response. Unknown errors are
 * rethrown so Next.js returns a 500.
 */
export function errorResponse(error: unknown): NextResponse {
  if (isChatError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  throw error
}

export function plainError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Consumes a JSON response from Dify and returns either its payload or an
 * error response carrying Dify's message.
 */
export async function jsonFromUpstream(upstream: Response, fallback: string): Promise<NextResponse> {
  const text = await upstream.text()
  let payload: unknown = null
  try {
    payload = text ? JSON.parse(text) : null
  }
  catch {
    payload = null
  }

  if (!upstream.ok) {
    const message = payload && typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string'
      ? payload.message
      : (text.trim() || fallback)
    const status = upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502
    return NextResponse.json({ error: message }, { status })
  }

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
}

export { DifyConsoleError, DifyServiceError }
