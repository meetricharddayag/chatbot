import { forwardToDify, isUuid } from '@/lib/dify-service'
import { errorResponse, jsonFromUpstream, plainError } from '@/lib/route-utils'

export const runtime = 'nodejs'

type StopRequest = {
  app_id?: unknown
  user?: unknown
  task_id?: unknown
}

export async function POST(request: Request) {
  let body: StopRequest
  try {
    body = (await request.json()) as StopRequest
  }
  catch {
    return plainError('The request body must be valid JSON.', 400)
  }

  if (!isUuid(body.app_id))
    return plainError('Select a valid Dify chatbot.', 400)
  if (!isUuid(body.task_id))
    return plainError('A task identifier is required to stop generation.', 400)

  try {
    const upstream = await forwardToDify(body.app_id, `chat-messages/${body.task_id}/stop`, {
      method: 'POST',
      body: JSON.stringify({ ...(typeof body.user === 'string' && body.user ? { user: body.user } : {}) }),
      headers: { 'Content-Type': 'application/json' },
    })
    return jsonFromUpstream(upstream, `Dify returned ${upstream.status}.`)
  }
  catch (error) {
    return errorResponse(error)
  }
}
