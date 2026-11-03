import { useState } from 'react'
import { Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { CalendarPlus, Video, MapPin, Star, CalendarClock, XCircle } from 'lucide-react'
import { Page, Card, Button, Tabs, Empty, Kv, useToast, useConfirm } from '../../components/ui'
import { ApptStatus } from '../../components/common'
import { useData } from '../../lib/db'
import { useAuth } from '../../lib/auth'
import { cancelAppointment, APPT_TYPES } from '../../lib/actions'
import { fmtDate, hhmm, inr, today } from '../../lib/utils'
import { useFamily } from './PatientApp'
import { UpcomingCard } from './Home'

function List() {
  const nav = useNavigate()
  const { ids } = useFamily()
  const [tab, setTab] = useState('upcoming')
  const rows = useData((d) => d.list('appointments', (a) => ids.includes(a.patientId)))
  const up = rows.filter((a) => ['booked', 'arrived', 'in_consultation'].includes(a.status) && a.date >= today()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
  const past = rows.filter((a) => !up.includes(a)).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  const list = tab === 'upcoming' ? up : past
  return (
    <Page title="My Appointments" actions={<Button size="sm" icon={CalendarPlus} onClick={() => nav('/p/book')}>Book</Button>}>
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ value: 'upcoming', label: `Upcoming (${up.length})` }, { value: 'past', label: 'Past' }]} />
      <div className="space-y-3">
        {tab === 'upcoming' && up.map((a) => <UpcomingCard key={a.id} a={a} onClick={() => nav(a.id)} />)}
        {tab === 'past' && past.map((a) => <PastRow key={a.id} a={a} onClick={() => nav(a.id)} />)}
        {!list.length && <Empty title={tab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'} action={tab === 'upcoming' && <Button onClick={() => nav('/p/book')}>Book appointment</Button>} />}
      </div>
    </Page>
  )
}

function PastRow({ a, onClick }) {
  const doc = useData((d) => d.get('staff', a.doctorId))
  const p = useData((d) => d.get('patients', a.patientId))
  return (
    <Card className="p-4" onClick={onClick}>
      <div className="flex justify-between gap-3">
        <div className="min-w-0"><div className="font-bold truncate">{doc?.name}</div><div className="text-xs text-ink-500">{fmtDate(a.date + 'T00:00:00')} · {hhmm(a.time)} · {p?.name}</div></div>
        <ApptStatus s={a.status} />
      </div>
    </Card>
  )
}

function Detail() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const ask = useConfirm()
  const { hospital: h } = useAuth()
  const a = useData((d) => d.get('appointments', id))
  const doc = useData((d) => a && d.get('staff', a.doctorId))
  const p = useData((d) => a && d.get('patients', a.patientId))
  const con = useData((d) => a && d.find('consultations', (c) => c.apptId === a.id && c.status === 'final'))
  const fb = useData((d) => a && d.find('feedback', (f) => f.apptId === a.id))
  if (!a) return <Page title="Appointment" back><Empty title="Not found" /></Page>
  const active = ['booked', 'arrived', 'in_consultation'].includes(a.status)
  const cancel = async () => {
    if (!(await ask({ title: 'Cancel this appointment?', text: `${doc.name} · ${fmtDate(a.date + 'T00:00:00')} ${hhmm(a.time)}`, ok: 'Yes, cancel', danger: true }))) return
    try { cancelAppointment(a.id, 'Cancelled by patient'); toast('Appointment cancelled') } catch (e) { toast(e.message, 'error') }
  }
  return (
    <Page title="Appointment" back>
      {active ? <UpcomingCard a={a} /> : <Card className="p-4"><div className="flex justify-between"><div className="font-bold">{doc?.name}</div><ApptStatus s={a.status} /></div></Card>}
      <Card className="p-4 mt-3">
        <Kv k="Appointment ID" v={<span translate="no">{a.apptNo}</span>} />
        <Kv k="Patient" v={p?.name} />
        <Kv k="Type" v={APPT_TYPES[a.type]} />
        <Kv k="Date & time" v={`${fmtDate(a.date + 'T00:00:00')}, ${hhmm(a.time)}`} />
        <Kv k="Consultation fee" v={inr(a.fee)} />
        {a.cancelReason && <Kv k="Reason" v={a.cancelReason} />}
      </Card>
      {a.type === 'online' && active && a.meetLink && (
        <Card className="p-4 mt-3 bg-sky-50">
          <div className="flex items-center gap-2 font-bold text-sky-800"><Video size={18} /> Online consultation</div>
          <p className="text-sm text-sky-800/80 mt-1">Join from a quiet place with good network, 5 minutes before your time. Keep your old reports ready.</p>
          <a href={a.meetLink} target="_blank" rel="noreferrer" className="mt-3 h-12 rounded-xl bg-sky-600 text-white font-bold grid place-items-center">Join video consultation</a>
        </Card>
      )}
      {active && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {a.status === 'booked' && <Button variant="outline" icon={CalendarClock} onClick={() => nav(`/p/book/${a.doctorId}?reschedule=${a.id}`)}>Reschedule</Button>}
          {a.status === 'booked' && <Button variant="danger" icon={XCircle} onClick={cancel}>Cancel</Button>}
          <a href={h.mapUrl} target="_blank" rel="noreferrer" className="col-span-2 h-11 rounded-xl bg-brand-50 text-brand-800 font-semibold text-sm flex items-center justify-center gap-2"><MapPin size={16} /> Directions to {h.shortName || h.name}</a>
        </div>
      )}
      {a.status === 'completed' && (
        <div className="space-y-2 mt-3">
          {con?.prescriptionId && <Button block variant="secondary" onClick={() => nav(`/p/records/prescriptions/${con.prescriptionId}`)}>View prescription</Button>}
          {!fb ? <Button block icon={Star} onClick={() => nav(`/p/feedback/new?appt=${a.id}`)}>Rate your visit</Button> : <p className="text-sm text-center text-ink-500">Thank you for your feedback!</p>}
        </div>
      )}
    </Page>
  )
}

export default function Appointments() {
  return <Routes><Route index element={<List />} /><Route path=":id" element={<Detail />} /></Routes>
}
