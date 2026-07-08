import { google } from 'googleapis'

export interface CheckinRecord {
  timestamp: string
  student_id: string
  prefix: string
  fname: string
  lname: string
  grade: string
  classroom: string
  number: string
  status: string
  time: string
  image_url: string
  note?: string
}

export interface Student {
  student_id: string
  school_code: string
  prefix: string
  fname: string
  lname: string
  grade: string
  classroom: string
  number: string
  academic_year: string
  status: string
}

function getAuth(accessToken: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth2.setCredentials({ access_token: accessToken })
  return oauth2
}

// ค้นหา Sheet "เช็คชื่อ" ใน Drive ของครู
export async function findSchoolSheet(accessToken: string, sheetId?: string): Promise<string | null> {
  // ถ้ามี sheetId อยู่แล้ว (จาก session) ใช้เลย
  if (sheetId) return sheetId

  if (!accessToken || accessToken === 'public') return null
  try {
    const drive = google.drive({ version: 'v3', auth: getAuth(accessToken) })
    const res   = await drive.files.list({
      q: "name contains 'เช็คชื่อ' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: 'files(id,name)',
      orderBy: 'createdTime desc',
      pageSize: 5,
    })
    return res.data.files?.[0]?.id || null
  } catch (e) {
    console.error('[sheets] findSchoolSheet:', e)
    return null
  }
}

export async function listSchoolSheets(accessToken: string) {
  try {
    const drive = google.drive({ version: 'v3', auth: getAuth(accessToken) })
    const res   = await drive.files.list({
      q: "name contains 'เช็คชื่อ' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: 'files(id,name,createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 20,
    })
    return res.data.files || []
  } catch { return [] }
}

async function getRows(accessToken: string, sheetId: string, tab: string): Promise<string[][]> {
  // ถ้าไม่มี token ใช้ public CSV แทน
  if (!accessToken || accessToken === 'public') {
    return getRowsPublic(sheetId, tab)
  }
  try {
    const sheets = google.sheets({ version: 'v4', auth: getAuth(accessToken) })
    const res    = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tab}!A:M`,
    })
    return (res.data.values || []) as string[][]
  } catch (e) {
    console.error(`[sheets] getRows ${tab} OAuth failed, trying public:`, e)
    return getRowsPublic(sheetId, tab)
  }
}

async function getRowsPublic(sheetId: string, tab: string): Promise<string[][]> {
  try {
    const encoded = encodeURIComponent(tab)
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encoded}`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return []
    const text = await res.text()
    return text.trim().split('\n').map(line => {
      const cells: string[] = []
      let cur = '', inQ = false
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ }
        else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = '' }
        else cur += ch
      }
      cells.push(cur.trim())
      return cells
    })
  } catch (e) {
    console.error(`[sheets] getRowsPublic ${tab}:`, e)
    return []
  }
}

const HEADER_MAP: Record<string, string> = {
  'วันที่เวลา':    'timestamp',
  'timestamp':     'timestamp',
  'รหัสนักเรียน': 'student_id',
  'student_id':    'student_id',
  'คำนำหน้า':     'prefix',
  'prefix':        'prefix',
  'ชื่อ':          'fname',
  'fname':         'fname',
  'นามสกุล':      'lname',
  'lname':         'lname',
  'ห้องเรียน':    'grade',
  'grade':         'grade',
  'ชั้น':          'grade',
  'ห้อง':          'classroom',
  'classroom':     'classroom',
  'เลขที่':        'number',
  'number':        'number',
  'สถานะ':         'status',
  'status':        'status',
  'เวลา':          'time',
  'time':          'time',
  'รูปภาพ':        'image_url',
  'image_url':     'image_url',
  'หมายเหตุ':      'note',
  'note':          'note',
  'school_code':   'school_code',
  'รหัสโรงเรียน': 'school_code',
  'academic_year': 'academic_year',
  'ปีการศึกษา':   'academic_year',
}

// เดา field จาก header เมื่อไม่ตรงกับ HEADER_MAP เป๊ะๆ (เผื่อสะกด/คำที่ต่างไปเล็กน้อยในแต่ละชีท)
function guessHeaderKey(h: string): string {
  if (!h) return ''
  if (HEADER_MAP[h]) return HEADER_MAP[h]

  const lower = h.toLowerCase()
  if (h.includes('รหัสนักเรียน') || h.includes('รหัสประจำตัว') || lower.includes('student_id') || lower === 'id') return 'student_id'
  if (h.includes('คำนำหน้า') || lower.includes('prefix') || lower.includes('title')) return 'prefix'
  if (h.includes('นามสกุล') || lower.includes('lname') || lower.includes('surname')) return 'lname'
  if (h.includes('ชื่อจริง') || lower.includes('fname') || lower === 'first name') return 'fname'
  if (h.includes('ชั้น') || h.includes('ระดับ') || lower.includes('grade')) return 'grade'
  if (h.includes('ห้อง') || lower.includes('classroom') || lower.includes('room')) return 'classroom'
  if (h.includes('เลขที่') || lower.includes('number')) return 'number'
  if (h.includes('สถานะ') || lower.includes('status')) return 'status'
  if (h.includes('เวลา') || lower.includes('time')) return 'time'
  if (h.includes('รูปภาพ') || lower.includes('image')) return 'image_url'
  if (h.includes('หมายเหตุ') || lower.includes('note')) return 'note'
  if (h.includes('ปีการศึกษา') || lower.includes('academic_year')) return 'academic_year'
  if (h.includes('รหัสโรงเรียน') || lower.includes('school_code')) return 'school_code'
  return h // เดาไม่ได้ — เก็บ header เดิมไว้
}

