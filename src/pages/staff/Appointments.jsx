import { useState } from 'react'
import { Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarPlus, ChevronLeft, ChevronRight, MessageCircle, XCircle, CalendarClock, Video } from 'lucide-react'
import { Page, Card, Button, Table, Field, Select, Input, Textarea, Chips, Sheet, Badge, Empty, useToast, useConfirm } from '../../components/ui'
import { ApptStatus, EmergencyTag, PatientLine, doctorName } from '../../components/common'
import PatientPicker from '../../components/PatientPicker'
import { useAuth } from '../../lib/auth'
import { db, useData } from '../../lib/db'
import { can } from '../../lib/rbac'
import { doctors, worksOn, slotsFor, bookAppointment, cancelAppointment, rescheduleAppointment, sendMessage, apptVars, APPT_TYPES, APPT_STATUS } from '../../lib/actions'
import { addDays, fmtDate, hhmm, inr, today, cls } from '../../lib/utils'

function DayView() {
  const nav = useNavigate()
  const toast = useToast()
  const ask = useConfirm()
  const { user } = useAuth()
  const [day, setDay] = useState(today())
  const [doc, setDoc] = useState(user.role === 'doctor' ? user.staffId : 'all')
  const [status, setStatus] = useState('all')
  const [res, setRes] = useState(null)
  const docs = useData(() => doctors())
  const rows = useData((d) => d.list('appointments', (a) => a.date === day && (doc === 'all' || a.doctorId === doc) && (status === 'all' || a.status === status)).sort((a, b) => a.time.localeCompare(b.time)))
  const manage = can(user, 'appointments.manage')
  const counts = useData((d) => { const c = {}; d.list('appointments', (a) => a.date === day && (doc === 'all' || a.doctorId === doc)).forEach((a) => { c[a.status] = (c[a.status] || 0) + 1 }); return c })
  return (
    <Page title="Appointments" wide actions={manage && <Button icon={CalendarPlus} onClick={() => nav('new')}>Book appointment</Button>}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1 bg-white rounded-xl shadow-card p-1">
          <button aria-label="Previous day" onClick={() => setDay(addDays(day, -1))} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-ink-100"><ChevronLeft size={18} /></button>
          <Input type="date" value={day} onChange={(e) => setDay(e.target.value || today())} className="!h-9 !min-h-0 w-40 border-0" />
          <button aria-label="Next day" onClick={() => setDay(addDays(day, 1))} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-ink-100"><ChevronRight size={18} /></button>
        </div>
        {day !== today() && <Button size="sm" variant="ghost" onClick={() => setDay(today())}>Today</Button>}
        <Select value={doc} onChange={(e) => setDoc(e.target.value)} className="!h-11 w-auto min-w-[220px]"><option value="all">All doctors</option>{docs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>
      </div>
      <Chips className="mb-4" value={status} onChange={setStatus} options={[{ value: 'all', label: 'All', count: Object.values(counts).reduce((a, b) => a + b, 0) }, ...Object.entries(APPT_STATUS).map(([v, l]) => ({ value: v, label: l, count: counts[v] || 0 }))]} />
      <Table rows={rows} empty="No appointments for this day" columns={[
        { label: 'Token', render: (a) => <span className={cls('inline-grid place-items-center h-9 w-9 rounded-lg font-extrabold', a.priority === 'emergency' ? 'bg-red-600 text-white' : 'bg-brand-50 text-brand-800')} translate="no">{a.token}</span> },
        { label: 'Patient', render: (a) => <PatientCell id={a.patientId} onClick={() => nav(`/s/patients/${a.patientId}`)} /> },
        { label: 'Time', render: (a) => hhmm(a.time), nowrap: true },
        { label: 'Doctor', render: (a) => doctorName(a.doctorId), hideMobile: doc !== 'all' },
        { label: 'Type', render: (a) => a.priority === 'emergency' ? <EmergencyTag /> : <span className="text-xs flex items-center gap-1">{a.type === 'online' && <Video size={14} className="text-sky-600" />}{APPT_TYPES[a.type]}</span> },
        { label: 'Source', render: (a) => <Badge color={a.source === 'app' ? 'sky' : a.source === 'whatsapp' ? 'green' : 'gray'}>{{ app: 'App', whatsapp: 'WhatsApp', reception: 'Reception', 'walk-in': 'Walk-in', phone: 'Phone' }[a.source] || a.source}</Badge>, hideMobile: true },
        { label: 'Status', render: (a) => <ApptStatus s={a.status} /> },
        { label: '', right: true, render: (a) => manage && a.status === 'booked' && (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <button title="Send reminder" aria-label="Send reminder" onClick={() => { const m = sendMessage(a.patientId, 'appointment_reminder', apptVars(a)); toast(m?.status === 'blocked_no_consent' ? 'Patient has not agreed to messages' : 'Reminder queued', m?.status === 'blocked_no_consent' ? 'error' : 'success') }} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-ink-100"><MessageCircle size={17} className="text-[#1DA851]" /></button>
            <button title="Reschedule" aria-label="Reschedule" onClick={() => setRes(a)} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-ink-100"><CalendarClock size={17} /></button>
            <button title="Cancel" aria-label="Cancel" onClick={async () => { const r = await ask({ title: 'Cancel appointment?', input: 'Reason (e.g. patient requested)', danger: true, ok: 'Cancel appointment' }); if (r) { try { cancelAppointment(a.id, r); toast('Appointment cancelled') } catch (e) { toast(e.message, 'error') } } }} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-red-50 text-red-600"><XCircle size={17} /></button>
          </div>) }
      ]} />
      {res && <Reschedule a={res} onClose={() => setRes(null)} />}
    </Page>
  )
}
const PatientCell = ({ id, onClick }) => { const p = useData((d) => d.get('patients', id)); return <button onClick={(e) => { e.stopPropagation(); onClick() }} className="text-left"><PatientLine p={p} showPhone={false} /></button> }

function SlotPicker({ doctorId, day, value, onChange, walkIn }) {
  const { slots, reason } = useData(() => slotsFor(doctorId, day))
  const free = slots.filter((s) => s.free)
  const doc = useData((d) => d.get('staff', doctorId))
  const canWalkIn = walkIn && day === today() && worksOn(doc, day)
  if (canWalkIn) return (
    <div className="space-y-3">
      <button type="button" onClick={() => onChange('walkin')} className={cls('w-full rounded-2xl border-2 p-3 text-left', value === 'walkin' ? 'border-brand-500 bg-brand-50' : 'border-dashed border-ink-300')}>
        <div className="font-bold">Walk-in – give next token now</div><div className="text-xs text-ink-500">Patient is at the hospital; added to today’s queue</div>
      </button>
      {free.length > 0 && <div><div className="text-xs font-semibold text-ink-500 mb-2">Or book a later time today</div><div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">{free.map((s) => <button key={s.time} type="button" onClick={() => onChange(s.time)} className={cls('h-10 rounded-lg text-[13px] font-semibold border', value === s.time ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-ink-200 hover:border-brand-300')}>{hhmm(s.time)}</button>)}</div></div>}
    </div>
  )
  if (!free.length) return <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">{reason === 'leave' ? 'Doctor is on leave on this day.' : reason === 'off' ? 'Doctor does not have OPD on this day.' : 'No free slots on this day.'}</p>
  return <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">{free.map((s) => <button key={s.time} type="button" onClick={() => onChange(s.time)} className={cls('h-10 rounded-lg text-[13px] font-semibold border', value === s.time ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-ink-200 hover:border-brand-300')}>{hhmm(s.time)}</button>)}</div>
}

function Reschedule({ a, onClose }) {
  const toast = useToast()
  const [day, setDay] = useState(a.date)
  const [time, setTime] = useState('')
  return (
    <Sheet open onClose={onClose} title="Reschedule appointment" footer={<Button block size="lg" disabled={!time} onClick={() => { try { rescheduleAppointment(a.id, { date: day, time }); toast('Rescheduled – patient informed'); onClose() } catch (e) { toast(e.message, 'error') } }}>Reschedule</Button>}>
      <p className="text-sm text-ink-500 mb-3">{doctorName(a.doctorId)} · now {fmtDate(a.date + 'T00:00:00')} {hhmm(a.time)}</p>
      <Field label="New date"><Input type="date" min={today()} value={day} onChange={(e) => { setDay(e.target.value); setTime('') }} /></Field>
      <SlotPicker doctorId={a.doctorId} day={day} value={time} onChange={setTime} />
    </Sheet>
  )
}

function NewAppointment() {
  const nav = useNavigate()
  const toast = useToast()
  const [sp] = useSearchParams()
  const docs = useData(() => doctors())
  const [patientId, setPatientId] = useState(sp.get('patient') || null)
  const [doctorId, setDoctorId] = useState(sp.get('doctor') || '')
  const [day, setDay] = useState(today())
  const [time, setTime] = useState('')
  const [type, setType] = useState('general')
  const [reason, setReason] = useState('')
  const [source, setSource] = useState('reception')
  const doc = useData((d) => doctorId && d.get('staff', doctorId))
  const book = () => {
    try {
      const a = bookAppointment({ patientId, doctorId, date: day, time: time === 'walkin' ? '' : time, walkIn: time === 'walkin', type, reason, source })
      toast(`Booked · Token ${a.token} · confirmation sent`)
      nav(day === today() ? '/s/queue' : '/s/appointments', { replace: true })
    } catch (e) { toast(e.message, 'error') }
  }
  return (
    <Page title="Book appointment" back wide>
      <div className="grid lg:grid-cols-[1fr_340px] gap-4 max-w-6xl">
        <div className="space-y-4">
          <Card className="p-5"><h3 className="font-bold mb-3">1. Patient</h3><PatientPicker value={patientId} onChange={setPatientId} /></Card>
          <Card className="p-5">
            <h3 className="font-bold mb-3">2. Doctor & visit type</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {docs.map((x) => (
                <button key={x.id} onClick={() => { setDoctorId(x.id); setTime('') }} className={cls('text-left rounded-2xl border p-3 transition', doctorId === x.id ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-ink-200 hover:border-ink-300')}>
                  <div className="font-semibold">{x.name}</div><div className="text-xs text-ink-500">{db.get('departments', x.deptId)?.name} · {inr(x.fee)}</div>
                </button>
              ))}
            </div>
            <Chips className="mt-4" value={type} onChange={setType} options={Object.entries(APPT_TYPES).filter(([k]) => k !== 'emergency' && (k !== 'online' || doc?.availability?.online)).map(([value, label]) => ({ value, label }))} />
          </Card>
          {doctorId && <Card className="p-5">
            <h3 className="font-bold mb-3">3. Date & time</h3>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3">{Array.from({ length: 10 }, (_, i) => addDays(today(), i)).map((dd) => <button key={dd} onClick={() => { setDay(dd); setTime('') }} className={cls('shrink-0 rounded-xl px-3 py-2 text-sm font-semibold border', day === dd ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-ink-200')}>{dd === today() ? 'Today' : fmtDate(dd + 'T00:00:00', { year: false, weekday: 'short' })}</button>)}</div>
            <SlotPicker walkIn doctorId={doctorId} day={day} value={time} onChange={setTime} />
          </Card>}
        </div>
        <div>
          <Card className="p-5 lg:sticky lg:top-24">
            <h3 className="font-bold mb-3">Summary</h3>
            <Field label="Reason for visit"><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <Field label="Booked via"><Select value={source} onChange={(e) => setSource(e.target.value)}><option value="reception">Reception (walk-in)</option><option value="phone">Phone call</option><option value="whatsapp">WhatsApp</option></Select></Field>
            <div className="text-sm space-y-1 mb-4"><div className="flex justify-between"><span className="text-ink-500">Doctor</span><b>{doc?.name || '—'}</b></div><div className="flex justify-between"><span className="text-ink-500">When</span><b>{time === 'walkin' ? 'Now (walk-in)' : time ? `${fmtDate(day + 'T00:00:00', { year: false })}, ${hhmm(time)}` : '—'}</b></div><div className="flex justify-between"><span className="text-ink-500">Fee</span><b>{doc ? inr(type === 'followup' ? doc.followUpFee : doc.fee) : '—'}</b></div></div>
            <Button block size="lg" disabled={!patientId || !doctorId || !time} onClick={book}>Confirm booking</Button>
            <p className="text-xs text-ink-500 mt-2">The patient gets the token number by WhatsApp / SMS (if they agreed).</p>
          </Card>
        </div>
      </div>
    </Page>
  )
}

export default function Appointments() {
  return <Routes><Route index element={<DayView />} /><Route path="new" element={<NewAppointment />} /></Routes>
}
