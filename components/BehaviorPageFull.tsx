'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function BehaviorPage() {
  const { data: session } = useSession();
  const isTeacher = session?.role === 'teacher';

  const [activeTab, setActiveTab] = useState<'students' | 'log' | 'rules'>('students');
  const [students, setStudents] = useState<any[]>([]);
  const [logItems, setLogItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRuleKey, setSelectedRuleKey] = useState('เบา-มาสาย');
  const [ruleName, setRuleName] = useState('มาโรงเรียนสาย');
  const [pointsChange, setPointsChange] = useState(-5);
  const [note, setNote] = useState('');
  const [attachedDocNames, setAttachedDocNames] = useState<string[]>([]);
  const [attachedImgNames, setAttachedImgNames] = useState<string[]>([]);
  const [docFiles, setDocFiles] = useState<FileList | null>(null);
  const [imgFiles, setImgFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  const officialRules = {
    deductions: [
      { category: "วินัยการมาเรียนและการสแกน", items: [
        { label: "มาโรงเรียนสาย", pts: -5, key: "เบา-มาสาย" },
        { label: "ขาดเรียนโดยไม่มีเหตุผล", pts: -10, key: "กลาง-ขาดเรียน" },
        { label: "ไม่สแกนกลับบ้าน", pts: -2, key: "เบา-ไม่สแกนกลับ" }
      ]},
      { category: "สถานเบา (-5 คะแนน)", items: [
        { label: "ทิ้งขยะไม่ถูกที่", pts: -5, key: "เบา-ขยะ" },
        { label: "เข้าห้องเรียนช้า", pts: -5, key: "เบา-ห้องเรียนช้า" },
        { label: "ส่งเสียงดังรบกวนผู้อื่น", pts: -5, key: "เบา-เสียงดัง" },
        { label: "รับประทานอาหารในเวลาเรียน", pts: -5, key: "เบา-กินอาหาร" },
        { label: "ไม่ทำเวรหรือหน้าที่ที่ได้รับมอบหมาย", pts: -5, key: "เบา-ไม่ทำเวร" },
        { label: "แต่งกายหรือไว้ทรงผมผิดระเบียบ", pts: -5, key: "เบา-ทรงผมแต่งกาย" },
      ]},
      { category: "สถานกลาง (-10 คะแนน)", items: [
        { label: "ไม่ร่วมกิจกรรมของทางโรงเรียน", pts: -10, key: "กลาง-โดดกิจกรรม" },
        { label: "กริยา วาจาไม่สุภาพ พูดเท็จ", pts: -10, key: "กลาง-พูดเท็จ" },
        { label: "กลั่นแกล้ง รังแกผู้อื่น", pts: -10, key: "กลาง-บูลลี่" },
        { label: "นำสิ่งของต้องห้ามเข้ามา", pts: -10, key: "กลาง-ของต้องห้าม" },
      ]},
      { category: "สถานหนัก (-20 ถึง -40 คะแนน)", items: [
        { label: "ฝ่าฝืน/ขัดขืนคำสั่งครู ผู้บริหาร", pts: -20, key: "หนัก-ขัดคำสั่ง" },
        { label: "หนีเรียนหรือออกนอกบริเวณโรงเรียน", pts: -20, key: "หนัก-หนีเรียน" },
        { label: "ก่อเหตุทะเลาะวิวาทในโรงเรียน", pts: -30, key: "หนัก-วิวาท" },
        { label: "ลักขโมยสิ่งของ ทรัพย์สินของผู้อื่น", pts: -40, key: "หนัก-ลักขโมย" }
      ]},
      { category: "สถานร้ายแรง (-50 ถึง -100 คะแนน)", items: [
        { label: "ทำลายทรัพย์สินของส่วนรวมหรือของผู้อื่น", pts: -50, key: "ร้ายแรง-ทำลายของ" },
        { label: "ปลอมแปลงเอกสาร ลายมือชื่อ", pts: -50, key: "ร้ายแรง-ปลอมเอกสาร" },
        { label: "กระทำความผิดคดีอาญา", pts: -100, key: "ร้ายแรง-คดีอาญา" }
      ]}
    ],
    rewards: [
      { category: "🌟 การเพิ่มคะแนนพฤติกรรมเชิงบวก", items: [
        { label: "เก็บสิ่งของคืนมูลค่าไม่เกิน 100 บาท", pts: 5, key: "ดี-เก็บของเล็ก" },
        { label: "เก็บสิ่งของคืนมูลค่าเกิน 100 บาท", pts: 10, key: "ดี-เก็บของใหญ่" },
        { label: "เต็มใจช่วยเหลือกิจกรรมของโรงเรียน", pts: 10, key: "ดี-ช่วยงาน" },
        { label: "ช่วยเหลือเพื่อน ผู้อื่นที่ประสบปัญหา", pts: 10, key: "ดี-ช่วยเพื่อน" },
        { label: "เป็นตัวแทนของโรงเรียนในการเข้าร่วมกิจกรรม", pts: 15, key: "ดี-ตัวแทนรร" },
        { label: "สร้างชื่อเสียงที่ดีให้แก่โรงเรียน (ระดับอำเภอ)", pts: 25, key: "ดี-ชื่อเสียงอำเภอ" },
        { label: "สร้างชื่อเสียงที่ดีให้แก่โรงเรียน (ระดับจังหวัด)", pts: 45, key: "ดี-ชื่อเสียงจังหวัด" },
        { label: "สร้างชื่อเสียงที่ดีให้แก่โรงเรียน (ระดับภาคขึ้นไป)", pts: 60, key: "ดี-ชื่อเสียงภาค" }
      ]}
    ]
  };

  const allDropdownItems = [
    ...officialRules.deductions.flatMap(d => d.items).filter(i => !isTeacher || i.pts >= -20),
    ...officialRules.rewards.flatMap(r => r.items)
  ];

  // clear classFilter เมื่อเป็นครู
  useEffect(() => {
    if (isTeacher) setClassFilter('');
  }, [isTeacher]);

  useEffect(() => {
    loadData();
  }, [session]);

  const loadData = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const g = isTeacher ? (session.grade || '') : '';
      const r = isTeacher ? (session.classroom || '') : '';

      // ครูต้องมีห้องก่อนจึงจะโหลด
      if (isTeacher && (!g || !r)) {
        setIsLoading(false);
        return;
      }

      const stuRes = await fetch(`/api/students${g ? `?grade=${g}&classroom=${r}` : ''}`);
      const stuData = await stuRes.json();
      const stuList = stuData.students || [];

      const scoresRes = await fetch('/api/behavior/scores');
      const scoresData = await scoresRes.json();
      const scoreMap: Record<string, number> = {};
      (scoresData.scores || []).forEach((s: any) => {
        scoreMap[s.student_id] = parseInt(s.score) || 100;
      });

      const combined = stuList.map((s: any) => ({
        ...s,
        name: `${s.prefix}${s.fname} ${s.lname}`,
        cls: `${s.grade}/${s.classroom}`,
        initials: (s.fname || '?')[0],
        score: scoreMap[s.student_id] ?? 100,
      }));
      setStudents(combined);

      const logsRes = await fetch(`/api/behavior/logs?grade=${g}&classroom=${r}`);
      const logsData = await logsRes.json();
      setLogItems((logsData.logs || []).map((l: any) => ({
        student_id: l.student_id,
        name: combined.find((s: any) => s.student_id === l.student_id)?.name || l.student_id,
        desc: l.rule_name + (l.note ? ` — ${l.note}` : ''),
        pts: parseInt(l.points) || 0,
        time: l.timestamp?.slice(0, 10) || '',
        type: parseInt(l.points) > 0 ? 'pos' : 'neg',
        isSystem: l.teacher_user === 'system',
      })));
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const totalStudents = students.length;
  const averageScore = totalStudents > 0
    ? (students.reduce((acc, s) => acc + s.score, 0) / totalStudents).toFixed(1) : '0.0';
  const warningCount = students.filter(s => s.score >= 50 && s.score < 70).length;
  const criticalCount = students.filter(s => s.score < 50).length;

  const filteredStudents = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.student_id.includes(searchQuery);
    const matchClass = !classFilter || s.cls === classFilter;
    let status = 'normal';
    if (s.score < 50) status = 'critical';
    else if (s.score < 70) status = 'warning';
    const matchStatus = !statusFilter || status === statusFilter;
    return matchSearch && matchClass && matchStatus;
  });

  const classList = Array.from(new Set(students.map(s => s.cls))).sort();
  const currentStudent = students.find(s => s.student_id === viewingStudentId);
  const currentStudentLogs = logItems.filter(l => l.student_id === viewingStudentId);

  const handleRuleChange = (key: string) => {
    setSelectedRuleKey(key);
    allDropdownItems.forEach(item => {
      if (item.key === key) { setRuleName(item.label); setPointsChange(item.pts); }
    });
  };

  const uploadFiles = async (files: FileList | null): Promise<string[]> => {
    if (!files || files.length === 0) return [];
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/attendance/upload', { method: 'POST', body: fd });
      const d = await res.json();
      if (d.url) urls.push(d.url);
    }
    return urls;
  };

  const submitPointAdjustment = async () => {
    if (!viewingStudentId || !currentStudent) return;
    setUploading(true);
    try {
      const res = await fetch('/api/behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: viewingStudentId,
          grade: currentStudent.grade,
          classroom: currentStudent.classroom,
          rule_name: ruleName,
          points: pointsChange,
          note,
          evidence_url: [
            ...(await uploadFiles(docFiles)),
            ...(await uploadFiles(imgFiles))
          ].join('|'),
        })
      });
      const result = await res.json();
      if (result.success) {
        setStudents(prev => prev.map(s =>
          s.student_id === viewingStudentId
            ? { ...s, score: Math.max(0, Math.min(100, s.score + pointsChange)) }
            : s
        ));
        setLogItems(prev => [{
          student_id: viewingStudentId, name: currentStudent.name,
          desc: ruleName + (note ? ` — ${note}` : ''),
          pts: pointsChange, time: new Date().toISOString().slice(0,10),
          type: pointsChange > 0 ? 'pos' : 'neg',
          isSystem: false,
        }, ...prev]);
        setNote(''); setAttachedDocNames([]); setAttachedImgNames([]); setDocFiles(null); setImgFiles(null);
        alert(`บันทึกสำเร็จ!`);
      } else {
        alert(result.error || 'บันทึกไม่สำเร็จ');
      }
    } catch { alert('เกิดข้อผิดพลาด'); }
    finally { setUploading(false); }
  };

  const renderCircleRing = (score: number) => {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(100, score) / 100) * circumference;
    let ringColor = '#38A169';
    if (score < 50) ringColor = '#E53E3E';
    else if (score < 70) ringColor = '#F5A623';
    return (
      <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0, margin: '0 auto' }}>
        <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="22" cy="22" r="16" fill="none" stroke="#30363d" strokeWidth="3.5"/>
          <circle cx="22" cy="22" r="16" fill="none" stroke={ringColor} strokeWidth="3.5"
            strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={strokeDashoffset} strokeLinecap="round"/>
        </svg>
        <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontWeight: 700, fontSize: 12, color: '#e6edf3' }}>{score}</span>
      </div>
    );
  };

  const inp = {
    background: '#21262d', border: '1px solid #30363d', color: '#e6edf3',
    borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none',
    fontFamily: 'Sarabun, sans-serif', width: '100%', boxSizing: 'border-box' as const,
  };

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: '#8b949e', fontFamily: 'Sarabun, sans-serif' }}>
      กำลังโหลดข้อมูล...
    </div>
  );

  if (isTeacher && (!session?.grade || !session?.classroom)) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#8b949e', fontFamily: 'Sarabun, sans-serif' }}>
      ไม่พบข้อมูลห้องเรียน กรุณาติดต่อแอดมิน
    </div>
  );

  return (
    <div style={{ fontFamily: 'Sarabun, sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: '#e6edf3', marginBottom: '1.25rem' }}>⭐ ระบบคะแนนความประพฤติ</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 4, marginBottom: '1.25rem', width: 'fit-content' }}>
        {[{k:'students',l:'👥 คะแนนรายคน'},{k:'log',l:'📋 ประวัติ'},{k:'rules',l:'📖 ระเบียบ'}].map(t => (
          <button key={t.k} onClick={() => { setActiveTab(t.k as any); setViewingStudentId(null); }} style={{
            padding: '7px 14px', borderRadius: 8, border: 'none', fontSize: 13,
            background: activeTab===t.k ? '#388bfd' : 'transparent',
            color: activeTab===t.k ? '#fff' : '#8b949e',
            cursor: 'pointer', fontFamily: 'Sarabun, sans-serif',
          }}>{t.l}</button>
        ))}
      </div>

      {/* TAB: students */}
      {activeTab === 'students' && (
        <div>
          {viewingStudentId && currentStudent ? (
            <div style={{ maxWidth: 900 }}>
              <button onClick={() => setViewingStudentId(null)} style={{ padding: '6px 14px', background: '#21262d', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 8, cursor: 'pointer', fontSize: 13, marginBottom: '1rem', fontFamily: 'Sarabun, sans-serif' }}>
                ← ย้อนกลับ
              </button>

              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#e6edf3' }}>{currentStudent.name}</div>
                  <div style={{ fontSize: 13, color: '#8b949e', marginTop: 4 }}>รหัส: {currentStudent.student_id} · ชั้น {currentStudent.cls}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {renderCircleRing(currentStudent.score)}
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: currentStudent.score >= 70 ? '#2ecc71' : currentStudent.score >= 50 ? '#f39c12' : '#e74c3c' }}>{currentStudent.score}</div>
                    <div style={{ fontSize: 11, color: '#8b949e' }}>คะแนน</div>
                  </div>
                </div>
              </div>

              <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1.25rem' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', marginBottom: '1rem' }}>⚖️ บันทึกพฤติกรรม</div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>หัวข้อ</label>
                    <select value={selectedRuleKey} onChange={e => handleRuleChange(e.target.value)} style={inp}>
                      <option disabled>--- บทลงโทษ ---</option>
                      {officialRules.deductions.map(g => (
                        <optgroup key={g.category} label={g.category}>
                          {g.items.filter(item => !isTeacher || item.pts >= -20).map(item => (
                            <option key={item.key} value={item.key}>{item.label} ({item.pts})</option>
                          ))}
                        </optgroup>
                      ))}
                      <option disabled>--- ความดี ---</option>
                      {officialRules.rewards.map(g => (
                        <optgroup key={g.category} label={g.category}>
                          {g.items.map(item => <option key={item.key} value={item.key}>{item.label} (+{item.pts})</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: 12, padding: '10px', background: '#0d1117', borderRadius: 8, textAlign: 'center' }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: pointsChange > 0 ? '#2ecc71' : '#e74c3c' }}>
                      {pointsChange > 0 ? `+${pointsChange}` : pointsChange} คะแนน
                    </span>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>หมายเหตุ</label>
                    <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="รายละเอียดเพิ่มเติม..." rows={3}
                      style={{ ...inp, resize: 'none' }} />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>📄 แนบเอกสาร (PDF, Word)</label>
                    <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                      onChange={e => { setDocFiles(e.target.files); setAttachedDocNames(Array.from(e.target.files||[]).map(f=>f.name)); }}
                      style={{ fontSize: 12, color: '#8b949e', width: '100%' }} />
                    {attachedDocNames.length > 0 && <div style={{ fontSize: 11, color: '#388bfd', marginTop: 2 }}>{attachedDocNames.join(', ')}</div>}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: '#8b949e', display: 'block', marginBottom: 4 }}>📸 แนบรูปหลักฐาน</label>
                    <input type="file" multiple accept="image/*"
                      onChange={e => { setImgFiles(e.target.files); setAttachedImgNames(Array.from(e.target.files||[]).map(f=>f.name)); }}
                      style={{ fontSize: 12, color: '#8b949e', width: '100%' }} />
                    {attachedImgNames.length > 0 && <div style={{ fontSize: 11, color: '#388bfd', marginTop: 2 }}>{attachedImgNames.join(', ')}</div>}
                  </div>

                  <button onClick={submitPointAdjustment} disabled={uploading} style={{
                    width: '100%', padding: '10px', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                    background: uploading ? '#30363d' : pointsChange > 0 ? '#2ecc71' : '#e74c3c',
                    color: uploading ? '#8b949e' : '#fff',
                    cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'Sarabun, sans-serif',
                  }}>
                    {uploading ? '⏳ กำลังอัพโหลด...' : pointsChange > 0 ? '🌟 บันทึกเพิ่มคะแนน' : '💥 บันทึกหักคะแนน'}
                  </button>
                </div>

                <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1.25rem', maxHeight: 400, overflowY: 'auto' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3', marginBottom: '1rem' }}>📋 ประวัติการปรับคะแนน</div>
                  {currentStudentLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#8b949e', padding: '2rem' }}>ยังไม่มีประวัติ</div>
                  ) : currentStudentLogs.map((l, i) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #21262d', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 13, color: '#e6edf3' }}>{l.isSystem ? '🤖' : '👤'} {l.desc}</div>
                        <div style={{ fontSize: 11, color: '#6e7681', marginTop: 2 }}>{l.time}</div>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 700, color: l.type === 'pos' ? '#2ecc71' : '#e74c3c', flexShrink: 0 }}>
                        {l.pts > 0 ? `+${l.pts}` : l.pts}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1rem' }}>
                {[
                  { label: 'นักเรียนทั้งหมด', value: totalStudents, color: '#e6edf3' },
                  { label: 'คะแนนเฉลี่ย', value: averageScore, color: '#2ecc71' },
                  { label: 'เฝ้าระวัง (50-69)', value: warningCount, color: '#f39c12' },
                  { label: 'วิกฤต (<50)', value: criticalCount, color: '#e74c3c' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
                <input placeholder="🔍 ค้นหาชื่อหรือรหัสนักเรียน..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{ ...inp, flex: 1, minWidth: 200 }} />
                {!isTeacher && (
                  <select value={classFilter} onChange={e => setClassFilter(e.target.value)} style={{ ...inp, width: 'auto' }}>
                    <option value="">ทุกห้อง</option>
                    {classList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inp, width: 'auto' }}>
                  <option value="">ทุกสถานะ</option>
                  <option value="normal">ปกติ (70-100)</option>
                  <option value="warning">เฝ้าระวัง (50-69)</option>
                  <option value="critical">วิกฤต (&lt;50)</option>
                </select>
                <div style={{ display: 'flex', gap: 4, background: '#21262d', borderRadius: 8, padding: 3 }}>
                  {[{v:'grid',l:'🗂️'},{v:'list',l:'📜'}].map(b => (
                    <button key={b.v} onClick={() => setViewMode(b.v as any)} style={{
                      padding: '5px 10px', borderRadius: 6, border: 'none', fontSize: 14,
                      background: viewMode===b.v ? '#388bfd' : 'transparent',
                      color: viewMode===b.v ? '#fff' : '#8b949e', cursor: 'pointer',
                    }}>{b.l}</button>
                  ))}
                </div>
              </div>

              {viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 10 }}>
                  {filteredStudents.map(s => {
                    const borderColor = s.score < 50 ? '#e74c3c' : s.score < 70 ? '#f39c12' : '#2ecc71';
                    return (
                      <div key={s.student_id} onClick={() => setViewingStudentId(s.student_id)} style={{
                        background: '#161b22', border: '1px solid #30363d', borderLeft: `4px solid ${borderColor}`,
                        borderRadius: 12, padding: '1rem', cursor: 'pointer',
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 4 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 10 }}>ชั้น {s.cls}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {renderCircleRing(s.score)}
                          <span style={{ fontSize: 11, color: borderColor, fontWeight: 600 }}>
                            {s.score >= 70 ? 'ปกติ' : s.score >= 50 ? 'เฝ้าระวัง' : 'วิกฤต'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#0d1117', borderBottom: '1px solid #30363d' }}>
                        {['รหัส','ชื่อ','ชั้น','คะแนน','สถานะ'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#8b949e', fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map(s => {
                        const color = s.score < 50 ? '#e74c3c' : s.score < 70 ? '#f39c12' : '#2ecc71';
                        return (
                          <tr key={s.student_id} onClick={() => setViewingStudentId(s.student_id)}
                            style={{ borderBottom: '1px solid #21262d', cursor: 'pointer' }}>
                            <td style={{ padding: '8px 16px', color: '#8b949e', fontFamily: 'monospace' }}>{s.student_id}</td>
                            <td style={{ padding: '8px 16px', color: '#e6edf3', fontWeight: 500 }}>{s.name}</td>
                            <td style={{ padding: '8px 16px', color: '#8b949e' }}>{s.cls}</td>
                            <td style={{ padding: '8px 16px' }}>{renderCircleRing(s.score)}</td>
                            <td style={{ padding: '8px 16px' }}>
                              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
                                background: color+'22', color }}>{s.score >= 70 ? 'ปกติ' : s.score >= 50 ? 'เฝ้าระวัง' : 'วิกฤต'}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: log */}
      {activeTab === 'log' && (
        <div style={{ maxWidth: 700 }}>
          {logItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#8b949e', background: '#161b22', borderRadius: 12 }}>
              ยังไม่มีประวัติ
            </div>
          ) : logItems.map((l, i) => (
            <div key={i} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '1rem', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, paddingRight: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>{l.isSystem ? '🤖' : '👤'} {l.name}</div>
                <div style={{ fontSize: 13, color: '#8b949e', marginTop: 2 }}>{l.desc}</div>
                <div style={{ fontSize: 11, color: '#6e7681', marginTop: 4 }}>{l.time}</div>
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: l.type === 'pos' ? '#2ecc71' : '#e74c3c', flexShrink: 0 }}>
                {l.pts > 0 ? `+${l.pts}` : l.pts}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* TAB: rules */}
      {activeTab === 'rules' && (
        <div style={{ maxWidth: 800 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e74c3c', marginBottom: '1rem' }}>🔴 บทลงโทษ</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: '1.5rem' }}>
            {officialRules.deductions.flatMap(g => g.items)
              .filter(r => !isTeacher || r.pts >= -20)
              .map((r, i) => (
              <div key={i} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#e6edf3' }}>{r.label}</span>
                <span style={{ color: '#e74c3c', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{r.pts}</span>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#2ecc71', marginBottom: '1rem' }}>🟢 ความดี</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {officialRules.rewards.flatMap(g => g.items).map((r, i) => (
              <div key={i} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#e6edf3' }}>{r.label}</span>
                <span style={{ color: '#2ecc71', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>+{r.pts}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
