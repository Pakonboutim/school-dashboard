'use client'
import { signOut } from 'next-auth/react'

export default function StudentSignOut() {
  return (
    <button onClick={() => signOut({ callbackUrl: '/login' })} style={{
      background: 'transparent', border: '1px solid #30363d',
      color: '#8b949e', borderRadius: 8, padding: '6px 12px',
      fontSize: 13, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
    }}>ออก</button>
  )
}
