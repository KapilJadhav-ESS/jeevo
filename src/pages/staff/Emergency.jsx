import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Siren, Phone, Ambulance, Zap, BedDouble } from 'lucide-react'
import { Page, Card, Button, Field, Input, Select, Textarea, Empty, Badge, useToast } from '../../components/ui'
import { PatientLine, ClinicalAlerts, doctorName } from '../../components/common'
import PatientPicker from '../../components/PatientPicker'
import { useAuth } from '../../lib/auth'
import { useData } from '../../lib/db'
import { can } from '../../lib/rbac'
import { doctors, registerEmergency, startConsultation } from '../../lib/actions'
import { today, timeAgo, telLink, cls } from '../../lib/utils'

export default function Emergency() {
  const nav = useNavigate()
  const toast = useToast()
  const { user, hospital: h } = useAuth()
  const docs = useData(() => doctors())
  const [known, setKnown] = useState(false)
  const [f, setF] = useState({ name: '', phone: '', age: '', gender: '', complaint: '', doctorId: docs[0]?.id || '', broughtBy: '', patientId: null })
  const cases = useData((d) => d.list('appointments', (a) => a.priority === 'emergency' && a.date === today()).sort((a, b) => b.arrivedAt?.localeCompare(a.arrivedAt || '') || 0))
  const ipd = useData((d) => d.list('admissions', (a) => a.status === 'admitted' && a.emergency))
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const reg = () => {
    try {
      const { appointment } = registerEmergency(f)
      toast(`Emergency registered · Token ${appointment.token} · doctor alerted`)
      setF({ ...f, name: '', phone: '', age: '', gender: '', complaint: '', broughtBy: '', patientId: null })
    } catch (e) { toast(e.message, 'error') }
  }
  return (
    <Page title="Emergency" subtitle="Register first – complete details later. Never delay treatment." wide actions={<a href={telLink(h.ambulancePhone || '108')} className="h-11 px-4 rounded-xl bg-red-600 text-white font-semibold flex items-center gap-2"><Ambulance size={18} /> Ambulance {h.ambulancePhone || '108'}</a>}>
      <div className="grid lg:grid-cols-[420px_1fr] gap-4">
        {can(user, 'emergency.register') && (
          <Card className="p-5 border-2 border-red-200">
            <div className="flex items-center gap-2 text-red-700 font-extrabold text-lg mb-4"><Siren /> Fast emergency registration</div>
            <div className="flex gap-2 mb-4"><Button size="sm" variant={known ? 'outline' : 'dangerSolid'} onClick={() => setKnown(false)}>New / unknown patient</Button><Button size="sm" variant={known ? 'dangerSolid' : 'outline'} onClick={() => setKnown(true)}>Existing patient</Button></div>
            {known ? <div className="mb-4"><PatientPicker value={f.patientId} onChange={(id) => setF({ ...f, patientId: id })} allowNew={false} /></div> : <>
              <Field label="Name (if known)" hint="Leave empty for an unidentified patient"><Input value={f.name} onChange={set('name')} /></Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Approx. age"><Input inputMode="numeric" value={f.age} onChange={(e) => setF({ ...f, age: e.target.value.replace(/\D/g, '').slice(0, 3) })} /></Field>
                <Field label="Gender" className="col-span-2"><Select value={f.gender} onChange={set('gender')}><option value="">Unknown</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></Select></Field>
              </div>
              <Field label="Mobile (patient or relative)"><Input inputMode="numeric" maxLength={10} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value.replace(/\D/g, '') })} /></Field>
              <Field label="Brought by"><Input value={f.broughtBy} onChange={set('broughtBy')} placeholder="Relative / police / ambulance" /></Field>
            </>}
            <Field label="Main problem *"><Textarea rows={2} value={f.complaint} onChange={set('complaint')} placeholder="e.g. chest pain, road accident, unconscious" /></Field>
            <Field label="Alert doctor"><Select value={f.doctorId} onChange={set('doctorId')}>{docs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
            <Button block size="lg" variant="dangerSolid" icon={Zap} onClick={reg}>Register emergency now</Button>
          </Card>
        )}
        <div>
          <h3 className="font-bold mb-2">Emergency cases today</h3>
          <div className="space-y-2">
            {cases.map((a) => <CaseRow key={a.id} a={a} onOpen={() => { if (user.role === 'doctor') { try { if (a.status !== 'in_consultation' && a.status !== 'completed') startConsultation(a.id); nav(`/s/consult/${a.id}`) } catch (e) { toast(e.message, 'error') } } else nav(`/s/patients/${a.patientId}`) }} />)}
            {!cases.length && <Card className="p-2"><Empty icon={Siren} title="No emergency cases today" /></Card>}
          </div>
          {ipd.length > 0 && <>
            <h3 className="font-bold mt-6 mb-2">Admitted through emergency</h3>
            <div className="space-y-2">{ipd.map((a) => <IpRow key={a.id} a={a} onOpen={() => nav(`/s/ipd/${a.id}`)} />)}</div>
          </>}
        </div>
      </div>
    </Page>
  )
}
function CaseRow({ a, onOpen }) {
  const p = useData((d) => d.get('patients', a.patientId))
  return (
    <Card className={cls('p-4 border', a.status === 'completed' ? 'border-ink-200' : 'border-red-200')} onClick={onOpen}>
      <div className="flex items-center gap-3"><span className="h-11 w-11 rounded-xl bg-red-600 text-white grid place-items-center font-extrabold" translate="no">{a.token}</span><PatientLine p={p} className="flex-1" /><Badge color={a.status === 'completed' ? 'green' : a.status === 'in_consultation' ? 'purple' : 'red'}>{a.status === 'completed' ? 'Seen' : a.status === 'in_consultation' ? 'With doctor' : 'Waiting'}</Badge></div>
      <div className="text-sm mt-2"><b translate="no">{a.reason}</b> <span className="text-ink-500">{`· ${doctorName(a.doctorId)} · arrived ${timeAgo(a.arrivedAt)}`}</span></div>
      {p?.incomplete && <div className="text-xs text-amber-700 mt-1">Patient details to be completed</div>}
      <ClinicalAlerts p={p} className="mt-2" />
    </Card>
  )
}
function IpRow({ a, onOpen }) {
  const p = useData((d) => d.get('patients', a.patientId))
  const bed = useData((d) => d.get('beds', a.bedId))
  return <Card className="p-3 flex items-center gap-3" onClick={onOpen}><BedDouble size={18} className="text-brand-600" /><span className="font-semibold flex-1">{p?.name}</span><Badge color="blue">{bed?.label}</Badge><span className="text-xs text-ink-500 truncate max-w-[40%]" translate="no">{a.diagnosis}</span></Card>
}
