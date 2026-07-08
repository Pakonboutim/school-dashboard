import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cloudName   = process.env.CLOUDINARY_CLOUD_NAME || ''
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'school_checkin'

  if (!cloudName) return NextResponse.json({ url: '' })

  try {
    const formData = await req.formData()
    const file     = formData.get('file') as File
    if (!file) return NextResponse.json({ url: '' })

    const body = new FormData()
    body.append('file', file)
    body.append('upload_preset', uploadPreset)
    body.append('folder', 'leave_docs')

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST', body,
    })
    const data = await res.json()
    return NextResponse.json({ url: data.secure_url || '' })
  } catch (e) {
    console.error('[upload] error:', e)
    return NextResponse.json({ url: '' })
  }
}
