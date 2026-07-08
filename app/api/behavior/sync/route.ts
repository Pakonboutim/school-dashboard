import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAllStudents, getCalendarData } from '@/lib/sheets'

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

// โควตาผ่อนผัน
const QUOTA = {
  'มาสาย':          { free: 3, deduct: -5,  label: 'มาโรงเรียนสาย' },
  'ขาด':            { free: 1, deduct: -10, label: 'ขาดเรียนโดยไม่มีเหตุผล' },
  'ไม่สแกนเช้า':    { free: 3, deduct: -2,  label: 'ไม่สแกนกลับบ้าน' },
}

export async function GET(req: NextRequest) {
  // ตรวจสอบ secret key
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET && secret !== 'bhp-cron-2026')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sheetId = process.env.DEFAULT_SHEET_URL?.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1]
  if (!sheetId) return NextResponse.json({ error: 'no sheetId' }, { status: 500 })

  const token = await getSAToken()
  if (!token) return NextResponse.json({ error: 'no token' }, { status: 500 })

  const sem = parseInt(process.env.CURRENT_SEMESTER || '1') as 1 | 2

  const today      = new Date(Date.now() + 7*60*60*1000).toISOString().slice(0,10)
  // ประเมินของ "เมื่อวาน" เพราะวันนี้ยังไม่จบวัน สแกนอาจยังไม่ครบ
  const targetDate = new Date(Date.now() + 7*60*60*1000 - 86400000).toISOString().slice(0,10)

  // ตรวจวันหยุด — ใช้ AcademicCalendar ผ่าน lib/sheets.ts (normalize date format ให้แล้ว)
  // และข้ามเสาร์-อาทิตย์ด้วย เพราะ cron รันเฉพาะจันทร์-ศุกร์ วันจันทร์ "เมื่อวาน" จะตกเป็นวันอาทิตย์เสมอ
  const calendar    = await getCalendarData(token, sheetId, sem)
  const targetDow   = new Date(targetDate + 'T00:00:00Z').getUTCDay()
  const isWeekend   = targetDow === 0 || targetDow === 6
  const isHoliday   = calendar.holidays.has(targetDate)
  const isForcedOpen = calendar.schoolOpenDays.has(targetDate)
  if (!isForcedOpen && (isWeekend || isHoliday)) {
    return NextResponse.json({ skipped: true, reason: isWeekend ? 'weekend' : 'holiday', date: targetDate })
  }

  // ดึงข้อมูล
  const [checkin, students, scores, logs] = await Promise.all([
    fetchTab(sheetId, `Checkin_เทอม${sem}`, token),
    getAllStudents(token, sheetId),
    fetchTab(sheetId, 'Behavior_Scores', token),
    fetchTab(sheetId, 'Behavior_Logs', token),
  ])

  // เฉพาะ record ของวันที่ประเมิน (เมื่อวาน)
  const dayRecords = checkin.filter((r: any) => r.timestamp?.slice(0,10) === targetDate)

  // สร้าง map สถานะรายคนสำหรับวันที่ประเมิน
  const studentStatus: Record<string, Set<string>> = {}
  const addStatus = (sid: string, status: string) => {
    if (!sid) return
    if (!studentStatus[sid]) studentStatus[sid] = new Set()
    studentStatus[sid].add(status)
  }

  // มาสาย — จากสถานะจริงที่บันทึกไว้
  dayRecords
    .filter((r: any) => r.status === 'มาสาย')
    .forEach((r: any) => addStatus(r.student_id, 'มาสาย'))

  // ขาด — นักเรียนทั้งหมดที่ไม่มี record เลยในวันนั้น (เทียบรายชื่อทั้งหมดกับคนที่สแกน)
  const scannedIds = new Set(dayRecords.map((r: any) => r.student_id))
  students.forEach(s => {
    if (!scannedIds.has(s.student_id)) addStatus(s.student_id, 'ขาด')
  })

  // ไม่สแกนเช้า — มี record "กลับบ้าน" แต่ไม่มี record ช่วงเช้า (สถานะอื่นที่ไม่ใช่กลับบ้าน) ในวันนั้น
  const morningIds = new Set(dayRecords.filter((r: any) => r.status !== 'กลับบ้าน').map((r: any) => r.student_id))
  const homeIds     = new Set(dayRecords.filter((r: any) => r.status === 'กลับบ้าน').map((r: any) => r.student_id))
  homeIds.forEach(sid => {
    if (!morningIds.has(sid)) addStatus(sid, 'ไม่สแกนเช้า')
  })

  // isAlreadyProcessed — ตรวจว่าหักแล้วหรือยัง (กันรัน cron ซ้ำวันเดียวกัน)
  const processedSet = new Set(
    logs
      .filter((l: any) => l.timestamp?.slice(0,10) === today && l.rule_name?.includes('อัตโนมัติ'))
      .map((l: any) => l.student_id)
  )

  const newLogs: string[][] = []
  const scoreUpdates: { id: string; delta: number }[] = []

  for (const [sid, statusSet] of Object.entries(studentStatus)) {
    if (processedSet.has(sid)) continue // ข้ามถ้าหักแล้ว

    for (const [status, quota] of Object.entries(QUOTA)) {
      if (!statusSet.has(status)) continue

      // นับจำนวนครั้งที่ผ่านมา
      const prevCount = logs.filter((l: any) =>
        l.student_id === sid && l.rule_name === quota.label
      ).length

      const now = new Date(Date.now() + 7*60*60*1000).toISOString().replace('T',' ').slice(0,19)

      if (prevCount < quota.free) {
        // ยังอยู่ในโควตา — บันทึกเป็นการตักเตือน (คะแนนไม่ลด)
        newLogs.push([now, sid, `${quota.label} (ตักเตือนครั้งที่ ${prevCount+1}) อัตโนมัติ`, '0', `โควตา ${prevCount+1}/${quota.free}`, '', 'system'])
      } else {
        // เกินโควตา — หักคะแนน
        newLogs.push([now, sid, `${quota.label} (ครั้งที่ ${prevCount+1}) อัตโนมัติ`, String(quota.deduct), '', '', 'system'])
        scoreUpdates.push({ id: sid, delta: quota.deduct })
      }
    }
  }

  // บันทึก logs
  if (newLogs.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Behavior_Logs')}!A:G:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: newLogs }),
    })
  }

  // อัพเดตคะแนน
  for (const { id, delta } of scoreUpdates) {
    const scoreRow = scores.find((s: any) => s.student_id === id)
    if (!scoreRow) continue
    const newScore = Math.max(0, Math.min(100, (parseInt(scoreRow.score) || 100) + delta))
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Behavior_Scores')}!G${scoreRow._row}?valueInputOption=RAW`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [[String(newScore)]] }),
    })
  }

  return NextResponse.json({
    success: true, date: targetDate,
    processed: Object.keys(studentStatus).length,
    logs: newLogs.length,
    deductions: scoreUpdates.length,
  })
}
