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

  const token   = (session as any).access_token || 'public'
  const sheetId = session.sheetId
  const sem     = parseInt(process.env.CURRENT_SEMESTER || '1') as 1|2

  if (!sheetId) return { error: 'ไม่พบ Sheet ID กรุณา login ใหม่' }

  const [records, students] = await Promise.all([
    getCheckinToday(token, sheetId, sem),
    getAllStudents(token, sheetId),
  ])

  // filter เฉพาะห้องครู
  const filtered      = records.filter(r => r.grade === session.grade && r.classroom === session.classroom)
  const classStudents = students.filter(s => s.grade === session.grade && s.classroom === session.classroom)

  const stats = calcStats(filtered, classStudents.length)

  // คำนวณนักเรียนขาด/ไม่สแกนเช้า
  const scannedAtAll  = new Set(filtered.map(r => r.student_id))
  const morningIds    = new Set(filtered.filter(r => r.status !== 'กลับบ้าน').map(r => r.student_id))
  const homeIds       = new Set(filtered.filter(r => r.status === 'กลับบ้าน').map(r => r.student_id))

  const absentStudents    = classStudents.filter(s => !scannedAtAll.has(s.student_id))
  const noMorningScanStu  = classStudents.filter(s => homeIds.has(s.student_id) && !morningIds.has(s.student_id))

  // weekly
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() + 7*60*60*1000)
    d.setUTCDate(d.getUTCDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const weekday = d.getUTCDay()
    if (weekday === 0 || weekday === 6) {
      days.push({ date: dateStr, weekday, isWeekend: true, present: 0, late: 0, absent: 0, total: 0 })
      continue
    }
    const recs = await getCheckinRange(token, sheetId, dateStr, dateStr, sem)
    const fil  = recs.filter(r => r.grade === session.grade && r.classroom === session.classroom)
    const s    = calcStats(fil, classStudents.length)
    days.push({ date: dateStr, weekday, isWeekend: false, ...s })
  }

  return {
    stats, recent: filtered.slice(-10).reverse(), days,
    absentStudents, noMorningScanStu, classStudents,
    grade: session.grade, classroom: session.classroom,
  }
}

const STATUS_COLOR: Record<string, string> = {
  'มาเรียนปกติ': '#2ecc71', 'มาสาย': '#f39c12',
  'กลับบ้าน': '#3498db', 'ลากิจ': '#3498db',
  'ลาป่วย': '#9b59b6', 'ไม่สแกนเช้า': '#e67e22', 'ขาด': '#e74c3c',
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  if (!data) redirect('/login')
  if ((data as any).error) return <>{(data as any).error}</>

  const { stats, recent, days, absentStudents, noMorningScanStu, classStudents, grade, classroom } = data as any

  const statCards = [
    { label: 'มาปกติ',          value: stats.present,          color: '#2ecc71', bg: '#0a3a1a' },
    { label: 'มาสาย',           value: stats.late,             color: '#f39c12', bg: '#3c2d00' },
    { label: 'ขาดเรียน',        value: stats.absent,           color: '#e74c3c', bg: '#3c1a1a' },
    { label: 'กลับบ้าน',        value: stats.leave,            color: '#3498db', bg: '#0a2a4a' },
    { label: 'ไม่สแกนเช้า',    value: stats.noMorningScan || 0, color: '#e67e22', bg: '#3a1f00' },
    { label: 'ลา',               value: stats.leaveCount || 0, color: '#9b59b6', bg: '#2d1a40' },
    { label: 'นักเรียนทั้งหมด', value: stats.total,           color: '#8b949e', bg: '#21262d' },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#e6edf3' }}>ภาพรวมวันนี้</h1>
          <p style={{ color: '#8b949e', fontSize: 14, marginTop: 4 }}>
            ชั้น {grade} ห้อง {classroom} · {getTodayThai().split('-').reverse().join('/')}
          </p>
        </div>
        <ClientTime />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1rem' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
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

      {/* นักเรียนขาดวันนี้ */}
      {absentStudents.length > 0 && (
        <div style={{ background: '#161b22', border: '1px solid #e74c3c44', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e74c3c', marginBottom: '1rem' }}>
            ❌ ขาดเรียนวันนี้ ({absentStudents.length} คน)
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {absentStudents
              .sort((a: any, b: any) => parseInt(a.number) - parseInt(b.number))
              .map((s: any) => (
                <div key={s.student_id} style={{
                  background: '#e74c3c15', border: '1px solid #e74c3c33',
                  borderRadius: 8, padding: '6px 12px', fontSize: 13,
                }}>
                  <span style={{ color: '#6e7681', marginRight: 6 }}>{s.number}</span>
                  <span style={{ color: '#e6edf3' }}>{s.prefix}{s.fname} {s.lname}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ไม่สแกนเช้า */}
      {noMorningScanStu.length > 0 && (
        <div style={{ background: '#161b22', border: '1px solid #e67e2244', borderRadius: 12, padding: '1.25rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e67e22', marginBottom: '1rem' }}>
            ⚠️ ไม่สแกนเช้า ({noMorningScanStu.length} คน)
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {noMorningScanStu
              .sort((a: any, b: any) => parseInt(a.number) - parseInt(b.number))
              .map((s: any) => (
                <div key={s.student_id} style={{
                  background: '#e67e2215', border: '1px solid #e67e2233',
                  borderRadius: 8, padding: '6px 12px', fontSize: 13,
                }}>
                  <span style={{ color: '#6e7681', marginRight: 6 }}>{s.number}</span>
                  <span style={{ color: '#e6edf3' }}>{s.prefix}{s.fname} {s.lname}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  )
}
