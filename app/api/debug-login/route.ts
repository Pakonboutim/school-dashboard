import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const revalidate = 0

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const envUrl  = process.env.DEFAULT_SHEET_URL || ''
  const m       = envUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)

  return NextResponse.json({
    env: {
      DEFAULT_SHEET_URL: envUrl ? envUrl.slice(0, 60) + '...' : 'NOT SET',
      sheetIdFromEnv: m ? m[1] : 'NOT FOUND',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '✅ SET' : '❌ NOT SET',
    },
    session: session ? {
      role:      session.role,
      username:  session.username,
      sheetId:   session.sheetId,
      sheetUrl:  session.sheetUrl?.slice(0, 60),
      hasToken:  !!(session as any).access_token,
    } : null,
  })
}
