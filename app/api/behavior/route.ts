import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'

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
  return rows.slice(1).filter(r => r.some(v => v)).map((r, ri) => {
    const o: any = { _row: ri + 2 }
    headers.forEach((h, i) => { o[h] = r[i] || '' })
    return o
  })
}

// GET — ดึงคะแนนนักเรียน
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sheetId   = session.sheetId
  const studentId = req.nextUrl.searchParams.get('student_id') || session.studentId || ''
  if (!sheetId || !studentId) return NextResponse.json({ score: 100, logs: [] })

  const token = (session as any).access_token || await getSAToken()
  if (!token) return NextResponse.json({ score: 100, logs: [] })

  const [scores, logs] = await Promise.all([
    fetchTab(sheetId, 'Behavior_Scores', token),
    fetchTab(sheetId, 'Behavior_Logs', token),
  ])

  const scoreRow    = scores.find((s: any) => s.student_id === studentId)
  const score       = scoreRow ? parseInt(scoreRow.score) || 100 : 100
  const studentLogs = logs
    .filter((l: any) => l.student_id === studentId)
    .sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp))

  return NextResponse.json({ score, logs: studentLogs })
}

// POST — เพิ่ม/หักคะแนน + security check
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.role === 'student')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { student_id, grade, classroom, rule_name, points, note, evidence_url } = await req.json()

  if (!student_id || !rule_name || points === undefined)
    return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })

  // Security: ครูหักได้ไม่เกิน -20
  if (session.role === 'teacher' && parseInt(String(points)) < -20)
    return NextResponse.json({ error: 'ครูผู้สอนไม่มีสิทธิ์หักคะแนนเกิน 20 คะแนน' }, { status: 403 })

  const sheetId = session.sheetId
  const token   = (session as any).access_token || await getSAToken()
  if (!sheetId || !token) return NextResponse.json({ error: 'ไม่มี token' }, { status: 500 })

  const now = new Date(Date.now() + 7*60*60*1000).toISOString().replace('T',' ').slice(0,19)

  // 1. บันทึกใน Behavior_Logs
  const logRow = [
    now, student_id, rule_name, String(points),
    note || '', evidence_url || '',
    session.username || ''
  ]
  const logUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Behavior_Logs')}!A:G:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
  await fetch(logUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [logRow] }),
  })

  // 2. อัพเดต Behavior_Scores
  const scores    = await fetchTab(sheetId, 'Behavior_Scores', token)
  const scoreRow  = scores.find((s: any) => s.student_id === student_id)

  if (scoreRow) {
    const current  = parseInt(scoreRow.score) || 100
    const newScore = Math.max(0, Math.min(100, current + parseInt(String(points))))
    const rowNum   = scoreRow._row
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Behavior_Scores')}!G${rowNum}?valueInputOption=RAW`
    await fetch(updateUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [[String(newScore)]] }),
    })
  }

  return NextResponse.json({ success: true })
}
