'use client'
import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router   = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session) {
      if (session.role === 'student') router.replace('/student')
      else if (session.role === 'teacher') router.replace('/teacher')
      else router.replace('/admin')
    }
  }, [status, session])

  if (status === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e', fontFamily: 'Sarabun, sans-serif' }}>
      กำลังโหลด...
    </div>
  )
  if (status === 'authenticated') return null

  const handleLogin = async () => {
    if (!username || !password) { setError('กรุณากรอกข้อมูลให้ครบ'); return }
    setLoading(true); setError('')
    const res = await signIn('credentials', {
      redirect: false, username, password, sheetUrl: '',
    })
    setLoading(false)
    if (res?.error) setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
  }

  const inp = {
    width: '100%', background: '#21262d', border: '1px solid #30363d',
    borderRadius: 10, color: '#e6edf3', fontSize: 14, fontFamily: 'Sarabun, sans-serif',
    padding: '10px 14px', outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Sarabun, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#388bfd,#1f6feb)', borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 12 }}>🏫</div>
          <h1 style={{ color: '#e6edf3', fontSize: 22, fontWeight: 600 }}>ระบบเช็คชื่อนักเรียน</h1>
          <p style={{ color: '#8b949e', fontSize: 14, marginTop: 4 }}>School Checkin Dashboard</p>
        </div>

        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 16, padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>ชื่อผู้ใช้</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              placeholder="username / email / รหัสนักเรียน"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={inp} />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>รหัสผ่าน</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="รหัสผ่าน"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={inp} />
          </div>

          {error && <p style={{ color: '#f85149', fontSize: 13, marginBottom: '1rem' }}>{error}</p>}

          <button onClick={handleLogin} disabled={loading} style={{
            width: '100%', background: loading ? '#30363d' : '#388bfd',
            color: loading ? '#8b949e' : '#fff', border: 'none', borderRadius: 10,
            padding: 12, fontSize: 15, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Sarabun, sans-serif',
          }}>
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </div>
      </div>
    </div>
  )
}
