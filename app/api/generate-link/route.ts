import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ลิ้งถาวร — ใช้ sheetId อย่างเดียว ไม่มี token ไม่มีวันหมดอายุ
  const sheetId = session.sheetId || process.env.DEFAULT_SHEET_URL?.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || ''
  if (!sheetId) return NextResponse.json({ error: 'ไม่พบ Sheet ID' }, { status: 400 })

  const data    = { sheetId }
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64')
  const baseUrl = process.env.NEXTAUTH_URL || 'https://school-dashboard-ruddy-iota.vercel.app'
  const link    = `${baseUrl}/register?token=${encoded}`

  return NextResponse.json({ link })
}
