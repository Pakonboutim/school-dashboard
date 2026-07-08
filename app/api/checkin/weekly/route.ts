import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { findSchoolSheet, getCheckinRange, getAllStudents, calcStats, getTodayThai } from '@/lib/sheets'

export const revalidate = 0

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.access_token)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token   = session.access_token
  const sem     = parseInt(process.env.CURRENT_SEMESTER || '1') as 1|2
  const sheetId = await findSchoolSheet(token)
  if (!sheetId) return NextResponse.json({ days: [] })

  const students = await getAllStudents(token, sheetId)
  const days = []

  for (let i = 6; i >= 0; i--) {
    // ใช้ timezone ไทย
    const d = new Date(Date.now() + 7 * 60 * 60 * 1000)
    d.setUTCDate(d.getUTCDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const weekday = d.getUTCDay()

    if (weekday === 0 || weekday === 6) {
      days.push({ date: dateStr, weekday, isWeekend: true, present: 0, late: 0, absent: 0, total: 0, presentPct: 0 })
      continue
    }
    const records = await getCheckinRange(token, sheetId, dateStr, dateStr, sem)
    const stats   = calcStats(records, students.length)
    days.push({ date: dateStr, weekday, isWeekend: false, ...stats })
  }

  return NextResponse.json({ days })
}
