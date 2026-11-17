import { useNavigate, Link } from 'react-router-dom'
import { Bell, CalendarPlus, CalendarDays, Pill, FlaskConical, FolderHeart, Wallet, Stethoscope, Phone, MapPin, Siren, ChevronRight, Syringe, ClipboardList, Megaphone } from 'lucide-react'
import { Card, IconButton, SectionTitle, Badge, Avatar } from '../../components/ui'
import { ApptStatus } from '../../components/common'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { useAuth } from '../../lib/auth'
import { useData } from '../../lib/db'
import { waitInfo, APPT_TYPES } from '../../lib/actions'
import { fmtDate, hhmm, greeting, today, timeAgo, cls, telLink } from '../../lib/utils'
import { pick, getLang } from '../../i18n'
import { useFamily } from './PatientApp'

export const ACTIONS = [
  { label: 'Book Appointment', icon: CalendarPlus, to: '/p/book', tone: 'bg-brand-50 text-brand-700' },
  { label: 'My Appointments', icon: CalendarDays, to: '/p/appointments', tone: 'bg-sky-50 text-sky-700' },
  { label: 'My Prescriptions', icon: Pill, to: '/p/records/prescriptions', tone: 'bg-violet-50 text-violet-700' },
  { label: 'Lab Reports', icon: FlaskConical, to: '/p/records/reports', tone: 'bg-amber-50 text-amber-700' },
  { label: 'Medical History', icon: FolderHeart, to: '/p/records/history', tone: 'bg-pink-50 text-pink-700' },
  { label: 'Pay Bills', icon: Wallet, to: '/p/bills', tone: 'bg-accent-50 text-accent-700' },
  { label: 'Find a Doctor', icon: Stethoscope, to: '/p/doctors', tone: 'bg-teal-50 text-teal-700' },
  { label: 'Contact Hospital', icon: Phone, to: '/p/contact', tone: 'bg-indigo-50 text-indigo-700' }
]

export function UpcomingCard({ a, onClick }) {
  const doc = useData((d) => d.get('staff', a.doctorId))
  const dept = useData((d) => d.get('departments', a.deptId))
  const p = useData((d) => d.get('patients', a.patientId))
  const w = useData(() => waitInfo(a))
  const isToday = a.date === today()
  return (
    <Card onClick={onClick} className="overflow-hidden">
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 text-white p-4">
        <div className="flex items-start gap-3">
          <Avatar user={doc} size={48} className="ring-2 ring-white/30" />
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[16px] truncate">{doc?.name}</div>
            <div className="text-brand-100 text-[13px] truncate">{dept?.name} · {APPT_TYPES[a.type]}</div>
            <div className="text-brand-100 text-[12px] truncate mt-0.5">For {p?.name}</div>
          </div>
          <div className="text-center rounded-2xl bg-white/15 px-3 py-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-100">Token</div>
            <div className="text-2xl font-extrabold leading-none" translate="no">{a.token}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 text-[14px] font-semibold">
          <span className="flex items-center gap-1.5"><CalendarDays size={16} />{isToday ? 'Today' : fmtDate(a.date + 'T00:00:00')}</span>
          <span>{hhmm(a.time)}</span>
        </div>
      </div>
      <div className="p-4">
        {w ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-ink-100 py-2"><div className="text-[11px] text-ink-500 font-semibold">Now serving</div><div className="text-xl font-extrabold" translate="no">{w.current ?? '—'}</div></div>
            <div className="rounded-xl bg-ink-100 py-2"><div className="text-[11px] text-ink-500 font-semibold">Ahead of you</div><div className="text-xl font-extrabold" translate="no">{w.ahead}</div></div>
            <div className="rounded-xl bg-brand-50 py-2"><div className="text-[11px] text-brand-700 font-semibold">Approx. wait</div><div className="text-xl font-extrabold text-brand-800">{`${w.minutes} min`}</div></div>
          </div>
        ) : <div className="flex items-center justify-between"><ApptStatus s={a.status} /><span className="text-xs text-ink-500">Please arrive 15 minutes early</span></div>}
        {w && <div className="flex items-center justify-between mt-3"><ApptStatus s={a.status} />{a.status === 'booked' && <span className="text-xs text-ink-500">Show your token at reception</span>}</div>}
      </div>
    </Card>
  )
}

