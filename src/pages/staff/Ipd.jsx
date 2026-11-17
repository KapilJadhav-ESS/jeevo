import { useState } from 'react'
import { Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ShieldCheck, BedDouble, Plus, ArrowRightLeft, FileText, LogOut, Wrench, Receipt, HeartPulse, ClipboardList, Pill } from 'lucide-react'
import { Page, Card, Button, Field, Input, Select, Textarea, Sheet, Badge, Empty, Tabs, Kv, Grid, Table, useToast, useConfirm } from '../../components/ui'
import { PatientLine, ClinicalAlerts, doctorName, userName } from '../../components/common'
import { DischargeView } from '../../components/Documents'
import PatientPicker from '../../components/PatientPicker'
import { VitalsForm, VitalChips } from './Patients'
import { useAuth } from '../../lib/auth'
import { db, useData } from '../../lib/db'
import { can } from '../../lib/rbac'
import { visibleBills, saveAdmissionInsurance, insurers, PREAUTH_STATUS, CLAIM_STATUS, admitPatient, transferBed, setBedStatus, saveDischargeSummary, discharge, daysAdmitted, stayCharges, billStay, admissionBalance, depositHeld, addAdmissionNote, addNursingTask, BED_STATUS, PAY_METHODS } from '../../lib/actions'
import { fmtDate, fmtDateTime, inr, addDays, today, timeAgo, cls } from '../../lib/utils'

const BED_TONE = { available: 'bg-accent-50 border-accent-200 text-accent-800', occupied: 'bg-brand-600 border-brand-600 text-white', reserved: 'bg-amber-50 border-amber-300 text-amber-800', maintenance: 'bg-ink-100 border-ink-200 text-ink-400' }

function Board() {
  const nav = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const wards = useData((d) => d.list('wards'))
  const beds = useData((d) => d.list('beds'))
  const [bed, setBed] = useState(null)
  const count = (s) => beds.filter((b) => b.status === s).length
  return (
    <Page title="Beds & admissions" wide actions={can(user, 'ipd.admit') && <Button icon={Plus} onClick={() => nav('admit')}>Admit patient</Button>}>
      <div className="flex flex-wrap gap-2 mb-4">{Object.entries(BED_STATUS).map(([k, l]) => <span key={k} className={cls('rounded-xl border px-3 py-1.5 text-sm font-semibold', BED_TONE[k])}>{l}: {count(k)}</span>)}</div>
      <div className="space-y-4">
        {wards.map((w) => (
          <Card key={w.id} className="p-4">
            <div className="flex items-baseline justify-between mb-3"><h3 className="font-bold">{w.name}</h3><span className="text-xs text-ink-500">Floor {w.floor} · {inr(w.dailyRate)}/day</span></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {beds.filter((b) => b.wardId === w.id).map((b) => <BedTile key={b.id} b={b} onClick={() => (b.status === 'occupied' ? nav(b.admissionId) : setBed(b))} />)}
            </div>
          </Card>
        ))}
      </div>
      <Sheet open={!!bed} onClose={() => setBed(null)} title={`Bed ${bed?.label}`}>
        {bed && <div className="space-y-2">
          <p className="text-sm text-ink-500 mb-2">Current status: <b>{BED_STATUS[bed.status]}</b>{bed.reservedFor ? ` – ${bed.reservedFor}` : ''}</p>
          {can(user, 'ipd.admit') && ['available', 'reserved'].includes(bed.status) && <Button block onClick={() => nav(`admit?bed=${bed.id}`)}>Admit a patient here</Button>}
          {can(user, 'ipd.admit') && Object.keys(BED_STATUS).filter((s) => s !== 'occupied' && s !== bed.status).map((s) => <Button key={s} block variant="outline" icon={s === 'maintenance' ? Wrench : undefined} onClick={() => { try { setBedStatus(bed.id, s, s === 'reserved' ? 'Reserved at reception' : ''); toast('Bed updated'); setBed(null) } catch (e) { toast(e.message, 'error') } }}>Mark {BED_STATUS[s].toLowerCase()}</Button>)}
        </div>}
      </Sheet>
    </Page>
  )
}
function BedTile({ b, onClick }) {
  const a = useData((d) => b.admissionId && d.get('admissions', b.admissionId))
  const p = useData((d) => a && d.get('patients', a.patientId))
  return (
    <button onClick={onClick} className={cls('rounded-xl border-2 p-2.5 text-left min-h-[76px] transition hover:shadow-card', BED_TONE[b.status])}>
      <div className="flex items-center justify-between"><span className="font-extrabold text-sm" translate="no">{b.label}</span><BedDouble size={16} /></div>
      {b.status === 'occupied' ? <><div className="text-[12px] font-semibold truncate mt-1">{p?.name}</div><div className="text-[10px] opacity-80">Day {a ? daysAdmitted(a) : ''}</div></> : <div className="text-[11px] mt-1 font-semibold">{BED_STATUS[b.status]}</div>}
    </button>
  )
}

