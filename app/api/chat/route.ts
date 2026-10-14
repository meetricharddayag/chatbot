import { NextResponse } from 'next/server'
import { getServiceBaseUrl, isUuid, resolveAppApiKey } from '@/lib/dify-service'
import { errorResponse, plainError } from '@/lib/route-utils'

export const runtime = 'nodejs'

type ChatFile = {
  type?: unknown
  transfer_method?: unknown
  url?: unknown
  upload_file_id?: unknown
}

type ChatRequest = {
  query?: unknown
  user?: unknown
  conversation_id?: unknown
  app_id?: unknown
  inputs?: unknown
  files?: unknown
  auto_generate_name?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseFiles(value: unknown): ChatFile[] | null {
  if (value === undefined || value === null)
    return null
  if (!Array.isArray(value))
    return null

  const files: ChatFile[] = []
  for (const item of value) {
    if (!isRecord(item))
      return null
    const type = item.type
    const transferMethod = item.transfer_method
    if (type !== 'image' && type !== 'document' && type !== 'audio' && type !== 'video' && type !== 'custom')
      return null
    if (transferMethod !== 'remote_url' && transferMethod !== 'local_file')
      return null

    const file: ChatFile = { type, transfer_method: transferMethod }
    if (transferMethod === 'remote_url') {
      if (typeof item.url !== 'string' || !item.url)
        return null
      file.url = item.url
    }
    else {
      if (!isUuid(item.upload_file_id))
        return null
      file.upload_file_id = item.upload_file_id
    }
    files.push(file)
  }
  return files
}

export async function POST(request: Request) {
  let baseUrl: string
  try {
    baseUrl = getServiceBaseUrl()
  }
  catch (error) {
    return errorResponse(error)
  }

  let body: ChatRequest
  try {
    body = (await request.json()) as ChatRequest
  }
  catch {
    return plainError('The request body must be valid JSON.', 400)
  }

  if (typeof body.query !== 'string' || !body.query.trim())
    return plainError('Enter a message before sending it.', 400)
  if (typeof body.user !== 'string' || !body.user.trim())
    return plainError('A user identifier is required.', 400)
  if (!isUuid(body.app_id))
    return plainError('Select a valid Dify chatbot before sending a message.', 400)
  if (body.conversation_id !== undefined && typeof body.conversation_id !== 'string')
    return plainError('The conversation identifier is invalid.', 400)

  const files = parseFiles(body.files)
  if (files === null && body.files !== undefined && body.files !== null)
    return plainError('The attached files are invalid.', 400)

  const inputs = body.inputs === undefined ? {} : isRecord(body.inputs) ? body.inputs : null
  if (inputs === null)
    return plainError('The input variables are invalid.', 400)

  let apiKey: string
  try {
    apiKey = await resolveAppApiKey(body.app_id)
  }
  catch (error) {
    return errorResponse(error)
  }

  let endpoint: URL
  try {
    endpoint = new URL(`${baseUrl}/chat-messages`)
  }
  catch {
    return plainError('DIFY_API_BASE_URL must be a valid HTTP or HTTPS URL ending in /v1, without query parameters.', 500)
  }

  let upstream: Response
  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        inputs,
        query: body.query,
        response_mode: 'streaming',
        user: body.user,
        ...(body.auto_generate_name === false ? { auto_generate_name: false } : {}),
        ...(files ? { files } : {}),
        ...(typeof body.conversation_id === 'string' && body.conversation_id ? { conversation_id: body.conversation_id } : {}),
      }),
      signal: request.signal,
      cache: 'no-store',
    })
  }
  catch (error) {
    if (request.signal.aborted)
      throw error
    return plainError('Unable to reach Dify. Check the server URL and try again.', 502)
  }

  if (!upstream.ok) {
    const details = await upstream.text()
    return new Response(details || 'Dify rejected the chat request.', {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'text/plain; charset=utf-8' },
    })
  }

  if (!upstream.body) {
    return plainError('Dify returned an empty response stream.', 502)
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') ?? 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
