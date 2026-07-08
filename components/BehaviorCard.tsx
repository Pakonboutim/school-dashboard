'use client'
import { useState, useEffect } from 'react'

interface Log {
  timestamp: string
  rule_name: string
  points: string
  note: string
  evidence_url: string
  teacher_user: string
}

interface Props {
  studentId: string
}

export default function BehaviorCard({ studentId }: Props) {
  const [score, setScore]   = useState<number | null>(null)
  const [logs, setLogs]     = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch(`/api/behavior?student_id=${studentId}`)
      .then(r => r.json())
      .then(d => {
        setScore(d.score ?? 100)
        setLogs(d.logs || [])
      })
      .catch(() => setScore(100))
      .finally(() => setLoading(false))
  }, [studentId])

  const thDate = (ts: string) => {
    try {
      return new Date(ts.slice(0,10) + 'T12:00:00').toLocaleDateString('th-TH', {
        day: 'numeric', month: 'short', year: '2-digit'
      })
    } catch { return ts.slice(0,10) }
  }

  // วาด half circle gauge
  const ScoreGauge = ({ value }: { value: number }) => {
    const pct     = Math.max(0, Math.min(100, value))
    const radius  = 70
    const stroke  = 12
    const cx      = 90
    const cy      = 90
    // half circle = semicircle จาก 180° ถึง 0° (ซ้ายไปขวา)
    const circumference = Math.PI * radius // ครึ่งวงกลม
    const offset  = circumference * (1 - pct / 100)
    const color   = pct >= 80 ? '#2ecc71' : pct >= 60 ? '#f39c12' : '#e74c3c'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <svg width={180} height={100} viewBox="0 0 180 100">
          {/* track */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none" stroke="#30363d" strokeWidth={stroke} strokeLinecap="round"
          />
          {/* progress */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
          {/* ตัวเลข */}
          <text x={cx} y={cy - 8} textAnchor="middle" fill={color}
            fontSize="30" fontWeight="700" fontFamily="Sarabun, sans-serif">{value}</text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="#8b949e"
            fontSize="12" fontFamily="Sarabun, sans-serif">คะแนน</text>
        </svg>
        <div style={{ display: 'flex', gap: 24, marginTop: -8 }}>
          <span style={{ fontSize: 11, color: '#6e7681' }}>0</span>
          <span style={{ fontSize: 11, color: '#6e7681' }}>100</span>
        </div>
      </div>
    )
  }

  const displayLogs = showAll ? logs : logs.slice(0, 5)

  return (
    <div style={{ fontFamily: 'Sarabun, sans-serif' }}>
      {/* Gauge card */}
      <div style={{
        background: '#161b22', border: '1px solid #30363d',
        borderRadius: 12, padding: '1.25rem', marginBottom: 12,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{ fontSize: 14, color: '#8b949e', marginBottom: 8 }}>คะแนนความประพฤติ</div>
        {loading ? (
          <div style={{ color: '#6e7681', padding: '2rem' }}>กำลังโหลด...</div>
        ) : (
          <>
            <ScoreGauge value={score ?? 100} />
            <div style={{ marginTop: 4, fontSize: 13, color: (score ?? 100) >= 80 ? '#2ecc71' : (score ?? 100) >= 60 ? '#f39c12' : '#e74c3c', fontWeight: 600 }}>
              {(score ?? 100) >= 80 ? '🌟 ดีเยี่ยม' : (score ?? 100) >= 60 ? '⚠️ ควรปรับปรุง' : '❌ ต้องแก้ไข'}
            </div>
          </>
        )}
      </div>

      {/* ประวัติ */}
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #21262d' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>📜 ประวัติคะแนน</span>
        </div>

        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#8b949e', fontSize: 13 }}>
            ยังไม่มีประวัติคะแนน
          </div>
        ) : (
          <>
            {displayLogs.map((log, i) => {
              const pts    = parseInt(log.points) || 0
              const isAdd  = pts > 0
              const color  = isAdd ? '#2ecc71' : '#e74c3c'
              const bg     = isAdd ? '#2ecc7115' : '#e74c3c15'
              return (
                <div key={i} style={{
                  padding: '12px 16px',
                  borderBottom: i < displayLogs.length-1 ? '1px solid #21262d' : 'none',
                  background: bg,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#e6edf3', fontWeight: 500 }}>{log.rule_name}</div>
                      {log.note && <div style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }}>{log.note}</div>}
                      <div style={{ fontSize: 11, color: '#6e7681', marginTop: 4 }}>
                        {thDate(log.timestamp)} · {log.teacher_user}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                      <span style={{
                        fontSize: 18, fontWeight: 700, color,
                        lineHeight: 1,
                      }}>
                        {pts > 0 ? `+${pts}` : pts}
                      </span>
                      {log.evidence_url && (
                        <a href={log.evidence_url} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, color: '#388bfd', marginTop: 4 }}>
                          ดูหลักฐาน
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {logs.length > 5 && (
              <button onClick={() => setShowAll(!showAll)} style={{
                width: '100%', padding: '10px', background: 'none', border: 'none',
                color: '#388bfd', fontSize: 13, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
              }}>
                {showAll ? '▲ แสดงน้อยลง' : `▼ ดูทั้งหมด ${logs.length} รายการ`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
