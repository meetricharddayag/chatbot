export type DifyApp = {
  id: string
  name: string
  mode: string
  description?: string
  icon?: string
  icon_background?: string
}

type DifyApiKey = {
  token?: unknown
}

type DifyApiKeyList = {
  data?: unknown
}

type DifyAppPage = {
  data?: unknown
  has_more?: unknown
}

type DifyAppSummary = {
  id?: unknown
  name?: unknown
  mode?: unknown
  description?: unknown
  icon?: unknown
  icon_background?: unknown
}

export class DifyConsoleError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'DifyConsoleError'
  }
}

function getConsoleConfig() {
  const baseUrl = process.env.DIFY_CONSOLE_API_BASE_URL?.replace(/\/+$/, '')
  const token = process.env.DIFY_CONSOLE_API_TOKEN
  const csrfToken = process.env.DIFY_CONSOLE_CSRF_TOKEN?.trim()

  if (!baseUrl || !token || !csrfToken) {
    throw new DifyConsoleError(
      'Dify Console is not configured. Set DIFY_CONSOLE_API_BASE_URL, DIFY_CONSOLE_API_TOKEN, and DIFY_CONSOLE_CSRF_TOKEN on the server.',
      503,
    )
  }

  try {
    const url = new URL(baseUrl)
    if (
      (url.protocol !== 'https:' && url.protocol !== 'http:')
      || !url.pathname.replace(/\/+$/, '').endsWith('/console/api')
      || url.search
      || url.hash
    ) {
      throw new Error('Unsupported Dify Console URL')
    }

    return { baseUrl, token, csrfToken }
  }
  catch {
    throw new DifyConsoleError(
      'DIFY_CONSOLE_API_BASE_URL must be a valid HTTP or HTTPS URL ending in /console/api.',
      500,
    )
  }
}

async function requestConsole(path: string, searchParams?: URLSearchParams) {
  const { baseUrl, token, csrfToken } = getConsoleConfig()
  const url = new URL(`${baseUrl}/${path}`)
  if (searchParams)
    url.search = searchParams.toString()

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'X-CSRF-Token': csrfToken,
        Cookie: `csrf_token=${csrfToken}`,
      },
      cache: 'no-store',
    })
  }
  catch {
    throw new DifyConsoleError('Unable to reach the Dify Console API. Check its URL and try again.', 502)
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new DifyConsoleError(
        'Dify Console rejected the access token. Check that it is valid and has permission to access these apps.',
        response.status,
      )
    }

    const detail = await response.text()
    throw new DifyConsoleError(
      detail || `Dify Console request failed (${response.status}).`,
      response.status >= 400 && response.status < 500 ? response.status : 502,
    )
  }

  try {
    return await response.json() as unknown
  }
  catch {
    throw new DifyConsoleError('Dify Console returned an invalid response.', 502)
  }
}

const CHAT_MODES = new Set(['chat', 'agent', 'agent-chat', 'advanced-chat'])

export async function listDifyApps(): Promise<DifyApp[]> {
  const apps: DifyApp[] = []

  for (let page = 1; page <= 99999; page++) {
    const params = new URLSearchParams({
      page: String(page),
      limit: '100',
      mode: 'all',
      sort_by: 'last_modified',
    })
    const result = await requestConsole('apps', params)
    if (typeof result !== 'object' || result === null || !('data' in result)) {
      throw new DifyConsoleError('Dify Console returned an invalid app list.', 502)
    }

    const appPage = result as DifyAppPage
    if (!Array.isArray(appPage.data)) {
      throw new DifyConsoleError('Dify Console returned an invalid app list.', 502)
    }

    for (const item of appPage.data) {
      if (typeof item !== 'object' || item === null)
        continue
      const app = item as DifyAppSummary
      if (
        typeof app.id === 'string'
        && typeof app.name === 'string'
        && typeof app.mode === 'string'
        && CHAT_MODES.has(app.mode)
      ) {
        apps.push({
          id: app.id,
          name: app.name,
          mode: app.mode,
          description: typeof app.description === 'string' ? app.description : undefined,
          icon: typeof app.icon === 'string' ? app.icon : undefined,
          icon_background: typeof app.icon_background === 'string' ? app.icon_background : undefined,
        })
      }
    }

    if (appPage.has_more !== true)
      return apps
  }

  throw new DifyConsoleError('Dify returned too many pages of apps to load safely.', 502)
}

async function fetchDifyAppApiKey(appId: string): Promise<string> {
  const result = await requestConsole(`apps/${encodeURIComponent(appId)}/api-keys`)
  if (typeof result !== 'object' || result === null || !('data' in result)) {
    throw new DifyConsoleError('Dify Console returned an invalid API key list.', 502)
  }

  const keyList = result as DifyApiKeyList
  if (!Array.isArray(keyList.data)) {
    throw new DifyConsoleError('Dify Console returned an invalid API key list.', 502)
  }

  const key = keyList.data.find((item): item is DifyApiKey =>
    typeof item === 'object'
    && item !== null
    && 'token' in item
    && typeof item.token === 'string'
    && item.token.length > 0,
  )

  if (!key || typeof key.token !== 'string') {
    throw new DifyConsoleError(
      'This Dify chatbot has no API key yet. Create an API key for it in Dify, then try again.',
      409,
    )
  }

  return key.token
}

const apiKeyCache = new Map<string, { token: string; expires: number }>()
const API_KEY_TTL_MS = 5 * 60 * 1000

export async function getDifyAppApiKey(appId: string): Promise<string> {
  const cached = apiKeyCache.get(appId)
  if (cached && cached.expires > Date.now())
    return cached.token

  const token = await fetchDifyAppApiKey(appId)
  apiKeyCache.set(appId, { token, expires: Date.now() + API_KEY_TTL_MS })
  return token
}
