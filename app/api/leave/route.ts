import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'

const WS = 'LeaveRequests'

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

async function readSheet(sheetId: string, token: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(WS)}!A:P`
  const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (!res.ok) return []
  const d = await res.json()
  const rows = d.values || []
  if (rows.length < 2) return []
  const headers = rows[0]
  const idx = (k: string) => headers.indexOf(k)
  return rows.slice(1).filter((r: string[]) => r.some(v => v)).map((r: string[]) => ({
    request_id:  r[idx('request_id')]  || '',
    timestamp:   r[idx('timestamp')]   || '',
    student_id:  r[idx('student_id')]  || '',
    name:        r[idx('name')]        || '',
    grade:       r[idx('grade')]       || '',
    classroom:   r[idx('classroom')]   || '',
    number:      r[idx('number')]      || '',
    date:        r[idx('date')]        || '',
    period:      r[idx('period')]      || '',
    type:        r[idx('type')]        || '',
    reason:      r[idx('reason')]      || '',
    image_url:   r[idx('image_url')]   || '',
    status:      r[idx('status')]      || 'pending',
    approved_by: r[idx('approved_by')] || '',
    approved_at: r[idx('approved_at')] || '',
    row_index:   rows.indexOf(r) + 1,
  }))
}

// GET — ดึงรายการลา
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sheetId = session.sheetId
  if (!sheetId) return NextResponse.json({ requests: [] })

  const token = (session as any).access_token || await getSAToken()
  if (!token) return NextResponse.json({ error: 'no token' }, { status: 500 })

  let requests = await readSheet(sheetId, token)

  // filter ตาม role
  if (session.role === 'teacher') {
    requests = requests.filter((r: any) => r.grade === session.grade && r.classroom === session.classroom)
  } else if (session.role === 'student') {
    requests = requests.filter((r: any) => r.student_id === session.studentId)
  }

  // filter status
  const status = req.nextUrl.searchParams.get('status')
  if (status) requests = requests.filter((r: any) => r.status === status)

  return NextResponse.json({ requests })
}

// POST — นักเรียนส่งคำขอลา
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { student_id, name, grade, classroom, number, date, period, type, reason, image_url } = body

  const sheetId = session.sheetId
  if (!sheetId) return NextResponse.json({ error: 'ไม่พบ Sheet ID' }, { status: 400 })

  const token = (session as any).access_token || await getSAToken()
  if (!token) return NextResponse.json({ error: 'ไม่สามารถเขียน Sheet ได้' }, { status: 500 })

  const now        = new Date(Date.now() + 7*60*60*1000)
  const timestamp  = now.toISOString().replace('T', ' ').slice(0, 19)
  const request_id = `LR${Date.now()}`

  const row = [
    request_id, timestamp, student_id, name, grade, classroom, number,
    date, period, type, reason || '', image_url || '', 'pending', '', ''
  ]

  // สร้าง header row ถ้ายังไม่มี
  const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(WS)}!A1:P1`
  const checkRes = await fetch(checkUrl, { headers: { Authorization: `Bearer ${token}` } })
  const checkData = await checkRes.json()
  const hasHeader = checkData.values?.length > 0

  if (!hasHeader) {
    const headers = ['request_id','timestamp','student_id','name','grade','classroom','number','date','period','type','reason','image_url','status','approved_by','approved_at']
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(WS)}!A1:O1?valueInputOption=RAW`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [headers] }),
    })
  }

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(WS)}!A:O:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
  const res = await fetch(appendUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  })

  if (!res.ok) return NextResponse.json({ error: 'บันทึกไม่ได้' }, { status: 500 })
  return NextResponse.json({ success: true, request_id })
}

// PATCH — ครู/แอดมินอนุมัติ/ปฏิเสธ
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.role === 'student')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { request_id, action } = await req.json() // action: 'approve' | 'reject'
  if (!request_id || !action) return NextResponse.json({ error: 'ข้อมูลไม่ครบ' }, { status: 400 })

  const sheetId = session.sheetId
  const token   = (session as any).access_token || await getSAToken()
  if (!token) return NextResponse.json({ error: 'ไม่สามารถเขียน Sheet ได้' }, { status: 500 })

  // หา row ของ request_id
  const requests = await readSheet(sheetId, token)
  const req_data  = requests.find((r: any) => r.request_id === request_id)
  if (!req_data) return NextResponse.json({ error: 'ไม่พบคำขอ' }, { status: 404 })

  if (session.role === 'teacher' && (req_data.grade !== session.grade || req_data.classroom !== session.classroom))
    return NextResponse.json({ error: 'ครูผู้สอนอนุมัติได้เฉพาะห้องของตนเอง' }, { status: 403 })

  const now = new Date(Date.now() + 7*60*60*1000).toISOString().replace('T',' ').slice(0,19)
  const newStatus = action === 'approve' ? 'approved' : 'rejected'

  // อัพเดต status, approved_by, approved_at (columns M, N, O = 13, 14, 15)
  const rowNum = req_data.row_index + 1 // +1 เพราะมี header
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(WS)}!M${rowNum}:O${rowNum}?valueInputOption=RAW`
  await fetch(updateUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [[newStatus, session.username, now]] }),
  })

  // ถ้าอนุมัติ → เขียนลง Checkin sheet
  if (action === 'approve') {
    const sem    = parseInt(process.env.CURRENT_SEMESTER || '1') as 1|2
    const wsName = `Checkin_เทอม${sem}`
    const periodLabel = req_data.period === 'allday' ? 'ทั้งวัน' : req_data.period === 'afternoon' ? 'ครึ่งวันบ่าย' : 'ครึ่งวันเช้า'
    const timeStr = req_data.period === 'afternoon' ? '12:00:00' : '08:00:00'
    const ts      = `${req_data.date} ${timeStr}`
    const nameParts = req_data.name.split(' ')

    const checkinRow = [
      ts, req_data.student_id, '', nameParts[0] || req_data.name,
      nameParts.slice(1).join(' ') || '',
      req_data.grade, req_data.classroom, req_data.number,
      req_data.type, timeStr, req_data.image_url,
      `${periodLabel}${req_data.reason ? ' — ' + req_data.reason : ''}`,
      session.username
    ]

    const checkinUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(wsName)}!A:M:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`
    await fetch(checkinUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [checkinRow] }),
    })
  }

  return NextResponse.json({ success: true, status: newStatus })
}