export default function Home() {
  const nav = useNavigate()
  const { user, hospital: h } = useAuth()
  const { ids, members } = useFamily()
  const me = members.find((m) => m.id === user.patientId)
  const unread = useData((d) => d.list('notifications', (n) => n.userId === user.id && !n.read).length)
  const upcoming = useData((d) => d.list('appointments', (a) => ids.includes(a.patientId) && ['booked', 'arrived', 'in_consultation'].includes(a.status) && a.date >= today()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)))
  const updates = useData((d) => d.list('announcements', (a) => a.audience !== 'staff' && (!a.expiresAt || a.expiresAt > new Date().toISOString())).sort((a, b) => (b.pinned - a.pinned) || b.createdAt.localeCompare(a.createdAt)))
  const tips = useData((d) => d.list('healthTips', (t) => t.status === 'published'))
  const recentRx = useData((d) => d.list('prescriptions', (r) => ids.includes(r.patientId) && r.status === 'final').length)
  const recentLab = useData((d) => d.list('labOrders', (l) => ids.includes(l.patientId) && l.status === 'published').length)
  const consults = useData((d) => d.list('consultations', (c) => ids.includes(c.patientId) && c.status === 'final').length)
  const vacc = members.reduce((n, m) => n + (m.vaccinations?.length || 0), 0)
  const KIND = { camp: ['Health camp', 'green'], timing: ['Timings', 'amber'], vaccination: ['Vaccination', 'sky'], doctor: ['Doctor', 'purple'], holiday: ['Holiday', 'red'], notice: ['Notice', 'gray'] }

  return (
    <div className="pb-28">
      <header className="bg-gradient-to-b from-brand-700 to-brand-600 text-white px-4 pt-4 pb-16 safe-top rounded-b-[28px]">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white grid place-items-center shrink-0" aria-hidden="true"><img src={h.logo || 'logo.png'} alt="" className="h-10 w-10" /></div>
          <div className="flex-1 min-w-0">
            <div className="font-bold leading-tight truncate">{h.name}</div>
            <div className="text-[12px] text-brand-100 truncate">{h.city}</div>
          </div>
          <IconButton icon={Bell} label="Notifications" badge={unread} onClick={() => nav('/p/notifications')} className="bg-white/15 text-white shadow-none" />
          <button aria-label="Profile" onClick={() => nav('/p/profile')}><Avatar name={user.name} size={40} user={{ ...user, color: '#0F655F' }} className="ring-2 ring-white/40" /></button>
        </div>
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-brand-100 text-sm">{greeting()} 🙏</p>
            <h1 className="text-[24px] font-extrabold leading-tight">{user.name.split(' ')[0]}</h1>
            <p className="text-[12px] text-brand-100 mt-0.5">Patient ID <span translate="no" className="font-bold text-white">{me?.pid}</span></p>
          </div>
          <LanguageSwitcher dark className="scale-90 origin-bottom-right" />
        </div>
      </header>

      <div className="px-4 -mt-10 space-y-4">
        {upcoming[0] ? <UpcomingCard a={upcoming[0]} onClick={() => nav(`/p/appointments/${upcoming[0].id}`)} /> : (
          <Card className="p-4 flex items-center gap-3" onClick={() => nav('/p/book')}>
            <div className="h-12 w-12 rounded-2xl bg-brand-50 text-brand-700 grid place-items-center"><CalendarPlus /></div>
            <div className="flex-1"><div className="font-bold">No upcoming appointment</div><div className="text-sm text-ink-500">Book a visit in less than a minute</div></div>
            <ChevronRight className="text-ink-400" />
          </Card>
        )}
        {upcoming.length > 1 && <button onClick={() => nav('/p/appointments')} className="w-full text-sm font-semibold text-brand-700">{`+ ${upcoming.length - 1} more upcoming`}</button>}

        <a href={telLink(h.emergencyPhone || '108')} className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-100 p-3.5 active:scale-[.99] transition">
          <span className="h-11 w-11 rounded-xl bg-red-600 text-white grid place-items-center"><Siren size={22} /></span>
          <span className="flex-1"><span className="block font-bold text-red-700">Emergency</span><span className="text-[13px] text-red-600">Tap to call {h.emergencyPhone || '108'} · Ambulance {h.ambulancePhone || '108'}</span></span>
          <Phone className="text-red-600" size={20} />
        </a>
      </div>

      <div className="px-4">
        <SectionTitle>What would you like to do?</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {ACTIONS.map((a) => (
            <button key={a.to} onClick={() => nav(a.to)} className="flex items-center gap-3 p-3.5 rounded-2xl bg-white shadow-card text-left active:scale-[.98] transition min-h-[72px]">
              <span className={cls('h-11 w-11 rounded-xl grid place-items-center shrink-0', a.tone)}><a.icon size={22} /></span>
              <span className="text-[14px] font-bold leading-tight text-ink-900">{a.label}</span>
            </button>
          ))}
        </div>

        <SectionTitle action="See all" onAction={() => nav('/p/records')}>Health records</SectionTitle>
        <Card className="divide-y divide-ink-100">
          {[
            [Pill, 'Prescriptions', recentRx, '/p/records/prescriptions'], [FlaskConical, 'Diagnostic reports', recentLab, '/p/records/reports'],
            [ClipboardList, 'Previous consultations', consults, '/p/records/history'], [Syringe, 'Vaccination records', vacc, '/p/records/vaccinations']
          ].map(([Icon, label, n, to]) => (
            <button key={to} onClick={() => nav(to)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
              <Icon size={20} className="text-brand-600" /><span className="flex-1 font-semibold text-[15px]">{label}</span>
              <span className="text-sm text-ink-500" translate="no">{n}</span><ChevronRight size={18} className="text-ink-400" />
            </button>
          ))}
        </Card>

        {updates.length > 0 && <>
          <SectionTitle>Hospital updates</SectionTitle>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1 snap-x">
            {updates.map((u) => (
              <Card key={u.id} className="p-4 w-[280px] shrink-0 snap-start" onClick={() => nav(`/p/updates#${u.id}`)}>
                <div className="flex items-center gap-2 mb-2"><Megaphone size={16} className="text-brand-600" /><Badge color={KIND[u.kind]?.[1] || 'gray'}>{KIND[u.kind]?.[0] || 'Notice'}</Badge><span className="text-[11px] text-ink-400 ml-auto">{timeAgo(u.createdAt)}</span></div>
                <div className="font-bold leading-snug line-clamp-2">{u.title}</div>
                <p className="text-[13px] text-ink-500 mt-1 line-clamp-2">{u.body}</p>
              </Card>
            ))}
          </div>
        </>}

        {tips.length > 0 && <>
          <SectionTitle>Health awareness</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            {tips.slice(0, 6).map((t) => (
              <Link key={t.id} to={`/p/tips/${t.id}`} className="rounded-2xl bg-white shadow-card p-3.5 active:scale-[.98] transition" translate="no">
                <div className="text-2xl">{t.emoji}</div>
                <div className="font-bold text-[14px] leading-snug mt-2 line-clamp-2">{pick(t.title)}</div>
              </Link>
            ))}
          </div>
          <p className="text-[11px] text-ink-400 mt-2">Reviewed by our doctors. For general awareness only – not a substitute for medical advice.</p>
        </>}

        <SectionTitle>Visit us</SectionTitle>
        <Card className="p-4">
          <div className="flex gap-3"><MapPin className="text-brand-600 shrink-0" size={20} /><div className="text-sm"><div className="font-semibold">{getLang() === 'mr' && h.addressMr ? <span translate="no">{h.addressMr}</span> : `${h.address}, ${h.city} ${h.pin}`}</div><div className="text-ink-500 mt-1">{h.timings}</div></div></div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <a href={h.mapUrl} target="_blank" rel="noreferrer" className="h-11 rounded-xl bg-brand-50 text-brand-800 font-semibold text-sm grid place-items-center">Directions</a>
            <a href={telLink(h.phone)} className="h-11 rounded-xl bg-brand-50 text-brand-800 font-semibold text-sm grid place-items-center">Call reception</a>
          </div>
        </Card>
      </div>
    </div>
  )
}
