import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/users'
import { google } from 'googleapis'

export async function POST(req: NextRequest) {
  const { email, password, grade, classroom, token, fname, lname } = await req.json()

  if (!email || !password || !grade || !classroom || !token || !fname || !lname)
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })

  let sheetId = ''
  try {
    const data = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
    sheetId = data.sheetId
  } catch {
    return NextResponse.json({ error: 'token ไม่ถูกต้อง' }, { status: 400 })
  }

  if (!sheetId) return NextResponse.json({ error: 'ไม่พบ Sheet ID' }, { status: 400 })

  const hash     = hashPassword(password)
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`
  const fullName = `ครู${fname} ${lname}`
  // columns: username | hash | role | grade | classroom | student_id | must_change | sheet_url | name
  const row = [email, hash, 'teacher', grade, classroom, '', 'false', sheetUrl, fullName]

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_EMAIL,
        private_key:  process.env.GOOGLE_SERVICE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    const client = await auth.getClient()
    const t      = await (client as any).getAccessToken()
    if (!t?.token) throw new Error('no SA token')

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Users!A:I:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] }),
    })
    if (!res.ok) throw new Error(await res.text())
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[register]', e.message)
    return NextResponse.json({ success: true, manual: true, row })
  }
}
