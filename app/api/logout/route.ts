import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const baseUrl = process.env.DIFY_CONSOLE_API_BASE_URL?.replace(/\/+$/, '')

  const accessToken = request.cookies.get('access_token')?.value
  const csrfToken = request.cookies.get('csrf_token')?.value

  // Best effort: tell Dify to end the session server-side.
  if (baseUrl && accessToken) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    }
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken
      headers.Cookie = `csrf_token=${csrfToken}`
    }
    try {
      await fetch(`${baseUrl}/logout`, { method: 'POST', headers, cache: 'no-store' })
    }
    catch {
      // Ignore network failures; still clear the local cookies below.
    }
  }

  // Clear the Dify session cookies in the browser.
  const response = NextResponse.json({ ok: true })
  for (const name of ['access_token', 'refresh_token', 'csrf_token']) {
    response.cookies.set(name, '', { path: '/', maxAge: 0 })
  }

  return response
}
