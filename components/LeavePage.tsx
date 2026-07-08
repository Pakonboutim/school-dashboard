'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface LeaveRequest {
  request_id: string; timestamp: string; student_id: string
  name: string; grade: string; classroom: string; number: string
  date: string; period: string; type: string; reason: string
  image_url: string; status: string; approved_by: string; approved_at: string
}

const PERIOD_LABEL: Record<string,string> = {
  allday: '📅 ทั้งวัน', morning: '🌅 ครึ่งวันเช้า', afternoon: '🌇 ครึ่งวันบ่าย'
}
const STATUS_LABEL: Record<string,{label:string;color:string;bg:string}> = {
  pending:  { label: '⏳ รออนุมัติ', color: '#f39c12', bg: '#f39c1222' },
  approved: { label: '✅ อนุมัติแล้ว', color: '#2ecc71', bg: '#2ecc7122' },
  rejected: { label: '❌ ปฏิเสธ',    color: '#e74c3c', bg: '#e74c3c22' },
}

export default function LeavePage() {
  const { data: session } = useSession()
  const isStudent = session?.role === 'student'
  const today = new Date(Date.now() + 7*60*60*1000).toISOString().slice(0,10)

  const [tab, setTab]           = useState<'list'|'form'>(isStudent ? 'form' : 'list')
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [filter, setFilter]     = useState('pending')
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState<{text:string;ok:boolean}|null>(null)
  const [actionLoading, setActionLoading] = useState<string|null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [image, setImage]       = useState<File|null>(null)
  const [date, setDate]         = useState(today)
  const [period, setPeriod]     = useState('allday')
  const [type, setType]         = useState('ลาป่วย')
  const [reason, setReason]     = useState('')

  useEffect(() => { loadRequests() }, [filter, session])

  const loadRequests = async () => {
    if (!session) return
    const res = await fetch(`/api/leave?status=${filter}`)
    const d   = await res.json()
    setRequests(d.requests || [])
  }

  const handleSubmit = async () => {
    setLoading(true); setMsg(null)
    try {
      let imageUrl = ''
      if (image) {
        const fd = new FormData(); fd.append('file', image)
        const up = await fetch('/api/attendance/upload', { method: 'POST', body: fd })
        imageUrl = (await up.json()).url || ''
      }
      const res = await fetch('/api/leave', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: session?.studentId, name: session?.username,
          grade: session?.grade, classroom: session?.classroom, number: '',
          date, period, type, reason, image_url: imageUrl,
        }),
      })
      const d = await res.json()
      if (d.success) {
        setMsg({ text: '✅ ส่งคำขอลาสำเร็จ รอครูอนุมัติ', ok: true })
        setReason(''); setImage(null); setImagePreview('')
        setTab('list'); loadRequests()
      } else { setMsg({ text: `❌ ${d.error}`, ok: false }) }
    } catch(e:any) { setMsg({ text: `❌ ${e.message}`, ok: false }) }
    finally { setLoading(false) }
  }

  const handleAction = async (request_id: string, action: 'approve'|'reject') => {
    setActionLoading(request_id + action)
    const res = await fetch('/api/leave', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id, action }),
    })
    const d = await res.json()
    setActionLoading(null)
    if (d.success) loadRequests()
    else alert(d.error)
  }

  const inp = {
    background: '#21262d', border: '1px solid #30363d', color: '#e6edf3',
    borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none',
    fontFamily: 'Sarabun, sans-serif', width: '100%', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ fontFamily: 'Sarabun, sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: '#e6edf3', marginBottom: '1.25rem' }}>
        {isStudent ? '📋 แจ้งลา' : '📋 อนุมัติการลา'}
      </h1>

      {isStudent && (
        <div style={{ display: 'flex', gap: 4, background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 4, marginBottom: '1.25rem' }}>
          {[{key:'form',label:'📝 แจ้งลา'},{key:'list',label:'📋 ประวัติ'}].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} style={{
              flex: 1, padding: '8px', borderRadius: 8, border: 'none', fontSize: 13,
              background: tab===t.key ? '#388bfd' : 'transparent',
              color: tab===t.key ? '#fff' : '#8b949e',
              cursor: 'pointer', fontFamily: 'Sarabun, sans-serif', fontWeight: tab===t.key ? 600 : 400,
            }}>{t.label}</button>
          ))}
        </div>
      )}

      {/* ฟอร์มแจ้งลา */}
      {tab === 'form' && (
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>วันที่</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>ช่วงเวลา</label>
              <select value={period} onChange={e => setPeriod(e.target.value)} style={inp}>
                <option value="allday">📅 ทั้งวัน</option>
                <option value="morning">🌅 ครึ่งวันเช้า</option>
                <option value="afternoon">🌇 ครึ่งวันบ่าย</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 8 }}>ประเภทการลา</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['ลาป่วย','ลากิจ'].map(t => (
                <button key={t} onClick={() => setType(t)} style={{
                  padding: '10px', borderRadius: 8,
                  border: `2px solid ${type===t?'#388bfd':'#30363d'}`,
                  background: type===t?'#388bfd22':'#0d1117',
                  color: type===t?'#388bfd':'#8b949e',
                  fontSize: 14, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
                  fontWeight: type===t?600:400,
                }}>{t==='ลาป่วย'?'🏥 ลาป่วย':'📋 ลากิจ'}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>เหตุผล</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="ระบุเหตุผล..." rows={3} style={{ ...inp, resize: 'none' }} />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>แนบใบลา / ใบรับรองแพทย์</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={e => {
              const f = e.target.files?.[0]; if (!f) return; setImage(f)
              const reader = new FileReader(); reader.onload = ev => setImagePreview(ev.target?.result as string); reader.readAsDataURL(f)
            }} style={{ display: 'none' }} />
            <button onClick={() => fileRef.current?.click()} style={{
              width: '100%', padding: '12px', background: '#21262d',
              border: '2px dashed #30363d', borderRadius: 8, color: '#8b949e',
              cursor: 'pointer', fontSize: 13, fontFamily: 'Sarabun, sans-serif',
            }}>{image ? `📎 ${image.name}` : '📎 คลิกเพื่อแนบรูปภาพ'}</button>
            {imagePreview && (
              <div style={{ marginTop: 8, position: 'relative' }}>
                <img src={imagePreview} style={{ width: '100%', borderRadius: 8, maxHeight: 180, objectFit: 'cover' }} />
                <button onClick={() => { setImage(null); setImagePreview('') }} style={{
                  position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)',
                  border: 'none', color: '#fff', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer',
                }}>✕</button>
              </div>
            )}
          </div>

          {msg && <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontSize: 13,
            background: msg.ok?'#2ecc7122':'#e74c3c22', color: msg.ok?'#2ecc71':'#e74c3c' }}>{msg.text}</div>}

          <button onClick={handleSubmit} disabled={loading} style={{
            width: '100%', background: loading?'#30363d':'#388bfd',
            color: loading?'#8b949e':'#fff', border: 'none', borderRadius: 10,
            padding: '12px', fontSize: 15, fontWeight: 600,
            cursor: loading?'not-allowed':'pointer', fontFamily: 'Sarabun, sans-serif',
          }}>{loading ? '⏳ กำลังส่ง...' : '📤 ส่งคำขอลา'}</button>
        </div>
      )}

      {/* รายการ */}
      {tab === 'list' && (
        <>
          {!isStudent && (
            <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
              {[{k:'pending',l:'⏳ รออนุมัติ'},{k:'approved',l:'✅ อนุมัติ'},{k:'rejected',l:'❌ ปฏิเสธ'}].map(s => (
                <button key={s.k} onClick={() => setFilter(s.k)} style={{
                  padding: '6px 14px', borderRadius: 20, border: 'none', fontSize: 13,
                  background: filter===s.k?'#388bfd':'#21262d',
                  color: filter===s.k?'#fff':'#8b949e',
                  cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
                }}>{s.l}</button>
              ))}
            </div>
          )}

          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#8b949e', background: '#161b22', borderRadius: 12 }}>
              ไม่มีรายการ
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {requests.map(r => {
                const st = STATUS_LABEL[r.status] || STATUS_LABEL.pending
                return (
                  <div key={r.request_id} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#e6edf3' }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }}>{r.grade}/{r.classroom} · เลขที่ {r.number}</div>
                      </div>
                      <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color, fontWeight: 600 }}>{st.label}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: r.image_url||r.approved_by?10:0 }}>
                      {[
                        {l:'วันที่',v:r.date},
                        {l:'ช่วงเวลา',v:PERIOD_LABEL[r.period]||r.period},
                        {l:'ประเภท',v:r.type},
                        ...(r.reason?[{l:'เหตุผล',v:r.reason}]:[]),
                      ].map((item,i) => (
                        <div key={i} style={{ background: '#0d1117', borderRadius: 8, padding: '8px 12px' }}>
                          <div style={{ fontSize: 11, color: '#6e7681' }}>{item.l}</div>
                          <div style={{ fontSize: 13, color: '#e6edf3' }}>{item.v}</div>
                        </div>
                      ))}
                    </div>

                    {r.image_url && <img src={r.image_url} style={{ width: '100%', borderRadius: 8, maxHeight: 160, objectFit: 'cover', marginBottom: 10 }} />}
                    {r.approved_by && <div style={{ fontSize: 12, color: '#6e7681', marginBottom: 10 }}>{r.status==='approved'?'✅':'❌'} โดย {r.approved_by} · {r.approved_at}</div>}

                    {!isStudent && r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleAction(r.request_id,'approve')} disabled={actionLoading===r.request_id+'approve'} style={{
                          flex: 1, padding: '10px', background: '#2ecc7122', color: '#2ecc71',
                          border: '1px solid #2ecc7144', borderRadius: 8, fontSize: 14, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
                        }}>{actionLoading===r.request_id+'approve'?'⏳...':'✅ อนุมัติ'}</button>
                        <button onClick={() => handleAction(r.request_id,'reject')} disabled={actionLoading===r.request_id+'reject'} style={{
                          flex: 1, padding: '10px', background: '#e74c3c22', color: '#e74c3c',
                          border: '1px solid #e74c3c44', borderRadius: 8, fontSize: 14, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
                        }}>{actionLoading===r.request_id+'reject'?'⏳...':'❌ ปฏิเสธ'}</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
