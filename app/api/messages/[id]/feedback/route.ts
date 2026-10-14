import { forwardToDify, isUuid } from '@/lib/dify-service'
import { errorResponse, jsonFromUpstream, plainError } from '@/lib/route-utils'

export const runtime = 'nodejs'

type FeedbackRequest = {
  app_id?: unknown
  user?: unknown
  rating?: unknown
  content?: unknown
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isUuid(id))
    return plainError('Select a valid message.', 400)

  let body: FeedbackRequest
  try {
    body = (await request.json()) as FeedbackRequest
  }
  catch {
    return plainError('The request body must be valid JSON.', 400)
  }

  if (!isUuid(body.app_id))
    return plainError('Select a valid Dify chatbot.', 400)
  if (body.rating !== 'like' && body.rating !== 'dislike' && body.rating !== null && body.rating !== undefined)
    return plainError('The feedback rating is invalid.', 400)

  try {
    const upstream = await forwardToDify(body.app_id, `messages/${id}/feedbacks`, {
      method: 'POST',
      body: JSON.stringify({
        rating: body.rating ?? null,
        ...(typeof body.user === 'string' && body.user ? { user: body.user } : {}),
        ...(typeof body.content === 'string' && body.content ? { content: body.content } : {}),
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    return jsonFromUpstream(upstream, `Dify returned ${upstream.status}.`)
  }
  catch (error) {
    return errorResponse(error)
  }
}
