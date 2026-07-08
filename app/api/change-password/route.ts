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
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { newPassword } = await req.json()
  if (!newPassword || newPassword.length < 6)
    return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัว' }, { status: 400 })

  const hash    = hashPassword(newPassword)
  const sheetId = session.sheetId

  if (!sheetId) return NextResponse.json({ error: 'ไม่พบ Sheet ID' }, { status: 400 })

  // ใช้ access_token (Google login) หรือ Service Account
  const token = (session as any).access_token || await getSAToken()
  if (!token) return NextResponse.json({ error: 'ไม่สามารถเขียน Sheet ได้' }, { status: 500 })

  // ดึง Users sheet
  const getRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Users!A:H`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
  )
  if (!getRes.ok) return NextResponse.json({ error: 'ดึงข้อมูลไม่ได้' }, { status: 500 })

  const data = await getRes.json()
  const rows: string[][] = data.values || []

  // หา row ของ user โดยใช้ username (case-insensitive)
  const username = session.username?.toLowerCase() || ''
  const rowIdx = rows.findIndex((r, i) =>
    i > 0 && (
      r[0]?.toLowerCase() === username ||
      r[5]?.toLowerCase() === username  // student_id
    )
  )

  if (rowIdx < 0) {
    console.error('[change-password] user not found:', session.username, 'rows:', rows.length)
    return NextResponse.json({ error: `ไม่พบ user "${session.username}"` }, { status: 404 })
  }

  // อัพเดท password_hash (col B) และ must_change_password (col G)
  const row     = rows[rowIdx]
  const range   = `Users!B${rowIdx + 1}:G${rowIdx + 1}`
  const updated = [hash, row[2]||'', row[3]||'', row[4]||'', row[5]||'', 'false']

  const putRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [updated] }),
    }
  )

  if (!putRes.ok) {
    const err = await putRes.text()
    console.error('[change-password] write error:', err)
    return NextResponse.json({ error: 'บันทึกไม่ได้' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
