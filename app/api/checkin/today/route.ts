import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCheckinToday, getAllStudents, calcStats, getTodayThai } from '@/lib/sheets'

export const revalidate = 0

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token    = (session as any).access_token || 'public'
  const sheetId  = session.sheetId
  const sem      = parseInt(process.env.CURRENT_SEMESTER || '1') as 1|2

  if (!sheetId) return NextResponse.json({ error: 'ไม่พบ Sheet ID' }, { status: 400 })

  const [checkins, students] = await Promise.all([
    getCheckinToday(token, sheetId, sem),
    getAllStudents(token, sheetId),
  ])

  // filter ตาม role
  let filtered = checkins
  if (session.role === 'teacher') {
    filtered = checkins.filter(r => r.grade === session.grade && r.classroom === session.classroom)
  } else if (session.role === 'student') {
    filtered = checkins.filter(r => r.student_id === session.studentId)
  }

  const stats = calcStats(filtered, session.role === 'admin' ? students.length : filtered.length)

  return NextResponse.json({ stats, sheetId, today: getTodayThai() })
}
