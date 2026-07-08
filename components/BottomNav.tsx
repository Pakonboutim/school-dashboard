'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface NavItem {
  href: string
  icon: string
  label: string
}

export default function BottomNav({ items, basePath }: { items: NavItem[], basePath: string }) {
  const path = usePathname()

  const isActive = (href: string) =>
    href === basePath ? path === basePath : path.startsWith(href)

  return (
    <nav className="mobile-bottom-nav" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#161b22', borderTop: '1px solid #21262d',
      display: 'none', // default hidden, shown via CSS
      alignItems: 'center', justifyContent: 'space-around',
      height: 64, zIndex: 50, padding: '0 4px',
      overflowX: 'auto',
    }}>
      {items.map(m => {
        const active = isActive(m.href)
        return (
          <Link key={m.href} href={m.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 2, padding: '6px 8px', borderRadius: 10, minWidth: 48,
            textDecoration: 'none', flexShrink: 0,
            color: active ? '#388bfd' : '#8b949e',
            background: active ? '#388bfd15' : 'transparent',
          }}>
            <span style={{ fontSize: 20 }}>{m.icon}</span>
            <span style={{ fontSize: 10, fontFamily: 'Sarabun, sans-serif', whiteSpace: 'nowrap' }}>
              {m.label}
            </span>
          </Link>
        )
      })}
      <button onClick={() => signOut({ callbackUrl: '/login' })} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 2, padding: '6px 8px', borderRadius: 10, minWidth: 48,
        background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
        color: '#8b949e',
      }}>
        <span style={{ fontSize: 20 }}>🚪</span>
        <span style={{ fontSize: 10, fontFamily: 'Sarabun, sans-serif' }}>ออก</span>
      </button>
    </nav>
  )
}
