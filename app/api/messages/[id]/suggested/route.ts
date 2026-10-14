import { forwardToDify, isUuid } from '@/lib/dify-service'
import { errorResponse, jsonFromUpstream, plainError } from '@/lib/route-utils'

export const runtime = 'nodejs'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isUuid(id))
    return plainError('Select a valid message.', 400)

  const url = new URL(request.url)
  const appId = url.searchParams.get('app_id') ?? ''
  const user = url.searchParams.get('user') ?? ''

  if (!isUuid(appId))
    return plainError('Select a valid Dify chatbot.', 400)
  if (!user.trim())
    return plainError('A user identifier is required.', 400)

  try {
    const upstream = await forwardToDify(appId, `messages/${id}/suggested`, {
      searchParams: new URLSearchParams({ user }),
    })
    return jsonFromUpstream(upstream, `Dify returned ${upstream.status}.`)
  }
  catch (error) {
    return errorResponse(error)
  }
}
