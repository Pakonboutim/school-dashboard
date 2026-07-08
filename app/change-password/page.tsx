'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function ChangePasswordPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [newPass, setNewPass]     = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  const handleSubmit = async () => {
    if (newPass.length < 6) { setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัว'); return }
    if (newPass !== confirm)  { setError('รหัสผ่านไม่ตรงกัน'); return }

    setLoading(true)
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword: newPass }),
    })
    const d = await res.json()
    setLoading(false)
    if (d.success) {
      await update({ mustChangePassword: false })
      router.push('/dashboard')
    } else setError(d.error || 'เกิดข้อผิดพลาด')
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0d1117',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Sarabun, sans-serif',
    }}>
      <div style={{
        background: '#161b22', border: '1px solid #30363d',
        borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 400,
      }}>
        <h1 style={{ color: '#e6edf3', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>🔑 ตั้งรหัสผ่านใหม่</h1>
        <p style={{ color: '#8b949e', fontSize: 14, marginBottom: '1.5rem' }}>
          กรุณาตั้งรหัสผ่านใหม่ก่อนเข้าใช้งาน
        </p>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>รหัสผ่านใหม่</label>
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
            placeholder="อย่างน้อย 6 ตัว"
            style={{ width: '100%', background: '#21262d', border: '1px solid #30363d', borderRadius: 10, color: '#e6edf3', fontSize: 14, padding: '10px 14px', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>ยืนยันรหัสผ่าน</label>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder="กรอกรหัสผ่านอีกครั้ง"
            style={{ width: '100%', background: '#21262d', border: '1px solid #30363d', borderRadius: 10, color: '#e6edf3', fontSize: 14, padding: '10px 14px', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {error && <p style={{ color: '#f85149', fontSize: 13, marginBottom: '1rem' }}>{error}</p>}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', background: '#388bfd', color: '#fff', border: 'none',
          borderRadius: 10, padding: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}>
          {loading ? 'กำลังบันทึก...' : 'ยืนยัน'}
        </button>
      </div>
    </div>
  )
}
