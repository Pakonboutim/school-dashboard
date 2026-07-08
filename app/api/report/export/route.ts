import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCheckinRange, getAllStudents, getTodayThai, getCalendarData, countSchoolDays } from '@/lib/sheets'

export const revalidate = 0

function toCSV(rows: any[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ]
  return '\uFEFF' + lines.join('\n')
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.role === 'student')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const p         = req.nextUrl.searchParams
  const type      = p.get('type') || 'absent'
  const date      = p.get('date') || getTodayThai()
  const grade     = p.get('grade') || (session.role === 'teacher' ? session.grade : '')
  const classroom = p.get('classroom') || ''
  const isPreview = p.get('preview') === '1'
  const token     = (session as any).access_token || 'public'
  const sheetId   = session.sheetId
  const sem       = parseInt(process.env.CURRENT_SEMESTER || '1') as 1|2

  if (!sheetId) return NextResponse.json({ rows: [] })

  // กำหนดช่วงวันที่
  const isMonthly = type === 'monthly'
  const start     = isMonthly ? date.slice(0,7) + '-01' : date
  const end       = isMonthly
    ? new Date(parseInt(date.slice(0,4)), parseInt(date.slice(5,7)), 0).toISOString().slice(0,10)
    : date

  const [records, students] = await Promise.all([
    getCheckinRange(token, sheetId, start, end, sem),
    getAllStudents(token, sheetId),
  ])

  // filter ตาม grade/classroom — ถ้าไม่เลือกแสดงทั้งหมด
  let filteredStu = students
  if (grade) filteredStu = filteredStu.filter(s => s.grade === grade)
  if (classroom) filteredStu = filteredStu.filter(s => s.classroom === classroom)
  if (session.role === 'teacher') {
    filteredStu = filteredStu.filter(s => s.grade === session.grade && s.classroom === session.classroom)
  }

  let rows: any[] = []

  if (type === 'absent') {
    // นักเรียนขาด = ไม่มี record เช้า
    const dates = [...new Set(records.map(r => r.timestamp.slice(0,10)))]
    const targetDates = start === end ? [start] : dates
    for (const d of targetDates) {
      const dayRecs     = records.filter(r => r.timestamp.startsWith(d))
      const morningIds  = new Set(dayRecs.filter(r => r.status !== 'กลับบ้าน').map(r => r.student_id))
      const absentStu   = filteredStu.filter(s => !morningIds.has(s.student_id))
      absentStu.forEach(s => rows.push({
        วันที่: d, ชั้น: s.grade, ห้อง: s.classroom, เลขที่: s.number,
        ชื่อ: `${s.prefix}${s.fname} ${s.lname}`, สถานะ: 'ขาดเรียน'
      }))
    }
  } else if (type === 'not_home') {
    const targetDate = start
    const dayRecs    = records.filter(r => r.timestamp.startsWith(targetDate))
    const homeIds    = new Set(dayRecs.filter(r => r.status === 'กลับบ้าน').map(r => r.student_id))
    const morningIds = new Set(dayRecs.filter(r => r.status !== 'กลับบ้าน').map(r => r.student_id))
    const leaveAfternoonIds = new Set(dayRecs.filter(r =>
      (r.status === 'ลากิจ' || r.status === 'ลาป่วย') &&
      (r.note?.includes('ทั้งวัน') || r.note?.includes('ครึ่งวันบ่าย'))
    ).map(r => r.student_id))

    filteredStu
      .filter(s => !homeIds.has(s.student_id) && !leaveAfternoonIds.has(s.student_id))
      .forEach(s => {
        const didComeInMorning = morningIds.has(s.student_id)
        rows.push({
          วันที่: targetDate, ชั้น: s.grade, ห้อง: s.classroom, เลขที่: s.number,
          ชื่อ: `${s.prefix}${s.fname} ${s.lname}`,
          สถานะ: didComeInMorning ? 'มาแต่ไม่สแกนกลับ' : 'ขาดเรียน'
        })
      })
  } else if (type === 'late') {
    const seen = new Set<string>()
    records
      .filter(r => r.status === 'มาสาย' && r.timestamp.startsWith(start))
      .forEach(r => {
        const stu = filteredStu.find(s => s.student_id === r.student_id)
        if (!stu || seen.has(r.student_id)) return
        seen.add(r.student_id)
        rows.push({
          วันที่: r.timestamp.slice(0,10), ชั้น: stu.grade, ห้อง: stu.classroom,
          เลขที่: stu.number, ชื่อ: `${stu.prefix}${stu.fname} ${stu.lname}`,
          เวลา: r.time?.slice(0,5) || '-'
        })
      })
  } else if (type === 'leave') {
    const seen = new Set<string>()
    records
      .filter(r => (r.status === 'ลากิจ' || r.status === 'ลาป่วย') && r.timestamp.startsWith(start))
      .forEach(r => {
        const key = `${r.student_id}_${r.timestamp.slice(0,10)}`
        if (seen.has(key)) return; seen.add(key)
        const stu = filteredStu.find(s => s.student_id === r.student_id)
        if (!stu) return
        rows.push({
          วันที่: r.timestamp.slice(0,10), ชั้น: stu.grade, ห้อง: stu.classroom,
          เลขที่: stu.number, ชื่อ: `${stu.prefix}${stu.fname} ${stu.lname}`,
          ประเภท: r.status, หมายเหตุ: r.note || ''
        })
      })
  } else if (type === 'monthly') {
    // รายงานรายเดือน — รายคน
    const calendar   = await getCalendarData(token, sheetId, sem)
    const schoolDays = countSchoolDays(start, end, calendar.holidays, calendar.schoolOpenDays)
    const totalDays  = schoolDays.length

    filteredStu.forEach(s => {
      const stuRecs     = records.filter(r => r.student_id === s.student_id)
      const presentDays = new Set(stuRecs.filter(r => r.status === 'มาเรียนปกติ').map(r => r.timestamp.slice(0,10))).size
      const lateDays    = new Set(stuRecs.filter(r => r.status === 'มาสาย').map(r => r.timestamp.slice(0,10))).size
      const leaveDays   = new Set(stuRecs.filter(r => r.status === 'ลากิจ' || r.status === 'ลาป่วย').map(r => r.timestamp.slice(0,10))).size
      rows.push({
        ชั้น: s.grade, ห้อง: s.classroom, เลขที่: s.number,
        ชื่อ: `${s.prefix}${s.fname} ${s.lname}`,
        มาปกติ: presentDays, มาสาย: lateDays, ลา: leaveDays,
        ขาด: Math.max(0, totalDays - presentDays - lateDays - leaveDays),
      })
    })
  }

  // เรียงตามชั้น/ห้อง/เลขที่
  rows.sort((a, b) =>
    (a.ชั้น||'').localeCompare(b.ชั้น||'') ||
    parseInt(a.ห้อง||'0') - parseInt(b.ห้อง||'0') ||
    parseInt(a.เลขที่||'0') - parseInt(b.เลขที่||'0')
  )

  if (isPreview) return NextResponse.json({ rows })

  const csv = toCSV(rows)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="report.csv"`,
    }
  })
}
