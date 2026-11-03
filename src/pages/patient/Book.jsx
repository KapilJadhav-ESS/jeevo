import { useMemo, useState } from 'react'
import { Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Video, Languages as LangIcon, GraduationCap, CalendarX } from 'lucide-react'
import { Page, Card, Button, Chips, SearchBox, Avatar, Badge, Empty, Textarea, Field, useToast } from '../../components/ui'
import { useData } from '../../lib/db'
import { doctors, slotsFor, bookAppointment, rescheduleAppointment, worksOn, APPT_TYPES } from '../../lib/actions'
import { addDays, cls, fmtWeekday, hhmm, inr, today, fmtDate } from '../../lib/utils'
import { FamilySwitch, useFamily } from './PatientApp'
import { UpcomingCard } from './Home'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function DoctorList({ onPick, title = 'Find a Doctor', back = true }) {
  const [q, setQ] = useState('')
  const [dep, setDep] = useState('all')
  const depts = useData((d) => d.list('departments', (x) => x.active && d.list('staff', (s) => s.role === 'doctor' && s.deptId === x.id && !s.noOpd && s.active).length))
  const docs = useData(() => doctors()).filter((d) => (dep === 'all' || d.deptId === dep) && (!q || (d.name + d.designation + d.qualification).toLowerCase().includes(q.toLowerCase())))
  const nav = useNavigate()
  return (
    <Page title={title} back={back}>
      <SearchBox value={q} onChange={setQ} placeholder="Search doctor or speciality" className="mb-3" />
      <Chips className="mb-4" value={dep} onChange={setDep} options={[{ value: 'all', label: 'All' }, ...depts.map((x) => ({ value: x.id, label: `${x.icon} ${x.name}` }))]} />
      <div className="space-y-3">
        {docs.map((d) => <DoctorCard key={d.id} d={d} onClick={() => (onPick ? onPick(d) : nav(`/p/book/${d.id}`))} />)}
        {!docs.length && <Empty title="No doctors found" text="Try another speciality" />}
      </div>
    </Page>
  )
}

function DoctorCard({ d, onClick }) {
  const dept = useData((x) => x.get('departments', d.deptId))
  const av = d.availability || {}
  const next = useMemo(() => { for (let i = 0; i < 14; i++) { const day = addDays(today(), i); if (worksOn(d, day)) return i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmtDate(day + 'T00:00:00', { year: false }) } return '' }, [d.id])
  return (
    <Card className="p-4" onClick={onClick}>
      <div className="flex gap-3">
        <Avatar user={d} size={56} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[16px] leading-tight">{d.name}</div>
          <div className="text-[13px] text-brand-700 font-semibold">{d.designation}</div>
          <div className="text-xs text-ink-500 mt-0.5">{dept?.icon} {dept?.name} · {d.experience ? `${d.experience} yrs exp.` : ''}</div>
        </div>
        <div className="text-right"><div className="font-extrabold text-[17px]">{inr(d.fee)}</div><div className="text-[11px] text-ink-500">Consultation fee</div></div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
        <span className="inline-flex items-center gap-1 rounded-lg bg-ink-100 px-2 py-1 font-semibold text-ink-700">{(av.days || []).map((x) => DAYS[x]).join(', ')}</span>
        {(av.sessions || []).map((s) => <span key={s.start} className="rounded-lg bg-ink-100 px-2 py-1 font-semibold text-ink-700">{hhmm(s.start)} – {hhmm(s.end)}</span>)}
        {av.online && <Badge color="sky"><Video size={12} /> Online</Badge>}
      </div>
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-accent-700 font-semibold">{next ? `Next available: ${next}` : 'Not available in the next 2 weeks'}</span>
        <span className="text-sm font-bold text-brand-700">Book →</span>
      </div>
    </Card>
  )
}

