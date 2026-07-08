import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCheckinRange, getTodayThai } from '@/lib/sheets'

export const revalidate = 0

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sid = req.nextUrl.searchParams.get('studentId') || session.studentId
  if (session.role === 'student' && sid !== session.studentId)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sheetId = session.sheetId
  const end     = getTodayThai()
  const startD  = new Date(Date.now() + 7*60*60*1000)
  startD.setUTCDate(startD.getUTCDate() - 90)
  const startStr = startD.toISOString().slice(0, 10)

  const token = (session as any).access_token || ''
  const all   = await getCheckinRange(token, sheetId, startStr, end, 1)
  const records = all.filter(r => r.student_id === sid)

  const present = records.filter(r => r.status === 'มาเรียนปกติ').length
  const late    = records.filter(r => r.status === 'มาสาย').length
  const leave   = records.filter(r => r.status === 'กลับบ้าน').length

  return NextResponse.json({
    records: records.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    stats: { present, late, leave, total: present + late },
  })
}
