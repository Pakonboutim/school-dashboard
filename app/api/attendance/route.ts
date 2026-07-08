import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllStudents } from '@/lib/sheets'
import { google } from 'googleapis'

async function getServiceAccountToken(): Promise<string | null> {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_EMAIL,
        private_key:  process.env.GOOGLE_SERVICE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    const client = await auth.getClient()
    const token  = await (client as any).getAccessToken()
    return token?.token || null
  } catch (e) {
    console.error('[attendance] service account error:', e)
    return null
  }
}

export const revalidate = 0

// GET — ดึงรายชื่อนักเรียน
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token     = (session as any).access_token || 'public'
  const sheetId   = session.sheetId
  const grade     = req.nextUrl.searchParams.get('grade') || session.grade || ''
  const classroom = req.nextUrl.searchParams.get('classroom') || session.classroom || ''

  let students = await getAllStudents(token, sheetId)

  if (session.role === 'teacher') {
    students = students.filter(s => s.grade === session.grade && s.classroom === session.classroom)
  } else if (grade && classroom) {
    students = students.filter(s => s.grade === grade && s.classroom === classroom)
  }

  return NextResponse.json({ students })
}

// POST — บันทึกการลา/เช็คมาย้อนหลัง
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.role === 'student')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { student_id, student_name, prefix, grade, classroom, number,
          date, status, period, note, image_url } = body

  // ตรวจสิทธิ์ครู
  if (session.role === 'teacher') {
    if (grade !== session.grade || classroom !== session.classroom)
      return NextResponse.json({ error: 'ไม่มีสิทธิ์แก้ไขห้องนี้' }, { status: 403 })
  }

  const token   = (session as any).access_token || ''
  const sheetId = session.sheetId
  const sem     = parseInt(process.env.CURRENT_SEMESTER || '1') as 1|2
  const wsName  = `Checkin_เทอม${sem}`

  // สร้าง rows — allday = 2 rows (เช้า+บ่าย)
  const makeRow = (timeStr: string) => {
    const thDate = `${date} ${timeStr}`
    const fullName = student_name.replace(prefix, '').trim()
    const nameParts = fullName.split(' ')
    const fname = nameParts[0] || fullName
    const lname  = nameParts.slice(1).join(' ') || ''
    const periodNote = period === 'allday' ? 'ทั้งวัน' : period === 'afternoon' ? 'ครึ่งวันบ่าย' : 'ครึ่งวันเช้า'
    const fullNote   = note ? `${periodNote} — ${note}` : periodNote
    return [
      thDate, student_id, prefix, fname, lname,
      grade, classroom, number, status, timeStr, image_url || '',
      fullNote, session.username || 'manual'
    ]
  }

  const rows = [makeRow(
    period === 'afternoon' ? '12:00:00' :
    period === 'allday'    ? '08:00:00' : '08:00:00'
  )]

  if (!sheetId) return NextResponse.json({ error: 'ไม่พบ Sheet ID' }, { status: 400 })

  // ใช้ access_token (Google login) หรือ Service Account
  const saToken    = await getServiceAccountToken()
  const writeToken = token || saToken

  if (!writeToken) return NextResponse.json({
    error: `ไม่มี token — SA: ${process.env.GOOGLE_SERVICE_EMAIL ? 'SET' : 'NOT SET'}`
  }, { status: 500 })

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(wsName)}!A:M:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${writeToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: rows }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[attendance] Sheet error:', err)
      return NextResponse.json({ error: 'บันทึกลง Sheet ไม่ได้' }, { status: 500 })
    }
    return NextResponse.json({ success: true, rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