function toObjects<T>(rows: string[][]): T[] {
  if (rows.length < 2) return []
  let hi = 0
  for (let i = 0; i < Math.min(rows.length, 3); i++) {
    if (rows[i].some(v => v && !v.startsWith('⚠️') && !v.includes('FREE'))) { hi = i; break }
  }
  const rawHeaders = rows[hi]
  const headers    = rawHeaders.map(h => guessHeaderKey(h?.trim() || ''))
  return rows.slice(hi + 1)
    .filter(r => r.some(v => v?.trim()))
    .map(r => {
      const o: Record<string, string> = {}
      headers.forEach((h, i) => { if (h) o[h] = r[i]?.trim() || '' })
      return o as T
    })
}

export async function getCheckinToday(
  token: string, sheetId: string, sem: 1|2 = 1
): Promise<CheckinRecord[]> {
  const rows    = await getRows(token, sheetId, `Checkin_เทอม${sem}`)
  const records = toObjects<any>(rows)
  const today   = getTodayThai()
  return records
    .filter(r => r.timestamp?.startsWith(today))
    .map(normalizeRecord)
}

export async function getCheckinRange(
  token: string, sheetId: string, start: string, end: string, sem: 1|2 = 1
) {
  const rows    = await getRows(token, sheetId, `Checkin_เทอม${sem}`)
  const records = toObjects<any>(rows)
  return records
    .filter(r => { const d = r.timestamp?.slice(0, 10); return d >= start && d <= end })
    .map(normalizeRecord)
}

// จัดการกรณี grade/classroom รวมกันในเซลล์เดียว ("ม.3/2") หรือแยกคอลัมน์กัน
export function splitGradeClassroom(gradeRaw: string, classroomRaw: string): { grade: string; classroom: string } {
  let grade     = gradeRaw     || ''
  let classroom = classroomRaw || ''

  if (grade.includes('/') && !classroom) {
    const parts = grade.split('/')
    grade       = parts[0].trim()
    classroom   = parts[1].trim()
  }

  return { grade, classroom }
}

function normalizeRecord(r: any): CheckinRecord {
  const { grade, classroom } = splitGradeClassroom(r.grade || '', r.classroom || '')

  // image_url อาจอยู่ใน key ต่างๆ
  const image_url = r.image_url || r['รูปภาพ'] || ''

  return {
    timestamp:  r.timestamp  || r['วันที่เวลา'] || '',
    student_id: r.student_id || r['รหัสนักเรียน'] || '',
    prefix:     r.prefix     || r['คำนำหน้า'] || '',
    fname:      r.fname      || r['ชื่อ'] || '',
    lname:      r.lname      || r['นามสกุล'] || '',
    grade,
    classroom,
    number:     r.number     || r['เลขที่'] || '',
    status:     r.status     || r['สถานะ'] || '',
    time:       r.time       || r['เวลา'] || '',
    image_url,
    note:       r.note       || r['หมายเหตุ'] || '',
  }
}

