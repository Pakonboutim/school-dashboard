export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCheckinToday, getAllStudents, calcStats, getCheckinRange, getTodayThai } from '@/lib/sheets'
import WeeklyChart from '@/components/WeeklyChart'
import ClientTime from '@/components/ClientTime'
import RecentScans from '@/components/RecentScans'
import { redirect } from 'next/navigation'

async function getDashboardData() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  // student ให้ไปหน้าของตัวเอง — layout จัดการแล้ว
  const token   = (session as any).access_token || 'public'
  const sheetId = session.sheetId
  const sem     = parseInt(process.env.CURRENT_SEMESTER || '1') as 1|2

  if (!sheetId) return { error: 'ไม่พบ Sheet ID กรุณา login ใหม่' }

  const [records, students] = await Promise.all([
    getCheckinToday(token, sheetId, sem),
    getAllStudents(token, sheetId),
  ])

  // filter ตาม role
  let filtered = records
  if (session.role === 'teacher') {
    filtered = records.filter(r => r.grade === session.grade && r.classroom === session.classroom)
  }

  const classStudents = students.filter(s => !session.grade || (s.grade === session.grade && s.classroom === session.classroom))
  const stats = calcStats(filtered, session.role === 'teacher' ? classStudents.length : students.length)

  // class summary
  const classMap = new Map<string, typeof records>()
  filtered.forEach(r => {
    const k = `${r.grade}/${r.classroom}`
    if (!classMap.has(k)) classMap.set(k, [])
    classMap.get(k)!.push(r)
  })
  const classSummary = Array.from(classMap.entries()).map(([key, recs]) => ({
    key, grade: recs[0].grade, classroom: recs[0].classroom,
    present: recs.filter(r => r.status === 'มาเรียนปกติ').length,
    late:    recs.filter(r => r.status === 'มาสาย').length,
    leave:   recs.filter(r => r.status === 'กลับบ้าน').length,
  }))

  // weekly
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() + 7*60*60*1000)
    d.setUTCDate(d.getUTCDate() - i)
    const dateStr  = d.toISOString().slice(0, 10)
    const weekday  = d.getUTCDay()
    if (weekday === 0 || weekday === 6) {
      days.push({ date: dateStr, weekday, isWeekend: true, present: 0, late: 0, absent: 0, total: 0 })
      continue
    }
    const recs = await getCheckinRange(token, sheetId, dateStr, dateStr, sem)
    const fil  = session.role === 'teacher'
      ? recs.filter(r => r.grade === session.grade && r.classroom === session.classroom)
      : recs
    const s = calcStats(fil, session.role === 'teacher' ? classStudents.length : students.length)
    days.push({ date: dateStr, weekday, isWeekend: false, ...s })
  }

  return { stats, classSummary, recent: filtered.slice(-10).reverse(), days, sheetId }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  if (!data) redirect('/login')
  if ((data as any).redirect) redirect((data as any).redirect)

  if ((data as any).error) return (
    <>{(data as any).error}</>
  )

  const { stats, classSummary, recent, days } = data as any

  const statCards = [
    { label: 'มาปกติ',      value: stats.present,        color: '#2ecc71', bg: '#0a3a1a' },
    { label: 'มาสาย',       value: stats.late,            color: '#f39c12', bg: '#3c2d00' },
    { label: 'ขาดเรียน',    value: stats.absent,          color: '#e74c3c', bg: '#3c1a1a' },
    { label: 'กลับบ้าน',    value: stats.leave,           color: '#3498db', bg: '#0a2a4a' },
    { label: 'ไม่สแกนเช้า', value: stats.noMorningScan,   color: '#e67e22', bg: '#3a1f00' },
    { label: 'ลา',           value: stats.leaveCount || 0, color: '#9b59b6', bg: '#2d1a40' },
    { label: 'นักเรียนทั้งหมด', value: stats.total,        color: '#8b949e', bg: '#21262d' },
  ]

  return (
    <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: '#e6edf3' }}>ภาพรวมวันนี้</h1>
            <p style={{ color: '#8b949e', fontSize: 14, marginTop: 4 }}>{getTodayThai().split('-').reverse().join('/')}</p>
          </div>
          <ClientTime />
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: '1.5rem' } as any}>
          {statCards.map(s => (
            <div key={s.label} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1rem' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className='dashboard-grid' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Weekly Chart */}
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1.25rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e6edf3', marginBottom: '1rem' }}>📈 แนวโน้ม 7 วัน</h2>
            <WeeklyChart days={days} />
          </div>

          {/* Recent */}
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1.25rem' }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e6edf3', marginBottom: '1rem' }}>⏱️ สแกนล่าสุด</h2>
            <RecentScans records={recent} />
          </div>
        </div>
      </>
  )
}
