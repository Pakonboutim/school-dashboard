'use client'
import { useState } from 'react'
import LeavePage from '@/components/LeavePage'
import BehaviorCard from '@/components/BehaviorCard'

interface CheckinRec {
  timestamp: string; student_id: string; status: string
  time: string; image_url: string; note?: string
  fname: string; lname: string; prefix: string
}

interface Props {
  records:     CheckinRec[]
  stats:       { present: number; late: number; leaveCount: number; absent: number; pct: number; total: number; scanned: number }
  todayMorn:   CheckinRec | null
  todayHome:   CheckinRec | null
  studentInfo: any
  studentId:   string
  grade:       string
  classroom:   string
}

const STATUS_STYLE: {[key: string]: {color:string;bg:string;label:string}} = {
  'มาเรียนปกติ': { color: '#2ecc71', bg: '#2ecc7122', label: 'มาปกติ' },
  'มาสาย':       { color: '#f39c12', bg: '#f39c1222', label: 'มาสาย'  },
  'กลับบ้าน':    { color: '#3498db', bg: '#3498db22', label: 'กลับบ้าน' },
  'ขาด':         { color: '#e74c3c', bg: '#e74c3c22', label: 'ขาด'    },
  'ลากิจ':       { color: '#3498db', bg: '#3498db22', label: 'ลากิจ'  },
  'ลาป่วย':      { color: '#9b59b6', bg: '#9b59b622', label: 'ลาป่วย' },
}

