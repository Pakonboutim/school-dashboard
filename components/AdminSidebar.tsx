'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

export default function AdminSidebar() {
  const path = usePathname()
  const { data: session } = useSession()
  const role = session?.role
  const [pendingLeave, setPendingLeave] = React.useState(0)

  React.useEffect(() => {
    fetch('/api/leave?status=pending')
      .then(r => r.json())
      .then(d => setPendingLeave((d.requests || []).length))
      .catch(() => {})
    const t = setInterval(() => {
      fetch('/api/leave?status=pending')
        .then(r => r.json())
        .then(d => setPendingLeave((d.requests || []).length))
        .catch(() => {})
    }, 60000)
    return () => clearInterval(t)
  }, [])

  const allMenus: {href:string;icon:string;label:string;roles:string[];badge?:number}[] = [
    { href: '/admin',         icon: '📊', label: 'ภาพรวม',        roles: ['admin', 'teacher'] },
    { href: '/admin/class',   icon: '🏫', label: 'รายชั้น/ห้อง',  roles: ['admin', 'teacher'] },
    { href: '/admin/absent',  icon: '⚠️', label: 'ขาดบ่อย',       roles: ['admin', 'teacher'] },
    { href: '/admin/history', icon: '📋', label: 'ประวัติ',        roles: ['admin', 'teacher'] },
    { href: '/admin/attendance', icon: '📝', label: 'บันทึกการลา',  roles: ['admin', 'teacher'] },
    { href: '/admin/behavior',   icon: '⭐', label: 'คะแนนประพฤติ', roles: ['admin', 'teacher'] },
    { href: '/admin/leave',      icon: '📋', label: 'อนุมัติลา',     roles: ['admin', 'teacher'], badge: pendingLeave },
    { href: '/admin/report',     icon: '📤', label: 'Export รายงาน', roles: ['admin', 'teacher'] },
    { href: '/admin/users',   icon: '⚙️', label: 'จัดการผู้ใช้',  roles: ['admin'] },
  ]

  const menus = allMenus.filter(m => !role || m.roles.includes(role))

  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: '#0d1117',
      borderRight: '1px solid #21262d', display: 'flex', flexDirection: 'column',
      padding: '1.25rem 0', fontFamily: 'Sarabun, sans-serif', flexShrink: 0,
    }}>
      <div style={{ padding: '0 1.25rem 1.25rem', borderBottom: '1px solid #21262d' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3' }}>🏫 School Checkin</div>
        {session?.username && (
          <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>
            {(session as any).displayName || session.username}
            <span style={{
              marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 20,
              background: role === 'admin' ? '#388bfd22' : '#2ecc7122',
              color: role === 'admin' ? '#388bfd' : '#2ecc71',
            }}>{role}</span>
          </div>
        )}
      </div>

      <nav style={{ flex: 1, padding: '0.75rem' }}>
        {menus.map(m => {
          const active = path === m.href
          return (
            <Link key={m.href} href={m.href} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 12px', borderRadius: 8, marginBottom: 2,
              fontSize: 14, textDecoration: 'none',
              background: active ? '#388bfd1a' : 'transparent',
              color: active ? '#388bfd' : '#8b949e',
              fontWeight: active ? 600 : 400,
            }}>
              <span>{m.icon}</span>
              <span style={{ flex: 1 }}>{m.label}</span>
              {m.badge ? (
                <span style={{
                  fontSize: 11, fontWeight: 700, minWidth: 18, height: 18,
                  borderRadius: 9, background: '#e74c3c', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                }}>{m.badge}</span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #21262d' }}>
        <button onClick={() => signOut({ callbackUrl: '/login' })} style={{
          width: '100%', background: 'transparent', border: '1px solid #f85149',
          color: '#f85149', borderRadius: 8, padding: '8px', fontSize: 13,
          cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
        }}>ออกจากระบบ</button>
      </div>
    </aside>
  )
}
