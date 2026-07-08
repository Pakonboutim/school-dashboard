'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Tab = 'manual' | 'student' | 'list'

export default function UsersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [tab, setTab]         = useState<Tab>('manual')
  const [users, setUsers]     = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [grades, setGrades]   = useState<string[]>([])
  const [rooms, setRooms]     = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState('')
  const [exportData, setExportData] = useState<any[]>([])

  // form manual
  const [form, setForm] = useState({ username: '', password: '', role: 'teacher', grade: '', classroom: '', studentId: '' })

  // form batch student
  const [batchGrade, setBatchGrade]   = useState('')
  const [batchRoom, setBatchRoom]     = useState('')
  const [batchMode, setBatchMode]     = useState<'all'|'grade'|'room'|'single'>('room')
  const [selStudent, setSelStudent]   = useState<any>(null)
  const [stuSearch, setStuSearch]     = useState('')
  const [defaultPass, setDefaultPass] = useState('checkin2026')

  useEffect(() => {
    if (session && session.role !== 'admin') router.push('/admin')
  }, [session])

  useEffect(() => {
    loadUsers()
    fetch('/api/students').then(r => r.json()).then(d => {
      setStudents(d.students || [])
      const gs = Array.from(new Set<string>((d.students || []).map((s: any) => s.grade))).sort() as string[]
      setGrades(gs)
    })
  }, [])

  useEffect(() => {
    if (!batchGrade) { setRooms([]); setBatchRoom(''); return }
    fetch('/api/students?grade=' + batchGrade).then(r => r.json()).then(d => {
      const rs = Array.from(new Set<string>((d.students || []).map((s: any) => s.classroom))).sort((a: string, b: string) => parseInt(a) - parseInt(b)) as string[]
      setRooms(rs)
    })
  }, [batchGrade])

  const loadUsers = () => {
    fetch('/api/users').then(r => r.json()).then(d => setUsers(d.users || []))
  }

  const createManual = async () => {
    setMsg(''); setLoading(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, sheetUrl: session?.sheetUrl }),
    })
    const d = await res.json()
    setLoading(false)
    if (d.success) {
      if (d.written) {
        setMsg('✅ สร้าง user และบันทึกลง Sheet สำเร็จ')
        setExportData([])
      } else {
        setMsg('⚠️ สร้าง user แล้ว แต่บันทึกลง Sheet ไม่ได้ — ดาวน์โหลด CSV แทน')
        setExportData([d.row])
      }
      loadUsers()
    } else {
      setMsg('❌ ' + (d.error || 'เกิดข้อผิดพลาด'))
    }
  }

  const createBatchStudents = async () => {
    setMsg(''); setLoading(true)
    let targets = students
    if (batchMode === 'grade')  targets = students.filter(s => s.grade === batchGrade)
    if (batchMode === 'room')   targets = students.filter(s => s.grade === batchGrade && s.classroom === batchRoom)
    if (batchMode === 'single') targets = selStudent ? [selStudent] : []

    const rows: any[] = []
    for (const s of targets) {
      rows.push({
        username:   s.student_id,
        password:   defaultPass,
        role:       'student',
        grade:      s.grade,
        classroom:  s.classroom,
        studentId:  s.student_id,
        sheetUrl:   session?.sheetUrl || '',
        name:       `${s.prefix}${s.fname} ${s.lname}`,
      })
    }

    const res = await fetch('/api/users/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: rows }),
    })
    const d = await res.json()
    setLoading(false)

    if (d.success) {
      if (d.written) {
        setMsg(`✅ สร้าง ${d.count} user และบันทึกลง Sheet สำเร็จทั้งหมด`)
        setExportData([])
        loadUsers()
      } else {
        setMsg(`⚠️ เตรียม ${d.count} user แล้ว แต่บันทึกลง Sheet ไม่ได้ — ดาวน์โหลด CSV แทน`)
        setExportData(d.rows || rows)
      }
    } else {
      setMsg('❌ ' + (d.error || 'เกิดข้อผิดพลาด'))
    }
  }

  const exportExcel = () => {
    if (!exportData.length) return
    const headers = ['username', 'password_hash', 'role', 'grade', 'classroom', 'student_id', 'must_change_password', 'sheet_url']
    const csvRows = [
      headers.join(','),
      ...exportData.map(u => {
        const hash = u.password_hash || u.hash || ''
        return [
          u.username, hash, u.role || 'student',
          u.grade || '', u.classroom || '', u.studentId || u.student_id || '',
          'true', u.sheetUrl || session?.sheetUrl || '',
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      })
    ]
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `users_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inp = { width: '100%', background: '#21262d', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3', fontSize: 13, padding: '8px 12px', outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'Sarabun, sans-serif' }
  const tabs: { key: Tab; label: string }[] = [
    { key: 'manual',  label: '➕ สร้าง User' },
    { key: 'student', label: '🎓 สร้างจากนักเรียน' },
    { key: 'list',    label: '👥 รายการ User' },
  ]

  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: '#e6edf3', marginBottom: '1.25rem' }}>⚙️ จัดการผู้ใช้</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 4 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '8px', borderRadius: 8, border: 'none', fontSize: 13,
            background: tab === t.key ? '#388bfd' : 'transparent',
            color: tab === t.key ? '#fff' : '#8b949e',
            cursor: 'pointer', fontFamily: 'Sarabun, sans-serif', fontWeight: tab === t.key ? 600 : 400,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Manual */}
      {tab === 'manual' && (
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {[
              { label: 'ชื่อผู้ใช้', key: 'username', placeholder: 'username' },
              { label: 'รหัสผ่าน',  key: 'password',  placeholder: 'password' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input style={inp} value={(form as any)[f.key]} placeholder={f.placeholder}
                  onChange={e => setForm({...form, [f.key]: e.target.value})} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>Role</label>
              <select style={inp} value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="teacher">ครู (teacher)</option>
                <option value="student">นักเรียน (student)</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {form.role === 'teacher' && <>
              <div>
                <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>ชั้น</label>
                <select style={inp} value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}>
                  <option value="">เลือกชั้น</option>
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>ห้อง</label>
                <input style={inp} value={form.classroom} placeholder="1" onChange={e => setForm({...form, classroom: e.target.value})} />
              </div>
            </>}
            {form.role === 'student' && <div>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>รหัสนักเรียน</label>
              <input style={inp} value={form.studentId} placeholder="12345" onChange={e => setForm({...form, studentId: e.target.value})} />
            </div>}
          </div>
          {msg && <p style={{ color: msg.startsWith('✅') ? '#2ecc71' : '#f85149', fontSize: 13, marginBottom: 8 }}>{msg}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={createManual} disabled={loading} style={{
              background: '#388bfd', color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
            }}>สร้าง User</button>
            {exportData.length > 0 && (
              <button onClick={exportExcel} style={{
                background: '#2ecc71', color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
              }}>📥 Download CSV</button>
            )}
          </div>
          {exportData.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#0d1117', borderRadius: 8, fontSize: 12, color: '#8b949e' }}>
              <p style={{ marginBottom: 6, color: '#f39c12' }}>⚠️ กรุณาเพิ่ม row นี้ใน Google Sheet tab Users:</p>
              <code style={{ color: '#e6edf3', wordBreak: 'break-all' }}>
                {exportData[0]?.username} | *** | {exportData[0]?.role} | {exportData[0]?.grade} | {exportData[0]?.classroom}
              </code>
            </div>
          )}
        </div>
      )}

      {/* Batch Students */}
      {tab === 'student' && (
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1.25rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, color: '#e6edf3', marginBottom: '1rem' }}>สร้าง User จากรายชื่อนักเรียน</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>รหัสผ่านเริ่มต้น</label>
              <input style={inp} value={defaultPass} onChange={e => setDefaultPass(e.target.value)} placeholder="checkin2026" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>สร้างแบบ</label>
              <select style={inp} value={batchMode} onChange={e => { setBatchMode(e.target.value as any); setSelStudent(null); setStuSearch('') }}>
                <option value="single">รายคน</option>
                <option value="room">รายห้อง</option>
                <option value="grade">รายชั้น</option>
                <option value="all">ทั้งหมด</option>
              </select>
            </div>
            {(batchMode === 'grade' || batchMode === 'room') && (
              <div>
                <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>ชั้น</label>
                <select style={inp} value={batchGrade} onChange={e => setBatchGrade(e.target.value)}>
                  <option value="">เลือกชั้น</option>
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            )}
            {/* เลือกนักเรียนรายคน */}
            {batchMode === 'single' && (
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>ค้นหานักเรียน</label>
                <input style={inp} placeholder="ชื่อ หรือ รหัสนักเรียน..."
                  value={stuSearch} onChange={e => { setStuSearch(e.target.value); setSelStudent(null) }} />
                {stuSearch.length > 1 && (
                  <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                    {students.filter(s =>
                      `${s.prefix}${s.fname}${s.lname}${s.student_id}`.includes(stuSearch)
                    ).slice(0,10).map(s => (
                      <button key={s.student_id} onClick={() => { setSelStudent(s); setStuSearch(`${s.prefix}${s.fname} ${s.lname}`) }}
                        style={{ width: '100%', padding: '8px 12px', background: selStudent?.student_id===s.student_id?'#388bfd22':'none',
                          border: 'none', borderBottom: '1px solid #21262d', color: '#e6edf3', fontSize: 13,
                          cursor: 'pointer', textAlign: 'left', fontFamily: 'Sarabun, sans-serif' }}>
                        <span style={{ color: '#8b949e', marginRight: 8 }}>{s.grade}/{s.classroom} เลขที่ {s.number}</span>
                        {s.prefix}{s.fname} {s.lname}
                      </button>
                    ))}
                  </div>
                )}
                {selStudent && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: '#388bfd22', borderRadius: 8, fontSize: 13, color: '#388bfd' }}>
                    ✅ เลือก: {selStudent.prefix}{selStudent.fname} {selStudent.lname} (รหัส: {selStudent.student_id})
                  </div>
                )}
              </div>
            )}

          {batchMode === 'room' && batchGrade && (
              <div>
                <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>ห้อง</label>
                <select style={inp} value={batchRoom} onChange={e => setBatchRoom(e.target.value)}>
                  <option value="">เลือกห้อง</option>
                  {rooms.map(r => <option key={r} value={r}>ห้อง {r}</option>)}
                </select>
              </div>
            )}
          </div>

          <div style={{ padding: '12px', background: '#21262d', borderRadius: 8, marginBottom: 12, fontSize: 13, color: '#8b949e' }}>
            จะสร้าง user สำหรับ:
            <span style={{ color: '#e6edf3', marginLeft: 8, fontWeight: 600 }}>
              {batchMode === 'all'    ? `นักเรียนทั้งหมด ${students.length} คน` :
               batchMode === 'grade'   ? `${batchGrade || '...'} — ${students.filter(s => s.grade === batchGrade).length} คน` :
               batchMode === 'single'  ? (selStudent ? `${selStudent.prefix}${selStudent.fname} ${selStudent.lname}` : 'ยังไม่ได้เลือก') :
               `${batchGrade || '...'}/${batchRoom || '...'} — ${students.filter(s => s.grade === batchGrade && s.classroom === batchRoom).length} คน`}
            </span>
            <br />
            <span>username = รหัสนักเรียน | password = {defaultPass}</span>
          </div>

          {msg && <p style={{ color: msg.startsWith('✅') ? '#2ecc71' : '#f85149', fontSize: 13, marginBottom: 8 }}>{msg}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={createBatchStudents} disabled={loading} style={{
              background: '#388bfd', color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
            }}>🎓 สร้าง User นักเรียน</button>
            {exportData.length > 0 && (
              <button onClick={exportExcel} style={{
                background: '#2ecc71', color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
              }}>📥 Download CSV ({exportData.length} คน)</button>
            )}
          </div>
          {exportData.length > 0 && (
            <p style={{ marginTop: '1rem', fontSize: 13, color: '#f39c12' }}>
              ⚠️ นำไฟล์ CSV ที่ได้ไป import เข้า Google Sheet tab Users
            </p>
          )}
        </div>
      )}

      {/* List */}
      {tab === 'list' && (
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #30363d', background: '#0d1117' }}>
                {['username','role','grade','classroom','student_id'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#8b949e', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #21262d' }}>
                  <td style={{ padding: '8px 16px', color: '#e6edf3' }}>{u.username}</td>
                  <td style={{ padding: '8px 16px' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                      background: u.role==='admin'?'#388bfd22':u.role==='teacher'?'#2ecc7122':'#f39c1222',
                      color: u.role==='admin'?'#388bfd':u.role==='teacher'?'#2ecc71':'#f39c12',
                    }}>{u.role}</span>
                  </td>
                  <td style={{ padding: '8px 16px', color: '#8b949e' }}>{u.grade}</td>
                  <td style={{ padding: '8px 16px', color: '#8b949e' }}>{u.classroom}</td>
                  <td style={{ padding: '8px 16px', color: '#8b949e' }}>{u.student_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
