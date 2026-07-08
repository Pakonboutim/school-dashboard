export const dynamic = 'force-dynamic'

import FilterBar from '@/components/FilterBar'
import PhotoGrid from '@/components/PhotoGrid'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCheckinRange, getAllStudents, calcStats, getTodayThai, getCalendarData } from '@/lib/sheets'

export default async function HistoryPage({
  searchParams
}: {
  searchParams: { date?: string; grade?: string; classroom?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const token   = (session as any).access_token || 'public'
  const sheetId = session.sheetId
  const sem     = parseInt(process.env.CURRENT_SEMESTER || '1') as 1|2
  const today   = getTodayThai()
  const selDate  = searchParams.date || today
  const selGrade = session.role === 'teacher' ? session.grade     : (searchParams.grade || '')
  const selRoom  = session.role === 'teacher' ? session.classroom : (searchParams.classroom || '')

  const DAYS = ['อา','จ','อ','พ','พฤ','ศ','ส']
  const calendar = sheetId ? await getCalendarData(token, sheetId, sem) : null
  const startStr = calendar?.semesterStart || getTodayThai()

  let dailySummary: any[] = []
  let dayRecords: any[]   = []
  let grades: string[]    = []
  let rooms: string[]     = []

  if (sheetId) {
    const [allRecords, students] = await Promise.all([
      getCheckinRange(token, sheetId, startStr, today, sem),
      getAllStudents(token, sheetId),
    ])

    grades = Array.from(new Set(students.map(s => s.grade))).sort()
    rooms  = Array.from(new Set(
      students.filter(s => !selGrade || s.grade === selGrade).map(s => s.classroom)
    )).sort((a, b) => parseInt(a) - parseInt(b))

    // วันย้อนหลัง
    const s = new Date(startStr), e = new Date(today)
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) continue
      const ds   = d.toISOString().slice(0, 10)
      const recs = allRecords.filter(r =>
        r.timestamp.startsWith(ds) &&
        (!selGrade || r.grade === selGrade) &&
        (!selRoom  || r.classroom === selRoom)
      )
      const filtStu = students.filter(s =>
        (!selGrade || s.grade === selGrade) &&
        (!selRoom  || s.classroom === selRoom)
      )
      const stats = calcStats(recs, filtStu.length)
      const label = new Date(ds + 'T00:00:00+07:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
      const leaveCountDay = new Set(recs.filter(r => r.status === 'ลากิจ' || r.status === 'ลาป่วย').map(r => r.student_id)).size
      dailySummary.push({ date: ds, weekday: DAYS[new Date(ds).getDay()], label, ...stats, leaveCount: leaveCountDay })
    }
    dailySummary.reverse()

    // วันที่เลือก
    const selected  = allRecords.filter(r =>
      r.timestamp.startsWith(selDate) &&
      (!selGrade || r.grade === selGrade) &&
      (!selRoom  || r.classroom === selRoom)
    )
    const filtStu   = students.filter(s =>
      (!selGrade || s.grade === selGrade) &&
      (!selRoom  || s.classroom === selRoom)
    )
    const morningScanned = new Set(
      selected
        .filter(r => r.status !== 'กลับบ้าน')
        .map(r => r.student_id)
    )
    const scannedAtAll = new Set(selected.map(r => r.student_id))
    const homeScanned  = new Set(selected.filter(r => r.status === 'กลับบ้าน').map(r => r.student_id))

    // ไม่สแกนเช้า = มี record กลับบ้าน แต่ไม่มี record เช้า (ไม่ใช่ขาด — มาโรงเรียนแล้ว)
    const noMorningScan = filtStu.filter(s => homeScanned.has(s.student_id) && !morningScanned.has(s.student_id))
    // ขาด = ไม่มี record ใดๆ เลยในวันนั้น
    const absent = filtStu.filter(s => !scannedAtAll.has(s.student_id))

    dayRecords = [
      ...selected.map(r => ({
        student_id: r.student_id, name: `${r.prefix}${r.fname} ${r.lname}`,
        grade: r.grade, classroom: r.classroom, number: r.number,
        status: r.status, time: r.time, image_url: r.image_url || '', note: r.note || '',
      })),
      ...noMorningScan.map(s => ({
        student_id: s.student_id, name: `${s.prefix}${s.fname} ${s.lname}`,
        grade: s.grade, classroom: s.classroom, number: s.number,
        status: 'ไม่สแกนเช้า', time: '-', image_url: '', note: '',
      })),
      ...absent.map(s => ({
        student_id: s.student_id, name: `${s.prefix}${s.fname} ${s.lname}`,
        grade: s.grade, classroom: s.classroom, number: s.number,
        status: 'ขาด', time: '-', image_url: '', note: '',
      })),
    ].sort((a, b) =>
      a.grade.localeCompare(b.grade) ||
      a.classroom.localeCompare(b.classroom) ||
      parseInt(a.number) - parseInt(b.number)
    )
  }

  const stats = {
    present:      dayRecords.filter(r => r.status === 'มาเรียนปกติ').length,
    late:         dayRecords.filter(r => r.status === 'มาสาย').length,
    leave:        dayRecords.filter(r => r.status === 'กลับบ้าน').length,
    absent:       dayRecords.filter(r => r.status === 'ขาด').length,
    noMorningScan: dayRecords.filter(r => r.status === 'ไม่สแกนเช้า').length,
    leaveCount:   new Set(dayRecords.filter(r => r.status === 'ลากิจ' || r.status === 'ลาป่วย').map(r => r.student_id)).size,
  }

  return (
    <>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#e6edf3' }}>📋 ประวัติการเข้าเรียน</h1>
        <p style={{ color: '#8b949e', fontSize: 13, marginTop: 4 }}>ตั้งแต่เปิดเทอม</p>
      </div>

      <FilterBar grades={grades} rooms={rooms} selGrade={selGrade} selRoom={selRoom} selDate={selDate} basePath="/admin/history" showDate={true} showGradeRoom={session.role !== 'teacher'} />

      {session.role !== 'teacher' && (!selGrade || !selRoom) ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#161b22', border: '1px solid #30363d', borderRadius: 12, color: '#8b949e' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏫</div>
          <div style={{ fontSize: 16, color: '#e6edf3', marginBottom: 8 }}>เลือกชั้นและห้องเรียน</div>
          <div style={{ fontSize: 13 }}>กรุณาเลือกชั้นและห้องด้านบนเพื่อดูประวัติการเข้าเรียน</div>
        </div>
      ) : (

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1.25rem' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3', marginBottom: '1rem' }}>{selDate}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
              {[
                { label: 'มาปกติ',      val: stats.present,       color: '#2ecc71' },
                { label: 'มาสาย',       val: stats.late,          color: '#f39c12' },
                { label: 'กลับบ้าน',    val: stats.leave,         color: '#3498db' },
                { label: 'ไม่สแกนเช้า', val: stats.noMorningScan, color: '#e67e22' },
                { label: 'ขาด',        val: stats.absent,         color: '#e74c3c' },
                { label: 'ลา',          val: stats.leaveCount,    color: '#9b59b6' },
              ].map(s => (
                <div key={s.label} style={{ background: s.color + '22', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <PhotoGrid records={dayRecords} />
      </div>
      )}
    </>
  )
}
