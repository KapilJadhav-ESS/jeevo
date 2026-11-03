import { useState } from 'react'
import { Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { UserPlus, CalendarPlus, Receipt, HeartPulse, Pencil, QrCode, Printer, MessageCircle, Syringe, Users, ScanLine, Zap, AlertTriangle } from 'lucide-react'
import { Page, Card, Button, Table, SearchBox, Field, Input, Select, Textarea, Toggle, Tabs, Sheet, Kv, Badge, Empty, Grid, useToast } from '../../components/ui'
import { PatientLine, ClinicalAlerts, QR, ApptStatus, LabStatus, BillStatus, doctorName } from '../../components/common'
import { useAuth } from '../../lib/auth'
import { db, useData } from '../../lib/db'
import { can } from '../../lib/rbac'
import { searchPatients, registerPatient, updatePatient, setConsent, addVaccination, familyOf, patientTimeline, recordVitals, balanceOf, VITAL_FIELDS, latestVitals, sendMessage, patientBalance } from '../../lib/actions'
import { ageSex, fmtDate, fmtDateTime, fmtPhone, inr, dobFromAge, ageOf, today, hhmm, waLink, cls } from '../../lib/utils'
import { LANGS } from '../../i18n'
import { printPage } from '../../components/Documents'

function List() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const rows = useData(() => searchPatients(q, 200)).filter((p) => filter === 'all' || (filter === 'incomplete' ? p.incomplete : p.createdAt?.startsWith(today())))
  return (
    <Page title="Patients" wide actions={can(user, 'patients.register') && <Button icon={UserPlus} onClick={() => nav('new')}>Register patient</Button>}>
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <SearchBox autoFocus value={q} onChange={setQ} placeholder="Name, mobile number, Patient ID or scan QR" className="flex-1" />
        <Tabs value={filter} onChange={setFilter} tabs={[{ value: 'all', label: 'All' }, { value: 'today', label: 'New today' }, { value: 'incomplete', label: 'Details pending' }]} className="md:w-[380px]" />
      </div>
      <Table rows={rows.slice(0, 100)} onRow={(p) => nav(p.id)} empty={q ? 'No patient found – register a new one' : 'No patients'} columns={[
        { label: 'Patient', render: (p) => <PatientLine p={p} showPhone={false} /> },
        { label: 'Mobile', render: (p) => <span translate="no">{fmtPhone(p.phone)}</span>, nowrap: true },
        { label: 'City', key: 'city', hideMobile: true },
        { label: 'Registered', render: (p) => fmtDate(p.createdAt), nowrap: true },
        { label: 'Balance', right: true, render: (p) => { const b = patientBalance(p.id); return b > 0 ? <span className="text-red-600 font-semibold">{inr(b)}</span> : '—' } }
      ]} />
      {rows.length > 100 && <p className="text-xs text-ink-500 mt-2">Showing first 100 – refine your search.</p>}
    </Page>
  )
}

const BLANK = { name: '', age: '', dob: '', gender: '', phone: '', altPhone: '', address: '', city: '', pin: '', lang: 'mr', emergencyName: '', emergencyPhone: '', bloodGroup: '', allergies: '', conditions: '', familyId: '', relation: 'self', consent: { whatsapp: true, sms: true } }

