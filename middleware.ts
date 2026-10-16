import { NextRequest, NextResponse } from 'next/server'
import { getDifySignInUrl, verifyDifySession } from '@/lib/dify-auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Logout must always be reachable so users can clear their session.
  if (pathname === '/api/logout')
    return NextResponse.next()

  const accessToken = request.cookies.get('access_token')?.value
  const csrfToken = request.cookies.get('csrf_token')?.value
  const isApi = pathname.startsWith('/api')

  const deny = () => {
    if (isApi) {
      return NextResponse.json(
        { error: 'Sign in to Dify to use this chat.' },
        { status: 401 },
      )
    }
    return NextResponse.redirect(getDifySignInUrl())
  }

  if (!accessToken || !csrfToken)
    return deny()

  const valid = await verifyDifySession(accessToken, csrfToken)
  if (!valid)
    return deny()

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/api/:path*'],
}
