export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCheckinRange, getCalendarData, countSchoolDays, getTodayThai, getAllStudents } from '@/lib/sheets'
import { redirect } from 'next/navigation'
import StudentClient from '@/components/StudentClient'

export default async function StudentPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const token   = (session as any).access_token || 'public'
  const sheetId = session.sheetId
  const sem     = parseInt(process.env.CURRENT_SEMESTER || '1') as 1|2
  const sid     = session.studentId
  const today   = getTodayThai()

  if (!sid) return (
    <div style={{ textAlign: 'center', color: '#f85149', padding: '2rem', fontFamily: 'Sarabun, sans-serif' }}>
      ไม่พบรหัสนักเรียน กรุณาติดต่อครู
    </div>
  )

  const [calendar, allStudents] = await Promise.all([
    sheetId ? getCalendarData(token, sheetId, sem) : Promise.resolve(null),
    sheetId ? getAllStudents(token, sheetId) : Promise.resolve([]),
  ])

  const start    = calendar?.semesterStart || today.slice(0, 7) + '-01'
  const semEnd   = calendar?.semesterEnd   || today
  // นับถึงวันนี้ถ้ายังไม่ถึงวันปิดเทอม
  const countEnd = semEnd < today ? semEnd : today
  const all      = sheetId ? await getCheckinRange(token, sheetId, start, today, sem) : []
  const records  = all
    .filter(r => r.student_id === sid)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))

  const schoolDays  = calendar
    ? countSchoolDays(start, countEnd, calendar.holidays, calendar.schoolOpenDays)
    : []
  const studentInfo = allStudents.find(s => s.student_id === sid)

  // นับ unique วันที่ (1 วัน = 1 ครั้ง)
  const morningRecs  = records.filter(r => r.status !== 'กลับบ้าน')
  const presentDays  = new Set(records.filter(r => r.status === 'มาเรียนปกติ').map(r => r.timestamp.slice(0,10)))
  const lateDays     = new Set(records.filter(r => r.status === 'มาสาย').map(r => r.timestamp.slice(0,10)))
  const leaveDays    = new Set(records.filter(r => r.status === 'ลากิจ' || r.status === 'ลาป่วย').map(r => r.timestamp.slice(0,10)))

  const present      = presentDays.size
  const late         = lateDays.size
  const leaveCount   = leaveDays.size
  const scannedDays  = new Set([...presentDays, ...lateDays, ...leaveDays])
  const scanned      = scannedDays.size
  const absent       = Math.max(0, schoolDays.length - scanned)
  const pct          = schoolDays.length > 0 ? Math.round((scanned / schoolDays.length) * 100) : 0

  // วันนี้
  const todayRecs  = records.filter(r => r.timestamp.startsWith(today))
  const todayMorn  = todayRecs.find(r => r.status !== 'กลับบ้าน')
  const todayHome  = todayRecs.find(r => r.status === 'กลับบ้าน')

  return (
    <StudentClient
      records={records}
      stats={{ present, late, leaveCount, absent, pct, total: schoolDays.length, scanned }}
      todayMorn={todayMorn || null}
      todayHome={todayHome || null}
      studentInfo={studentInfo || null}
      studentId={sid}
      grade={session.grade || ''}
      classroom={session.classroom || ''}
    />
  )
}
