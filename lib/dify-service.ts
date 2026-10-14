import { DifyConsoleError, getDifyAppApiKey } from './dify-console'

export class DifyServiceError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'DifyServiceError'
  }
}

export function getServiceBaseUrl(): string {
  const baseUrl = process.env.DIFY_API_BASE_URL?.replace(/\/+$/, '')

  if (!baseUrl) {
    throw new DifyServiceError('Dify is not configured. Set DIFY_API_BASE_URL on the server.', 503)
  }

  try {
    const url = new URL(baseUrl)
    if (
      (url.protocol !== 'https:' && url.protocol !== 'http:')
      || !url.pathname.replace(/\/+$/, '').endsWith('/v1')
      || url.search
      || url.hash
    ) {
      throw new Error('Unsupported Dify service URL')
    }
    return baseUrl
  }
  catch {
    throw new DifyServiceError(
      'DIFY_API_BASE_URL must be a valid HTTP or HTTPS URL ending in /v1, without query parameters.',
      500,
    )
  }
}

export async function resolveAppApiKey(appId: string): Promise<string> {
  return getDifyAppApiKey(appId)
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)
}

export function isChatError(error: unknown): error is Error & { status: number } {
  return error instanceof DifyServiceError || error instanceof DifyConsoleError
}

/**
 * Builds a URL pointing at the Dify service API.
 */
export function serviceUrl(path: string, searchParams?: URLSearchParams): URL {
  const baseUrl = getServiceBaseUrl()
  const url = new URL(`${baseUrl}/${path.replace(/^\//, '')}`)
  if (searchParams)
    url.search = searchParams.toString()
  return url
}

/**
 * Forwards a request to the Dify service API using an app API key resolved
 * from the Console. Returns the upstream response (JSON or stream).
 */
export async function forwardToDify(
  appId: string,
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'DELETE'
    searchParams?: URLSearchParams
    body?: BodyInit
    headers?: Record<string, string>
    signal?: AbortSignal
  } = {},
): Promise<Response> {
  const apiKey = await resolveAppApiKey(appId)
  const url = serviceUrl(path, options.searchParams)

  let upstream: Response
  try {
    upstream = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...options.headers,
      },
      body: options.body,
      signal: options.signal,
      cache: 'no-store',
    })
  }
  catch (error) {
    if (options.signal?.aborted)
      throw error
    throw new DifyServiceError('Unable to reach Dify. Check the server URL and try again.', 502)
  }

  return upstream
}
