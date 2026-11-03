import { useNavigate } from 'react-router-dom'
import { Users, CalendarDays, Stethoscope, IndianRupee, Wallet, FlaskConical, BedDouble, PackageX, UserPlus, CalendarPlus, Siren, Receipt, Clock, AlertTriangle, ListOrdered, Pill, HeartPulse, Megaphone } from 'lucide-react'
import { Page, Card, Stat, SectionTitle, Button, Badge, Empty, Avatar } from '../../components/ui'
import { ApptStatus, EmergencyTag, PatientLine, doctorName } from '../../components/common'
import { ColumnChart, BarList, Ring } from '../../components/Charts'
import { useAuth } from '../../lib/auth'
import { getLocale } from '../../i18n'
import { useData } from '../../lib/db'
import { balanceOf, stockAlerts, doctors, worksOn, queueFor, avgConsultMins, canVerify, PAY_METHODS } from '../../lib/actions'
import { addDays, greeting, hhmm, inr, today, fmtShort, cls, timeAgo } from '../../lib/utils'
import { can } from '../../lib/rbac'

export function useTodayStats() {
  return useData((d) => {
    const T = today()
    const appts = d.list('appointments', (a) => a.date === T && a.status !== 'cancelled')
    const pays = d.list('payments', (p) => p.at?.startsWith(T))
    const beds = d.list('beds')
    return {
      patients: d.list('patients').length,
      newPatients: d.list('patients', (p) => p.createdAt?.startsWith(T)).length,
      appts: appts.length,
      done: appts.filter((a) => a.status === 'completed').length,
      waiting: appts.filter((a) => a.status === 'arrived').length,
      revenue: pays.reduce((s, p) => s + p.amount, 0),
      outstanding: d.list('bills', (b) => b.status !== 'cancelled').reduce((s, b) => s + Math.max(0, balanceOf(b)), 0),
      pendingLab: d.list('labOrders', (l) => !['published', 'cancelled'].includes(l.status)).length,
      bedsFree: beds.filter((b) => b.status === 'available').length,
      bedsUsed: beds.filter((b) => b.status === 'occupied').length,
      bedsTotal: beds.length,
      lowStock: (() => { const a = stockAlerts(); return a.low.length + a.out.length })(),
      emergencies: appts.filter((a) => a.priority === 'emergency' && a.status !== 'completed').length
    }
  })
}

