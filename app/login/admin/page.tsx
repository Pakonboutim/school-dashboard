'use client'
import { useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated' && session?.role === 'admin')
      router.replace('/admin')
  }, [status, session])

  // Auto redirect ไป Google login
  useEffect(() => {
    if (status === 'unauthenticated')
      signIn('google', { callbackUrl: '/admin' })
  }, [status])

  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Sarabun, sans-serif', color: '#8b949e', fontSize: 16,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏫</div>
        <p>กำลังนำไปยัง Google Login...</p>
      </div>
    </div>
  )
}
