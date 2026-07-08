'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface DayData {
  date: string
  weekday: number
  isWeekend: boolean
  present: number
  late: number
  absent: number
  total: number
  presentPct?: number
}

const DAY_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

export default function WeeklyChart({ days }: { days: DayData[] }) {
  const data = days.map(d => ({
    name: DAY_TH[d.weekday],
    present: d.present,
    late: d.late,
    absent: d.absent,
    isWeekend: d.isWeekend,
    pct: d.presentPct || 0,
  }))

  return (
    <div className="section-card">
      <h2 className="text-[15px] font-medium text-[#e6edf3] mb-4">
        📈 แนวโน้ม 7 วันล่าสุด
      </h2>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barSize={28} barGap={2}>
          <XAxis
            dataKey="name"
            tick={{ fill: '#8b949e', fontSize: 13 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: '#161b22', border: '1px solid #30363d',
              borderRadius: 8, color: '#e6edf3', fontSize: 13
            }}
            formatter={(val: number, name: string) => {
              const labels: Record<string, string> = {
                present: 'มาปกติ', late: 'สาย', absent: 'ขาด'
              }
              return [val, labels[name] || name]
            }}
          />
          <Bar dataKey="present" stackId="a" fill="#1D9E75" radius={[0,0,0,0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.isWeekend ? '#21262d' : '#1D9E75'} />
            ))}
          </Bar>
          <Bar dataKey="late" stackId="a" fill="#BA7517">
            {data.map((d, i) => (
              <Cell key={i} fill={d.isWeekend ? '#21262d' : '#BA7517'} />
            ))}
          </Bar>
          <Bar dataKey="absent" stackId="a" fill="#A32D2D" radius={[4,4,0,0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.isWeekend ? '#21262d' : '#A32D2D'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-[12px] text-[#8b949e]">
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-600 mr-1"></span>มาปกติ</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-600 mr-1"></span>มาสาย</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-800 mr-1"></span>ขาด</span>
      </div>
    </div>
  )
}