export function PatientForm({ initial, onSaved, onCancel, compact }) {
  const toast = useToast()
  const [quick, setQuick] = useState(!initial)
  const [f, setF] = useState(() => (initial ? { ...BLANK, ...initial, age: ageOf(initial.dob) ?? '' } : { ...BLANK, city: db.hospital()?.city || '' }))
  const [dups, setDups] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const family = useData((d) => (f.familyId ? d.get('patients', f.familyId) : null))
  const [famQ, setFamQ] = useState('')
  const famRes = useData(() => (famQ.length >= 3 ? searchPatients(famQ, 5) : []))
  const save = (force = false) => {
    const data = { ...f, dob: f.dob || (f.age ? dobFromAge(f.age) : ''), ageOnly: !f.dob }
    delete data.age
    try {
      const p = initial ? updatePatient(initial.id, data) : registerPatient(data, { quick, force })
      toast(initial ? 'Details saved' : `Registered · Patient ID ${p.pid}`)
      onSaved?.(p)
    } catch (e) {
      if (e.duplicates) setDups(e.duplicates)
      else toast(e.message, 'error')
    }
  }
  return (
    <div>
      {!initial && <Tabs className="mb-4 max-w-md" value={quick ? 'quick' : 'full'} onChange={(v) => setQuick(v === 'quick')} tabs={[{ value: 'quick', label: 'Quick (essential details)' }, { value: 'full', label: 'Full registration' }]} />}
      <Grid cols={compact ? 2 : 3}>
        <Field label="Full name *" className="sm:col-span-2"><Input autoFocus value={f.name} onChange={set('name')} placeholder="First and last name" /></Field>
        <Field label="Mobile number *" hint={f.familyId ? 'Optional for family members' : ''}><div className="flex gap-2"><span className="h-12 px-3 rounded-xl border border-ink-200 grid place-items-center text-sm font-semibold text-ink-500">+91</span><Input inputMode="numeric" maxLength={10} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '') })} /></div></Field>
        <Field label="Age (years) *" hint="Or enter date of birth"><Input inputMode="numeric" value={f.age} onChange={(e) => setF({ ...f, age: e.target.value.replace(/\D/g, '').slice(0, 3), dob: '' })} /></Field>
        <Field label="Date of birth"><Input type="date" max={today()} value={f.dob} onChange={(e) => setF({ ...f, dob: e.target.value, age: ageOf(e.target.value) ?? '' })} /></Field>
        <Field label="Gender *"><Select value={f.gender} onChange={set('gender')}><option value="">Choose</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></Select></Field>
        <Field label="Preferred language"><Select value={f.lang} onChange={set('lang')} translate="no">{LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</Select></Field>
        {(!quick || initial) && <>
          <Field label="Alternate mobile"><Input inputMode="numeric" maxLength={10} value={f.altPhone} onChange={(e) => setF({ ...f, altPhone: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Address" className="sm:col-span-2"><Input value={f.address} onChange={set('address')} placeholder="House, street, area" /></Field>
          <Field label="City / village"><Input value={f.city} onChange={set('city')} /></Field>
          <Field label="PIN code"><Input inputMode="numeric" maxLength={6} value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Emergency contact name"><Input value={f.emergencyName} onChange={set('emergencyName')} /></Field>
          <Field label="Emergency contact mobile"><Input inputMode="numeric" maxLength={10} value={f.emergencyPhone} onChange={(e) => setF({ ...f, emergencyPhone: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Blood group"><Select value={f.bloodGroup} onChange={set('bloodGroup')}><option value="">Not known</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b}>{b}</option>)}</Select></Field>
          <Field label="Allergies"><Input value={f.allergies} onChange={set('allergies')} placeholder="e.g. Penicillin, sulfa" /></Field>
          <Field label="Existing medical conditions" className="sm:col-span-2"><Input value={f.conditions} onChange={set('conditions')} placeholder="e.g. Diabetes, BP, asthma" /></Field>
        </>}
      </Grid>
      {!initial && (
        <Card className="p-4 bg-ink-100/50 shadow-none mb-4">
          <div className="text-sm font-semibold mb-2 flex items-center gap-2"><Users size={16} /> Add to a family (optional)</div>
          {family ? <div className="flex items-center gap-3"><PatientLine p={family} className="flex-1" /><Select className="w-40" value={f.relation} onChange={set('relation')}><option value="spouse">Spouse</option><option value="child">Child</option><option value="parent">Parent</option><option value="other">Other</option></Select><Button variant="ghost" size="sm" onClick={() => setF({ ...f, familyId: '', relation: 'self' })}>Remove</Button></div> : <>
            <SearchBox value={famQ} onChange={setFamQ} placeholder="Search family head by name / mobile / ID" />
            {famRes.map((p) => <button key={p.id} onClick={() => { setF({ ...f, familyId: p.id, relation: 'child', phone: f.phone || p.phone, address: f.address || p.address }); setFamQ('') }} className="w-full text-left p-2 rounded-xl hover:bg-white mt-1"><PatientLine p={p} /></button>)}
          </>}
        </Card>
      )}
      {!initial && <div className="mb-4 space-y-1">
        <Toggle label="Patient agrees to WhatsApp messages" desc="Appointment, report and payment updates" checked={f.consent.whatsapp} onChange={(v) => setF({ ...f, consent: { ...f.consent, whatsapp: v } })} />
        <Toggle label="Patient agrees to SMS messages" checked={f.consent.sms} onChange={(v) => setF({ ...f, consent: { ...f.consent, sms: v } })} />
      </div>}
      <div className="flex gap-2 justify-end">{onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}<Button size="lg" onClick={() => save(false)}>{initial ? 'Save changes' : 'Register patient'}</Button></div>
      <Sheet open={!!dups} onClose={() => setDups(null)} title="Is this an existing patient?" footer={<Button block variant="outline" onClick={() => { setDups(null); save(true) }}>No – register as a new patient</Button>}>
        <p className="text-sm text-ink-500 mb-3 flex gap-2"><AlertTriangle size={18} className="text-amber-500 shrink-0" /> We found patients with the same details. Please check to avoid duplicate records.</p>
        {dups?.map((p) => <Card key={p.id} className="p-3 mb-2" onClick={() => { setDups(null); onSaved?.(p, true) }}><PatientLine p={p} right={<Badge color="green">Use this</Badge>} /></Card>)}
      </Sheet>
    </div>
  )
}

function NewPatient() {
  const nav = useNavigate()
  const [sp] = useSearchParams()
  return (
    <Page title="Register patient" back wide>
      <Card className="p-5 lg:p-6 max-w-5xl">
        <PatientForm onSaved={(p) => nav(sp.get('next') === 'book' ? `/s/appointments/new?patient=${p.id}` : `/s/patients/${p.id}`, { replace: true })} onCancel={() => nav(-1)} />
      </Card>
    </Page>
  )
}

export function VitalsForm({ patientId, admissionId, apptId, onDone }) {
  const toast = useToast()
  const [v, setV] = useState({})
  const [note, setNote] = useState('')
  const save = () => { try { recordVitals({ patientId, admissionId, apptId, values: v, note }); toast('Vitals saved'); onDone?.() } catch (e) { toast(e.message, 'error') } }
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3">
        {VITAL_FIELDS.map(([k, label, unit]) => <Field key={k} label={`${label} (${unit})`}><Input inputMode="decimal" value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value.replace(/[^\d.]/g, '') })} /></Field>)}
      </div>
      <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <Button block size="lg" onClick={save}>Save vitals</Button>
    </>
  )
}

function Profile() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const p = useData((d) => d.get('patients', id))
  const fam = useData(() => familyOf(p))
  const tl = useData(() => (p ? patientTimeline(p.id) : []))
  const bills = useData((d) => d.list('bills', (b) => b.patientId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  const vit = useData((d) => d.list('vitals', (v) => v.patientId === id).sort((a, b) => b.at.localeCompare(a.at)))
  const [tab, setTab] = useState('history')
  const [sheet, setSheet] = useState('')
  const [vac, setVac] = useState({ name: '', date: today() })
  if (!p) return <Page title="Patient" back><Empty title="Patient not found" /></Page>
  const clinical = can(user, 'patients.clinical')
  const lastV = latestVitals(p.id)
  return (
    <Page title={p.name} subtitle={`${p.pid} · ${ageSex(p)}`} back="/s/patients" wide actions={<div className="flex gap-2">
      {can(user, 'appointments.manage') && <Button icon={CalendarPlus} onClick={() => nav(`/s/appointments/new?patient=${p.id}`)} className="hidden sm:inline-flex">Book</Button>}
      {can(user, 'billing.create') && <Button variant="secondary" icon={Receipt} onClick={() => nav(`/s/billing/new?patient=${p.id}`)} className="hidden sm:inline-flex">Bill</Button>}
    </div>}>
      <div className="grid lg:grid-cols-[360px_1fr] gap-4">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-xl font-extrabold">{p.name}</div>
                <div className="text-sm text-ink-500"><span translate="no">{p.pid}</span> · {ageSex(p)}</div>
                {p.incomplete && <Badge color="amber" className="mt-2">Details pending</Badge>}
                {p.emergencyRegistered && <Badge color="red" className="mt-2 ml-1">Emergency registration</Badge>}
              </div>
              <button onClick={() => setSheet('qr')} aria-label="Show QR"><QR text={`JEEVO:${p.pid}`} size={72} /></button>
            </div>
            {clinical && <ClinicalAlerts p={p} className="mt-3" />}
            <div className="mt-3 divide-y divide-ink-100">
              <Kv k="Mobile" v={<span translate="no">{fmtPhone(p.phone) || '—'}</span>} />
              {p.altPhone && <Kv k="Alternate" v={<span translate="no">{fmtPhone(p.altPhone)}</span>} />}
              <Kv k="Address" v={[p.address, p.city, p.pin].filter(Boolean).join(', ') || '—'} />
              <Kv k="Emergency contact" v={p.emergencyName ? `${p.emergencyName} ${fmtPhone(p.emergencyPhone)}` : '—'} />
              <Kv k="Language" v={<span translate="no">{LANGS.find((l) => l.code === p.lang)?.label}</span>} />
              <Kv k="Registered" v={fmtDate(p.createdAt)} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {can(user, 'patients.register') && <Button variant="outline" size="sm" icon={Pencil} onClick={() => setSheet('edit')}>Edit details</Button>}
              {can(user, 'vitals.record') && <Button variant="outline" size="sm" icon={HeartPulse} onClick={() => setSheet('vitals')}>Record vitals</Button>}
              <a href={waLink(p.phone, `Hello ${p.name}, `)} target="_blank" rel="noreferrer" className="h-9 rounded-xl border border-ink-200 text-[13px] font-semibold flex items-center justify-center gap-1.5"><MessageCircle size={16} className="text-[#25D366]" /> WhatsApp</a>
              <Button variant="outline" size="sm" icon={Printer} onClick={() => setSheet('card')}>Patient card</Button>
            </div>
          </Card>
          <Card className="p-5">
            <div className="font-bold mb-2">Consent</div>
            <Toggle label="WhatsApp messages" checked={!!p.consent?.whatsapp} onChange={(v) => setConsent(p.id, { whatsapp: v })} />
            <Toggle label="SMS messages" checked={!!p.consent?.sms} onChange={(v) => setConsent(p.id, { sms: v })} />
            <p className="text-[11px] text-ink-400">Last updated {fmtDateTime(p.consent?.at)}</p>
          </Card>
          <Card className="p-5">
            <div className="font-bold mb-2 flex items-center gap-2"><Users size={16} /> {`Family (${fam.length})`}</div>
            {fam.map((m) => <button key={m.id} onClick={() => nav(`/s/patients/${m.id}`)} className={cls('w-full text-left py-2 rounded-xl', m.id === p.id && 'opacity-50')}><PatientLine p={m} showPhone={false} /></button>)}
            {can(user, 'patients.register') && <Button size="sm" variant="ghost" icon={UserPlus} onClick={() => setSheet('family')}>Add family member</Button>}
          </Card>
        </div>
        <div className="min-w-0">
          {clinical && lastV && <Card className="p-4 mb-4"><div className="text-xs font-bold text-ink-500 uppercase mb-2">Latest vitals · {fmtDateTime(lastV.at)}</div><VitalChips v={lastV.values} /></Card>}
          <Tabs value={tab} onChange={setTab} className="mb-3" tabs={[{ value: 'history', label: 'History' }, { value: 'bills', label: `Bills (${bills.length})` }, ...(clinical ? [{ value: 'vitals', label: 'Vitals' }, { value: 'vaccines', label: 'Vaccinations' }] : [])]} />
          {tab === 'history' && <Timeline items={tl} clinical={clinical} />}
          {tab === 'bills' && <Table rows={bills} onRow={(b) => nav(`/s/billing/${b.id}`)} columns={[
            { label: 'Bill', render: (b) => <span className="font-semibold" translate="no">{b.billNo}</span> }, { label: 'Date', render: (b) => fmtDate(b.createdAt) },
            { label: 'Total', right: true, render: (b) => inr(b.total, 2) }, { label: 'Balance', right: true, render: (b) => inr(balanceOf(b), 2) }, { label: 'Status', render: (b) => <BillStatus s={b.status} /> }]} />}
          {tab === 'vitals' && <Table rows={vit} empty="No vitals recorded" columns={[
            { label: 'When', render: (v) => fmtDateTime(v.at), nowrap: true }, { label: 'Readings', render: (v) => <VitalChips v={v.values} /> }, { label: 'By', render: (v) => db.getAny('users', v.by)?.name, hideMobile: true }, { label: 'Note', key: 'note', hideMobile: true }]} />}
          {tab === 'vaccines' && <Card className="p-4">
            {(p.vaccinations || []).map((v, i) => <div key={i} className="flex justify-between py-2 border-b border-ink-100 text-sm"><span className="font-semibold" translate="no">{v.name}</span><span className="text-ink-500">{fmtDate(v.date)}</span></div>)}
            <div className="flex gap-2 mt-3"><Input placeholder="Vaccine name" value={vac.name} onChange={(e) => setVac({ ...vac, name: e.target.value })} /><Input type="date" className="w-44" value={vac.date} onChange={(e) => setVac({ ...vac, date: e.target.value })} /><Button icon={Syringe} onClick={() => { try { addVaccination(p.id, vac); setVac({ name: '', date: today() }) } catch (e) { toast(e.message, 'error') } }}>Add</Button></div>
          </Card>}
        </div>
      </div>

      <Sheet open={sheet === 'edit'} onClose={() => setSheet('')} title="Edit patient details" wide><PatientForm initial={p} compact onSaved={() => setSheet('')} /></Sheet>
      <Sheet open={sheet === 'family'} onClose={() => setSheet('')} title="Add family member" wide><PatientForm compact onSaved={(np) => { if (!np.familyId || np.familyId !== (p.familyId || p.id)) db.update('patients', np.id, { familyId: p.familyId || p.id, relation: np.relation === 'self' ? 'other' : np.relation }); setSheet('') }} /></Sheet>
      <Sheet open={sheet === 'vitals'} onClose={() => setSheet('')} title={`Vitals – ${p.name}`}><VitalsForm patientId={p.id} onDone={() => setSheet('')} /></Sheet>
      <Sheet open={sheet === 'qr'} onClose={() => setSheet('')} title="Patient QR"><div className="text-center pb-4"><QR text={`JEEVO:${p.pid}`} size={220} className="mx-auto" /><div className="font-bold mt-2">{p.name}</div><div translate="no">{p.pid}</div></div></Sheet>
      <Sheet open={sheet === 'card'} onClose={() => setSheet('')} title="Patient card" footer={<Button block icon={Printer} onClick={() => printPage('A5')}>Print</Button>}>
        <div className="print-area rounded-2xl border-2 border-brand-600 p-4 flex gap-4 items-center">
          <QR text={`JEEVO:${p.pid}`} size={110} />
          <div><div className="text-xs font-bold text-brand-700">{db.hospital()?.name}</div><div className="text-lg font-extrabold">{p.name}</div><div className="font-semibold" translate="no">{p.pid}</div><div className="text-sm text-ink-500">{ageSex(p)} · {p.bloodGroup || ''}</div><div className="text-xs text-ink-500">Emergency: {db.hospital()?.emergencyPhone}</div></div>
        </div>
        <Button className="mt-3" variant="ghost" size="sm" icon={MessageCircle} onClick={() => { const m = sendMessage(p.id, 'custom', { text: `Welcome to ${db.hospital()?.name}. Your Patient ID is ${p.pid}.` }); toast(m?.status === 'blocked_no_consent' ? 'Patient has not agreed to messages' : 'Message queued') }}>Send Patient ID on WhatsApp</Button>
      </Sheet>
    </Page>
  )
}

export function VitalChips({ v = {} }) {
  const items = [v.bpSys && ['BP', `${v.bpSys}/${v.bpDia || '–'}`], v.pulse && ['Pulse', v.pulse], v.temp && ['Temp', `${v.temp}°F`], v.spo2 && ['SpO₂', `${v.spo2}%`], v.resp && ['RR', v.resp], v.glucose && ['Sugar', v.glucose], v.weight && ['Wt', `${v.weight} kg`], v.height && ['Ht', `${v.height} cm`]].filter(Boolean)
  return <div className="flex flex-wrap gap-1.5">{items.map(([k, x]) => <span key={k} className="rounded-lg bg-ink-100 px-2 py-1 text-xs"><span className="text-ink-500">{k} </span><b translate="no">{x}</b></span>)}</div>
}

function Timeline({ items, clinical }) {
  const nav = useNavigate()
  if (!items.length) return <Card className="p-2"><Empty title="No visits yet" /></Card>
  return (
    <Card className="divide-y divide-ink-100">
      {items.map(({ kind, rec, at }) => {
        if (kind === 'appointment') return <div key={rec.id} className="px-4 py-3 flex items-center gap-3 text-sm"><CalendarPlus size={18} className="text-sky-600" /><div className="flex-1 min-w-0"><b>{doctorName(rec.doctorId)}</b> <span className="text-ink-500">· {fmtDate(rec.date + 'T00:00:00')} {hhmm(rec.time)} · Token {rec.token}</span></div><ApptStatus s={rec.status} /></div>
        if (kind === 'consultation') return clinical ? <div key={rec.id} className="px-4 py-3 text-sm"><div className="flex items-center gap-2"><Zap size={18} className="text-violet-600" /><b className="flex-1">Consultation · {doctorName(rec.doctorId)}</b><span className="text-ink-500">{fmtDate(at)}</span></div><div className="mt-1 ml-7"><span translate="no">{rec.complaints}</span>{rec.diagnosis && <> → <b translate="no">{rec.diagnosis}</b></>}</div>{rec.plan && <div className="ml-7 text-ink-500" translate="no">{rec.plan}</div>}</div> : null
        if (kind === 'prescription') return <button key={rec.id} onClick={() => nav(`/s/rx/${rec.id}`)} className="w-full text-left px-4 py-3 text-sm flex items-center gap-3"><span className="text-lg font-extrabold text-brand-600">℞</span><span className="flex-1 min-w-0 truncate" translate="no">{rec.items.map((i) => i.name).join(', ')}</span><span className="text-ink-500">{fmtDate(at)}</span></button>
        if (kind === 'lab') return <button key={rec.id} onClick={() => nav(`/s/lab/${rec.id}`)} className="w-full text-left px-4 py-3 text-sm flex items-center gap-3"><ScanLine size={18} className="text-amber-600" /><span className="flex-1 min-w-0 truncate">{rec.tests.map((t) => db.get('labTests', t)?.code).join(', ')}</span><LabStatus s={rec.status} /></button>
        if (kind === 'admission') return <button key={rec.id} onClick={() => nav(`/s/ipd/${rec.id}`)} className="w-full text-left px-4 py-3 text-sm flex items-center gap-3"><HeartPulse size={18} className="text-red-500" /><span className="flex-1 min-w-0"><b translate="no">{rec.admNo}</b> · <span translate="no">{rec.diagnosis}</span></span><Badge color={rec.status === 'admitted' ? 'amber' : 'green'}>{rec.status === 'admitted' ? 'Admitted' : 'Discharged'}</Badge></button>
        return null
      })}
    </Card>
  )
}

export default function Patients() {
  return <Routes><Route index element={<List />} /><Route path="new" element={<NewPatient />} /><Route path=":id" element={<Profile />} /></Routes>
}
