import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { findSchoolSheet, getTodayThai } from '@/lib/sheets'

export const revalidate = 0

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.access_token)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token     = session.access_token
  const todayThai = getTodayThai()
  const sheetId   = await findSchoolSheet(token)

  if (!sheetId) return NextResponse.json({ error: 'no sheetId', todayThai })

  // ลองดึงตรงๆ ผ่าน Sheets API
  try {
    const sem = parseInt(process.env.CURRENT_SEMESTER || '1')
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Checkin_เทอม${sem}!A1:K10`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    return NextResponse.json({
      todayThai,
      sheetId,
      status: res.status,
      rows: data.values?.slice(0, 5) ?? [],
      error: data.error ?? null,
    })
  } catch(e: any) {
    return NextResponse.json({ error: e.message, todayThai, sheetId })
  }
}
