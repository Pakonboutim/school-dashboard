import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import BottomNav from '@/components/BottomNav'

const adminNavItems = [
  { href: '/admin',            icon: '📊', label: 'ภาพรวม' },
  { href: '/admin/history',    icon: '📋', label: 'ประวัติ' },
  { href: '/admin/leave',      icon: '📋', label: 'อนุมัติลา' },
  { href: '/admin/attendance', icon: '📝', label: 'บันทึกลา' },
  { href: '/admin/behavior',   icon: '⭐', label: 'คะแนน' },
  { href: '/admin/users',      icon: '⚙️', label: 'จัดการ' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.role === 'student') redirect('/student')
  if (session.role === 'teacher') redirect('/teacher')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0d1117', fontFamily: 'Sarabun, sans-serif' }}>
      {/* Sidebar — desktop only */}
      <div className="desktop-sidebar" style={{ flexShrink: 0 }}>
        <AdminSidebar />
      </div>

      {/* Main content */}
      <main className="main-content" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <BottomNav items={adminNavItems} basePath="/admin" />
    </div>
  )
}