function Admit() {
  const nav = useNavigate()
  const toast = useToast()
  const [sp] = useSearchParams()
  const docs = useData((d) => d.list('staff', (s) => s.role === 'doctor' && s.active))
  const beds = useData((d) => d.list('beds', (b) => ['available', 'reserved'].includes(b.status)))
  const wards = useData((d) => d.list('wards'))
  const [f, setF] = useState({ patientId: sp.get('patient'), doctorId: sp.get('doctor') || '', bedId: sp.get('bed') || '', reason: '', diagnosis: '', expectedDischarge: addDays(today(), 3), emergency: false, deposit: '', method: 'cash', insurer: '', policyNo: '' })
  const pat = useData((d) => f.patientId && d.get('patients', f.patientId))
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const go = () => { try { const a = admitPatient(f); if (f.insurer) saveAdmissionInsurance(a.id, { insurer: f.insurer, policyNo: f.policyNo, preauthStatus: 'requested', claimStatus: 'none' }); toast(`Admitted · ${a.admNo}`); nav(`/s/ipd/${a.id}`, { replace: true }) } catch (e) { toast(e.message, 'error') } }
  return (
    <Page title="Admit patient" back wide>
      <Card className="p-5 max-w-4xl">
        <Field label="Patient"><PatientPicker value={f.patientId} onChange={(id) => setF({ ...f, patientId: id })} /></Field>
        <Grid cols={2}>
          <Field label="Attending doctor"><Select value={f.doctorId} onChange={set('doctorId')}><option value="">Choose</option>{docs.map((d) => <option key={d.id} value={d.id}>{d.name} – {db.get('departments', d.deptId)?.name}</option>)}</Select></Field>
          <Field label="Bed"><Select value={f.bedId} onChange={set('bedId')}><option value="">Choose a free bed</option>{wards.map((w) => <optgroup key={w.id} label={`${w.name} · ₹${w.dailyRate}/day`}>{beds.filter((b) => b.wardId === w.id).map((b) => <option key={b.id} value={b.id}>{b.label}{b.status === 'reserved' ? ' (reserved)' : ''}</option>)}</optgroup>)}</Select></Field>
          <Field label="Reason for admission"><Input value={f.reason} onChange={set('reason')} /></Field>
          <Field label="Provisional diagnosis"><Input value={f.diagnosis} onChange={set('diagnosis')} /></Field>
          <Field label="Expected discharge"><Input type="date" min={today()} value={f.expectedDischarge} onChange={set('expectedDischarge')} /></Field>
          <Field label="Admission type"><Select value={f.emergency ? 'e' : 'p'} onChange={(e) => setF({ ...f, emergency: e.target.value === 'e' })}><option value="p">Planned</option><option value="e">Emergency</option></Select></Field>
          <Field label="Advance deposit (₹)"><Input inputMode="numeric" value={f.deposit} onChange={(e) => setF({ ...f, deposit: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Deposit paid by"><Select value={f.method} onChange={set('method')}>{Object.entries(PAY_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field label="Cashless insurance / TPA (optional)"><Select value={f.insurer || pat?.insurance?.insurer || ''} onChange={set('insurer')}><option value="">No insurance / cash</option>{insurers().map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="Policy / card number"><Input value={f.policyNo || pat?.insurance?.policyNo || ''} onChange={set('policyNo')} /></Field>
        </Grid>
        <Button size="lg" onClick={go}>Admit patient</Button>
      </Card>
    </Page>
  )
}

function Admission() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const ask = useConfirm()
  const { user } = useAuth()
  const a = useData((d) => d.get('admissions', id))
  const p = useData((d) => a && d.get('patients', a.patientId))
  const bed = useData((d) => a && d.get('beds', a.bedId))
  const ward = useData((d) => bed && d.get('wards', bed.wardId))
  const vit = useData((d) => d.list('vitals', (v) => v.admissionId === id).sort((x, y) => y.at.localeCompare(x.at)))
  const tasks = useData((d) => d.list('nursingTasks', (t) => t.admissionId === id).sort((x, y) => x.due.localeCompare(y.due)))
  const meds = useData((d) => d.list('medAdmin', (m) => m.admissionId === id).sort((x, y) => y.at.localeCompare(x.at)))
  const bills = useData((d) => visibleBills(user, d.list('bills', (b) => b.admissionId === id)))
  const free = useData((d) => d.list('beds', (b) => b.status === 'available'))
  const nurses = useData((d) => d.list('staff', (s) => s.role === 'nurse' && s.active))
  const [tab, setTab] = useState('notes')
  const [sheet, setSheet] = useState('')
  const [note, setNote] = useState({ kind: user.role === 'doctor' ? 'doctor_visit' : 'nursing', text: '' })
  const [task, setTask] = useState({ title: '', due: '', assignedTo: '' })
  const [ds, setDs] = useState(null)
  if (!a) return <Page title="Admission" back><Empty title="Not found" /></Page>
  const admitted = a.status === 'admitted'
  const run = (fn, m) => { try { fn(); toast(m) } catch (e) { toast(e.message, 'error') } }
  const openDs = () => { setDs(a.dischargeSummary || { diagnosis: a.diagnosis, course: '', procedures: '', condition: 'Stable', medications: '', advice: '', followUp: addDays(today(), 7) }); setSheet('ds') }
  return (
    <Page title={`${p?.name} · ${a.admNo}`} subtitle={`${ward?.name} · Bed ${bed?.label} · Day ${daysAdmitted(a)}`} back="/s/ipd" wide actions={admitted && <div className="flex gap-2">
      {can(user, 'ipd.discharge') && <Button variant="secondary" icon={FileText} onClick={openDs}>Discharge summary</Button>}
      {can(user, 'ipd.discharge') && <Button icon={LogOut} onClick={async () => { if (await ask({ title: 'Discharge this patient?', text: `Bed ${bed?.label} will become available. Pending balance: ${inr(admissionBalance(a.id))}`, ok: 'Discharge' })) run(() => discharge(a.id), 'Patient discharged') }}>Discharge</Button>}
    </div>}>
      <div className="grid lg:grid-cols-[340px_1fr] gap-4">
        <div className="space-y-4">
          <Card className="p-5">
            <PatientLine p={p} />
            <ClinicalAlerts p={p} className="mt-3" />
            <div className="mt-3 divide-y divide-ink-100">
              <Kv k="Status" v={admitted ? <Badge color="amber">Admitted</Badge> : <Badge color="green">Discharged</Badge>} />
              <Kv k="Doctor" v={doctorName(a.doctorId)} />
              <Kv k="Department" v={db.get('departments', a.deptId)?.name} />
              <Kv k="Admitted" v={fmtDateTime(a.admittedAt)} />
              <Kv k="Expected discharge" v={fmtDate(a.expectedDischarge + 'T00:00:00')} />
              {a.dischargedAt && <Kv k="Discharged" v={fmtDateTime(a.dischargedAt)} />}
              <Kv k="Reason" v={<span translate="no">{a.reason}</span>} />
              <Kv k="Diagnosis" v={<span translate="no">{a.diagnosis}</span>} />
            </div>
            {admitted && can(user, 'ipd.admit') && <Button size="sm" variant="ghost" icon={ArrowRightLeft} className="mt-2" onClick={() => setSheet('transfer')}>Transfer bed</Button>}
          </Card>
          <InsuranceCard a={a} />
          <Card className="p-5">
            <div className="flex justify-between items-center mb-2"><h3 className="font-bold">Charges</h3><span className={cls('font-bold', admissionBalance(a.id) > 0 ? 'text-red-600' : 'text-accent-700')}>Balance {inr(admissionBalance(a.id))}</span></div>
            {bills.map((b) => <button key={b.id} onClick={() => nav(`/s/billing/${b.id}`)} className="w-full flex justify-between text-sm py-1.5 border-b border-ink-100"><span translate="no">{b.billNo}</span><span>{inr(b.total)}</span></button>)}
            {depositHeld(a) > 0 && <div className="flex justify-between text-sm py-1.5 text-accent-700"><span>Advance deposit not yet adjusted</span><span>{inr(depositHeld(a))}</span></div>}
            {!admitted && depositHeld(a) > 0 && <p className="text-xs text-ink-500">Refund the unused deposit from the deposit bill.</p>}
            {admitted && can(user, 'billing.create') && stayCharges(a).length > 0 && <Button size="sm" variant="secondary" icon={Receipt} className="mt-3" onClick={() => run(() => billStay(a.id), 'Room charges billed')}>{`Bill room charges (${stayCharges(a)[0].qty} day(s))`}</Button>}
          </Card>
        </div>
        <div className="min-w-0">
          <Tabs value={tab} onChange={setTab} className="mb-3" tabs={[{ value: 'notes', label: 'Notes' }, { value: 'vitals', label: 'Vitals' }, { value: 'tasks', label: 'Tasks' }, { value: 'meds', label: 'Medication' }, ...(a.dischargeSummary ? [{ value: 'ds', label: 'Discharge' }] : [])]} />
          {tab === 'notes' && <Card className="p-5">
            {admitted && <div className="mb-4"><div className="flex gap-2 mb-2">{(user.role === 'doctor' ? [['doctor_visit', 'Doctor visit'], ['treatment', 'Treatment']] : [['nursing', 'Nursing note']]).map(([k, l]) => <button key={k} onClick={() => setNote({ ...note, kind: k })} className={cls('h-8 px-3 rounded-full text-xs font-semibold border', note.kind === k ? 'bg-brand-600 text-white border-brand-600' : 'border-ink-200')}>{l}</button>)}</div><Textarea rows={2} value={note.text} onChange={(e) => setNote({ ...note, text: e.target.value })} placeholder="Write a note…" /><Button size="sm" className="mt-2" onClick={() => { try { addAdmissionNote(a.id, note.kind, note.text); setNote({ ...note, text: '' }) } catch (e) { toast(e.message, 'error') } }}>Add note</Button></div>}
            <div className="space-y-3">{[...(a.notes || [])].reverse().map((n, i) => <div key={i} className={cls('rounded-xl p-3 text-sm', n.kind === 'nursing' ? 'bg-sky-50' : 'bg-violet-50')}><div className="flex justify-between text-xs text-ink-500 mb-1"><span className="font-bold">{{ doctor_visit: 'Doctor visit', treatment: 'Treatment', nursing: 'Nursing' }[n.kind]} · {userName(n.by)}</span><span>{fmtDateTime(n.at)}</span></div><p translate="no">{n.text}</p></div>)}
              {!a.notes?.length && <p className="text-sm text-ink-400">No notes yet.</p>}</div>
          </Card>}
          {tab === 'vitals' && <Card className="p-5">
            {admitted && can(user, 'vitals.record') && <Button size="sm" icon={HeartPulse} className="mb-3" onClick={() => setSheet('vitals')}>Record vitals</Button>}
            {vit.map((v) => <div key={v.id} className="py-2 border-b border-ink-100"><div className="text-xs text-ink-500 mb-1">{fmtDateTime(v.at)} · {userName(v.by)}</div><VitalChips v={v.values} />{v.note && <div className="text-xs mt-1" translate="no">{v.note}</div>}</div>)}
            {!vit.length && <p className="text-sm text-ink-400">No vitals recorded.</p>}
          </Card>}
          {tab === 'tasks' && <Card className="p-5">
            {admitted && can(user, 'nursing') && <div className="grid sm:grid-cols-[1fr_180px_180px_auto] gap-2 mb-4"><Input value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} placeholder="Task / instruction for nurses" /><Input type="datetime-local" value={task.due} onChange={(e) => setTask({ ...task, due: e.target.value })} /><Select value={task.assignedTo} onChange={(e) => setTask({ ...task, assignedTo: e.target.value })}><option value="">Any nurse</option>{nurses.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</Select><Button icon={ClipboardList} onClick={() => { try { addNursingTask({ patientId: a.patientId, admissionId: a.id, title: task.title, due: task.due ? new Date(task.due).toISOString() : '', assignedTo: task.assignedTo }); setTask({ title: '', due: '', assignedTo: '' }) } catch (e) { toast(e.message, 'error') } }}>Add</Button></div>}
            {tasks.map((t) => <div key={t.id} className="flex items-center gap-3 py-2 border-b border-ink-100 text-sm"><Badge color={t.status === 'done' ? 'green' : t.status === 'cancelled' ? 'gray' : t.due < new Date().toISOString() ? 'red' : 'amber'}>{t.status === 'done' ? 'Done' : t.status === 'cancelled' ? 'Cancelled' : 'Pending'}</Badge><span className="flex-1" translate="no">{t.title}</span><span className="text-xs text-ink-500">{t.status === 'done' ? `${userName(t.doneBy)} · ${timeAgo(t.doneAt)}` : timeAgo(t.due)}</span></div>)}
          </Card>}
          {tab === 'meds' && <Card className="p-5">
            {meds.map((m) => <div key={m.id} className="flex items-center gap-3 py-2 border-b border-ink-100 text-sm"><Pill size={16} className="text-brand-600" /><span className="flex-1" translate="no"><b>{m.medicine}</b> {m.dose} · {m.route}{m.note ? ` · ${m.note}` : ''}</span><span className="text-xs text-ink-500">{fmtDateTime(m.at)} · {userName(m.by)}</span></div>)}
            {!meds.length && <p className="text-sm text-ink-400">No medication recorded yet. Nurses record each dose in the Nursing section.</p>}
          </Card>}
          {tab === 'ds' && <DischargeView a={a} />}
        </div>
      </div>
      <Sheet open={sheet === 'vitals'} onClose={() => setSheet('')} title="Record vitals"><VitalsForm patientId={a.patientId} admissionId={a.id} onDone={() => setSheet('')} /></Sheet>
      <Sheet open={sheet === 'transfer'} onClose={() => setSheet('')} title="Transfer to another bed">
        <div className="grid grid-cols-3 gap-2">{free.map((b) => <Button key={b.id} variant="outline" onClick={() => run(() => { transferBed(a.id, b.id); setSheet('') }, `Moved to ${b.label}`)}>{b.label}</Button>)}</div>
        {!free.length && <Empty title="No free beds" />}
      </Sheet>
      <Sheet open={sheet === 'ds'} onClose={() => setSheet('')} title="Discharge summary" wide footer={<Button block size="lg" onClick={() => run(() => { saveDischargeSummary(a.id, ds); setSheet('') }, 'Discharge summary saved')}>Save summary</Button>}>
        {ds && <>
          <Field label="Final diagnosis"><Input value={ds.diagnosis} onChange={(e) => setDs({ ...ds, diagnosis: e.target.value })} /></Field>
          <Field label="Course in hospital"><Textarea rows={3} value={ds.course} onChange={(e) => setDs({ ...ds, course: e.target.value })} /></Field>
          <Field label="Procedures"><Input value={ds.procedures} onChange={(e) => setDs({ ...ds, procedures: e.target.value })} /></Field>
          <Grid cols={2}><Field label="Condition at discharge"><Select value={ds.condition} onChange={(e) => setDs({ ...ds, condition: e.target.value })}>{['Stable', 'Improved', 'Referred', 'Discharged against medical advice'].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Follow-up date"><Input type="date" value={ds.followUp} onChange={(e) => setDs({ ...ds, followUp: e.target.value })} /></Field></Grid>
          <Field label="Medicines at discharge"><Textarea rows={3} value={ds.medications} onChange={(e) => setDs({ ...ds, medications: e.target.value })} /></Field>
          <Field label="Advice"><Textarea rows={2} value={ds.advice} onChange={(e) => setDs({ ...ds, advice: e.target.value })} /></Field>
        </>}
      </Sheet>
    </Page>
  )
}

function InsuranceCard({ a }) {
  const toast = useToast()
  const { user } = useAuth()
  const [f, setF] = useState(null)
  const ins = a.insurance
  const manage = can(user, 'insurance.manage') && a.status === 'admitted'
  return (
    <Card className="p-5">
      <div className="flex justify-between items-center mb-2"><h3 className="font-bold flex items-center gap-2"><ShieldCheck size={18} className="text-accent-600" /> Insurance / cashless</h3>{manage && <Button size="sm" variant="ghost" onClick={() => setF({ insurer: '', policyNo: '', preauthStatus: 'requested', preauthAmount: '', preauthRef: '', claimStatus: 'none', claimAmount: '', ...(ins || {}) })}>{ins ? 'Update' : 'Add'}</Button>}</div>
      {ins ? <div className="text-sm space-y-1">
        <div className="font-semibold" translate="no">{ins.insurer}</div>
        {ins.policyNo && <div className="text-ink-500" translate="no">Policy {ins.policyNo}</div>}
        <div className="flex flex-wrap gap-1.5 mt-2"><Badge color={ins.preauthStatus === 'approved' ? 'green' : ins.preauthStatus === 'rejected' ? 'red' : 'amber'}>{PREAUTH_STATUS[ins.preauthStatus] || '—'}</Badge><Badge color={ins.claimStatus === 'settled' ? 'green' : ins.claimStatus === 'rejected' ? 'red' : 'gray'}>{CLAIM_STATUS[ins.claimStatus] || '—'}</Badge></div>
        {ins.preauthAmount > 0 && <div className="text-ink-500">{`Approved / requested ${inr(ins.preauthAmount)}`}</div>}
      </div> : <p className="text-sm text-ink-500">Cash patient – no insurance recorded.</p>}
      <Sheet open={!!f} onClose={() => setF(null)} title="Insurance / cashless" footer={<Button block size="lg" onClick={() => { try { saveAdmissionInsurance(a.id, { ...f, preauthAmount: Number(f.preauthAmount) || 0, claimAmount: Number(f.claimAmount) || 0 }); toast('Saved'); setF(null) } catch (e) { toast(e.message, 'error') } }}>Save</Button>}>
        {f && <>
          <Field label="Insurance company / TPA"><Select value={f.insurer} onChange={(e) => setF({ ...f, insurer: e.target.value })}><option value="">Choose</option>{insurers().map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="Policy / card number"><Input value={f.policyNo} onChange={(e) => setF({ ...f, policyNo: e.target.value })} /></Field>
          <Grid cols={2}>
            <Field label="Pre-authorisation"><Select value={f.preauthStatus} onChange={(e) => setF({ ...f, preauthStatus: e.target.value })}>{Object.entries(PREAUTH_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Pre-auth amount (₹)"><Input inputMode="numeric" value={f.preauthAmount} onChange={(e) => setF({ ...f, preauthAmount: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="Pre-auth reference"><Input value={f.preauthRef || ''} onChange={(e) => setF({ ...f, preauthRef: e.target.value })} /></Field>
            <Field label="Claim status"><Select value={f.claimStatus} onChange={(e) => setF({ ...f, claimStatus: e.target.value })}>{Object.entries(CLAIM_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Claim amount (₹)"><Input inputMode="numeric" value={f.claimAmount} onChange={(e) => setF({ ...f, claimAmount: e.target.value.replace(/\D/g, '') })} /></Field>
          </Grid>
          <p className="text-xs text-ink-500">When the insurer settles, record the amount in Billing with payment method “Insurance (cashless)”.</p>
        </>}
      </Sheet>
    </Card>
  )
}

// Insurance desk: all admitted patients with cashless insurance
function InsuranceDesk() {
  const nav = useNavigate()
  const rows = useData((d) => d.list('admissions', (a) => a.insurance?.insurer).sort((a, b) => (a.status === 'admitted' ? -1 : 1) - (b.status === 'admitted' ? -1 : 1) || b.admittedAt.localeCompare(a.admittedAt)))
  const list = useData(() => insurers())
  return (
    <Page title="Insurance & cashless" subtitle={`${list.length} empanelled insurers / TPAs`} wide>
      <Table rows={rows} onRow={(a) => nav(`/s/ipd/${a.id}`)} empty="No insured admissions" columns={[
        { label: 'Patient', render: (a) => <AdmPat a={a} /> },
        { label: 'Insurer / TPA', render: (a) => <span className="text-sm" translate="no">{a.insurance.insurer}</span> },
        { label: 'Pre-auth', render: (a) => <Badge color={a.insurance.preauthStatus === 'approved' ? 'green' : a.insurance.preauthStatus === 'rejected' ? 'red' : 'amber'}>{PREAUTH_STATUS[a.insurance.preauthStatus]}</Badge> },
        { label: 'Claim', render: (a) => <Badge color={a.insurance.claimStatus === 'settled' ? 'green' : 'gray'}>{CLAIM_STATUS[a.insurance.claimStatus]}</Badge> },
        { label: 'Amount', right: true, render: (a) => inr(a.insurance.preauthAmount || 0) }
      ]} />
      <h3 className="font-bold mt-6 mb-2">Empanelled for cashless</h3>
      <Card className="p-4"><ol className="grid md:grid-cols-2 gap-x-6 gap-y-1 text-sm list-decimal list-inside" translate="no">{list.map((x) => <li key={x}>{x}</li>)}</ol>
        <p className="text-sm text-ink-500 mt-3">Also: LIC and Star Health medical examination centre · help with the Chief Minister’s medical relief fund.</p></Card>
    </Page>
  )
}
const AdmPat = ({ a }) => { const p = useData((d) => d.get('patients', a.patientId)); return <div><div className="font-semibold">{p?.name}</div><div className="text-xs text-ink-500" translate="no">{a.admNo} · {a.status === 'admitted' ? 'Admitted' : 'Discharged'}</div></div> }

export default function Ipd({ insurance }) {
  if (insurance) return <InsuranceDesk />
  return <Routes><Route index element={<Board />} /><Route path="admit" element={<Admit />} /><Route path=":id" element={<Admission />} /></Routes>
}
