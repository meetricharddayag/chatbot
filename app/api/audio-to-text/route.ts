import { forwardToDify, isUuid } from '@/lib/dify-service'
import { errorResponse, jsonFromUpstream, plainError } from '@/lib/route-utils'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let formData: FormData
  try {
    formData = await request.formData()
  }
  catch {
    return plainError('The request must be multipart/form-data.', 400)
  }

  const appId = String(formData.get('app_id') ?? '')
  const user = String(formData.get('user') ?? '')
  const file = formData.get('file')

  if (!isUuid(appId))
    return plainError('Select a valid Dify chatbot.', 400)
  if (!(file instanceof File) || file.size === 0)
    return plainError('Choose an audio file to transcribe.', 400)

  const upstreamForm = new FormData()
  upstreamForm.set('file', file)
  if (user.trim())
    upstreamForm.set('user', user)

  try {
    const upstream = await forwardToDify(appId, 'audio-to-text', {
      method: 'POST',
      body: upstreamForm,
    })
    return jsonFromUpstream(upstream, `Dify returned ${upstream.status}.`)
  }
  catch (error) {
    return errorResponse(error)
  }
}
