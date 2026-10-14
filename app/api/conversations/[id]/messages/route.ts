import { forwardToDify, isUuid } from '@/lib/dify-service'
import { errorResponse, jsonFromUpstream, plainError } from '@/lib/route-utils'

export const runtime = 'nodejs'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isUuid(id))
    return plainError('Select a valid conversation.', 400)

  const url = new URL(request.url)
  const appId = url.searchParams.get('app_id') ?? ''
  const user = url.searchParams.get('user') ?? ''
  const firstId = url.searchParams.get('first_id') ?? undefined
  const limit = Number(url.searchParams.get('limit') ?? '20')

  if (!isUuid(appId))
    return plainError('Select a valid Dify chatbot.', 400)
  if (!user.trim())
    return plainError('A user identifier is required.', 400)

  const params = new URLSearchParams({
    conversation_id: id,
    user,
    limit: String(Math.min(Math.max(limit || 20, 1), 100)),
  })
  if (firstId)
    params.set('first_id', firstId)

  try {
    const upstream = await forwardToDify(appId, 'messages', { searchParams: params })
    return jsonFromUpstream(upstream, `Dify returned ${upstream.status}.`)
  }
  catch (error) {
    return errorResponse(error)
  }
}
