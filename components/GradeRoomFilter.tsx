'use client'
import { useRouter } from 'next/navigation'

interface Props {
  grades:    string[]
  rooms:     string[]
  selGrade:  string
  selRoom:   string
  basePath:  string
}

export default function GradeRoomFilter({ grades, rooms, selGrade, selRoom, basePath }: Props) {
  const router = useRouter()

  const sel = {
    background: '#21262d', border: '1px solid #30363d', color: '#e6edf3',
    borderRadius: 8, padding: '7px 12px', fontSize: 13, outline: 'none',
    fontFamily: 'Sarabun, sans-serif', cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: '1.25rem' }}>
      <select value={selGrade}
        onChange={e => router.push(`${basePath}?grade=${e.target.value}`)}
        style={sel}>
        <option value="">ทุกชั้น</option>
        {grades.map(g => <option key={g} value={g}>{g}</option>)}
      </select>

      {selGrade && (
        <select value={selRoom}
          onChange={e => router.push(`${basePath}?grade=${selGrade}&classroom=${e.target.value}`)}
          style={sel}>
          <option value="">ทุกห้อง</option>
          {rooms.map(r => <option key={r} value={r}>ห้อง {r}</option>)}
        </select>
      )}
    </div>
  )
}
