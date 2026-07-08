'use client'
import Image from 'next/image'

interface ScanRecord {
  student_id: string
  prefix: string
  fname: string
  lname: string
  grade: string
  classroom: string
  number: string
  status: string
  time: string
  image_url: string
  timestamp: string
}

const statusStyle: Record<string, { badge: string; border: string }> = {
  'มาเรียนปกติ': { badge: 'badge-present', border: 'border-emerald-500/40' },
  'มาสาย':      { badge: 'badge-late',    border: 'border-amber-500/40'   },
  'กลับบ้าน':   { badge: 'badge-leave',   border: 'border-blue-500/40'    },
}

export default function RecentScans({ records }: { records: ScanRecord[] }) {
  if (!records.length) {
    return (
      <div className="section-card">
        <h2 className="text-[15px] font-medium text-[#e6edf3] mb-4">🕐 สแกนล่าสุด</h2>
        <p className="text-[#8b949e] text-[14px] text-center py-6">ยังไม่มีการสแกนวันนี้</p>
      </div>
    )
  }

  return (
    <div className="section-card">
      <h2 className="text-[15px] font-medium text-[#e6edf3] mb-4">
        🕐 สแกนล่าสุด
        <span className="text-[12px] text-[#8b949e] ml-2 font-normal">10 รายการ</span>
      </h2>

      <div className="space-y-2">
        {records.map((r, i) => {
          const style = statusStyle[r.status] || { badge: 'badge-absent', border: 'border-red-500/40' }
          const name  = `${r.prefix}${r.fname} ${r.lname}`
          const cls   = r.grade && r.classroom ? `${r.grade}/${r.classroom}` : ''
          const hasImg = r.image_url && r.image_url.startsWith('http')

          return (
            <div
              key={`${r.student_id}-${i}`}
              className={`flex items-center gap-3 p-2.5 rounded-lg bg-[#0d1117] border ${style.border}`}
            >
              {/* รูปนักเรียน */}
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[#21262d] flex items-center justify-center">
                {hasImg ? (
                  <Image
                    src={r.image_url}
                    alt={name}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <span className="text-[16px]">
                    {r.prefix?.includes('หญิง') || r.prefix === 'นางสาว' || r.prefix === 'นาง'
                      ? '👩' : '👦'}
                  </span>
                )}
              </div>

              {/* ข้อมูล */}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] text-[#e6edf3] font-medium truncate">{name}</div>
                <div className="text-[12px] text-[#8b949e]">
                  {cls && <span className="mr-2">{cls}</span>}
                  {r.number && <span>เลขที่ {r.number}</span>}
                </div>
              </div>

              {/* สถานะ + เวลา */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={style.badge}>{r.status}</span>
                <span className="text-[11px] text-[#8b949e]">{r.time || r.timestamp?.slice(11, 16)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
