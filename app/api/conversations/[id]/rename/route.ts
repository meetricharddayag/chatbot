import { forwardToDify, isUuid } from '@/lib/dify-service'
import { errorResponse, jsonFromUpstream, plainError } from '@/lib/route-utils'

export const runtime = 'nodejs'

type RenameRequest = {
  name?: unknown
  auto_generate?: unknown
  user?: unknown
  app_id?: unknown
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isUuid(id))
    return plainError('Select a valid conversation.', 400)

  let body: RenameRequest
  try {
    body = (await request.json()) as RenameRequest
  }
  catch {
    return plainError('The request body must be valid JSON.', 400)
  }

  if (!isUuid(body.app_id))
    return plainError('Select a valid Dify chatbot.', 400)

  const autoGenerate = body.auto_generate === true
  if (!autoGenerate && (typeof body.name !== 'string' || !body.name.trim()))
    return plainError('A conversation name is required.', 400)

  try {
    const upstream = await forwardToDify(body.app_id, `conversations/${id}/name`, {
      method: 'POST',
      body: JSON.stringify({
        ...(autoGenerate ? { auto_generate: true } : { name: body.name as string }),
        ...(typeof body.user === 'string' && body.user ? { user: body.user } : {}),
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    return jsonFromUpstream(upstream, `Dify returned ${upstream.status}.`)
  }
  catch (error) {
    return errorResponse(error)
  }
}
