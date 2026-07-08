import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllStudents } from '@/lib/sheets'

export const revalidate = 0

export async function GET(req: NextRequest) {
  const grade    = req.nextUrl.searchParams.get('grade') || ''
  const regToken = req.nextUrl.searchParams.get('token') || ''
  const sheetIdQ = req.nextUrl.searchParams.get('sheetId') || ''

  // register flow — ใช้ token จาก query string
  if (regToken && sheetIdQ) {
    try {
      const data = JSON.parse(atob(regToken))
      const sid  = data.sheetId || sheetIdQ
      let students = await getAllStudents('public', sid)
      if (grade) students = students.filter(s => s.grade === grade)
      return NextResponse.json({ students })
    } catch {
      return NextResponse.json({ students: [] })
    }
  }

  // normal flow — ต้องมี session
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token   = (session as any).access_token || 'public'
  const sheetId = session.sheetId
  if (!sheetId) return NextResponse.json({ students: [] })

  let students = await getAllStudents(token, sheetId)
  if (session.role === 'teacher') {
    students = students.filter(s => s.grade === session.grade && s.classroom === session.classroom)
  } else if (grade) {
    students = students.filter(s => s.grade === grade)
  }

  return NextResponse.json({ students })
}
