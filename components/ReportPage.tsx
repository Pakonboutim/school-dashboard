'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

const REPORT_TYPES = [
  { key: 'absent',      label: '❌ นักเรียนขาดเรียน',        desc: 'รายชื่อนักเรียนที่ขาดเรียนในวันที่เลือก' },
  { key: 'not_home',    label: '🏠 ไม่สแกนกลับบ้าน',          desc: 'รายชื่อนักเรียนที่ยังไม่สแกนกลับบ้าน' },
  { key: 'late',        label: '⏰ มาสาย',                    desc: 'รายชื่อนักเรียนที่มาสาย' },
  { key: 'leave',       label: '📋 ลากิจ/ลาป่วย',             desc: 'รายชื่อนักเรียนที่ลาในวันที่เลือก' },
  { key: 'monthly',     label: '📅 รายงานรายเดือน',            desc: 'สรุปการเข้าเรียนรายเดือน' },
]

export default function ReportPage() {
  const { data: session } = useSession()
  const isTeacher = session?.role === 'teacher'
  const today = new Date(Date.now() + 7*60*60*1000).toISOString().slice(0,10)

  const [reportType, setReportType] = useState('absent')
  const [date, setDate]             = useState(today)
  const [month, setMonth]           = useState(today.slice(0,7))
  const [grades, setGrades]         = useState<string[]>([])
  const [rooms, setRooms]           = useState<string[]>([])
  const [selGrade, setSelGrade]     = useState(isTeacher ? session?.grade || '' : '')
  const [selRoom, setSelRoom]       = useState(isTeacher ? session?.classroom || '' : '')
  const [loading, setLoading]       = useState(false)
  const [preview, setPreview]       = useState<any[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    if (isTeacher) return
    fetch('/api/students').then(r => r.json()).then(d => {
      const gs = Array.from(new Set<string>((d.students||[]).map((s:any) => s.grade))).sort() as string[]
      setGrades(gs)
    })
  }, [])

  useEffect(() => {
    if (!selGrade || isTeacher) return
    fetch(`/api/students?grade=${selGrade}`).then(r => r.json()).then(d => {
      const rs = Array.from(new Set<string>((d.students||[]).map((s:any) => s.classroom)))
        .sort((a:string,b:string) => parseInt(a)-parseInt(b)) as string[]
      setRooms(rs); setSelRoom('')
    })
  }, [selGrade])

  // Preview
  useEffect(() => {
    loadPreview()
  }, [reportType, date, month, selGrade, selRoom])

  const loadPreview = async () => {
    setPreviewLoading(true)
    const params = new URLSearchParams({
      type: reportType,
      date: reportType === 'monthly' ? month + '-01' : date,
      grade: selGrade, classroom: selRoom || '',
    })
    try {
      const res = await fetch(`/api/report/export?${params}&preview=1`)
      const d   = await res.json()
      setPreview(d.rows || [])
    } catch { setPreview([]) }
    finally { setPreviewLoading(false) }
  }

  const handleExport = async () => {
    setLoading(true)
    const params = new URLSearchParams({
      type: reportType,
      date: reportType === 'monthly' ? month + '-01' : date,
      grade: selGrade, classroom: selRoom || '',
    })
    try {
      const res  = await fetch(`/api/report/export?${params}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      const label = REPORT_TYPES.find(r => r.key === reportType)?.label || reportType
      a.download = `${label}_${selGrade}${selRoom ? '_ห้อง'+selRoom : ''}_${date || month}.csv`
      a.click(); URL.revokeObjectURL(url)
    } catch(e) { alert('เกิดข้อผิดพลาด') }
    finally { setLoading(false) }
  }

  const inp = {
    background: '#21262d', border: '1px solid #30363d', color: '#e6edf3',
    borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none',
    fontFamily: 'Sarabun, sans-serif', width: '100%', boxSizing: 'border-box' as const,
  }

  const isMonthly = reportType === 'monthly'

  return (
    <div style={{ fontFamily: 'Sarabun, sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: '#e6edf3', marginBottom: '1.5rem' }}>
        📤 Export รายงาน
      </h1>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
        {/* ซ้าย — ตัวเลือก */}
        <div>
          {/* ประเภทรายงาน */}
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, overflow: 'hidden', marginBottom: '1rem' }}>
            {REPORT_TYPES.map((r, i) => (
              <button key={r.key} onClick={() => setReportType(r.key)} style={{
                width: '100%', padding: '12px 16px', background: reportType===r.key ? '#388bfd15' : 'transparent',
                border: 'none', borderBottom: i < REPORT_TYPES.length-1 ? '1px solid #21262d' : 'none',
                borderLeft: reportType===r.key ? '3px solid #388bfd' : '3px solid transparent',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'Sarabun, sans-serif',
              }}>
                <div style={{ fontSize: 14, color: reportType===r.key ? '#388bfd' : '#e6edf3', fontWeight: reportType===r.key ? 600 : 400 }}>
                  {r.label}
                </div>
                <div style={{ fontSize: 12, color: '#6e7681', marginTop: 2 }}>{r.desc}</div>
              </button>
            ))}
          </div>

          {/* ตัวกรอง */}
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* วันที่ / เดือน */}
            <div>
              <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>
                {isMonthly ? 'เดือน' : 'วันที่'}
              </label>
              {isMonthly
                ? <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={inp} />
                : <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} style={inp} />
              }
            </div>

            {/* ชั้น */}
            {!isTeacher && (
              <div>
                <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>ชั้น</label>
                <select value={selGrade} onChange={e => setSelGrade(e.target.value)} style={inp}>
                  <option value="">ทุกชั้น</option>
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            )}

            {/* ห้อง */}
            {!isTeacher && selGrade && (
              <div>
                <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>ห้อง</label>
                <select value={selRoom} onChange={e => setSelRoom(e.target.value)} style={inp}>
                  <option value="">ทุกห้อง</option>
                  {rooms.map(r => <option key={r} value={r}>ห้อง {r}</option>)}
                </select>
              </div>
            )}

            <button onClick={handleExport} disabled={loading} style={{
              padding: '10px', background: loading ? '#30363d' : '#388bfd',
              color: loading ? '#8b949e' : '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Sarabun, sans-serif',
            }}>
              {loading ? '⏳ กำลัง Export...' : '📥 Download CSV'}
            </button>
          </div>
        </div>

        {/* ขวา — Preview */}
        <div>
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #21262d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#e6edf3' }}>
                {REPORT_TYPES.find(r => r.key === reportType)?.label}
              </span>
              <span style={{ fontSize: 12, color: '#8b949e' }}>
                {selGrade ? `${selGrade}${selRoom ? '/'+selRoom : ''}` : 'ทุกชั้น'} · {isMonthly ? month : date}
              </span>
            </div>

            {previewLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#8b949e' }}>กำลังโหลด...</div>
            ) : preview.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#8b949e' }}>
                ไม่มีข้อมูล
              </div>
            ) : (
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#0d1117' }}>
                      {Object.keys(preview[0]).map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#8b949e', fontWeight: 500, borderBottom: '1px solid #21262d' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 50).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #21262d' }}>
                        {Object.values(row).map((v: any, j) => (
                          <td key={j} style={{ padding: '8px 12px', color: '#e6edf3' }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 50 && (
                  <div style={{ padding: '8px 16px', color: '#6e7681', fontSize: 12, textAlign: 'center' }}>
                    แสดง 50 จาก {preview.length} รายการ — Download CSV เพื่อดูทั้งหมด
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
