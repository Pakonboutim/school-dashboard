export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCheckinToday, getAllStudents, calcStats, getTodayThai } from '@/lib/sheets'
import GradeRoomFilter from '@/components/GradeRoomFilter'

export default async function ClassPage({
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

  let classData: any[] = []
  let grades: string[] = []
  let rooms: string[]  = []

  if (sheetId) {
    const [records, students] = await Promise.all([
      getCheckinToday(token, sheetId, sem),
      getAllStudents(token, sheetId),
    ])

    grades = Array.from(new Set(students.map(s => s.grade))).sort()
    rooms  = Array.from(new Set(
      students.filter(s => !selGrade || s.grade === selGrade).map(s => s.classroom)
    )).sort((a, b) => parseInt(a) - parseInt(b))

    const filteredStudents = students.filter(s =>
      (!selGrade || s.grade === selGrade) &&
      (!selRoom  || s.classroom === selRoom)
    )
    const filteredRecords = records.filter(r =>
      (!selGrade || r.grade === selGrade) &&
      (!selRoom  || r.classroom === selRoom)
    )

    const classMap = new Map<string, any>()
    filteredStudents.forEach(s => {
      const key = `${s.grade}/${s.classroom}`
      if (!classMap.has(key)) classMap.set(key, { grade: s.grade, classroom: s.classroom, students: [] })
      const studentRecs = filteredRecords.filter(r => r.student_id === s.student_id)
      const morningRec  = studentRecs.find(r => r.status !== 'กลับบ้าน')
      const homeRec     = studentRecs.find(r => r.status === 'กลับบ้าน')

      let status: string, time: string
      if (studentRecs.length === 0) {
        status = 'ขาด'; time = '-'
      } else if (homeRec && !morningRec) {
        status = 'ไม่สแกนเช้า'; time = homeRec.time
      } else {
        status = morningRec!.status; time = morningRec!.time
      }

      classMap.get(key).students.push({
        name: `${s.prefix}${s.fname} ${s.lname}`,
        number: s.number,
        status, time,
      })
    })

    classData = Array.from(classMap.values()).map(cls => {
      const stats = calcStats(
        filteredRecords.filter(r => r.grade === cls.grade && r.classroom === cls.classroom),
        cls.students.length
      )
      return { ...cls, ...stats }
    })
  }

  const STATUS_COLOR: Record<string, string> = {
    'มาเรียนปกติ': '#2ecc71',
    'มาสาย':       '#f39c12',
    'กลับบ้าน':    '#3498db',
    'ลากิจ':        '#3498db',
    'ลาป่วย':       '#9b59b6',
    'ไม่สแกนเช้า':  '#e67e22',
    'ขาด':         '#e74c3c',
  }
  const statusColor = (s: string) => STATUS_COLOR[s] || '#e74c3c'


  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>🏫 รายชั้น/ห้อง</h1>
      <p style={{ color: '#8b949e', fontSize: 13, marginBottom: '1.25rem' }}>วันนี้ {getTodayThai()}</p>

      {/* Filter */}
      {session.role !== 'teacher' && (
        <GradeRoomFilter grades={grades} rooms={rooms} selGrade={selGrade} selRoom={selRoom} basePath="/teacher/class" />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {classData.length === 0 && (
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '2rem', textAlign: 'center', color: '#8b949e' }}>
            ไม่มีข้อมูล
          </div>
        )}
        {classData.map(cls => (
          <div key={`${cls.grade}/${cls.classroom}`} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3' }}>{cls.grade} ห้อง {cls.classroom}</div>
                <div style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }}>นักเรียน {cls.students.length} คน</div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                <span style={{ color: '#2ecc71' }}>✅ {cls.present}</span>
                <span style={{ color: '#f39c12' }}>⏰ {cls.late}</span>
                <span style={{ color: '#3498db' }}>🏠 {cls.leave}</span>
                <span style={{ color: '#e74c3c' }}>❌ {cls.absent}</span>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #21262d' }}>
                  {['เลขที่','ชื่อ-สกุล','สถานะ','เวลา'].map(h => (
                    <th key={h} style={{ padding: '8px 16px', textAlign: 'left', color: '#8b949e', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cls.students
                  .sort((a: any, b: any) => parseInt(a.number) - parseInt(b.number))
                  .map((s: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '8px 16px', color: '#8b949e' }}>{s.number}</td>
                    <td style={{ padding: '8px 16px', color: '#e6edf3' }}>{s.name}</td>
                    <td style={{ padding: '8px 16px' }}>
                      <span style={{
                        fontSize: 12, padding: '2px 8px', borderRadius: 20,
                        background: statusColor(s.status) + '22', color: statusColor(s.status),
                      }}>{s.status}</span>
                    </td>
                    <td style={{ padding: '8px 16px', color: '#8b949e' }}>{s.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </>
  )
}
