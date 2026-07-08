export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCheckinRange, getAllStudents, getTodayThai, getCalendarData, countSchoolDays } from '@/lib/sheets'
import GradeRoomFilter from '@/components/GradeRoomFilter'

export default async function AbsentPage({
  searchParams
}: {
  searchParams: { grade?: string; classroom?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const token   = (session as any).access_token || 'public'
  const sheetId = session.sheetId
  const sem     = parseInt(process.env.CURRENT_SEMESTER || '1') as 1|2
  const selGrade = session.role === 'teacher' ? session.grade     : (searchParams.grade || '')
  const selRoom  = session.role === 'teacher' ? session.classroom : (searchParams.classroom || '')

  const end      = getTodayThai()
  // ใช้วันเปิดเทอมจาก AcademicCalendar
  const calendar = sheetId ? await getCalendarData(token, sheetId, sem) : null
  const startStr = calendar?.semesterStart || end

  let absentStats: any[] = []
  let grades: string[]   = []
  let rooms: string[]    = []

  if (sheetId) {
    const [records, students] = await Promise.all([
      getCheckinRange(token, sheetId, startStr, end, sem),
      getAllStudents(token, sheetId),
    ])

    grades = Array.from(new Set(students.map(s => s.grade))).sort()
    rooms  = Array.from(new Set(
      students.filter(s => !selGrade || s.grade === selGrade).map(s => s.classroom)
    )).sort((a, b) => parseInt(a) - parseInt(b))

    const schoolDays = countSchoolDays(startStr, end, calendar?.holidays || new Set(), calendar?.schoolOpenDays || new Set()).length

    const filteredStudents = students.filter(st =>
      (!selGrade || st.grade === selGrade) &&
      (!selRoom  || st.classroom === selRoom)
    )

    absentStats = filteredStudents.map(st => {
      const recs = records.filter(r =>
        r.student_id === st.student_id &&
        (!selGrade || r.grade === selGrade) &&
        (!selRoom  || r.classroom === selRoom)
      )
      const daysWithRecord = new Set(
        recs
          .filter(r => r.status !== 'กลับบ้าน')
          .map(r => r.timestamp.slice(0, 10))
      ).size
      const absentDays = Math.max(0, schoolDays - daysWithRecord)
      return {
        student_id: st.student_id,
        name: `${st.prefix}${st.fname} ${st.lname}`,
        grade: st.grade, classroom: st.classroom, number: st.number,
        absentDays,
        absentRate: schoolDays > 0 ? Math.round((absentDays / schoolDays) * 100) : 0,
        lateDays:   recs.filter(r => r.status === 'มาสาย').length,
        presentDays: recs.filter(r => r.status === 'มาเรียนปกติ').length,
      }
    })
    .filter(s => s.absentDays >= 3 || s.lateDays >= 3)
    .sort((a, b) => b.absentDays - a.absentDays)
  }

  const levelColor = (days: number) =>
    days >= 10 ? '#e74c3c' : days >= 5 ? '#f39c12' : '#8b949e'


  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>⚠️ นักเรียนขาดบ่อย</h1>
      <p style={{ color: '#8b949e', fontSize: 13, marginBottom: '1.25rem' }}>ขาด/สาย 3 วันขึ้นไปตั้งแต่เปิดเทอม</p>

      {/* Filter */}
      {session.role !== 'teacher' && (
        <GradeRoomFilter grades={grades} rooms={rooms} selGrade={selGrade} selRoom={selRoom} basePath="/teacher/absent" />
      )}

      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, overflow: 'hidden' }}>
        {absentStats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#2ecc71', fontSize: 16 }}>🎉 ไม่มีนักเรียนที่ขาดบ่อย</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #30363d', background: '#0d1117' }}>
                {['เลขที่','ชื่อ-สกุล','ชั้น/ห้อง','ขาด','อัตราขาด','สาย','มาปกติ'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#8b949e', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {absentStats.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #21262d' }}>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>{s.number}</td>
                  <td style={{ padding: '10px 16px', color: '#e6edf3' }}>{s.name}</td>
                  <td style={{ padding: '10px 16px', color: '#8b949e' }}>{s.grade}/{s.classroom}</td>
                  <td style={{ padding: '10px 16px', color: levelColor(s.absentDays), fontWeight: 600 }}>{s.absentDays}</td>
                  <td style={{ padding: '10px 16px', color: levelColor(s.absentDays) }}>{s.absentRate}%</td>
                  <td style={{ padding: '10px 16px', color: '#f39c12' }}>{s.lateDays}</td>
                  <td style={{ padding: '10px 16px', color: '#2ecc71' }}>{s.presentDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
