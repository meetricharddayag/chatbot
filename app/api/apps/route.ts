import { NextResponse } from 'next/server'
import { DifyConsoleError, listDifyApps } from '@/lib/dify-console'

export const runtime = 'nodejs'

export async function GET() {
  try {
    return NextResponse.json({ apps: await listDifyApps() }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }
  catch (error) {
    if (error instanceof DifyConsoleError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }
}
