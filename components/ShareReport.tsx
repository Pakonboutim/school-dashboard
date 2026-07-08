'use client'
import { useState } from 'react'

interface Student {
  name:      string
  number:    string
  status:    string
  time:      string
  student_id?: string
  note?:     string
}

interface Props {
  records:   Student[]  // dayRecords — ทุกคนในห้อง (มา + ขาด)
  date:      string
  grade:     string
  classroom: string
}

export default function ShareReport({ records, date, grade, classroom }: Props) {
  const [open, setOpen]     = useState(false)
  const [copied, setCopied] = useState(false)

  const shortName = (name: string) =>
    name.replace('เด็กชาย','').replace('เด็กหญิง','').replace('นาย','').replace('นางสาว','').trim()

  const thDate = (() => {
    try {
      return new Date(date + 'T12:00:00').toLocaleDateString('th-TH', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      })
    } catch { return date }
  })()

  // กรอง unique ตาม student_id สำหรับแต่ละกลุ่มแยกกัน
  const filterUnique = (arr: Student[]) => {
    const seen = new Set()
    return arr.filter(r => {
      const k = r.student_id || r.number
      if (!k || seen.has(k)) return false
      seen.add(k); return true
    })
  }

  // แบ่งกลุ่ม — filter status แล้ว unique แยกกันแต่ละกลุ่ม
  const came   = filterUnique(
    records.filter(r => r.status === 'มาเรียนปกติ' || r.status === 'มาสาย')
      .sort((a, b) => parseInt(a.number) - parseInt(b.number))
  )
  const absent = filterUnique(
    records.filter(r => r.status === 'ขาด')
      .sort((a, b) => parseInt(a.number) - parseInt(b.number))
  )
  const leave  = filterUnique(
    records.filter(r => r.status === 'ลากิจ' || r.status === 'ลาป่วย')
      .sort((a, b) => parseInt(a.number) - parseInt(b.number))
  )

  const buildMorningText = () => {
    let text = `🏫 รายงานการมาเรียน ${grade}/${classroom}\n`
    text += `📅 ${thDate}\n`
    text += `━━━━━━━━━━━━━━━━━━\n\n`

    // ส่วนที่ 1 — มาเรียน
    text += `✅ มาเรียน (${came.length} คน)\n`
    if (came.length === 0) {
      text += `ยังไม่มีนักเรียนสแกน\n`
    } else {
      came.forEach(r => {
        const status = r.status === 'มาสาย' ? ' ⏰มาสาย' : ' ✅มาปกติ'
        const time   = r.time && r.time !== '-' ? ` ${r.time.slice(0,5)}` : ''
        text += `${r.number}. ${shortName(r.name)}${status}${time}\n`
      })
    }

    // ส่วนที่ 2 — ขาดเรียน
    if (absent.length > 0) {
      text += `\n❌ ขาดเรียน (${absent.length} คน)\n`
      absent.forEach(r => {
        text += `${r.number}. ${shortName(r.name)}\n`
      })
    }

    // ส่วนที่ 3 — ลา
    if (leave.length > 0) {
      text += `\n📋 ลา (${leave.length} คน)\n`
      leave.forEach(r => {
        text += `${r.number}. ${shortName(r.name)} (${r.status})\n`
      })
    }

    text += `\n━━━━━━━━━━━━━━━━━━\n`
    text += `📊 มา ${came.length} | ขาด ${absent.length}`
    if (leave.length > 0) text += ` | ลา ${leave.length}`
    return text
  }

  const buildHomeText = () => {
    // คนที่สแกนกลับบ้าน (เรียงตามเลขที่)
    const wentHome = records
      .filter(r => r.status === 'กลับบ้าน')
      .sort((a, b) => parseInt(a.number) - parseInt(b.number))

    // student_id ที่กลับบ้านแล้ว
    const wentHomeIds = new Set(wentHome.map(r => r.student_id).filter(Boolean))

    // student_id ที่ลาครึ่งวันบ่าย หรือลาทั้งวัน — ไม่ต้องสแกนกลับบ้าน
    const leaveAfternoonIds = new Set(
      records
        .filter(r => {
          if (r.status !== 'ลากิจ' && r.status !== 'ลาป่วย') return false
          const n = r.note || ''
          return n.includes('ทั้งวัน') || n.includes('ครึ่งวันบ่าย')
        })
        .map(r => r.student_id).filter(Boolean)
    )

    // คนที่มาเรียน (มาปกติ/มาสาย) แต่ยังไม่สแกนกลับบ้าน และไม่ได้ลาบ่าย
    const notHome = filterUnique(
      records.filter(r =>
        (r.status === 'มาเรียนปกติ' || r.status === 'มาสาย') &&
        r.student_id &&
        !wentHomeIds.has(r.student_id) &&
        !leaveAfternoonIds.has(r.student_id)
      ).sort((a, b) => parseInt(a.number) - parseInt(b.number))
    )

    let text = `🏠 รายงานกลับบ้าน ${grade}/${classroom}\n`
    text += `📅 ${thDate}\n`
    text += `━━━━━━━━━━━━━━━━━━\n\n`

    text += `✅ สแกนกลับบ้านแล้ว (${wentHome.length} คน)\n`
    if (wentHome.length === 0) {
      text += `ยังไม่มีนักเรียนสแกนกลับบ้าน\n`
    } else {
      wentHome.forEach((r, i) => {
        const time = r.time && r.time !== '-' ? ` 🕐${r.time.slice(0,5)}` : ''
        text += `${r.number}. ${shortName(r.name)}${time}\n`
      })
    }

    if (notHome.length > 0) {
      text += `\n⚠️ ยังไม่สแกนกลับบ้าน (${notHome.length} คน)\n`
      notHome.forEach((r, i) => {
        text += `${i+1}. ${shortName(r.name)}\n`
      })
    } else {
      text += `\n🎉 นักเรียนที่มาเรียนสแกนกลับบ้านครบแล้ว\n`
    }

    text += `\n━━━━━━━━━━━━━━━━━━\n`
    text += `📊 กลับแล้ว ${wentHome.length} | ยังไม่กลับ ${notHome.length}`
    return text
  }

  const share = async (type: 'morning' | 'home') => {
    const text = type === 'morning' ? buildMorningText() : buildHomeText()
    setOpen(false)
    if (navigator.share) {
      try { await navigator.share({ text }); return } catch {}
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <>
      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen(!open)} style={{
          background: '#388bfd', color: '#fff', border: 'none',
          borderRadius: 8, padding: '8px 16px', fontSize: 13,
          fontWeight: 600, cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          📤 แชร์รายงาน ▾
        </button>

        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
            <div style={{
              position: 'absolute', top: '110%', right: 0, zIndex: 50,
              background: '#161b22', border: '1px solid #30363d',
              borderRadius: 10, overflow: 'hidden', minWidth: 180,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              <button onClick={() => share('morning')} style={{
                width: '100%', padding: '12px 16px', background: 'none',
                border: 'none', borderBottom: '1px solid #21262d',
                color: '#e6edf3', fontSize: 14, cursor: 'pointer',
                textAlign: 'left', fontFamily: 'Sarabun, sans-serif',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>🌅 ช่วงเช้า</button>
              <button onClick={() => share('home')} style={{
                width: '100%', padding: '12px 16px', background: 'none',
                border: 'none', color: '#e6edf3', fontSize: 14,
                cursor: 'pointer', textAlign: 'left',
                fontFamily: 'Sarabun, sans-serif',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>🏠 กลับบ้าน</button>
            </div>
          </>
        )}
      </div>

      {copied && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: '#2ecc71', color: '#fff', padding: '10px 20px',
          borderRadius: 8, fontSize: 14, zIndex: 100,
          fontFamily: 'Sarabun, sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap',
        }}>
          ✅ คัดลอกแล้ว วางใน LINE ได้เลย
        </div>
      )}
    </>
  )
}
