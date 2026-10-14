import { forwardToDify, isUuid } from '@/lib/dify-service'
import { errorResponse, jsonFromUpstream, plainError } from '@/lib/route-utils'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const appId = url.searchParams.get('app_id') ?? ''
  const user = url.searchParams.get('user') ?? ''
  const lastId = url.searchParams.get('last_id') ?? undefined
  const limit = Number(url.searchParams.get('limit') ?? '20')

  if (!isUuid(appId))
    return plainError('Select a valid Dify chatbot.', 400)
  if (!user.trim())
    return plainError('A user identifier is required.', 400)

  const params = new URLSearchParams({ user, limit: String(Math.min(Math.max(limit || 20, 1), 100)), sort_by: '-updated_at' })
  if (lastId)
    params.set('last_id', lastId)

  try {
    const upstream = await forwardToDify(appId, 'conversations', { searchParams: params })
    return jsonFromUpstream(upstream, `Dify returned ${upstream.status}.`)
  }
  catch (error) {
    return errorResponse(error)
  }
}
