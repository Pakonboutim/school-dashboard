import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import StudentSignOut from '@/components/StudentSignOut'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.role !== 'student') redirect('/teacher')

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', fontFamily: 'Sarabun, sans-serif' }}>
      {/* Header */}
      <header style={{
        background: '#161b22', borderBottom: '1px solid #30363d',
        padding: '0 1.25rem', height: 56, position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🏫</span>
          <div>
            <div style={{ color: '#e6edf3', fontWeight: 600, fontSize: 14 }}>ระบบเช็คชื่อนักเรียน</div>
            <div style={{ color: '#8b949e', fontSize: 11 }}>{session.username}</div>
          </div>
        </div>
        <StudentSignOut />
      </header>

      <main style={{ maxWidth: 540, margin: '0 auto', padding: '1.25rem 1rem 2rem' }}>
        {children}
      </main>
    </div>
  )
}
