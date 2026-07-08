import crypto from 'crypto'
import { splitGradeClassroom } from './sheets'

export interface AppUser {
  id:         string
  username:   string
  role:       'admin' | 'teacher' | 'student'
  sheetUrl:   string
  sheetId:    string
  grade?:     string
  classroom?: string
  studentId?: string
  mustChangePassword?: boolean
  name?: string
}

export function extractSheetId(url: string): string {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return m ? m[1] : ''
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'SCHOOL_SALT_2026').digest('hex')
}

async function fetchSheetTab(sheetId: string, tabName: string): Promise<string[][]> {
  const encoded = encodeURIComponent(tabName)
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encoded}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []
  const text = await res.text()
  if (text.includes('<!DOCTYPE')) return []
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
}

export async function verifyUser(
  sheetUrl: string,
  username: string,
  password: string,
): Promise<AppUser | null> {
  // ใช้ DEFAULT_SHEET_URL เป็น master sheet เพื่อค้นหา user
  const masterUrl = process.env.DEFAULT_SHEET_URL || sheetUrl
  const masterId  = extractSheetId(masterUrl)
  if (!masterId) return null

  const rows = await fetchSheetTab(masterId, 'Users')
  if (rows.length < 2) return null

  const headers = rows[0]
  const idx = (col: string) => headers.findIndex(h => h.toLowerCase().trim() === col.toLowerCase())

  const iUser  = idx('username')
  const iPass  = idx('password_hash')
  const iRole  = idx('role')
  const iGrade = idx('grade')
  const iClass = idx('classroom')
  const iSid   = idx('student_id')
  const iMust  = idx('must_change_password')
  const iSheet = idx('sheet_url')
  const iName  = idx('name')

  const hash = hashPassword(password)

  for (const row of rows.slice(1)) {
    if (!row[iUser] || row[iUser].toLowerCase() !== username.toLowerCase()) continue
    if (row[iPass] !== hash) return null

    // ใช้ sheet_url ของ user ถ้ามี ไม่งั้นใช้ master
    const userSheetUrl = (iSheet >= 0 && row[iSheet]) ? row[iSheet] : masterUrl
    const userSheetId  = extractSheetId(userSheetUrl) || masterId

    // grade/classroom อาจถูกกรอกรวมกันในเซลล์เดียว ("ม.3/2") — ต้องแยกให้ตรงกับที่ getAllStudents() ทำ
    const { grade, classroom } = splitGradeClassroom(row[iGrade] || '', row[iClass] || '')

    return {
      id:        row[iUser],
      username:  row[iUser],
      role:      (row[iRole] || 'student') as AppUser['role'],
      sheetUrl:  userSheetUrl,
      sheetId:   userSheetId,
      grade,
      classroom,
      studentId: row[iSid]    || '',
      mustChangePassword: row[iMust]?.toLowerCase() === 'true',
      name: (iName >= 0 && row[iName]) ? row[iName] : '',
    }
  }
  return null
}

export async function getAllUsers(sheetId: string): Promise<any[]> {
  const rows = await fetchSheetTab(sheetId, 'Users')
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1)
    .filter(r => r.some(v => v))
    .map(r => {
      const o: any = {}
      headers.forEach((h, i) => { o[h] = r[i] || '' })
      return o
    })
}
