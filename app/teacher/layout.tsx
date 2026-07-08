import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import TeacherSidebar from '@/components/TeacherSidebar'
import BottomNav from '@/components/BottomNav'

const teacherNavItems = [
  { href: '/teacher',             icon: '📊', label: 'ภาพรวม' },
  { href: '/teacher/class',       icon: '🏫', label: 'รายชื่อ' },
  { href: '/teacher/absent',      icon: '⚠️', label: 'ขาดบ่อย' },
  { href: '/teacher/history',     icon: '📋', label: 'ประวัติ' },
  { href: '/teacher/attendance',  icon: '📝', label: 'บันทึกลา' },
  { href: '/teacher/leave',       icon: '📋', label: 'อนุมัติลา' },
  { href: '/teacher/teacher-behavior', icon: '⭐', label: 'คะแนน' },
  { href: '/teacher/report',      icon: '📤', label: 'Export' },
]

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.role === 'admin') redirect('/admin')
  if (session.role === 'student') redirect('/student')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0d1117', fontFamily: 'Sarabun, sans-serif' }}>
      <div className="desktop-sidebar" style={{ flexShrink: 0 }}>
        <TeacherSidebar />
      </div>
      <main className="main-content" style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {children}
      </main>
      <BottomNav items={teacherNavItems} basePath="/teacher" />
    </div>
  )
}
