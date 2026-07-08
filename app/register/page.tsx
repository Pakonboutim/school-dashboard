'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function RegisterForm() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const token       = searchParams.get('token') || ''

  const [email, setEmail]       = useState('')
  const [fname, setFname]       = useState('')
  const [lname, setLname]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [grade, setGrade]       = useState('')
  const [room, setRoom]         = useState('')
  const [grades, setGrades]     = useState<string[]>([])
  const [rooms, setRooms]       = useState<string[]>([])
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [tokenData, setTokenData] = useState<any>(null)

  useEffect(() => {
    if (!token) return
    // ถอด token เพื่อดึง sheetId
    try {
      const data = JSON.parse(atob(token))
      // เพิ่ม sheetUrl จาก sheetId
      data.sheetUrl = `https://docs.google.com/spreadsheets/d/${data.sheetId}`
      setTokenData(data)
      // โหลด grades
      fetch(`/api/students?sheetId=${data.sheetId}&token=${encodeURIComponent(token)}`)
        .then(r => r.json())
        .then(d => {
          const gs = Array.from(new Set<string>((d.students||[]).map((s:any) => s.grade))).sort() as string[]
          setGrades(gs)
        })
    } catch {}
  }, [token])

  useEffect(() => {
    if (!grade || !tokenData) return
    fetch(`/api/students?grade=${grade}&sheetId=${tokenData.sheetId}&token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        const rs = Array.from(new Set<string>((d.students||[]).map((s:any) => s.classroom))).sort((a:string,b:string) => parseInt(a)-parseInt(b)) as string[]
        setRooms(rs)
      })
  }, [grade])

  const handleSubmit = async () => {
    if (!email || !fname || !lname || !password || !grade || !room) { setError('กรุณากรอกข้อมูลให้ครบ'); return }
    if (password !== confirm) { setError('รหัสผ่านไม่ตรงกัน'); return }
    if (password.length < 6) { setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัว'); return }

    setLoading(true)
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, grade, classroom: room, token, fname, lname }),
    })
    const d = await res.json()
    setLoading(false)
    if (d.success) {
      // บันทึก sheetUrl ลง localStorage เพื่อไม่ต้องใส่ URL ตอน login
      if (tokenData?.sheetUrl) {
        localStorage.setItem('school_sheet_url', tokenData.sheetUrl)
      }
      setDone(true)
    } else {
      setError(d.error || 'เกิดข้อผิดพลาด')
    }
  }

  const inp = { width: '100%', background: '#21262d', border: '1px solid #30363d', borderRadius: 10, color: '#e6edf3', fontSize: 14, fontFamily: 'Sarabun, sans-serif', padding: '10px 14px', outline: 'none', boxSizing: 'border-box' as const }

  if (!token) return (
    <div style={{ textAlign: 'center', color: '#f85149', padding: '2rem' }}>
      ❌ ลิ้งไม่ถูกต้อง กรุณาขอลิ้งใหม่จาก Admin
    </div>
  )

  if (done) return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
      <h2 style={{ color: '#2ecc71', fontSize: 20 }}>สมัครสำเร็จแล้ว!</h2>
      <p style={{ color: '#8b949e', marginTop: 8 }}>username: {email}</p>
      <button onClick={() => router.push('/login')} style={{
        marginTop: 16, background: '#388bfd', color: '#fff', border: 'none',
        borderRadius: 10, padding: '10px 24px', fontSize: 14, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
      }}>เข้าสู่ระบบ</button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>อีเมล (ใช้เป็น username)</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="teacher@school.ac.th" style={inp} />
      </div>

      {/* คำนำหน้า + ชื่อ-นามสกุล */}
      <div>
        <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>คำนำหน้า</label>
        <input value="ครู" readOnly style={{ ...inp, background: '#0d1117', color: '#6e7681', cursor: 'not-allowed' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>ชื่อ</label>
          <input value={fname} onChange={e => setFname(e.target.value)} placeholder="ชื่อ" style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>นามสกุล</label>
          <input value={lname} onChange={e => setLname(e.target.value)} placeholder="นามสกุล" style={inp} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>รหัสผ่าน</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัว" style={inp} />
      </div>
      <div>
        <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>ยืนยันรหัสผ่าน</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="กรอกรหัสผ่านอีกครั้ง" style={inp} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>ชั้นที่ดูแล</label>
          <select value={grade} onChange={e => setGrade(e.target.value)} style={inp}>
            <option value="">เลือกชั้น</option>
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>ห้อง</label>
          <select value={room} onChange={e => setRoom(e.target.value)} style={inp}>
            <option value="">เลือกห้อง</option>
            {rooms.map(r => <option key={r} value={r}>ห้อง {r}</option>)}
          </select>
        </div>
      </div>
      {error && <p style={{ color: '#f85149', fontSize: 13 }}>{error}</p>}
      <button onClick={handleSubmit} disabled={loading} style={{
        width: '100%', background: loading ? '#30363d' : '#388bfd', color: loading ? '#8b949e' : '#fff',
        border: 'none', borderRadius: 10, padding: 12, fontSize: 15, fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Sarabun, sans-serif',
      }}>
        {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
      </button>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'Sarabun, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏫</div>
          <h1 style={{ color: '#e6edf3', fontSize: 20, fontWeight: 600 }}>สมัครสมาชิกครู</h1>
          <p style={{ color: '#8b949e', fontSize: 14 }}>ระบบเช็คชื่อนักเรียน</p>
        </div>
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 16, padding: '1.5rem' }}>
          <Suspense fallback={<div style={{ color: '#8b949e' }}>กำลังโหลด...</div>}>
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