function AdminDash() {
  const nav = useNavigate()
  const s = useTodayStats()
  const series = useData((d) => Array.from({ length: 14 }, (_, i) => { const day = addDays(today(), i - 13); return { label: fmtShort(day + 'T00:00:00').split(' ')[0], value: d.list('payments', (p) => p.at?.startsWith(day)).reduce((a, p) => a + p.amount, 0) } }))
  const byMethod = useData((d) => { const m = {}; d.list('payments', (p) => p.at?.startsWith(today().slice(0, 7)) && p.kind === 'payment').forEach((p) => { m[p.method] = (m[p.method] || 0) + p.amount }); return Object.entries(m).map(([k, v]) => ({ label: PAY_METHODS[k] || k, value: v })).sort((a, b) => b.value - a.value) })
  const docs = useData(() => doctors().map((doc) => { const q = queueFor(doc.id); return { doc, on: worksOn(doc, today()), waiting: q.filter((a) => a.status === 'arrived').length, done: q.filter((a) => a.status === 'completed').length, avg: avgConsultMins(doc.id) } }))
  const fb = useData((d) => d.list('feedback', (f) => f.status !== 'resolved').length)
  const alerts = useData(() => stockAlerts())
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Users} label="Registered patients" value={s.patients.toLocaleString('en-IN')} sub={`+${s.newPatients} today`} onClick={() => nav('/s/patients')} />
        <Stat icon={CalendarDays} tone="sky" label="Today’s appointments" value={s.appts} sub={`${s.waiting} waiting now`} onClick={() => nav('/s/appointments')} />
        <Stat icon={Stethoscope} tone="purple" label="Consultations done" value={s.done} onClick={() => nav('/s/queue')} />
        <Stat icon={IndianRupee} tone="green" label="Collection today" value={inr(s.revenue)} onClick={() => nav('/s/reports')} />
        <Stat icon={Wallet} tone="red" label="Outstanding payments" value={inr(s.outstanding)} onClick={() => nav('/s/billing?tab=due')} />
        <Stat icon={FlaskConical} tone="amber" label="Pending lab reports" value={s.pendingLab} onClick={() => nav('/s/lab')} />
        <Stat icon={BedDouble} tone="blue" label="Beds available / occupied" value={`${s.bedsFree} / ${s.bedsUsed}`} sub={`${s.bedsTotal} beds`} onClick={() => nav('/s/ipd')} />
        <Stat icon={PackageX} tone="red" label="Pharmacy low-stock alerts" value={s.lowStock} onClick={() => nav('/s/pharmacy/stock')} />
      </div>
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex justify-between items-baseline"><h3 className="font-bold">Daily collection – last 14 days</h3><span className="text-sm text-ink-500">{inr(series.reduce((a, x) => a + x.value, 0))}</span></div>
          <div className="mt-4"><ColumnChart data={series} format={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${Math.round(v)}`)} height={170} ariaLabel="Daily collection" /></div>
        </Card>
        <Card className="p-5">
          <h3 className="font-bold mb-4">Bed occupancy</h3>
          <div className="flex items-center gap-4"><Ring value={s.bedsTotal ? s.bedsUsed / s.bedsTotal : 0} size={96} color="#0E7C74" label="occupied" /><div className="text-sm space-y-1"><div className="font-semibold">{`${s.bedsUsed} occupied`}</div><div className="font-semibold">{`${s.bedsFree} available`}</div><div className="text-ink-500">{`${s.bedsTotal - s.bedsUsed - s.bedsFree} reserved / maintenance`}</div></div></div>
          <h3 className="font-bold mt-6 mb-3">Payment methods (this month)</h3>
          <BarList data={byMethod} format={(v) => inr(v)} color="#16968B" />
        </Card>
      </div>
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-bold mb-3">Doctors today</h3>
          <div className="divide-y divide-ink-100">
            {docs.map(({ doc, on, waiting, done, avg }) => (
              <div key={doc.id} className="flex items-center gap-3 py-2.5">
                <Avatar user={doc} size={36} />
                <div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{doc.name}</div><div className="text-xs text-ink-500 truncate">{doc.designation}</div></div>
                {on ? <Badge color="green" dot>Available</Badge> : <Badge>Not in OPD</Badge>}
                <div className="text-right text-xs w-24"><div className="font-semibold">{`${waiting} waiting`}</div><div className="text-ink-500">{`${done} seen · ~${avg} min`}</div></div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-bold mb-3">Needs attention</h3>
          <div className="space-y-2 text-sm">
            {s.emergencies > 0 && <button onClick={() => nav('/s/emergency')} className="w-full flex items-center gap-2 rounded-xl bg-red-50 text-red-700 px-3 py-2.5 font-semibold"><Siren size={16} /> {`${s.emergencies} emergency case(s) in OPD`}</button>}
            {alerts.out.length > 0 && <button onClick={() => nav('/s/pharmacy/stock')} className="w-full flex items-center gap-2 rounded-xl bg-red-50 text-red-700 px-3 py-2.5 font-semibold"><PackageX size={16} /> {`${alerts.out.length} medicine(s) out of stock`}</button>}
            {alerts.expired.length > 0 && <button onClick={() => nav('/s/pharmacy/stock')} className="w-full flex items-center gap-2 rounded-xl bg-amber-50 text-amber-800 px-3 py-2.5 font-semibold"><AlertTriangle size={16} /> {`${alerts.expired.length} expired batch(es) to remove`}</button>}
            {alerts.expiring.length > 0 && <button onClick={() => nav('/s/pharmacy/stock')} className="w-full flex items-center gap-2 rounded-xl bg-amber-50 text-amber-800 px-3 py-2.5 font-semibold"><Clock size={16} /> {`${alerts.expiring.length} batch(es) expiring within 2 months`}</button>}
            {fb > 0 && <button onClick={() => nav('/s/feedback')} className="w-full flex items-center gap-2 rounded-xl bg-sky-50 text-sky-800 px-3 py-2.5 font-semibold"><Megaphone size={16} /> {`${fb} feedback / complaint(s) to review`}</button>}
          </div>
        </Card>
      </div>
    </>
  )
}

function DoctorDash() {
  const nav = useNavigate()
  const { user } = useAuth()
  const q = useData(() => queueFor(user.staffId))
  const followups = q.filter((a) => a.type === 'followup').length
  const emerg = q.filter((a) => a.priority === 'emergency' && a.status !== 'completed')
  const pending = q.filter((a) => ['arrived', 'booked', 'in_consultation'].includes(a.status))
  const verifyCount = useData((d) => (canVerify(user) ? d.list('labOrders', (l) => l.status === 'result_entered').length : 0))
  const ipd = useData((d) => d.list('admissions', (a) => a.status === 'admitted' && a.doctorId === user.staffId))
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat icon={CalendarDays} label="Today’s appointments" value={q.length} onClick={() => nav('/s/opd')} />
        <Stat icon={Stethoscope} tone="green" label="Patients seen" value={q.filter((a) => a.status === 'completed').length} />
        <Stat icon={Clock} tone="amber" label="Pending consultations" value={pending.length} onClick={() => nav('/s/opd')} />
        <Stat icon={ListOrdered} tone="sky" label="Follow-up patients" value={followups} />
        <Stat icon={Siren} tone="red" label="Emergency cases" value={emerg.length} onClick={() => nav('/s/opd')} />
      </div>
      {verifyCount > 0 && <button onClick={() => nav('/s/lab?tab=verify')} className="mt-4 w-full flex items-center gap-3 rounded-2xl bg-amber-50 text-amber-900 px-4 py-3 font-semibold text-left"><FlaskConical size={20} /> {`${verifyCount} lab report(s) waiting for your verification`}</button>}
      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex justify-between items-center mb-3"><h3 className="font-bold">Upcoming patients</h3><Button size="sm" onClick={() => nav('/s/opd')}>Open my OPD</Button></div>
          <div className="divide-y divide-ink-100">
            {pending.slice(0, 8).map((a) => <UpRow key={a.id} a={a} onClick={() => nav(`/s/consult/${a.id}`)} />)}
            {!pending.length && <Empty title="No patients waiting" />}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-bold mb-3">My inpatients</h3>
          {ipd.map((a) => <IpRow key={a.id} a={a} onClick={() => nav(`/s/ipd/${a.id}`)} />)}
          {!ipd.length && <p className="text-sm text-ink-500">No admitted patients.</p>}
        </Card>
      </div>
    </>
  )
}
function UpRow({ a, onClick }) {
  const p = useData((d) => d.get('patients', a.patientId))
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-ink-100/50 rounded-xl px-2 -mx-2">
      <span className={cls('h-10 w-10 rounded-xl grid place-items-center font-extrabold shrink-0', a.priority === 'emergency' ? 'bg-red-600 text-white' : 'bg-brand-50 text-brand-800')} translate="no">{a.token}</span>
      <PatientLine p={p} showPhone={false} className="flex-1" />
      <span className="text-xs text-ink-500 hidden sm:block">{hhmm(a.time)}</span>
      {a.priority === 'emergency' ? <EmergencyTag /> : <ApptStatus s={a.status} />}
    </button>
  )
}
function IpRow({ a, onClick }) {
  const p = useData((d) => d.get('patients', a.patientId))
  const bed = useData((d) => d.get('beds', a.bedId))
  return <button onClick={onClick} className="w-full flex items-center gap-2 py-2 text-left text-sm"><Badge color="blue">{bed?.label}</Badge><span className="font-semibold truncate flex-1">{p?.name}</span><span className="text-xs text-ink-500 truncate max-w-[40%]" translate="no">{a.diagnosis}</span></button>
}

function ReceptionDash() {
  const nav = useNavigate()
  const s = useTodayStats()
  const recent = useData((d) => d.list('appointments', (a) => a.date === today() && a.status === 'booked').sort((a, b) => a.time.localeCompare(b.time)).slice(0, 8))
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[[UserPlus, 'Register patient', '/s/patients/new', 'bg-brand-600 text-white'], [CalendarPlus, 'Book appointment', '/s/appointments/new', 'bg-sky-600 text-white'], [Siren, 'Emergency registration', '/s/emergency', 'bg-red-600 text-white'], [Receipt, 'New bill / collect payment', '/s/billing/new', 'bg-accent-600 text-white']].map(([Icon, label, to, tone]) => (
          <button key={to} onClick={() => nav(to)} className={cls('rounded-2xl p-4 text-left shadow-card active:scale-[.98] transition', tone)}><Icon size={26} /><div className="font-bold mt-3 leading-tight">{label}</div></button>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        <Stat icon={CalendarDays} label="Today’s appointments" value={s.appts} onClick={() => nav('/s/appointments')} />
        <Stat icon={Users} tone="amber" label="Waiting now" value={s.waiting} onClick={() => nav('/s/queue')} />
        <Stat icon={IndianRupee} tone="green" label="Collection today" value={inr(s.revenue)} onClick={() => nav('/s/billing')} />
        <Stat icon={BedDouble} tone="blue" label="Beds available" value={s.bedsFree} onClick={() => nav('/s/ipd')} />
      </div>
      <Card className="p-5 mt-4">
        <div className="flex justify-between items-center mb-3"><h3 className="font-bold">Expected next (not yet arrived)</h3><Button size="sm" variant="secondary" onClick={() => nav('/s/queue')}>Open queue</Button></div>
        <div className="divide-y divide-ink-100">{recent.map((a) => <div key={a.id} className="flex items-center gap-3"><UpRow a={a} onClick={() => nav('/s/queue')} /><span className="text-xs text-ink-500 w-40 truncate hidden md:block">{doctorName(a.doctorId)}</span></div>)}</div>
        {!recent.length && <Empty title="No more expected patients today" />}
      </Card>
    </>
  )
}

function NurseDash() {
  const nav = useNavigate()
  const { user } = useAuth()
  const tasks = useData((d) => d.list('nursingTasks', (t) => t.status === 'pending' && (!t.assignedTo || t.assignedTo === user.staffId)).sort((a, b) => a.due.localeCompare(b.due)))
  const adm = useData((d) => d.list('admissions', (a) => a.status === 'admitted'))
  const overdue = tasks.filter((t) => t.due < new Date().toISOString())
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={BedDouble} label="Admitted patients" value={adm.length} onClick={() => nav('/s/nursing')} />
        <Stat icon={HeartPulse} tone="amber" label="My pending tasks" value={tasks.length} onClick={() => nav('/s/nursing')} />
        <Stat icon={AlertTriangle} tone="red" label="Overdue tasks" value={overdue.length} onClick={() => nav('/s/nursing')} />
        <Stat icon={Siren} tone="red" label="Emergency in OPD" value={useTodayStats().emergencies} onClick={() => nav('/s/emergency')} />
      </div>
      <Card className="p-5 mt-4">
        <div className="flex justify-between items-center mb-3"><h3 className="font-bold">Next tasks</h3><Button size="sm" onClick={() => nav('/s/nursing')}>Open nursing</Button></div>
        {tasks.slice(0, 8).map((t) => <TaskRow key={t.id} t={t} />)}
        {!tasks.length && <Empty title="All tasks done 👏" />}
      </Card>
    </>
  )
}
function TaskRow({ t }) {
  const p = useData((d) => d.get('patients', t.patientId))
  const late = t.due < new Date().toISOString()
  return <div className="flex items-center gap-3 py-2 border-b border-ink-100 last:border-0 text-sm"><span className={cls('h-2.5 w-2.5 rounded-full', late ? 'bg-red-500' : 'bg-amber-400')} /><span className="flex-1 font-semibold" translate="no">{t.title}</span><span className="text-ink-500 truncate max-w-[35%]">{p?.name}</span><span className={cls('text-xs w-20 text-right', late ? 'text-red-600 font-bold' : 'text-ink-500')}>{timeAgo(t.due)}</span></div>
}

function PharmacyDash() {
  const nav = useNavigate()
  const pending = useData((d) => d.list('prescriptions', (r) => r.status === 'final' && r.dispenseStatus !== 'dispensed' && r.items?.some((i) => i.medicineId)).length)
  const a = useData(() => stockAlerts())
  const sales = useData((d) => d.list('bills', (b) => b.date === today() && b.items.some((i) => i.type === 'pharmacy')).reduce((s, b) => s + b.total, 0))
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Stat icon={Pill} label="Prescriptions to dispense" value={pending} onClick={() => nav('/s/pharmacy')} />
      <Stat icon={IndianRupee} tone="green" label="Pharmacy sales today" value={inr(sales)} onClick={() => nav('/s/pharmacy/sales')} />
      <Stat icon={PackageX} tone="red" label="Out of stock" value={a.out.length} onClick={() => nav('/s/pharmacy/stock')} />
      <Stat icon={AlertTriangle} tone="amber" label="Low stock" value={a.low.length} onClick={() => nav('/s/pharmacy/stock')} />
      <Stat icon={Clock} tone="purple" label="Expiring / expired batches" value={a.expiring.length + a.expired.length} onClick={() => nav('/s/pharmacy/stock')} />
    </div>
  )
}

function LabDash() {
  const nav = useNavigate()
  const c = useData((d) => { const o = {}; d.list('labOrders').forEach((l) => { o[l.status] = (o[l.status] || 0) + 1 }); return o })
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Stat icon={FlaskConical} label="Samples to collect" value={c.ordered || 0} onClick={() => nav('/s/lab')} />
      <Stat icon={Clock} tone="purple" label="In process" value={(c.sample_collected || 0) + (c.processing || 0)} onClick={() => nav('/s/lab')} />
      <Stat icon={AlertTriangle} tone="amber" label="Awaiting verification" value={c.result_entered || 0} onClick={() => nav('/s/lab?tab=verify')} />
      <Stat icon={Receipt} tone="green" label="Verified – to publish" value={c.verified || 0} onClick={() => nav('/s/lab?tab=done')} />
    </div>
  )
}

export default function Dashboard() {
  const { user, hospital: h } = useAuth()
  const ann = useData((d) => d.list('announcements', (a) => a.audience !== 'patients' && (!a.expiresAt || a.expiresAt > new Date().toISOString())).slice(0, 3))
  const R = user.role
  return (
    <Page title={`${greeting()}, ${user.name.split(' ').slice(0, R === 'doctor' || user.name.startsWith('Dr') ? 2 : 1).join(' ')}`} subtitle={`${h.name} · ${new Date().toLocaleDateString(getLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}`} wide>
      {R === 'admin' && <AdminDash />}
      {R === 'doctor' && <DoctorDash />}
      {R === 'receptionist' && <ReceptionDash />}
      {R === 'nurse' && <NurseDash />}
      {R === 'pharmacist' && <PharmacyDash />}
      {R === 'lab_tech' && <LabDash />}
      {ann.length > 0 && <>
        <SectionTitle>Announcements</SectionTitle>
        <div className="grid md:grid-cols-3 gap-3">{ann.map((a) => <Card key={a.id} className="p-4"><div className="flex gap-2 items-center mb-1"><Megaphone size={16} className="text-brand-600" />{a.audience === 'staff' && <Badge color="purple">Staff</Badge>}<span className="text-[11px] text-ink-400 ml-auto">{timeAgo(a.createdAt)}</span></div><div className="font-bold" translate="no">{a.title}</div><p className="text-sm text-ink-500 line-clamp-2" translate="no">{a.body}</p></Card>)}</div>
      </>}
      {can(user, 'queue.manage') && R !== 'doctor' && <p className="text-xs text-ink-400 mt-6">Tip: press <kbd>/</kbd> to search patients from anywhere.</p>}
    </Page>
  )
}
