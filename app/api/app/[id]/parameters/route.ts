import { NextResponse } from 'next/server'
import { forwardToDify, isUuid } from '@/lib/dify-service'
import { errorResponse, jsonFromUpstream, plainError } from '@/lib/route-utils'

export const runtime = 'nodejs'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isUuid(id))
    return plainError('Select a valid Dify chatbot.', 400)

  try {
    const upstream = await forwardToDify(id, 'parameters')
    return jsonFromUpstream(upstream, `Dify returned ${upstream.status}.`)
  }
  catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!isUuid(id))
    return plainError('Select a valid Dify chatbot.', 400)

  try {
    const upstream = await forwardToDify(id, 'parameters', {
      method: 'POST',
      body: await request.text(),
      headers: { 'Content-Type': 'application/json' },
    })
    return jsonFromUpstream(upstream, `Dify returned ${upstream.status}.`)
  }
  catch (error) {
    return errorResponse(error)
  }
}
