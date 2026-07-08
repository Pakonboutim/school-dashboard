import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hashPassword } from '@/lib/users'
import { google } from 'googleapis'

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
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { users } = await req.json()
  if (!users?.length) return NextResponse.json({ error: 'ไม่มีข้อมูล' }, { status: 400 })

  const sheetId = session.sheetId
  const rows = users.map((u: any) => {
    const hash = hashPassword(u.password)
    return [
      u.username, hash, u.role || 'student',
      u.grade || '', u.classroom || '', u.studentId || u.student_id || '',
      'true', u.sheetUrl || session.sheetUrl || '',
    ]
  })

  try {
    const token = await getSAToken()
    if (!token) throw new Error('ไม่มี Service Account token')

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Users!A:H:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: rows }),
    })
    if (!res.ok) throw new Error(await res.text())

    return NextResponse.json({ success: true, written: true, count: rows.length })
  } catch (e: any) {
    // fallback — return rows สำหรับ download CSV
    return NextResponse.json({
      success: true, written: false,
      rows: rows.map((r: any[], i: number) => ({ ...users[i], password_hash: r[1] })),
      count: rows.length,
      error: e.message,
    })
  }
}
