import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Monitor, Play, CheckCheck, UserCheck, UserX, Siren, Stethoscope, Clock, CalendarPlus, Video } from 'lucide-react'
import { Page, Card, Button, Badge, Empty, Sheet, Select, Avatar, useToast, useConfirm } from '../../components/ui'
import { ApptStatus, EmergencyTag, PatientLine } from '../../components/common'
import { useAuth } from '../../lib/auth'
import { db, useData } from '../../lib/db'
import { doctors, queueFor, checkIn, startConsultation, completeAppointment, markNoShow, setPriority, avgConsultMins, worksOn, PAY_METHODS, APPT_TYPES } from '../../lib/actions'
import { hhmm, inr, today, timeAgo, cls } from '../../lib/utils'

function QueueCard({ a, doctorView, onCheckIn }) {
  const nav = useNavigate()
  const toast = useToast()
  const ask = useConfirm()
  const p = useData((d) => d.get('patients', a.patientId))
  const run = (fn, msg) => { try { fn(); msg && toast(msg) } catch (e) { toast(e.message, 'error') } }
  const emergency = a.priority === 'emergency'
  return (
    <div className={cls('rounded-2xl border p-3 bg-white', emergency ? 'border-red-300 bg-red-50/40' : a.status === 'in_consultation' ? 'border-violet-300 bg-violet-50/40' : 'border-ink-200')}>
      <div className="flex items-center gap-3">
        <span className={cls('h-12 w-12 rounded-xl grid place-items-center text-lg font-extrabold shrink-0', emergency ? 'bg-red-600 text-white' : a.status === 'in_consultation' ? 'bg-violet-600 text-white' : 'bg-brand-50 text-brand-800')} translate="no">{a.token}</span>
        <PatientLine p={p} showPhone={false} className="flex-1" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
        {emergency ? <EmergencyTag /> : <ApptStatus s={a.status} />}
        {a.type === 'followup' && <Badge color="sky">Follow-up</Badge>}
        {a.type === 'online' && <Badge color="sky"><Video size={12} /> Online</Badge>}
        <span className="text-ink-500">{a.status === 'arrived' ? `Waiting ${timeAgo(a.arrivedAt).replace(' ago', '')}` : a.status === 'in_consultation' ? `Started ${timeAgo(a.startedAt)}` : `Slot ${hhmm(a.time)}`}</span>
        {a.reason && <span className="text-ink-500 truncate max-w-full" translate="no">· {a.reason}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {a.status === 'booked' && !doctorView && <Button size="sm" icon={UserCheck} onClick={() => onCheckIn(a)}>Mark arrived</Button>}
        {doctorView && ['arrived', 'booked', 'in_consultation'].includes(a.status) && <Button size="sm" icon={Stethoscope} onClick={() => { if (a.status !== 'in_consultation') run(() => startConsultation(a.id)); nav(`/s/consult/${a.id}`) }}>{a.status === 'in_consultation' ? 'Continue' : 'Start consultation'}</Button>}
        {!doctorView && a.status === 'arrived' && <Button size="sm" variant="secondary" icon={Play} onClick={() => run(() => startConsultation(a.id), `Token ${a.token} sent in`)}>Send in</Button>}
        {!doctorView && a.status === 'in_consultation' && <Button size="sm" variant="success" icon={CheckCheck} onClick={() => run(() => completeAppointment(a.id), 'Marked completed')}>Completed</Button>}
        {['booked', 'arrived'].includes(a.status) && <Button size="sm" variant="ghost" icon={Siren} className={emergency ? 'text-red-600' : ''} onClick={() => run(() => setPriority(a.id, !emergency), emergency ? 'Emergency flag removed' : 'Moved to the top as emergency')}>{emergency ? 'Normal' : 'Emergency'}</Button>}
        {!doctorView && ['booked', 'arrived'].includes(a.status) && <Button size="sm" variant="ghost" icon={UserX} onClick={async () => { if (await ask({ title: `Mark token ${a.token} as did not come?`, ok: 'Yes' })) run(() => markNoShow(a.id)) }}>No-show</Button>}
      </div>
    </div>
  )
}

function CheckInSheet({ a, onClose }) {
  const toast = useToast()
  const [collect, setCollect] = useState(!!a && a.fee > 0)
  const [method, setMethod] = useState('cash')
  if (!a) return null
  const p = db.get('patients', a.patientId)
  return (
    <Sheet open onClose={onClose} title={`Check in · Token ${a.token}`} footer={<Button block size="lg" onClick={() => { try { checkIn(a.id, { collectFee: collect, method }); toast(collect ? 'Checked in · fee collected' : 'Checked in · fee added to bill'); onClose() } catch (e) { toast(e.message, 'error') } }}>Confirm check-in</Button>}>
      <PatientLine p={p} />
      {a.fee > 0 && !a.billId && <div className="mt-4 rounded-2xl border border-ink-200 p-4">
        <div className="flex justify-between font-semibold"><span>Consultation fee</span><span>{inr(a.fee)}</span></div>
        <label className="flex items-center gap-2 mt-3 text-sm"><input type="checkbox" checked={collect} onChange={(e) => setCollect(e.target.checked)} className="h-5 w-5 accent-brand-600" /> Collect now</label>
        {collect && <Select className="mt-3" value={method} onChange={(e) => setMethod(e.target.value)}>{Object.entries(PAY_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>}
      </div>}
      {a.billId && <p className="text-sm text-ink-500 mt-3">Fee already billed.</p>}
    </Sheet>
  )
}

function DoctorColumn({ doc, onCheckIn, compact }) {
  const q = useData(() => queueFor(doc.id))
  const active = q.filter((a) => ['in_consultation', 'arrived', 'booked'].includes(a.status))
  const done = q.filter((a) => a.status === 'completed').length
  const cur = q.find((a) => a.status === 'in_consultation')
  const waiting = q.filter((a) => a.status === 'arrived').length
  const avg = useData(() => avgConsultMins(doc.id))
  return (
    <Card className={cls('p-4 flex flex-col', !compact && 'min-w-[300px]')}>
      <div className="flex items-center gap-3 mb-3">
        <Avatar user={doc} size={40} />
        <div className="flex-1 min-w-0"><div className="font-bold truncate">{doc.name}</div><div className="text-xs text-ink-500 truncate">{db.get('departments', doc.deptId)?.name}{doc.room ? ` · Room ${doc.room}` : ''}</div></div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div className="rounded-xl bg-violet-50 py-1.5"><div className="text-[10px] font-bold text-violet-700 uppercase">Now</div><div className="text-lg font-extrabold" translate="no">{cur?.token ?? '—'}</div></div>
        <div className="rounded-xl bg-amber-50 py-1.5"><div className="text-[10px] font-bold text-amber-700 uppercase">Waiting</div><div className="text-lg font-extrabold">{waiting}</div></div>
        <div className="rounded-xl bg-accent-50 py-1.5"><div className="text-[10px] font-bold text-accent-700 uppercase">Done</div><div className="text-lg font-extrabold">{done}</div></div>
      </div>
      <div className="text-[11px] text-ink-500 mb-2 flex items-center gap-1"><Clock size={12} /> {`~${avg} min per patient · approx. ${waiting * avg} min wait`}</div>
      <div className="space-y-2 flex-1">
        {active.map((a) => <QueueCard key={a.id} a={a} onCheckIn={onCheckIn} />)}
        {!active.length && <p className="text-sm text-ink-400 text-center py-6">Queue is empty</p>}
      </div>
    </Card>
  )
}

export default function Queue({ doctorView }) {
  const nav = useNavigate()
  const { user } = useAuth()
  const [ci, setCi] = useState(null)
  const [filter, setFilter] = useState('all')
  const docs = useData(() => doctors().filter((d) => worksOn(d, today()) || queueFor(d.id).length))

  if (doctorView) return <DoctorQueue />
  const shown = filter === 'all' ? docs : docs.filter((d) => d.id === filter)
  return (
    <Page title="Queue & tokens" subtitle="Today · emergencies are always shown first" wide actions={<div className="flex gap-2">
      <Button variant="secondary" icon={Monitor} onClick={() => window.open('#/tv', '_blank')}>TV display</Button>
      <Button icon={CalendarPlus} onClick={() => nav('/s/appointments/new')} className="hidden sm:inline-flex">Walk-in</Button>
    </div>}>
      <Select className="mb-4 max-w-xs" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All doctors in OPD today</option>{docs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
      <div className="flex gap-4 overflow-x-auto pb-4 items-start">
        {shown.map((d) => <DoctorColumn key={d.id} doc={d} onCheckIn={setCi} />)}
        {!shown.length && <Card className="p-2 w-full"><Empty title="No doctors in OPD today" /></Card>}
      </div>
      {ci && <CheckInSheet a={ci} onClose={() => setCi(null)} />}
    </Page>
  )
}

function DoctorQueue() {
  const { user } = useAuth()
  const nav = useNavigate()
  const q = useData(() => queueFor(user.staffId))
  const active = q.filter((a) => ['in_consultation', 'arrived', 'booked'].includes(a.status))
  const done = q.filter((a) => ['completed', 'no_show'].includes(a.status))
  const next = active.find((a) => a.status === 'arrived') || active.find((a) => a.status === 'booked')
  const cur = active.find((a) => a.status === 'in_consultation')
  const toast = useToast()
  return (
    <Page title="My OPD – today" subtitle={`${active.length} pending · ${done.length} done`} wide actions={next && !cur && <Button size="lg" icon={Play} onClick={() => { try { startConsultation(next.id); nav(`/s/consult/${next.id}`) } catch (e) { toast(e.message, 'error') } }}>Call next · Token {next.token}</Button>}>
      {cur && <Card className="p-4 mb-4 bg-violet-50 border border-violet-200 shadow-none flex items-center gap-3"><Stethoscope className="text-violet-700" /><span className="flex-1 font-semibold">{`Token ${cur.token} is with you now`}</span><Button onClick={() => nav(`/s/consult/${cur.id}`)}>Continue consultation</Button></Card>}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{active.map((a) => <QueueCard key={a.id} a={a} doctorView />)}</div>
      {!active.length && <Card className="p-2"><Empty icon={Stethoscope} title="No patients waiting" text="New arrivals appear here automatically." /></Card>}
      {done.length > 0 && <>
        <h3 className="font-bold mt-6 mb-2">Seen today</h3>
        <Card className="divide-y divide-ink-100">{done.map((a) => <DoneRow key={a.id} a={a} />)}</Card>
      </>}
    </Page>
  )
}
function DoneRow({ a }) {
  const nav = useNavigate()
  const p = useData((d) => d.get('patients', a.patientId))
  return <button onClick={() => nav(`/s/consult/${a.id}`)} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-ink-100/50"><span className="w-8 font-bold text-ink-500" translate="no">{a.token}</span><PatientLine p={p} showPhone={false} className="flex-1" /><span className="text-xs text-ink-500 hidden sm:block">{APPT_TYPES[a.type]}</span><ApptStatus s={a.status} /></button>
}
