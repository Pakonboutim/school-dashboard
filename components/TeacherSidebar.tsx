'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

export default function TeacherSidebar() {
  const path    = usePathname()
  const { data: session } = useSession()
  const [pendingLeave, setPendingLeave] = React.useState(0)

  React.useEffect(() => {
    fetch('/api/leave?status=pending')
      .then(r => r.json())
      .then(d => setPendingLeave((d.requests || []).length))
      .catch(() => {})
    // refresh ทุก 60 วินาที
    const t = setInterval(() => {
      fetch('/api/leave?status=pending')
        .then(r => r.json())
        .then(d => setPendingLeave((d.requests || []).length))
        .catch(() => {})
    }, 60000)
    return () => clearInterval(t)
  }, [])

  const menus: {href:string;icon:string;label:string;badge?:number}[] = [
    { href: '/teacher',         icon: '📊', label: 'ภาพรวมห้อง' },
    { href: '/teacher/class',   icon: '🏫', label: 'รายชื่อนักเรียน' },
    { href: '/teacher/absent',  icon: '⚠️', label: 'ขาดบ่อย' },
    { href: '/teacher/history', icon: '📋', label: 'ประวัติ' },
    { href: '/teacher/attendance', icon: '📝', label: 'บันทึกการลา' },
    { href: '/teacher/leave',      icon: '📋', label: 'อนุมัติลา',   badge: pendingLeave },
    { href: '/teacher/teacher-behavior', icon: '⭐', label: 'คะแนนประพฤติ' },
    { href: '/teacher/report',  icon: '📤', label: 'Export รายงาน' },
  ]

  const isActive = (href: string) =>
    href === '/teacher' ? path === '/teacher' : path.startsWith(href)

  return (
    <aside style={{ width: 210, minHeight: '100vh', background: '#0d1117', borderRight: '1px solid #21262d', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '1.25rem', borderBottom: '1px solid #21262d' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#e6edf3' }}>🏫 School Checkin</div>
        {session?.username && (
          <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>
            {(session as any).displayName || session.username}
            <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 20, background: '#2ecc7122', color: '#2ecc71' }}>ครู</span>
          </div>
        )}
        {session?.grade && (
          <div style={{ fontSize: 11, color: '#388bfd', marginTop: 2 }}>
            ประจำชั้น {session.grade}/{session.classroom}
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: '0.5rem' }}>
        {menus.map(m => (
          <Link key={m.href} href={m.href} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '9px 12px', borderRadius: 8, marginBottom: 2,
            fontSize: 14, textDecoration: 'none',
            background: isActive(m.href) ? '#388bfd1a' : 'transparent',
            color: isActive(m.href) ? '#388bfd' : '#8b949e',
            fontWeight: isActive(m.href) ? 600 : 400,
          }}>
            <span>{m.icon}</span>
            <span style={{ flex: 1 }}>{m.label}</span>
            {m.badge ? (
              <span style={{
                fontSize: 11, fontWeight: 700, minWidth: 18, height: 18,
                borderRadius: 9, background: '#e74c3c', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px',
              }}>{m.badge}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      <div style={{ padding: '1rem', borderTop: '1px solid #21262d' }}>
        <button onClick={() => signOut({ callbackUrl: '/login' })} style={{
          width: '100%', background: 'transparent', border: '1px solid #30363d',
          color: '#8b949e', borderRadius: 8, padding: '8px', fontSize: 13,
          cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
        }}>ออกจากระบบ</button>
      </div>
    </aside>
  )
}
