import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'
import { getAllStudents } from '@/lib/sheets'

export const revalidate = 0

async function getSAToken() {
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
}

async function fetchTab(sheetId: string, tab: string, token: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tab)}!A:Z`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (!res.ok) return []
  const d = await res.json()
  const rows: string[][] = d.values || []
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1).filter(r => r.some(v => v)).map(r => {
    const o: any = {}
    headers.forEach((h, i) => { o[h] = r[i] || '' })
    return o
  })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sheetId   = session.sheetId
  // ครูดูได้แค่ห้องตัวเอง — ไม่สนใจ query param ที่ client ส่งมา
  const grade     = session.role === 'teacher' ? session.grade     : (req.nextUrl.searchParams.get('grade') || '')
  const classroom = session.role === 'teacher' ? session.classroom : (req.nextUrl.searchParams.get('classroom') || '')
  const studentId = req.nextUrl.searchParams.get('student_id') || ''
  const token     = (session as any).access_token || await getSAToken()
  if (!sheetId || !token) return NextResponse.json({ logs: [] })

  const allLogs = await fetchTab(sheetId, 'Behavior_Logs', token)

  let logs = allLogs
  if (studentId) {
    logs = logs.filter((l: any) => l.student_id === studentId)
  } else if (grade || classroom) {
    // filter ตาม grade/classroom — join กับ Students sheet เพื่อหา student_id ที่อยู่ในห้องนั้น
    const students = await getAllStudents(token, sheetId)
    const allowedIds = new Set(
      students
        .filter(s => (!grade || s.grade === grade) && (!classroom || s.classroom === classroom))
        .map(s => s.student_id)
    )
    logs = logs.filter((l: any) => allowedIds.has(l.student_id))
  }

  logs = logs.sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))
  return NextResponse.json({ logs })
}
