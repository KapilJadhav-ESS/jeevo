import { useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { Page, Card, Button, Field, Input, Select, Textarea, Toggle, Table, Sheet, Grid, Badge, useToast } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { db, useData } from '../../lib/db'
import { saveHospital, saveSettings, saveDepartment, saveService, saveLabTest } from '../../lib/actions'
import { inr, cls } from '../../lib/utils'
import { CLOUD } from '../../lib/config'
import { can, rolesOf, unitOf, UNITS } from '../../lib/rbac'

function Tabs() {
  const { user } = useAuth()
  const hosp = can(user, 'config.manage')
  const t = [
    ...(hosp ? [['/s/settings', 'Hospital', true], ['/s/settings/departments', 'Departments'], ['/s/settings/pricing', 'Services & pricing']] : []),
    ['/s/settings/unit', hosp ? 'Letterhead' : `${UNITS[unitOf(user)]} profile`],
    ...(can(user, 'config.labtests') ? [['/s/settings/lab', hosp ? 'ECG / echo / X-ray prices' : 'Lab tests & prices']] : []),
    ...(hosp ? [['/s/settings/wards', 'Wards'], ['/s/settings/messaging', 'WhatsApp & SMS'], ['/s/settings/privacy', 'Privacy & data']] : [])
  ]
  return <div className="flex gap-1 p-1 bg-ink-100 rounded-xl mb-4 overflow-x-auto no-scrollbar">{t.map(([to, l, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => cls('h-9 px-4 rounded-lg text-[13px] font-semibold grid place-items-center whitespace-nowrap', isActive ? 'bg-white shadow-sm' : 'text-ink-500')}>{l}</NavLink>)}</div>
}

function Hospital() {
  const toast = useToast()
  const { hospital } = useAuth()
  const [h, setH] = useState({ ...hospital })
  const [opd, setOpd] = useState(() => db.setting('opd', {}))
  const [bill, setBill] = useState(() => db.setting('billing', {}))
  const set = (k) => (e) => setH({ ...h, [k]: e.target.value })
  return (
    <Page title="Settings" wide><Tabs />
      <div className="grid xl:grid-cols-[1fr_400px] gap-4">
        <Card className="p-5">
          <h3 className="font-bold mb-3">Hospital profile</h3>
          <Grid cols={2}>
            <Field label="Hospital / clinic name"><Input value={h.name} onChange={set('name')} /></Field>
            <Field label="Short name (for SMS)"><Input value={h.shortName || ''} onChange={set('shortName')} /></Field>
            <Field label="Type"><Select value={h.type} onChange={set('type')}>{['Multispecialty hospital', 'General physician clinic', 'Multispecialty clinic', 'Dental clinic', 'Diagnostic centre', 'Pathology laboratory', 'Nursing home', 'Day-care hospital'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Registration no."><Input value={h.regNo || ''} onChange={set('regNo')} /></Field>
            <Field label="Address" className="sm:col-span-2"><Input value={h.address || ''} onChange={set('address')} /></Field>
            <Field label="City"><Input value={h.city || ''} onChange={set('city')} /></Field>
            <Field label="PIN code"><Input value={h.pin || ''} onChange={set('pin')} /></Field>
            <Field label="Reception phone"><Input value={h.phone || ''} onChange={set('phone')} /></Field>
            <Field label="WhatsApp number"><Input value={h.whatsapp || ''} onChange={set('whatsapp')} /></Field>
            <Field label="Emergency number"><Input value={h.emergencyPhone || ''} onChange={set('emergencyPhone')} /></Field>
            <Field label="Ambulance number"><Input value={h.ambulancePhone || ''} onChange={set('ambulancePhone')} /></Field>
            <Field label="Email"><Input value={h.email || ''} onChange={set('email')} /></Field>
            <Field label="GSTIN (optional)"><Input value={h.gstin || ''} onChange={set('gstin')} /></Field>
            <Field label="Google Maps link" className="sm:col-span-2"><Input value={h.mapUrl || ''} onChange={set('mapUrl')} /></Field>
            <Field label="Timings (shown to patients)" className="sm:col-span-2"><Input value={h.timings || ''} onChange={set('timings')} /></Field>
            <Field label="Brand colour"><Input type="color" className="!h-12 p-1" value={h.color || '#0E7C74'} onChange={set('color')} /></Field>
          </Grid>
          <Button onClick={() => { try { saveHospital(h); toast('Saved') } catch (e) { toast(e.message, 'error') } }}>Save profile</Button>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold mb-2">OPD & appointments</h3>
            <Toggle label="Allow patients to book from the app" checked={opd.allowOnlineBooking !== false} onChange={(v) => setOpd({ ...opd, allowOnlineBooking: v })} />
            <Toggle label="Show waiting time to patients" checked={opd.showWaitTime !== false} onChange={(v) => setOpd({ ...opd, showWaitTime: v })} />
            <Field label="Average consultation (minutes, used until real data is available)"><Input inputMode="numeric" value={opd.avgConsultMins || 10} onChange={(e) => setOpd({ ...opd, avgConsultMins: Number(e.target.value) || 10 })} /></Field>
            <Button size="sm" onClick={() => { saveSettings('opd', opd); toast('Saved') }}>Save</Button>
          </Card>
          <Card className="p-5">
            <h3 className="font-bold mb-2">Billing</h3>
            <Toggle label="Allow part payments" checked={bill.allowPartial !== false} onChange={(v) => setBill({ ...bill, allowPartial: v })} />
            <Toggle label="Show GST on bills" checked={!!bill.gstEnabled} onChange={(v) => setBill({ ...bill, gstEnabled: v })} />
            <Field label="Footer on receipts"><Input value={bill.receiptFooter || ''} onChange={(e) => setBill({ ...bill, receiptFooter: e.target.value })} /></Field>
            <Button size="sm" onClick={() => { saveSettings('billing', bill); toast('Saved') }}>Save</Button>
          </Card>
        </div>
      </div>
    </Page>
  )
}

function Departments() {
  const toast = useToast()
  const [f, setF] = useState(null)
  const rows = useData((d) => d.list('departments'))
  return (
    <Page title="Settings" wide actions={<Button icon={Plus} onClick={() => setF({ name: '', icon: '🏥', active: true })}>Add department</Button>}><Tabs />
      <Table rows={rows} onRow={setF} columns={[{ label: 'Department', render: (d) => <b>{d.icon} {d.name}</b> }, { label: 'Doctors', render: (d) => db.list('staff', (s) => s.deptId === d.id && s.role === 'doctor').length }, { label: 'Status', render: (d) => d.active ? <Badge color="green">Active</Badge> : <Badge>Hidden</Badge> }]} />
      <Sheet open={!!f} onClose={() => setF(null)} title="Department" footer={<Button block size="lg" onClick={() => { try { saveDepartment(f); toast('Saved'); setF(null) } catch (e) { toast(e.message, 'error') } }}>Save</Button>}>
        {f && <><div className="grid grid-cols-[80px_1fr] gap-3"><Field label="Icon"><Input value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} /></Field><Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field></div><Toggle label="Active (shown to patients)" checked={f.active} onChange={(v) => setF({ ...f, active: v })} /></>}
      </Sheet>
    </Page>
  )
}

function Pricing() {
  const toast = useToast()
  const [f, setF] = useState(null)
  const rows = useData((d) => d.list('services').sort((a, b) => a.category.localeCompare(b.category)))
  const docs = useData((d) => d.list('staff', (s) => s.role === 'doctor' && !s.noOpd))
  return (
    <Page title="Settings" wide actions={<Button icon={Plus} onClick={() => setF({ name: '', category: 'Procedure', price: '', gst: 0, active: true })}>Add service</Button>}><Tabs />
      <div className="grid xl:grid-cols-[1fr_420px] gap-4">
        <Table rows={rows} onRow={setF} columns={[{ label: 'Service', render: (s) => <b>{s.name}</b> }, { label: 'Category', key: 'category' }, { label: 'Price', right: true, render: (s) => inr(s.price) }, { label: 'GST', right: true, render: (s) => `${s.gst || 0}%` }]} />
        <Card className="p-5 h-fit"><h3 className="font-bold mb-2">Consultation fees</h3><p className="text-xs text-ink-500 mb-3">Edit in Staff & HR → doctor.</p>{docs.map((d) => <div key={d.id} className="flex justify-between text-sm py-1.5 border-b border-ink-100"><span>{d.name}</span><span>{inr(d.fee)} · follow-up {inr(d.followUpFee)}</span></div>)}</Card>
      </div>
      <Sheet open={!!f} onClose={() => setF(null)} title="Service" footer={<Button block size="lg" onClick={() => { try { saveService(f); toast('Saved – change recorded in audit log'); setF(null) } catch (e) { toast(e.message, 'error') } }}>Save</Button>}>
        {f && <><Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-3"><Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{['Consultation', 'Procedure', 'Dental', 'Room', 'Registration', 'Other'].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Price (₹)"><Input inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field><Field label="GST %"><Select value={f.gst || 0} onChange={(e) => setF({ ...f, gst: Number(e.target.value) })}>{[0, 5, 12, 18].map((x) => <option key={x} value={x}>{x}</option>)}</Select></Field></div></>}
      </Sheet>
    </Page>
  )
}

function LabTests() {
  const toast = useToast()
  const { user } = useAuth()
  const unit = rolesOf(user).includes('lab_admin') ? 'lab' : 'hospital'
  const [f, setF] = useState(null)
  const rows = useData((d) => d.list('labTests', (t) => user.role === 'super_admin' || (t.unit || 'lab') === unit).sort((a, b) => a.category.localeCompare(b.category)))
  const setP = (i, k, v) => setF({ ...f, params: f.params.map((p, j) => (j === i ? { ...p, [k]: v } : p)) })
  return (
    <Page title="Settings" wide actions={<Button icon={Plus} onClick={() => setF({ code: '', name: '', category: unit === 'lab' ? 'Biochemistry' : 'Cardiac', sample: unit === 'lab' ? 'Serum' : 'Patient', price: '', tat: 6, params: [{ name: '', unit: '', low: '', high: '', normal: '' }] })}>Add test</Button>}><Tabs />
      <Table rows={rows} onRow={(t) => setF(JSON.parse(JSON.stringify(t)))} columns={[{ label: 'Code', render: (t) => <span className="font-mono text-xs" translate="no">{t.code}</span> }, { label: 'Test', render: (t) => <b>{t.name}</b> }, { label: 'Category', key: 'category' }, { label: 'Result fields', render: (t) => t.params.length, hideMobile: true }, { label: 'Price', right: true, render: (t) => inr(t.price) }]} />
      <Sheet open={!!f} onClose={() => setF(null)} title="Lab test" wide footer={<Button block size="lg" onClick={() => { try { saveLabTest(f); toast('Saved'); setF(null) } catch (e) { toast(e.message, 'error') } }}>Save</Button>}>
        {f && <>
          <Grid cols={3}><Field label="Code"><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} /></Field><Field label="Name" className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Category"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{(unit === 'lab' ? ['Biochemistry', 'Haematology', 'Serology', 'Hormones', 'Clinical pathology', 'Other'] : ['Cardiac', 'X-ray', 'Other']).map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Price (₹)"><Input inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field><Field label="Report time (hours)"><Input inputMode="numeric" value={f.tat} onChange={(e) => setF({ ...f, tat: Number(e.target.value) || 0 })} /></Field></Grid>
          <div className="font-semibold text-sm mb-2">Result fields & normal ranges</div>
          {f.params.map((p, i) => <div key={i} className="grid grid-cols-[1fr_90px_80px_80px_1fr_36px] gap-2 mb-2"><Input className="!h-10" placeholder="Parameter" value={p.name} onChange={(e) => setP(i, 'name', e.target.value)} /><Input className="!h-10" placeholder="Unit" value={p.unit} onChange={(e) => setP(i, 'unit', e.target.value)} /><Input className="!h-10" placeholder="Low" value={p.low ?? ''} onChange={(e) => setP(i, 'low', e.target.value)} /><Input className="!h-10" placeholder="High" value={p.high ?? ''} onChange={(e) => setP(i, 'high', e.target.value)} /><Input className="!h-10" placeholder="Normal text (e.g. Negative)" value={p.normal || ''} onChange={(e) => setP(i, 'normal', e.target.value)} /><button aria-label="Remove field" onClick={() => setF({ ...f, params: f.params.filter((_, j) => j !== i) })} className="grid place-items-center rounded-lg hover:bg-ink-100"><Trash2 size={16} /></button></div>)}
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => setF({ ...f, params: [...f.params, { name: '', unit: '', low: '', high: '', normal: '' }] })}>Add field</Button>
        </>}
      </Sheet>
    </Page>
  )
}

function Wards() {
  const toast = useToast()
  const rows = useData((d) => d.list('wards'))
  const [f, setF] = useState(null)
  const save = () => {
    try {
      if (!f.name) throw new Error('Enter the ward name')
      if (f.id) db.update('wards', f.id, { name: f.name, type: f.type, floor: f.floor, dailyRate: Number(f.dailyRate) })
      else {
        const id = 'w-' + Math.random().toString(36).slice(2, 8)
        db.insert('wards', { id, name: f.name, type: f.type, floor: f.floor, dailyRate: Number(f.dailyRate) })
        for (let i = 1; i <= Number(f.beds || 0); i++) db.insert('beds', { id: `${id}-${i}`, wardId: id, label: `${(f.prefix || f.name.slice(0, 2)).toUpperCase()}-${String(i).padStart(2, '0')}`, status: 'available' })
      }
      toast('Saved'); setF(null)
    } catch (e) { toast(e.message, 'error') }
  }
  return (
    <Page title="Settings" wide actions={<Button icon={Plus} onClick={() => setF({ name: '', type: 'General', floor: 1, dailyRate: 800, beds: 6, prefix: '' })}>Add ward</Button>}><Tabs />
      <Table rows={rows} onRow={setF} columns={[{ label: 'Ward', render: (w) => <b>{w.name}</b> }, { label: 'Type', key: 'type' }, { label: 'Floor', key: 'floor' }, { label: 'Beds', render: (w) => db.list('beds', (b) => b.wardId === w.id).length }, { label: 'Rate / day', right: true, render: (w) => inr(w.dailyRate) }]} />
      <Sheet open={!!f} onClose={() => setF(null)} title="Ward" footer={<Button block size="lg" onClick={save}>Save</Button>}>
        {f && <Grid cols={2}><Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field label="Type"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{['General', 'Semi-private', 'Private', 'ICU', 'Emergency', 'Day-care'].map((x) => <option key={x}>{x}</option>)}</Select></Field><Field label="Floor"><Input value={f.floor} onChange={(e) => setF({ ...f, floor: e.target.value })} /></Field><Field label="Rate per day (₹)"><Input inputMode="numeric" value={f.dailyRate} onChange={(e) => setF({ ...f, dailyRate: e.target.value })} /></Field>{!f.id && <><Field label="Number of beds"><Input inputMode="numeric" value={f.beds} onChange={(e) => setF({ ...f, beds: e.target.value })} /></Field><Field label="Bed label prefix"><Input value={f.prefix} onChange={(e) => setF({ ...f, prefix: e.target.value })} placeholder="e.g. GW" /></Field></>}</Grid>}
      </Sheet>
    </Page>
  )
}

function Messaging() {
  const toast = useToast()
  const [m, setM] = useState(() => db.setting('messaging', {}))
  return (
    <Page title="Settings" wide><Tabs />
      <Card className="p-5 max-w-3xl">
        <h3 className="font-bold mb-3">WhatsApp</h3>
        <Field label="How WhatsApp messages are sent"><Select value={m.whatsappProvider || 'click_to_chat'} onChange={(e) => setM({ ...m, whatsappProvider: e.target.value })}>
          <option value="click_to_chat">From the hospital phone (click-to-chat, free – staff tap Send)</option>
          <option value="api">WhatsApp Business API (automatic – Meta / Gupshup / Interakt / AiSensy)</option>
          <option value="off">Do not use WhatsApp</option>
        </Select></Field>
        {m.whatsappProvider === 'api' && <Grid cols={2}><Field label="Provider"><Select value={m.waVendor || 'meta'} onChange={(e) => setM({ ...m, waVendor: e.target.value })}><option value="meta">Meta Cloud API</option><option value="gupshup">Gupshup</option><option value="interakt">Interakt</option><option value="aisensy">AiSensy</option></Select></Field><Field label="Sender phone number ID"><Input value={m.waSender || ''} onChange={(e) => setM({ ...m, waSender: e.target.value })} /></Field><p className="text-xs text-ink-500 sm:col-span-2 -mt-2 mb-4">The access token is stored securely on the server (Supabase secret), never in the app. Message templates must be approved by WhatsApp.</p></Grid>}
        <h3 className="font-bold mb-3 mt-2">SMS</h3>
        <Grid cols={2}>
          <Field label="SMS gateway"><Select value={m.smsProvider || 'demo'} onChange={(e) => setM({ ...m, smsProvider: e.target.value })}><option value="demo">Demo (not sent)</option><option value="msg91">MSG91</option><option value="textlocal">Textlocal</option><option value="twilio">Twilio</option><option value="click_to_chat">From the hospital phone</option><option value="off">Off</option></Select></Field>
          <Field label="DLT sender ID (6 letters)"><Input maxLength={6} value={m.senderId || ''} onChange={(e) => setM({ ...m, senderId: e.target.value.toUpperCase() })} /></Field>
        </Grid>
        <h3 className="font-bold mb-2 mt-2">Automatic messages</h3>
        <Toggle label="Appointment reminders (day before and same day)" checked={!!m.autoReminders} onChange={(v) => setM({ ...m, autoReminders: v })} />
        <Field label="Tell patients when their token is this close" className="mt-2"><Select value={m.tokenAlertAhead || 3} onChange={(e) => setM({ ...m, tokenAlertAhead: Number(e.target.value) })}>{[1, 2, 3, 5].map((x) => <option key={x} value={x}>{x} patients ahead</option>)}</Select></Field>
        <p className="text-xs text-ink-500 mb-4">Every message is sent only with the patient’s consent and in their preferred language (English, Hindi or Marathi).</p>
        <Button onClick={() => { saveSettings('messaging', m); toast('Saved') }}>Save</Button>
      </Card>
    </Page>
  )
}

function Privacy() {
  return (
    <Page title="Settings" wide><Tabs />
      <div className="grid lg:grid-cols-2 gap-4 max-w-5xl">
        <Card className="p-5 text-sm space-y-2">
          <h3 className="font-bold text-base">How patient data is protected</h3>
          <p>• Each hospital’s data is kept separate – staff of one hospital can never see another hospital’s patients.</p>
          <p>• Staff see only what their role needs (e.g. pharmacists do not see clinical notes; receptionists do not see diagnoses).</p>
          <p>• Prescriptions, clinical notes, lab reports and bills are locked once final. Corrections create a new version; every change is in the audit log.</p>
          <p>• Reports and documents are stored in a private store and opened through short-lived secure links – never public URLs.</p>
          <p>• Staff are logged out automatically after 30 minutes of inactivity.</p>
          <p>• Data is encrypted in transit (HTTPS) and at rest {CLOUD ? '(Supabase / PostgreSQL)' : '(when connected to the cloud server)'}.</p>
        </Card>
        <Card className="p-5 text-sm space-y-2">
          <h3 className="font-bold text-base">Consent, retention & patient rights (DPDP Act, 2023)</h3>
          <p>• Consent for WhatsApp / SMS is recorded with date and staff name, and patients can change it in the app.</p>
          <p>• Patients can ask for a copy of their records (download from the app, or export from Reports).</p>
          <p>• Medical records are retained as required by applicable medical record-keeping rules; deletion requests are reviewed by the administrator.</p>
          <p>• Backups: daily automatic database backups with point-in-time recovery {CLOUD ? 'are enabled in Supabase' : 'when connected to the cloud server'}.</p>
          <p>• Future-ready: ABHA / ABDM linking can be added as a module (Patient ID ↔ ABHA number).</p>
        </Card>
      </div>
    </Page>
  )
}

// Each owner's own unit profile: shown on that unit's bills, receipts and reports
function UnitProfile() {
  const toast = useToast()
  const { user } = useAuth()
  const unit = user.role === 'super_admin' ? 'hospital' : unitOf(user)
  const key = 'unit.' + unit
  const [v, setV] = useState(() => db.setting(key, {}))
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })
  return (
    <Page title="Settings" subtitle={UNITS[unit]} wide><Tabs />
      <Card className="p-5 max-w-3xl">
        <h3 className="font-bold mb-3">{unit === 'lab' ? 'Laboratory letterhead' : unit === 'pharmacy' ? 'Medical store details' : 'Hospital letterhead'}</h3>
        <Grid cols={2}>
          <Field label="Name"><Input value={v.name || ''} onChange={set('name')} /></Field>
          <Field label="Owner"><Input value={v.owner || ''} onChange={set('owner')} /></Field>
          {unit === 'pharmacy' && <><Field label="Drug licence number"><Input value={v.drugLicence || ''} onChange={set('drugLicence')} /></Field><Field label="GSTIN"><Input value={v.gstin || ''} onChange={set('gstin')} /></Field><Field label="Phone"><Input value={v.phone || ''} onChange={set('phone')} /></Field></>}
          {unit === 'lab' && <><Field label="Address" className="sm:col-span-2"><Input value={v.address || ''} onChange={set('address')} /></Field><Field label="Phone"><Input value={v.phone || ''} onChange={set('phone')} /></Field><Field label="Email"><Input value={v.email || ''} onChange={set('email')} /></Field></>}
          <Field label="Footer (printed on bills / reports)" className="sm:col-span-2"><Input value={v.footer || ''} onChange={set('footer')} /></Field>
        </Grid>
        {unit === 'lab' && <>
          <div className="font-semibold text-sm mb-2">Signatories (top right of the report)</div>
          {(v.signatories || []).map((x, i) => <div key={i} className="grid sm:grid-cols-3 gap-2 mb-2">{['name', 'qual', 'reg'].map((k) => <Input key={k} className="!h-10" value={x[k] || ''} placeholder={{ name: 'Name', qual: 'Qualification', reg: 'Reg. No.' }[k]} onChange={(e) => setV({ ...v, signatories: v.signatories.map((y, j) => (j === i ? { ...y, [k]: e.target.value } : y)) })} />)}</div>)}
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => setV({ ...v, signatories: [...(v.signatories || []), { name: '', qual: '', reg: '' }] })}>Add signatory</Button>
        </>}
        <div className="mt-4"><Button onClick={() => { try { saveSettings(key, v); toast('Saved') } catch (e) { toast(e.message, 'error') } }}>Save</Button></div>
        <p className="text-xs text-ink-500 mt-3">Only the owner of this unit can change this. Income and bills of your unit are visible only to you and your staff.</p>
      </Card>
    </Page>
  )
}

export default function Settings() {
  const { user } = useAuth()
  if (!can(user, 'config.manage')) return <Routes><Route path="unit" element={<UnitProfile />} /><Route path="lab" element={<LabTests />} /><Route path="*" element={<Navigate to="/s/settings/unit" replace />} /></Routes>
  return <Routes><Route index element={<Hospital />} /><Route path="unit" element={<UnitProfile />} /><Route path="departments" element={<Departments />} /><Route path="pricing" element={<Pricing />} /><Route path="lab" element={<LabTests />} /><Route path="wards" element={<Wards />} /><Route path="messaging" element={<Messaging />} /><Route path="privacy" element={<Privacy />} /></Routes>
}
