// Full-screen queue display for a TV / reception screen.
// Privacy: shows only token numbers, doctors and rooms – never patient names.
import { useEffect, useRef, useState } from 'react'
import { Maximize, Volume2, VolumeX } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { db, useData } from '../../lib/db'
import { doctors, queueFor, worksOn, avgConsultMins } from '../../lib/actions'
import { today } from '../../lib/utils'
import LanguageSwitcher from '../../components/LanguageSwitcher'

export default function QueueTV() {
  const { hospital: h } = useAuth()
  const [now, setNow] = useState(new Date())
  const [sound, setSound] = useState(false)
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(t) }, [])
  const rows = useData(() => doctors().filter((d) => worksOn(d, today()) || queueFor(d.id).length).map((d) => {
    const q = queueFor(d.id)
    const cur = q.find((a) => a.status === 'in_consultation')
    const next = q.filter((a) => ['arrived', 'booked'].includes(a.status)).slice(0, 4)
    return { d, cur, next, avg: avgConsultMins(d.id), waiting: q.filter((a) => a.status === 'arrived').length }
  }))
  const sig = rows.map((r) => r.cur?.token).join(',')
  const last = useRef(sig)
  useEffect(() => {
    if (sig !== last.current && sound && 'speechSynthesis' in window) {
      rows.forEach((r) => { if (r.cur && !last.current.split(',').includes(String(r.cur.token))) { const u = new SpeechSynthesisUtterance(`Token number ${r.cur.token}, please go to ${r.d.name}`); u.lang = 'en-IN'; speechSynthesis.speak(u) } })
    }
    last.current = sig
  }, [sig])
  return (
    <div className="min-h-screen bg-brand-900 text-white p-6 lg:p-10">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-14 w-14 rounded-2xl bg-white/10 grid place-items-center"><svg viewBox="0 0 64 64" className="h-9 w-9"><path d="M27 12h10v15h15v10H37v15H27V37H12V27h15z" fill="#fff" /></svg></div>
        <div className="flex-1"><div className="text-3xl font-extrabold">{h.name}</div><div className="text-brand-200 text-lg">OPD queue · {now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</div></div>
        <LanguageSwitcher dark className="hidden md:inline-flex" />
        <button aria-label="Announce tokens" onClick={() => setSound(!sound)} className="h-12 w-12 rounded-xl bg-white/10 grid place-items-center">{sound ? <Volume2 /> : <VolumeX />}</button>
        <button aria-label="Full screen" onClick={() => document.documentElement.requestFullscreen?.()} className="h-12 w-12 rounded-xl bg-white/10 grid place-items-center"><Maximize /></button>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {rows.map(({ d, cur, next, avg, waiting }) => (
          <div key={d.id} className="rounded-3xl bg-white/[.07] p-6">
            <div className="text-2xl font-bold">{d.name}</div>
            <div className="text-brand-200">{db.get('departments', d.deptId)?.name}{d.room ? ` · Room ${d.room}` : ''}</div>
            <div className="mt-5 flex items-end gap-6">
              <div><div className="text-brand-200 text-sm font-semibold uppercase tracking-wider">Now serving</div><div className="text-[88px] leading-none font-extrabold text-brand-300" translate="no">{cur?.token ?? '—'}</div></div>
              <div className="flex-1"><div className="text-brand-200 text-sm font-semibold uppercase tracking-wider mb-2">Next</div>
                <div className="flex flex-wrap gap-2">{next.map((a) => <span key={a.id} className={`h-12 min-w-[48px] px-2 rounded-xl grid place-items-center text-2xl font-bold ${a.priority === 'emergency' ? 'bg-red-500' : a.status === 'arrived' ? 'bg-white/20' : 'bg-white/5 text-white/60'}`} translate="no">{a.token}</span>)}{!next.length && <span className="text-white/50">—</span>}</div>
              </div>
            </div>
            <div className="mt-4 text-brand-200 text-sm">{`${waiting} waiting · about ${avg} min per patient`}</div>
          </div>
        ))}
      </div>
      <p className="text-center text-brand-200/70 mt-10">Please keep your token slip ready. Emergency patients are seen first. Thank you for your patience.</p>
    </div>
  )
}