function BookDoctor() {
  const { doctorId } = useParams()
  const [sp] = useSearchParams()
  const resId = sp.get('reschedule')
  const nav = useNavigate()
  const toast = useToast()
  const { current, members } = useFamily()
  const doc = useData((d) => d.get('staff', doctorId))
  const res = useData((d) => (resId ? d.get('appointments', resId) : null))
  const [day, setDay] = useState(today())
  const [time, setTime] = useState('')
  const [type, setType] = useState(sp.get('type') || 'general')
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(null)
  const { slots, reason: why } = useData(() => slotsFor(doctorId, day))
  if (!doc) return <Page title="Book appointment" back><Empty title="Doctor not found" /></Page>
  const days = Array.from({ length: 14 }, (_, i) => addDays(today(), i))
  const fee = type === 'followup' ? doc.followUpFee : doc.fee
  const patient = res ? members.find((m) => m.id === res.patientId) : current

  const confirm = () => {
    try {
      const a = res ? rescheduleAppointment(res.id, { date: day, time }) : bookAppointment({ patientId: patient.id, doctorId, date: day, time, type, reason })
      setDone(a)
    } catch (e) { toast(e.message, 'error') }
  }
  if (done) return (
    <Page title="Appointment confirmed" back="/p">
      <div className="text-center py-6">
        <CheckCircle2 size={64} className="mx-auto text-accent-500" />
        <h2 className="text-xl font-extrabold mt-3">{res ? 'Appointment rescheduled' : 'Your appointment is booked'}</h2>
        <p className="text-sm text-ink-500 mt-1">A confirmation has been sent on WhatsApp / SMS.</p>
      </div>
      <UpcomingCard a={done} onClick={() => nav(`/p/appointments/${done.id}`)} />
      {done.type === 'online' && <p className="text-sm text-ink-500 mt-3 text-center">A secure video link will be available in My Appointments.</p>}
      <Button block size="lg" className="mt-6" onClick={() => nav('/p/appointments')}>View my appointments</Button>
      <Button block variant="ghost" className="mt-2" onClick={() => nav('/p')}>Go to home</Button>
    </Page>
  )

  return (
    <Page title={res ? 'Reschedule appointment' : 'Book appointment'} back>
      <Card className="p-4 flex gap-3 items-center">
        <Avatar user={doc} size={52} />
        <div className="flex-1 min-w-0"><div className="font-bold">{doc.name}</div><div className="text-[13px] text-ink-500">{doc.designation}</div>
          <div className="text-xs text-ink-500 flex items-center gap-1 mt-0.5"><GraduationCap size={13} />{doc.qualification}</div>
          {doc.languages && <div className="text-xs text-ink-500 flex items-center gap-1"><LangIcon size={13} />{doc.languages.join(', ')}</div>}
        </div>
      </Card>

      {!res && <>
        <h3 className="font-bold mt-5 mb-2">Who is the appointment for?</h3>
        <FamilySwitch />
        <h3 className="font-bold mt-4 mb-2">Type of visit</h3>
        <Chips value={type} onChange={setType} options={['general', 'followup', ...(doc.availability?.online ? ['online'] : [])].map((v) => ({ value: v, label: APPT_TYPES[v] }))} />
      </>}

      <h3 className="font-bold mt-5 mb-2">Choose a date</h3>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
        {days.map((dd) => {
          const ok = worksOn(doc, dd)
          return (
            <button key={dd} disabled={!ok} onClick={() => { setDay(dd); setTime('') }} className={cls('shrink-0 w-[58px] rounded-2xl py-2 text-center border transition', day === dd ? 'bg-brand-600 text-white border-brand-600' : ok ? 'bg-white border-ink-200' : 'bg-ink-100 border-ink-100 text-ink-400')}>
              <div className="text-[11px] font-semibold">{fmtWeekday(dd + 'T00:00:00')}</div>
              <div className="text-lg font-extrabold leading-tight" translate="no">{Number(dd.slice(8))}</div>
            </button>
          )
        })}
      </div>

      <h3 className="font-bold mt-5 mb-2">Choose a time</h3>
      {!slots.length || !slots.some((s) => s.free) ? (
        <Card className="p-2"><Empty icon={CalendarX} title={why === 'leave' ? 'Doctor is on leave' : why === 'off' ? 'Doctor is not available on this day' : 'No free slots on this day'} text="Please choose another date" /></Card>
      ) : ['morning', 'evening'].map((sess) => {
        const list = slots.filter((s) => s.session === sess)
        if (!list.length) return null
        return (
          <div key={sess} className="mb-3">
            <div className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-2">{sess === 'morning' ? 'Morning' : 'Evening'}</div>
            <div className="grid grid-cols-4 gap-2">
              {list.map((s) => (
                <button key={s.time} disabled={!s.free} onClick={() => setTime(s.time)} className={cls('h-11 rounded-xl text-[13px] font-semibold border transition', time === s.time ? 'bg-brand-600 text-white border-brand-600' : s.free ? 'bg-white border-ink-200' : 'bg-ink-100 border-ink-100 text-ink-300 line-through')}>{hhmm(s.time)}</button>
              ))}
            </div>
          </div>
        )
      })}

      {!res && <Field label="Reason for visit (optional)" className="mt-4"><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. fever since 2 days" /></Field>}

      <div className="fixed bottom-0 inset-x-0 mx-auto max-w-[520px] bg-white border-t border-ink-200 p-4 safe-bottom z-40">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-ink-500 truncate">{patient?.name} · {time ? `${fmtDate(day + 'T00:00:00', { year: false })}, ${hhmm(time)}` : 'Choose a time'}</div>
            <div className="font-extrabold text-lg">{inr(fee)} <span className="text-xs font-semibold text-ink-500">{type === 'online' ? 'pay online' : 'pay at hospital'}</span></div>
          </div>
          <Button size="lg" disabled={!time} onClick={confirm}>{res ? 'Reschedule' : 'Confirm'}</Button>
        </div>
      </div>
      <div className="h-24" />
    </Page>
  )
}

export default function Book() {
  return (
    <Routes>
      <Route index element={<DoctorList title="Book appointment" />} />
      <Route path=":doctorId" element={<BookDoctor />} />
    </Routes>
  )
}
