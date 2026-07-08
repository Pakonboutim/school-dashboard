'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface Student {
  student_id: string; prefix: string; fname: string; lname: string
  grade: string; classroom: string; number: string
}

const STATUS_OPTIONS = [
  { value: 'มาเรียนปกติ', label: '✅ มาเรียนปกติ', color: '#2ecc71' },
  { value: 'มาสาย',       label: '⏰ มาสาย',        color: '#f39c12' },
  { value: 'ลากิจ',       label: '📋 ลากิจ',        color: '#3498db' },
  { value: 'ลาป่วย',      label: '🏥 ลาป่วย',       color: '#9b59b6' },
]
const PERIOD_OPTIONS = [
  { value: 'morning',   label: '🌅 ช่วงเช้า' },
  { value: 'afternoon', label: '🌇 ช่วงบ่าย' },
  { value: 'allday',    label: '📅 ทั้งวัน' },
]

export default function AttendancePage() {
  const { data: session } = useSession()
  const isTeacher = session?.role === 'teacher'
  const today = new Date(Date.now() + 7*60*60*1000).toISOString().slice(0, 10)

  const [grades, setGrades]           = useState<string[]>([])
  const [rooms, setRooms]             = useState<string[]>([])
  const [selGrade, setSelGrade]       = useState('')
  const [selRoom, setSelRoom]         = useState('')
  const [students, setStudents]       = useState<Student[]>([])
  const [date, setDate]               = useState(today)
  const [period, setPeriod]           = useState('morning')
  const [search, setSearch]           = useState('')
  const [selected, setSelected]       = useState<Student | null>(null)
  const [status, setStatus]           = useState('มาเรียนปกติ')
  const [note, setNote]               = useState('')
  const [image, setImage]             = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [loading, setLoading]         = useState(false)
  const [msg, setMsg]                 = useState<{text: string; ok: boolean} | null>(null)
  const [saved, setSaved]             = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isTeacher) {
      setSelGrade(session?.grade || '')
      setSelRoom(session?.classroom || '')
    } else {
      fetch('/api/students').then(r => r.json()).then(d => {
        const gs = Array.from(new Set<string>((d.students||[]).map((s:any) => s.grade))).sort() as string[]
        setGrades(gs)
      })
    }
  }, [session])

  useEffect(() => {
    if (!selGrade || isTeacher) return
    fetch(`/api/students?grade=${selGrade}`).then(r => r.json()).then(d => {
      const rs = Array.from(new Set<string>((d.students||[]).map((s:any) => s.classroom)))
        .sort((a:string,b:string) => parseInt(a)-parseInt(b)) as string[]
      setRooms(rs); setSelRoom('')
    })
  }, [selGrade])

  useEffect(() => {
    const g = isTeacher ? session?.grade : selGrade
    const r = isTeacher ? session?.classroom : selRoom
    if (!g || !r) return
    fetch(`/api/attendance?grade=${g}&classroom=${r}`)
      .then(res => res.json()).then(d => setStudents(d.students || []))
  }, [selGrade, selRoom, session])

  const filtered = students.filter(s =>
    !search || `${s.prefix}${s.fname}${s.lname}${s.number}`.includes(search)
  )

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setImage(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!selected) return
    setLoading(true); setMsg(null)
    try {
      let imageUrl = ''
      if (image) {
        const formData = new FormData(); formData.append('file', image)
        const upRes = await fetch('/api/attendance/upload', { method: 'POST', body: formData })
        const upData = await upRes.json()
        imageUrl = upData.url || ''
      }
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selected.student_id,
          student_name: `${selected.prefix}${selected.fname} ${selected.lname}`,
          prefix: selected.prefix, grade: selected.grade,
          classroom: selected.classroom, number: selected.number,
          date, status, period, note, image_url: imageUrl,
        }),
      })
      const d = await res.json()
      if (d.success) {
        setMsg({ text: `✅ บันทึก ${selected.prefix}${selected.fname} — ${status} สำเร็จ`, ok: true })
        setSaved(prev => new Set(prev).add(selected.student_id))
        setSelected(null); setNote(''); setImage(null); setImagePreview('')
      } else {
        setMsg({ text: `❌ ${d.error}`, ok: false })
      }
    } catch (e: any) {
      setMsg({ text: `❌ ${e.message}`, ok: false })
    } finally { setLoading(false) }
  }

  const inp = {
    background: '#21262d', border: '1px solid #30363d', color: '#e6edf3',
    borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none',
    fontFamily: 'Sarabun, sans-serif', width: '100%', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ fontFamily: 'Sarabun, sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: '#e6edf3', marginBottom: '1.5rem' }}>
        📝 บันทึกการลา / เช็คมาย้อนหลัง
      </h1>
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* ซ้าย */}
        <div>
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>วันที่</label>
                <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>ช่วงเวลา</label>
                <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
                  {PERIOD_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            {!isTeacher && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>ชั้น</label>
                  <select value={selGrade} onChange={e => setSelGrade(e.target.value)} style={inp}>
                    <option value="">เลือกชั้น</option>
                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>ห้อง</label>
                  <select value={selRoom} onChange={e => setSelRoom(e.target.value)} style={inp}>
                    <option value="">เลือกห้อง</option>
                    {rooms.map(r => <option key={r} value={r}>ห้อง {r}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <input placeholder="🔍 ค้นหาชื่อหรือเลขที่..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ ...inp, marginBottom: '0.75rem' }} />

          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, overflow: 'hidden', maxHeight: 460, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#8b949e' }}>
                {students.length === 0 ? 'เลือกชั้น/ห้องก่อน' : 'ไม่พบนักเรียน'}
              </div>
            ) : filtered.map(s => {
              const isSaved  = saved.has(s.student_id)
              const isActive = selected?.student_id === s.student_id
              return (
                <button key={s.student_id} onClick={() => setSelected(isActive ? null : s)} style={{
                  width: '100%', padding: '10px 16px',
                  background: isActive ? '#388bfd22' : 'transparent',
                  border: 'none', borderBottom: '1px solid #21262d',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  textAlign: 'left', fontFamily: 'Sarabun, sans-serif',
                }}>
                  <span style={{ fontSize: 12, color: '#6e7681', minWidth: 28 }}>{s.number}</span>
                  <span style={{ flex: 1, fontSize: 14, color: isActive ? '#388bfd' : '#e6edf3' }}>
                    {s.prefix}{s.fname} {s.lname}
                  </span>
                  {isSaved && <span style={{ fontSize: 11, color: '#2ecc71' }}>✅</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* ขวา */}
        <div>
          {!selected ? (
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '3rem', textAlign: 'center', color: '#8b949e' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👈</div>
              <div>เลือกนักเรียนจากรายชื่อ</div>
            </div>
          ) : (
            <div style={{ background: '#161b22', border: '1px solid #388bfd44', borderRadius: 12, padding: '1.25rem' }}>
              <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#0d1117', borderRadius: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#e6edf3' }}>
                  {selected.prefix}{selected.fname} {selected.lname}
                </div>
                <div style={{ fontSize: 13, color: '#8b949e', marginTop: 4 }}>
                  {selected.grade}/{selected.classroom} เลขที่ {selected.number} • {date} • {PERIOD_OPTIONS.find(p => p.value === period)?.label}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 8 }}>สถานะ</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {STATUS_OPTIONS.map(s => (
                    <button key={s.value} onClick={() => setStatus(s.value)} style={{
                      padding: '10px', borderRadius: 8,
                      border: `2px solid ${status === s.value ? s.color : '#30363d'}`,
                      background: status === s.value ? s.color + '22' : '#0d1117',
                      color: status === s.value ? s.color : '#8b949e',
                      fontSize: 13, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
                      fontWeight: status === s.value ? 600 : 400,
                    }}>{s.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>หมายเหตุ</label>
                <input value={note} onChange={e => setNote(e.target.value)}
                  placeholder="เหตุผล / หมายเหตุ..." style={inp} />
              </div>

              {(status === 'ลากิจ' || status === 'ลาป่วย') && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>
                    แนบใบลา / หลักฐาน
                  </label>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  <button onClick={() => fileRef.current?.click()} style={{
                    width: '100%', padding: '10px', background: '#21262d',
                    border: '2px dashed #30363d', borderRadius: 8,
                    color: '#8b949e', cursor: 'pointer', fontSize: 13, fontFamily: 'Sarabun, sans-serif',
                  }}>
                    {image ? `📎 ${image.name}` : '📎 คลิกเพื่อแนบรูปภาพ'}
                  </button>
                  {imagePreview && (
                    <div style={{ marginTop: 8, position: 'relative' }}>
                      <img src={imagePreview} style={{ width: '100%', borderRadius: 8, maxHeight: 160, objectFit: 'cover' }} />
                      <button onClick={() => { setImage(null); setImagePreview('') }} style={{
                        position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.7)',
                        border: 'none', color: '#fff', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer',
                      }}>✕</button>
                    </div>
                  )}
                </div>
              )}

              {msg && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, marginBottom: '1rem', fontSize: 13,
                  background: msg.ok ? '#2ecc7122' : '#e74c3c22',
                  color: msg.ok ? '#2ecc71' : '#e74c3c',
                }}>{msg.text}</div>
              )}

              <button onClick={handleSubmit} disabled={loading} style={{
                width: '100%', background: loading ? '#30363d' : '#388bfd',
                color: loading ? '#8b949e' : '#fff', border: 'none', borderRadius: 10,
                padding: '12px', fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Sarabun, sans-serif',
              }}>
                {loading ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
