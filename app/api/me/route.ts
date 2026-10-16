import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.DIFY_CONSOLE_API_BASE_URL?.replace(/\/+$/, '')
  const accessToken = request.cookies.get('access_token')?.value
  const csrfToken = request.cookies.get('csrf_token')?.value

  if (!baseUrl || !accessToken || !csrfToken) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  try {
    const response = await fetch(`${baseUrl}/account/profile`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'X-CSRF-Token': csrfToken,
        Cookie: `csrf_token=${csrfToken}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
    }

    const payload = (await response.json()) as { name?: unknown; avatar_url?: unknown }
    return NextResponse.json({
      name: typeof payload.name === 'string' ? payload.name : '',
      avatarUrl: typeof payload.avatar_url === 'string' ? payload.avatar_url : null,
    })
  }
  catch {
    return NextResponse.json({ error: 'Unable to reach Dify.' }, { status: 502 })
  }
}
