'use client'
import { useState, useEffect } from 'react'

export default function ClientTime() {
  const [time, setTime] = useState('')
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }))
      setDateStr(now.toLocaleDateString('th-TH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }))
    }
    update()
    const interval = setInterval(update, 30000) // อัปเดตทุก 30 วิ
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="text-right">
      <div className="text-[12px] text-[#8b949e]">อัปเดตล่าสุด</div>
      <div className="text-[14px] text-[#e6edf3] font-medium">{time} น.</div>
    </div>
  )
}
