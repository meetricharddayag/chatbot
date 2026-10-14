import { NextResponse } from 'next/server'
import { forwardToDify, isUuid } from '@/lib/dify-service'
import { errorResponse, plainError } from '@/lib/route-utils'

export const runtime = 'nodejs'

type TtsRequest = {
  app_id?: unknown
  user?: unknown
  message_id?: unknown
  text?: unknown
  voice?: unknown
}

export async function POST(request: Request) {
  let body: TtsRequest
  try {
    body = (await request.json()) as TtsRequest
  }
  catch {
    return plainError('The request body must be valid JSON.', 400)
  }

  if (!isUuid(body.app_id))
    return plainError('Select a valid Dify chatbot.', 400)
  if (typeof body.message_id !== 'string' && typeof body.text !== 'string')
    return plainError('Provide text or a message to voice.', 400)

  const payload: Record<string, unknown> = {}
  if (typeof body.message_id === 'string' && body.message_id)
    payload.message_id = body.message_id
  else if (typeof body.text === 'string' && body.text)
    payload.text = body.text
  else
    return plainError('Provide text or a message to voice.', 400)

  if (typeof body.user === 'string' && body.user)
    payload.user = body.user
  if (typeof body.voice === 'string' && body.voice)
    payload.voice = body.voice

  try {
    const upstream = await forwardToDify(body.app_id, 'text-to-audio', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      let message = text || `Dify returned ${upstream.status}.`
      try {
        const parsed: unknown = JSON.parse(text)
        if (parsed && typeof parsed === 'object' && 'message' in parsed && typeof parsed.message === 'string')
          message = parsed.message
      }
      catch {
        // keep raw text
      }
      return NextResponse.json({ error: message }, { status: upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502 })
    }

    const audio = await upstream.arrayBuffer()
    const contentType = upstream.headers.get('Content-Type') ?? 'audio/mpeg'
    return new NextResponse(audio, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    })
  }
  catch (error) {
    return errorResponse(error)
  }
}
