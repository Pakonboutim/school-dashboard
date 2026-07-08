import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hashPassword, getAllUsers } from '@/lib/users'
import { google } from 'googleapis'

export const revalidate = 0

async function getSAToken(): Promise<string | null> {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_EMAIL,
        private_key:  process.env.GOOGLE_SERVICE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    const client = await auth.getClient()
    const t = await (client as any).getAccessToken()
    return t?.token || null
  } catch (e) {
    console.error('[users] SA error:', e)
    return null
  }
}

async function writeRowsToSheet(sheetId: string, rows: any[][]) {
  const token = await getSAToken()
  if (!token) throw new Error('ไม่มี Service Account token')

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Users!A:H:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: rows }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sheet error: ${err.slice(0, 200)}`)
  }
  return true
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const users = await getAllUsers(session.sheetId)
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { username, password, role, grade, classroom, studentId, sheetUrl } = body

  if (!username || !password || !role)
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })

  const hash      = hashPassword(password)
  const userSheet = sheetUrl || session.sheetUrl || ''
  const row       = [username, hash, role, grade||'', classroom||'', studentId||'', 'true', userSheet]

  try {
    await writeRowsToSheet(session.sheetId, [row])
    return NextResponse.json({ success: true, written: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, written: false, error: e.message, row })
  }
}