// คืนวันที่ปัจจุบันในเวลาไทย
export function getTodayThai(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export async function getAllStudents(token: string, sheetId: string) {
  const raw = toObjects<Student>(await getRows(token, sheetId, 'Students'))
  return raw.map(s => ({ ...s, ...splitGradeClassroom(s.grade, s.classroom) }))
}

export async function getStudentById(token: string, sheetId: string, id: string) {
  const all = await getAllStudents(token, sheetId)
  return all.find(s => s.student_id === id) || null
}

export function calcStats(records: CheckinRecord[], total: number) {
  const isLeave = (r: CheckinRecord) => r.status === 'ลากิจ' || r.status === 'ลาป่วย'

  // อ่านช่วงเวลาจาก note field
  const getPeriod = (r: CheckinRecord): 'allday' | 'morning' | 'afternoon' => {
    const n = r.note || ''
    if (n.includes('ทั้งวัน')) return 'allday'
    if (n.includes('ครึ่งวันบ่าย')) return 'afternoon'
    return 'morning'  // default = เช้า
  }

  // unique student_id ที่มาเรียนปกติ/มาสาย
  const presentIds = new Set(records.filter(r => r.status === 'มาเรียนปกติ').map(r => r.student_id))
  const lateIds    = new Set(records.filter(r => r.status === 'มาสาย').map(r => r.student_id))

  // unique student_id ที่ลา แยกตามช่วง
  const leaveAllIds       = new Set<string>()
  const leaveMorningIds   = new Set<string>()
  const leaveAfternoonIds = new Set<string>()

  records.filter(isLeave).forEach(r => {
    const sid    = r.student_id
    const period = getPeriod(r)
    if (period === 'allday') {
      leaveAllIds.add(sid)
      leaveMorningIds.add(sid)
      leaveAfternoonIds.add(sid)
    } else if (period === 'afternoon') {
      leaveAfternoonIds.add(sid)
    } else {
      leaveMorningIds.add(sid)
    }
  })

  // unique leaveCount (นับแต่ละคนครั้งเดียว)
  const leaveUniqueIds = new Set([...leaveMorningIds, ...leaveAfternoonIds])

  // กลับบ้าน unique
  const homeIds = new Set(records.filter(r => r.status === 'กลับบ้าน').map(r => r.student_id))

  // ไม่สแกนเช้า = สแกนกลับบ้านแต่ไม่มี record เช้า (ถือว่ามาโรงเรียน ไม่นับขาด)
  const noMorningScanIds = new Set(
    [...homeIds].filter(id =>
      !presentIds.has(id) && !lateIds.has(id) && !leaveUniqueIds.has(id)
    )
  )

  // นับมา = มาปกติ + มาสาย (ไม่ซ้ำกัน)
  const present       = presentIds.size
  const late          = lateIds.size
  const leave         = homeIds.size
  const leaveCount    = leaveUniqueIds.size
  const noMorningScan = noMorningScanIds.size

  // scanned = คนที่มาหรือลา หรือสแกนกลับบ้าน (ไม่นับว่าขาด)
  const scannedIds = new Set([...presentIds, ...lateIds, ...leaveUniqueIds, ...noMorningScanIds])
  const scanned    = scannedIds.size

  return {
    present, late, leave, leaveCount, noMorningScan, scanned,
    leaveAllIds, leaveMorningIds, leaveAfternoonIds,
    absent: Math.max(0, total - scanned),
    total,
    presentPct: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
  }
}

// ดึงปฏิทินการศึกษาจาก AcademicCalendar sheet
export interface CalendarData {
  semesterStart: string  // วันเปิดเทอม
  semesterEnd:   string  // วันปิดเทอม
  holidays:      Set<string> // วันหยุดราชการ (YYYY-MM-DD)
  schoolOpenDays: Set<string> // วันที่เปิดเรียนแม้เป็นวันหยุด (YYYY-MM-DD)
}

export async function getCalendarData(token: string, sheetId: string, sem: 1|2 = 1): Promise<CalendarData> {
  const today = getTodayThai()
  const defaults: CalendarData = {
    semesterStart: today.slice(0,7) + '-01',
    semesterEnd:   today,
    holidays:      new Set(),
    schoolOpenDays: new Set(),
  }

  try {
    const rows = await getRows(token, sheetId, 'AcademicCalendar')
    if (rows.length < 2) return defaults

    const headers = rows[0].map(h => h.toLowerCase().trim())
    const iDate   = headers.findIndex(h => h === 'date')
    const iType   = headers.findIndex(h => h === 'type')
    const iNote   = headers.findIndex(h => h === 'note')

    let semStart = '', semEnd = ''
    const holidays      = new Set<string>()
    const schoolOpenDays = new Set<string>()

    for (const row of rows.slice(1)) {
      const date = row[iDate]?.trim() || ''
      const type = row[iType]?.trim() || ''
      const note = row[iNote]?.trim() || ''
      if (!date) continue

      if (type === 'holiday') {
        holidays.add(date)
      } else if (type === 'school_open') {
        schoolOpenDays.add(date)
      } else if (type === 'semester_start') {
        // เลือก semester ที่ตรงกัน
        if (note.includes(String(sem)) || !semStart) semStart = date
      } else if (type === 'semester_end') {
        if (note.includes(String(sem)) || !semEnd) semEnd = date
      }
    }

    return {
      semesterStart: semStart || defaults.semesterStart,
      semesterEnd:   semEnd   || today,
      holidays,
      schoolOpenDays,
    }
  } catch (e) {
    console.error('[sheets] getCalendarData:', e)
    return defaults
  }
}

// นับวันเรียนจริง (ไม่นับวันหยุดราชการ + เสาร์-อาทิตย์)
export function countSchoolDays(start: string, end: string, holidays: Set<string>, schoolOpenDays: Set<string> = new Set()): string[] {
  const days: string[] = []
  const s = new Date(start + 'T00:00:00Z')
  const e = new Date(end   + 'T00:00:00Z')
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    const dow = d.getUTCDay()
    const iso = d.toISOString().slice(0, 10)
    // ถ้าเป็นวันที่กำหนดให้เปิดเรียนพิเศษ → นับเสมอ
    if (schoolOpenDays.has(iso)) { days.push(iso); continue }
    if (dow === 0 || dow === 6) continue  // เสาร์-อาทิตย์
    if (holidays.has(iso)) continue       // วันหยุดราชการ
    days.push(iso)
  }
  return days
}
