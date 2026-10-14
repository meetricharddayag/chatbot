/**
 * Server-side Dify session validation.
 *
 * The chatbot frontend is gated behind a Dify login: the visitor's browser
 * must be signed into Dify on the same host so its `access_token` and
 * `csrf_token` cookies are sent here. We verify those cookies by calling an
 * authenticated Console API endpoint with the visitor's own credentials.
 */

function getConsoleBaseUrl(): string | null {
  const baseUrl = process.env.DIFY_CONSOLE_API_BASE_URL?.replace(/\/+$/, '')
  return baseUrl || null
}

export async function verifyDifySession(accessToken: string, csrfToken: string): Promise<boolean> {
  const baseUrl = getConsoleBaseUrl()
  if (!baseUrl || !accessToken || !csrfToken)
    return false

  try {
    const url = new URL(`${baseUrl}/account/profile`)
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'X-CSRF-Token': csrfToken,
        Cookie: `csrf_token=${csrfToken}`,
      },
      cache: 'no-store',
    })
    return response.ok
  }
  catch {
    return false
  }
}

export function getDifySignInUrl(): string {
  const configured = process.env.DIFY_CONSOLE_WEB_URL?.replace(/\/+$/, '')
  if (configured)
    return `${configured}/signin`

  const base = getConsoleBaseUrl()
  if (base)
    return `${base.replace(/\/console\/api$/, '')}/signin`

  return '/signin'
}
