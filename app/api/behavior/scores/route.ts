import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'

export const revalidate = 0

async function getSAToken() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_EMAIL,
      private_key:  process.env.GOOGLE_SERVICE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const client = await auth.getClient()
  const t = await (client as any).getAccessToken()
  return t?.token || null
}

async function fetchTab(sheetId: string, tab: string, token: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tab)}!A:Z`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (!res.ok) return []
  const d = await res.json()
  const rows: string[][] = d.values || []
  if (rows.length < 2) return []
  const headers = rows[0]
  return rows.slice(1).filter(r => r.some(v => v)).map(r => {
    const o: any = {}
    headers.forEach((h, i) => { o[h] = r[i] || '' })
    return o
  })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sheetId = session.sheetId
  const token   = (session as any).access_token || await getSAToken()
  if (!sheetId || !token) return NextResponse.json({ scores: [] })

  const scores = await fetchTab(sheetId, 'Behavior_Scores', token)
  return NextResponse.json({ scores })
}
