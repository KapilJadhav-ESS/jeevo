import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartPulse, CheckCircle2, Pill, NotebookPen, Stethoscope } from 'lucide-react'
import { Page, Card, Button, Field, Input, Select, Textarea, Sheet, Badge, Empty, Chips, useToast } from '../../components/ui'
import { PatientLine, ClinicalAlerts, userName } from '../../components/common'
import { VitalsForm, VitalChips } from './Patients'
import { useAuth } from '../../lib/auth'
import { db, useData } from '../../lib/db'
import { completeTask, recordMedication, addAdmissionNote, latestVitals, daysAdmitted } from '../../lib/actions'
import { timeAgo, fmtDateTime, cls } from '../../lib/utils'

export default function Nursing() {
  const nav = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const [ward, setWard] = useState('all')
  const [mine, setMine] = useState(user.role === 'nurse')
  const [sheet, setSheet] = useState(null)
  const [med, setMed] = useState({ medicine: '', dose: '', route: 'Oral', note: '' })
  const [note, setNote] = useState('')
  const wards = useData((d) => d.list('wards'))
  const adms = useData((d) => d.list('admissions', (a) => a.status === 'admitted' && (ward === 'all' || d.get('beds', a.bedId)?.wardId === ward)))
  const tasks = useData((d) => d.list('nursingTasks', (t) => t.status === 'pending' && (!mine || !t.assignedTo || t.assignedTo === user.staffId)).sort((a, b) => a.due.localeCompare(b.due)))
  const now = new Date().toISOString()
  const run = (fn, m) => { try { fn(); toast(m) } catch (e) { toast(e.message, 'error') } }
  return (
    <Page title="Nursing" subtitle={`${adms.length} admitted patients · ${tasks.length} pending tasks`} wide>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Chips value={ward} onChange={setWard} options={[{ value: 'all', label: 'All wards' }, ...wards.map((w) => ({ value: w.id, label: w.name }))]} />
      </div>
      <div className="grid xl:grid-cols-[1fr_420px] gap-4">
        <div className="grid md:grid-cols-2 gap-3 h-fit">
          {adms.map((a) => <PatientCard key={a.id} a={a} tasks={tasks.filter((t) => t.admissionId === a.id)} onAction={(k) => setSheet({ k, a })} onOpen={() => nav(`/s/ipd/${a.id}`)} />)}
          {!adms.length && <Card className="p-2 md:col-span-2"><Empty title="No admitted patients" /></Card>}
        </div>
        <Card className="p-5 h-fit xl:sticky xl:top-24">
          <div className="flex items-center justify-between mb-3"><h3 className="font-bold">Task list</h3><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="h-4 w-4 accent-brand-600" /> Only mine</label></div>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {tasks.map((t) => (
              <div key={t.id} className={cls('rounded-xl border p-3', t.due < now ? 'border-red-200 bg-red-50/50' : 'border-ink-200')}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0"><div className="font-semibold text-sm" translate="no">{t.title}</div><div className="text-xs text-ink-500">{db.get('patients', t.patientId)?.name} · {db.get('beds', db.get('admissions', t.admissionId)?.bedId)?.label} · {t.fromDoctor ? 'Doctor’s instruction' : 'Nursing'}</div><div className={cls('text-xs mt-0.5', t.due < now ? 'text-red-600 font-bold' : 'text-ink-500')}>Due {timeAgo(t.due)}</div></div>
                  <Button size="sm" variant="success" icon={CheckCircle2} onClick={() => run(() => completeTask(t.id), 'Task done')}>Done</Button>
                </div>
              </div>
            ))}
            {!tasks.length && <Empty title="All tasks done 👏" />}
          </div>
        </Card>
      </div>

      <Sheet open={sheet?.k === 'vitals'} onClose={() => setSheet(null)} title={`Vitals – ${db.get('patients', sheet?.a.patientId)?.name || ''}`}>{sheet && <VitalsForm patientId={sheet.a.patientId} admissionId={sheet.a.id} onDone={() => setSheet(null)} />}</Sheet>
      <Sheet open={sheet?.k === 'med'} onClose={() => setSheet(null)} title="Record medication given" footer={<Button block size="lg" onClick={() => run(() => { recordMedication({ patientId: sheet.a.patientId, admissionId: sheet.a.id, ...med }); setMed({ medicine: '', dose: '', route: 'Oral', note: '' }); setSheet(null) }, 'Medication recorded')}>Save</Button>}>
        <Field label="Medicine"><Input value={med.medicine} onChange={(e) => setMed({ ...med, medicine: e.target.value })} placeholder="e.g. Inj. Ceftriaxone" /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Dose"><Input value={med.dose} onChange={(e) => setMed({ ...med, dose: e.target.value })} placeholder="e.g. 1 g" /></Field><Field label="Route"><Select value={med.route} onChange={(e) => setMed({ ...med, route: e.target.value })}>{['Oral', 'IV', 'IM', 'SC', 'Inhalation', 'Topical', 'Other'].map((x) => <option key={x}>{x}</option>)}</Select></Field></div>
        <Field label="Note"><Input value={med.note} onChange={(e) => setMed({ ...med, note: e.target.value })} /></Field>
        <p className="text-xs text-ink-500">Give medicines only as written by the treating doctor. The time and your name are recorded.</p>
      </Sheet>
      <Sheet open={sheet?.k === 'note'} onClose={() => setSheet(null)} title="Nursing note / observation" footer={<Button block size="lg" onClick={() => run(() => { addAdmissionNote(sheet.a.id, 'nursing', note); setNote(''); setSheet(null) }, 'Note saved')}>Save note</Button>}>
        <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Observation, patient complaint, intake/output…" />
      </Sheet>
    </Page>
  )
}

function PatientCard({ a, tasks, onAction, onOpen }) {
  const p = useData((d) => d.get('patients', a.patientId))
  const bed = useData((d) => d.get('beds', a.bedId))
  const v = useData(() => latestVitals(a.patientId))
  const lastDoc = [...(a.notes || [])].reverse().find((n) => n.kind !== 'nursing')
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="h-11 min-w-[44px] px-1 rounded-xl bg-brand-600 text-white grid place-items-center text-xs font-extrabold" translate="no">{bed?.label}</span>
        <button onClick={onOpen} className="flex-1 min-w-0 text-left"><div className="font-bold truncate">{p?.name}</div><div className="text-xs text-ink-500 truncate"><span translate="no">{a.diagnosis}</span> · Day {daysAdmitted(a)}</div></button>
        {tasks.length > 0 && <Badge color="amber">{`${tasks.length} task(s)`}</Badge>}
      </div>
      <ClinicalAlerts p={p} className="mt-2" />
      {v && <div className="mt-2"><div className="text-[11px] text-ink-400 mb-1">Last vitals {timeAgo(v.at)}</div><VitalChips v={v.values} /></div>}
      {lastDoc && <div className="mt-2 rounded-xl bg-violet-50 p-2 text-xs"><span className="font-bold flex items-center gap-1"><Stethoscope size={12} /> Doctor’s instructions · {fmtDateTime(lastDoc.at)}</span><span className="line-clamp-2" translate="no">{lastDoc.text}</span></div>}
      <div className="grid grid-cols-3 gap-1.5 mt-3">
        <Button size="sm" variant="secondary" icon={HeartPulse} onClick={() => onAction('vitals')}>Vitals</Button>
        <Button size="sm" variant="secondary" icon={Pill} onClick={() => onAction('med')}>Medicine</Button>
        <Button size="sm" variant="secondary" icon={NotebookPen} onClick={() => onAction('note')}>Note</Button>
      </div>
    </Card>
  )
}
