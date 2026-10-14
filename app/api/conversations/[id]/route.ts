import { NextResponse } from 'next/server'
import { forwardToDify, isUuid } from '@/lib/dify-service'
import { errorResponse, jsonFromUpstream, plainError } from '@/lib/route-utils'

export const runtime = 'nodejs'

type DeleteRequest = { user?: unknown; app_id?: unknown }

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isUuid(id))
    return plainError('Select a valid conversation.', 400)

  let body: DeleteRequest
  try {
    body = (await request.json()) as DeleteRequest
  }
  catch {
    return plainError('The request body must be valid JSON.', 400)
  }

  if (!isUuid(body.app_id))
    return plainError('Select a valid Dify chatbot.', 400)

  try {
    const upstream = await forwardToDify(body.app_id, `conversations/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ ...(typeof body.user === 'string' && body.user ? { user: body.user } : {}) }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (upstream.status === 204)
      return new NextResponse(null, { status: 204 })

    return jsonFromUpstream(upstream, `Dify returned ${upstream.status}.`)
  }
  catch (error) {
    return errorResponse(error)
  }
}