export default function StudentClient({ records, stats, todayMorn, todayHome, studentInfo, studentId, grade, classroom }: Props) {
  const [tab, setTab]     = useState<'overview'|'history'|'behavior'|'leave'>('overview')
  const [selRec, setSelRec] = useState<CheckinRec | null>(null)

  const thDate = (ts: string) => {
    try {
      return new Date(ts.slice(0,10) + 'T12:00:00').toLocaleDateString('th-TH', {
        weekday: 'short', day: 'numeric', month: 'short'
      })
    } catch { return ts.slice(0,10) }
  }

  const tabs = [
    { key: 'overview',  label: '📊 ภาพรวม' },
    { key: 'history',   label: '📋 ประวัติ' },
    { key: 'behavior',  label: '⭐ คะแนน'   },
    { key: 'leave',     label: '📝 แจ้งลา'  },
  ]

  return (
    <div style={{ fontFamily: 'Sarabun, sans-serif', maxWidth: 600, margin: '0 auto' }}>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: 4, marginBottom: '1.25rem' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            flex: 1, padding: '9px', borderRadius: 8, border: 'none', fontSize: 13,
            background: tab === t.key ? '#388bfd' : 'transparent',
            color: tab === t.key ? '#fff' : '#8b949e',
            cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
            fontWeight: tab === t.key ? 600 : 400,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ─── ภาพรวม ─── */}
      {tab === 'overview' && (
        <div>
          {/* Progress */}
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1.25rem', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: '#8b949e' }}>อัตราการมาเรียน</span>
              <span style={{ fontSize: 26, fontWeight: 600,
                color: stats.pct >= 80 ? '#2ecc71' : stats.pct >= 60 ? '#f39c12' : '#e74c3c' }}>
                {stats.pct}%
              </span>
            </div>
            <div style={{ background: '#21262d', borderRadius: 6, height: 8, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 6, transition: 'width 0.5s',
                background: stats.pct >= 80 ? '#2ecc71' : stats.pct >= 60 ? '#f39c12' : '#e74c3c',
                width: `${stats.pct}%`,
              }} />
            </div>
            <div style={{ fontSize: 12, color: '#6e7681', marginTop: 6 }}>
              มาแล้ว {stats.scanned} วัน จาก {stats.total} วันเรียน
            </div>
          </div>

          {/* Stats 4 กล่อง */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
            {[
              { label: 'มาเรียนปกติ', value: stats.present,    color: '#2ecc71', icon: '✅' },
              { label: 'มาสาย',      value: stats.late,        color: '#f39c12', icon: '⏰' },
              { label: 'ขาดเรียน',   value: stats.absent,      color: '#e74c3c', icon: '❌' },
              { label: 'ลา',         value: stats.leaveCount,  color: '#9b59b6', icon: '📋' },
            ].map(s => (
              <div key={s.label} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* วันนี้ */}
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: 13, color: '#8b949e', marginBottom: 10 }}>วันนี้</div>
            {!todayMorn && !todayHome ? (
              <div style={{ color: '#6e7681', fontSize: 14 }}>ยังไม่มีข้อมูลวันนี้</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todayMorn && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: '#21262d', overflow: 'hidden', flexShrink: 0 }}>
                      {todayMorn.image_url
                        ? <img src={todayMorn.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>😊</div>
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#e6edf3' }}>ช่วงเช้า</span>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                          background: STATUS_STYLE[todayMorn.status]?.bg || '#21262d',
                          color: STATUS_STYLE[todayMorn.status]?.color || '#8b949e',
                        }}>{todayMorn.time?.slice(0,5)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }}>
                        {STATUS_STYLE[todayMorn.status]?.label || todayMorn.status}
                      </div>
                    </div>
                  </div>
                )}
                {todayHome && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: '#21262d', overflow: 'hidden', flexShrink: 0 }}>
                      {todayHome.image_url
                        ? <img src={todayHome.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏠</div>
                      }
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#e6edf3' }}>กลับบ้าน</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: '#3498db22', color: '#3498db' }}>
                          {todayHome.time?.slice(0,5)}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#8b949e', marginTop: 2 }}>สแกนกลับบ้านแล้ว</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── ประวัติ ─── */}
      {tab === 'history' && (
        <div>
          {records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#8b949e', background: '#161b22', borderRadius: 12 }}>
              ยังไม่มีข้อมูล
            </div>
          ) : (
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, overflow: 'hidden' }}>
              {records.map((r, i) => {
                const st = STATUS_STYLE[r.status] || { color: '#8b949e', bg: '#21262d', label: r.status }
                return (
                  <div key={i} onClick={() => setSelRec(selRec === r ? null : r)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderBottom: i < records.length-1 ? '1px solid #21262d' : 'none',
                    cursor: 'pointer', background: selRec === r ? '#21262d' : 'transparent',
                  }}>
                    {/* รูป */}
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: '#21262d', overflow: 'hidden', flexShrink: 0 }}>
                      {r.image_url
                        ? <img src={r.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>😊</div>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#e6edf3', fontWeight: 500 }}>{thDate(r.timestamp)}</div>
                      <div style={{ fontSize: 12, color: '#6e7681' }}>{r.time?.slice(0,5) || '-'}</div>
                    </div>
                    <span style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0,
                      background: st.bg, color: st.color,
                    }}>{st.label}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Modal รูป */}
          {selRec && selRec.image_url && (
            <div onClick={() => setSelRec(null)} style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
              zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            }}>
              <div onClick={e => e.stopPropagation()} style={{ background: '#161b22', borderRadius: 16, overflow: 'hidden', maxWidth: 480, width: '100%' }}>
                <div style={{ position: 'relative', aspectRatio: '16/9' }}>
                  <img src={selRec.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => setSelRec(null)} style={{
                    position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)',
                    border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16,
                  }}>✕</button>
                </div>
                <div style={{ padding: '1rem' }}>
                  <div style={{ fontSize: 14, color: '#e6edf3', fontWeight: 500 }}>{thDate(selRec.timestamp)}</div>
                  <div style={{ fontSize: 13, color: '#8b949e', marginTop: 4 }}>
                    {STATUS_STYLE[selRec.status]?.label || selRec.status} · {selRec.time?.slice(0,5)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── คะแนนความประพฤติ ─── */}
      {tab === 'behavior' && <BehaviorCard studentId={studentId} />}

      {/* ─── แจ้งลา ─── */}
      {tab === 'leave' && <LeavePage />}
    </div>
  )
}
