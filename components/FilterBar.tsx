'use client'
import { useRouter } from 'next/navigation'

interface FilterBarProps {
  grades:       string[]
  rooms:        string[]
  selGrade:     string
  selRoom:      string
  selDate?:     string
  basePath:     string
  showDate?:    boolean
  showGradeRoom?: boolean
}

export default function FilterBar({
  grades, rooms, selGrade, selRoom, selDate, basePath, showDate = false, showGradeRoom = true
}: FilterBarProps) {
  const router = useRouter()
  // หาวันที่ปัจจุบันในโซนเวลาไทย (รูปแบบ YYYY-MM-DD)
  const today  = new Date(Date.now() + 7*60*60*1000).toISOString().slice(0, 10)

  const buildUrl = (params: Record<string, string>) => {
    const p = new URLSearchParams({
      grade: selGrade, 
      classroom: selRoom,
      ...(showDate ? { date: params.date || selDate || today } : {}),
      ...params,
    })
    return `${basePath}?${p.toString()}`
  }

  // สไตล์กลางสำหรับ input/select ให้เข้ากับธีมมืดเดิมของคุณ
  const sel = {
    background: '#21262d', border: '1px solid #30363d', color: '#e6edf3',
    borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none',
    fontFamily: 'Sarabun, sans-serif', cursor: 'pointer', minHeight: '38px',
  }

  return (
    <div style={{
      background: '#161b22', border: '1px solid #30363d', borderRadius: 12,
      padding: '1rem', marginBottom: '1.25rem',
    }}>
      <div className="filter-bar" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        
        {/* ปฏิทินเลือกวันที่ */}
        {showDate && (
          <div>
            <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 4 }}>วันที่</div>
            <input 
              type="date"
              style={sel}
              value={selDate || today}
              onChange={e => router.push(buildUrl({ date: e.target.value }))}
            />
          </div>
        )}

        {/* เลือกชั้น */}
        {showGradeRoom && (
          <div>
            <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 4 }}>ชั้น</div>
            <select style={sel} value={selGrade}
              onChange={e => router.push(buildUrl({ grade: e.target.value, classroom: '' }))}>
              <option value="">ทุกชั้น</option>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        )}

        {/* เลือกห้อง */}
        {showGradeRoom && (
          <div>
            <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 4 }}>ห้อง</div>
            <select style={sel} value={selRoom}
              onChange={e => router.push(buildUrl({ classroom: e.target.value }))}>
              <option value="">ทุกห้อง</option>
              {rooms.map(r => <option key={r} value={r}>ห้อง {r}</option>)}
            </select>
          </div>
        )}

        {/* ปุ่มล้างตัวกรอง */}
        {(selGrade || selRoom || (showDate && selDate && selDate !== today)) && (
          <button onClick={() => router.push(basePath)} style={{
            background: 'none', border: 'none', color: '#8b949e',
            fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
            fontFamily: 'Sarabun, sans-serif', paddingBottom: 10,
          }}>ล้างตัวกรอง</button>
        )}
      </div>
    </div>
  )
}