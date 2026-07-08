'use client'
import { useState } from 'react'

interface Student {
  student_id: string
  name: string
  prefix: string
  grade: string
  classroom: string
  number: string
  status: string
  time: string
  image_url: string
}

const STATUS_COLOR: Record<string, { border: string; badge: string; icon: string; bg: string; text: string }> = {
  'มาเรียนปกติ': { border: '#2ecc71', badge: '#0a3a1a', icon: '✅', bg: '#2ecc7122', text: '#2ecc71' },
  'ลากิจ':        { border: '#3498db', badge: '#0a1a3a', icon: '📋', bg: '#3498db22', text: '#3498db' },
  'ลาป่วย':       { border: '#9b59b6', badge: '#2d1a40', icon: '🏥', bg: '#9b59b622', text: '#9b59b6' },
  'ไม่สแกนเช้า':  { border: '#e67e22', badge: '#3a1f00', icon: '⚠️', bg: '#e67e2222', text: '#e67e22' },
  'มาสาย':       { border: '#f39c12', badge: '#3c2d00', icon: '⏰', bg: '#f39c1222', text: '#f39c12' },
  'กลับบ้าน':    { border: '#3498db', badge: '#0a2a4a', icon: '🏠', bg: '#3498db22', text: '#3498db' },
  'ขาด':         { border: '#e74c3c', badge: '#3c1a1a', icon: '❌', bg: '#e74c3c22', text: '#e74c3c' },
}

const FILTERS = ['ทั้งหมด', 'มาเรียนปกติ', 'มาสาย', 'กลับบ้าน', 'ไม่สแกนเช้า', 'ขาด', 'ลา']

export default function PhotoGrid({ records }: { records: Student[] }) {
  const [selected, setSelected] = useState<Student | null>(null)
  const [filter, setFilter]     = useState('ทั้งหมด')

  const filtered = filter === 'ทั้งหมด'
    ? records
    : filter === 'ลา'
      ? records.filter(r => r.status === 'ลากิจ' || r.status === 'ลาป่วย')
      : records.filter(r => r.status === filter)

  const sc = (status: string) => STATUS_COLOR[status] || STATUS_COLOR['ขาด']
  const shortName = (name: string) =>
    name.replace('เด็กชาย','').replace('เด็กหญิง','').replace('นาย','').replace('นางสาว','').trim()

  return (
    <>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1.25rem' }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
          {FILTERS.map(f => {
            const count = f === 'ทั้งหมด'
              ? records.length
              : f === 'ลา'
                ? records.filter(r => r.status === 'ลากิจ' || r.status === 'ลาป่วย').length
                : records.filter(r => r.status === f).length
            const active = filter === f
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 13, border: 'none',
                background: active ? '#388bfd' : '#21262d',
                color: active ? '#fff' : '#8b949e',
                cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
              }}>
                {f} <span style={{ opacity: 0.7 }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {filtered.map((r, i) => {
            const c = sc(r.status)
            return (
              <button key={i} onClick={() => setSelected(r)} style={{
                border: `1px solid ${c.border}44`, borderRadius: 12, padding: 10,
                background: '#0d1117', cursor: 'pointer', textAlign: 'left',
                transition: 'transform 0.15s', fontFamily: 'Sarabun, sans-serif',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {/* รูป 16:9 */}
                <div style={{
                  width: '100%', aspectRatio: '16/9',
                  borderRadius: 8, overflow: 'hidden',
                  background: '#21262d', marginBottom: 8,
                }}>
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                      {r.prefix?.includes('หญิง') || r.prefix === 'นางสาว' ? '👧' : '👦'}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#e6edf3', fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {shortName(r.name)}
                </div>
                <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6 }}>
                  {r.grade}/{r.classroom} • {r.number}
                </div>
                <div style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 20, display: 'inline-block',
                  background: c.bg, color: c.text, border: `1px solid ${c.border}44`,
                }}>
                  {c.icon} {r.status === 'มาเรียนปกติ' ? 'ปกติ' : r.status}
                  {r.time !== '-' && ` ${r.time.slice(0,5)}`}
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#8b949e', fontSize: 14 }}>
              ไม่มีนักเรียนในสถานะนี้
            </div>
          )}
        </div>
      </div>

      {/* Modal รูปใหญ่ */}
      {selected && (() => {
        const c = sc(selected.status)
        return (
          <div onClick={() => setSelected(null)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
            zIndex: 9999, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '1rem',
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              background: '#161b22', border: `1px solid ${c.border}66`,
              borderRadius: 16, overflow: 'hidden',
              width: '100%', maxWidth: 480,
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            }}>
              {/* รูป 16:9 */}
              <div style={{ width: '100%', aspectRatio: '16/9', background: '#21262d', position: 'relative' }}>
                {selected.image_url ? (
                  <img src={selected.image_url} alt={selected.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>
                    {selected.prefix?.includes('หญิง') || selected.prefix === 'นางสาว' ? '👧' : '👦'}
                  </div>
                )}
                <button onClick={() => setSelected(null)} style={{
                  position: 'absolute', top: 10, right: 10,
                  background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff',
                  width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', fontSize: 18,
                }}>✕</button>
              </div>
              {/* ข้อมูล */}
              <div style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>
                  {selected.name}
                </h3>
                <p style={{ fontSize: 13, color: '#8b949e', marginBottom: '1rem' }}>
                  {selected.grade} ห้อง {selected.classroom} เลขที่ {selected.number}
                </p>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', borderRadius: 10,
                  background: c.bg, border: `1px solid ${c.border}44`,
                }}>
                  <span style={{ fontSize: 20 }}>{c.icon}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: c.text }}>{selected.status}</div>
                    {selected.time !== '-' && (
                      <div style={{ fontSize: 12, color: '#8b949e' }}>เวลา {selected.time}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
