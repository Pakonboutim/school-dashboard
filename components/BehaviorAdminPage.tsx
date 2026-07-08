'use client'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface Student {
  student_id: string; prefix: string; fname: string; lname: string
  grade: string; classroom: string; number: string
}
interface ScoreRow {
  student_id: string; prefix: string; fname: string; lname: string
  grade: string; classroom: string; score: string
}
interface Log {
  timestamp: string; student_id: string; rule_name: string
  points: string; note: string; evidence_url: string; teacher_user: string
}

export default function BehaviorAdminPage() {
  const { data: session } = useSession()
  const isTeacher = session?.role === 'teacher'
  const today     = new Date(Date.now() + 7*60*60*1000).toISOString().slice(0,10)

  const [grades, setGrades]       = useState<string[]>([])
  const [rooms, setRooms]         = useState<string[]>([])
  const [selGrade, setSelGrade]   = useState(isTeacher ? session?.grade || '' : '')
  const [selRoom, setSelRoom]     = useState(isTeacher ? session?.classroom || '' : '')
  const [students, setStudents]   = useState<Student[]>([])
  const [scores, setScores]       = useState<ScoreRow[]>([])
  const [logs, setLogs]           = useState<Log[]>([])
  const [search, setSearch]       = useState('')
  const [selStu, setSelStu]       = useState<Student | null>(null)
  const [tab, setTab]             = useState<'scores'|'logs'>('scores')

  // form
  const [ruleName, setRuleName]   = useState('')
  const [points, setPoints]       = useState('')
  const [note, setNote]           = useState('')
  const [loading, setLoading]     = useState(false)
  const [msg, setMsg]             = useState<{text:string;ok:boolean}|null>(null)

  useEffect(() => {
    if (isTeacher) return
    fetch('/api/students').then(r=>r.json()).then(d=>{
      const gs = Array.from(new Set<string>((d.students||[]).map((s:any)=>s.grade))).sort() as string[]
      setGrades(gs)
    })
  }, [])

  useEffect(() => {
    if (!selGrade || isTeacher) return
    fetch(`/api/students?grade=${selGrade}`).then(r=>r.json()).then(d=>{
      const rs = Array.from(new Set<string>((d.students||[]).map((s:any)=>s.classroom)))
        .sort((a:string,b:string)=>parseInt(a)-parseInt(b)) as string[]
      setRooms(rs); setSelRoom('')
    })
  }, [selGrade])

  useEffect(() => {
    const g = isTeacher ? session?.grade : selGrade
    const r = isTeacher ? session?.classroom : selRoom
    if (!g || !r) return
    fetch(`/api/students?grade=${g}&classroom=${r}`).then(res=>res.json()).then(d=>setStudents(d.students||[]))
    loadScores()
    loadLogs()
  }, [selGrade, selRoom, session])

  const loadScores = async () => {
    const res = await fetch('/api/behavior/scores')
    const d   = await res.json()
    setScores(d.scores || [])
  }

  const loadLogs = async () => {
    const g = isTeacher ? session?.grade : selGrade
    const r = isTeacher ? session?.classroom : selRoom
    const res = await fetch(`/api/behavior/logs?grade=${g}&classroom=${r}`)
    const d   = await res.json()
    setLogs(d.logs || [])
  }

  const getScore = (sid: string) => {
    const row = scores.find(s => s.student_id === sid)
    return row ? parseInt(row.score) || 100 : 100
  }

  const scoreColor = (s: number) => s >= 80 ? '#2ecc71' : s >= 60 ? '#f39c12' : '#e74c3c'

  const handleSubmit = async () => {
    if (!selStu || !ruleName || !points) { setMsg({text:'กรอกข้อมูลไม่ครบ',ok:false}); return }
    setLoading(true); setMsg(null)
    const res = await fetch('/api/behavior', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: selStu.student_id, grade: selStu.grade, classroom: selStu.classroom,
        rule_name: ruleName, points: parseInt(points), note,
      }),
    })
    const d = await res.json()
    setLoading(false)
    if (d.success) {
      setMsg({text:`✅ บันทึกสำเร็จ — ${points > '0' ? '+':''}${points} คะแนน`, ok:true})
      setRuleName(''); setPoints(''); setNote('')
      loadScores(); loadLogs()
    } else {
      setMsg({text:`❌ ${d.error}`, ok:false})
    }
  }

  const filtered = students.filter(s =>
    !search || `${s.prefix}${s.fname}${s.lname}${s.number}`.includes(search)
  )

  const inp = {
    background: '#21262d', border: '1px solid #30363d', color: '#e6edf3',
    borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none',
    fontFamily: 'Sarabun, sans-serif', width: '100%', boxSizing: 'border-box' as const,
  }

  const thDate = (ts: string) => {
    try { return new Date(ts.slice(0,10)+'T12:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short'}) }
    catch { return ts.slice(0,10) }
  }

  return (
    <div style={{ fontFamily: 'Sarabun, sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: '#e6edf3', marginBottom: '1.5rem' }}>⭐ ระบบคะแนนความประพฤติ</h1>

      {/* filter */}
      {!isTeacher && (
        <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <select style={{ ...inp, width: 'auto' }} value={selGrade} onChange={e=>setSelGrade(e.target.value)}>
            <option value="">เลือกชั้น</option>
            {grades.map(g=><option key={g} value={g}>{g}</option>)}
          </select>
          {selGrade && (
            <select style={{ ...inp, width: 'auto' }} value={selRoom} onChange={e=>setSelRoom(e.target.value)}>
              <option value="">เลือกห้อง</option>
              {rooms.map(r=><option key={r} value={r}>ห้อง {r}</option>)}
            </select>
          )}
        </div>
      )}

      {/* tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 4, marginBottom: '1.25rem', width: 'fit-content' }}>
        {[{k:'scores',l:'📊 คะแนนรายคน'},{k:'logs',l:'📜 ประวัติทั้งหมด'}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k as any)} style={{
            padding: '7px 16px', borderRadius: 8, border: 'none', fontSize: 13,
            background: tab===t.k?'#388bfd':'transparent',
            color: tab===t.k?'#fff':'#8b949e',
            cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
          }}>{t.l}</button>
        ))}
      </div>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* ซ้าย — รายชื่อ */}
        <div>
          <input placeholder="🔍 ค้นหานักเรียน..." value={search}
            onChange={e=>setSearch(e.target.value)} style={{ ...inp, marginBottom: 10 }} />

          {tab === 'scores' ? (
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, overflow: 'hidden', maxHeight: 520, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign:'center', padding:'2rem', color:'#8b949e' }}>
                  {students.length===0?'เลือกชั้น/ห้องก่อน':'ไม่พบนักเรียน'}
                </div>
              ) : filtered.map((s,i) => {
                const score = getScore(s.student_id)
                const color = scoreColor(score)
                const isActive = selStu?.student_id === s.student_id
                return (
                  <button key={s.student_id} onClick={()=>setSelStu(isActive?null:s)} style={{
                    width:'100%', padding:'10px 16px', background: isActive?'#388bfd22':'transparent',
                    border:'none', borderBottom:'1px solid #21262d', cursor:'pointer',
                    display:'flex', alignItems:'center', gap:10, textAlign:'left', fontFamily:'Sarabun, sans-serif',
                  }}>
                    <span style={{ fontSize:12, color:'#6e7681', minWidth:24 }}>{s.number}</span>
                    <span style={{ flex:1, fontSize:13, color: isActive?'#388bfd':'#e6edf3' }}>
                      {s.prefix}{s.fname} {s.lname}
                    </span>
                    <span style={{ fontSize:16, fontWeight:700, color, minWidth:36, textAlign:'right' }}>{score}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, overflow: 'hidden', maxHeight: 520, overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <div style={{ textAlign:'center', padding:'2rem', color:'#8b949e' }}>ยังไม่มีประวัติ</div>
              ) : logs.map((l,i) => {
                const pts   = parseInt(l.points) || 0
                const isAdd = pts > 0
                return (
                  <div key={i} style={{ padding:'10px 16px', borderBottom:'1px solid #21262d', background: isAdd?'#2ecc7108':'#e74c3c08' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ fontSize:13, color:'#e6edf3', fontWeight:500 }}>{l.rule_name}</div>
                        <div style={{ fontSize:11, color:'#8b949e', marginTop:2 }}>
                          {l.student_id} · {l.teacher_user} · {thDate(l.timestamp)}
                        </div>
                        {l.note && <div style={{ fontSize:12, color:'#6e7681', marginTop:2 }}>{l.note}</div>}
                      </div>
                      <span style={{ fontSize:16, fontWeight:700, color: isAdd?'#2ecc71':'#e74c3c', flexShrink:0 }}>
                        {pts>0?`+${pts}`:pts}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ขวา — เพิ่ม/หักคะแนน */}
        <div>
          {!selStu ? (
            <div style={{ background:'#161b22', border:'1px solid #30363d', borderRadius:12, padding:'3rem', textAlign:'center', color:'#8b949e' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>👈</div>
              เลือกนักเรียนจากรายชื่อ
            </div>
          ) : (
            <div style={{ background:'#161b22', border:'1px solid #388bfd44', borderRadius:12, padding:'1.25rem' }}>
              {/* ชื่อและคะแนน */}
              <div style={{ padding:'1rem', background:'#0d1117', borderRadius:8, marginBottom:'1.25rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:600, color:'#e6edf3' }}>{selStu.prefix}{selStu.fname} {selStu.lname}</div>
                  <div style={{ fontSize:12, color:'#8b949e', marginTop:2 }}>{selStu.grade}/{selStu.classroom} เลขที่ {selStu.number}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:28, fontWeight:700, color: scoreColor(getScore(selStu.student_id)) }}>
                    {getScore(selStu.student_id)}
                  </div>
                  <div style={{ fontSize:11, color:'#8b949e' }}>คะแนน</div>
                </div>
              </div>

              {/* ปุ่ม +/- */}
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, color:'#8b949e', display:'block', marginBottom:6 }}>ประเภท</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[{v:'+10',l:'🌟 +10'},{v:'+5',l:'✅ +5'},{v:'-5',l:'⚠️ -5'},{v:'-10',l:'❌ -10'}].map(b=>(
                    <button key={b.v} onClick={()=>setPoints(b.v)} style={{
                      padding:'10px', borderRadius:8,
                      border: `2px solid ${points===b.v?(b.v.startsWith('+')?'#2ecc71':'#e74c3c'):'#30363d'}`,
                      background: points===b.v?(b.v.startsWith('+')?'#2ecc7122':'#e74c3c22'):'#0d1117',
                      color: points===b.v?(b.v.startsWith('+')?'#2ecc71':'#e74c3c'):'#8b949e',
                      fontSize:14, cursor:'pointer', fontFamily:'Sarabun, sans-serif', fontWeight:points===b.v?600:400,
                    }}>{b.l}</button>
                  ))}
                </div>
                <input type="number" value={points} onChange={e=>setPoints(e.target.value)}
                  placeholder="หรือกรอกคะแนนเอง เช่น -3 หรือ +20"
                  style={{ ...inp, marginTop:8 }} />
              </div>

              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, color:'#8b949e', display:'block', marginBottom:6 }}>เหตุผล / กฎที่ละเมิด</label>
                <input value={ruleName} onChange={e=>setRuleName(e.target.value)}
                  placeholder="เช่น แต่งกายไม่ถูกระเบียบ, ช่วยเหลือกิจกรรม..."
                  style={inp} />
              </div>

              <div style={{ marginBottom:'1.25rem' }}>
                <label style={{ fontSize:12, color:'#8b949e', display:'block', marginBottom:6 }}>หมายเหตุ (ถ้ามี)</label>
                <input value={note} onChange={e=>setNote(e.target.value)}
                  placeholder="รายละเอียดเพิ่มเติม..." style={inp} />
              </div>

              {msg && <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:12, fontSize:13,
                background:msg.ok?'#2ecc7122':'#e74c3c22', color:msg.ok?'#2ecc71':'#e74c3c' }}>{msg.text}</div>}

              <button onClick={handleSubmit} disabled={loading} style={{
                width:'100%', background:loading?'#30363d':parseInt(points||'0')>=0?'#2ecc71':'#e74c3c',
                color:'#fff', border:'none', borderRadius:10, padding:'12px', fontSize:15,
                fontWeight:600, cursor:loading?'not-allowed':'pointer', fontFamily:'Sarabun, sans-serif',
              }}>
                {loading?'⏳ กำลังบันทึก...':parseInt(points||'0')>=0?'✅ เพิ่มคะแนน':'❌ หักคะแนน'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
