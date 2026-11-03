// Doctor's consultation screen: patient summary and history on the left,
// vitals, notes, prescription and test orders on the right.
// The app never suggests diagnoses, medicines or doses – the doctor decides.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2, Copy, CheckCircle2, FlaskConical, Video, BedDouble, Save, Printer, History, FileSignature } from 'lucide-react'
import { Page, Card, Button, Field, Input, Select, Textarea, Badge, Empty, Sheet, Tabs, useToast, useConfirm } from '../../components/ui'
import { ClinicalAlerts, LabStatus, doctorName } from '../../components/common'
import { PrescriptionView, LabReportView } from '../../components/Documents'
import { VitalChips } from './Patients'
import { useAuth } from '../../lib/auth'
import { db, useData } from '../../lib/db'
import { openConsultation, saveConsultation, finaliseConsultation, savePrescription, amendPrescription, orderTests, addAddendum, FREQUENCIES, TIMINGS, VITAL_FIELDS, VITAL_NORMAL, APPT_TYPES } from '../../lib/actions'
import { ageSex, addDays, bmi, fmtDate, fmtDateTime, today, cls, fmtPhone } from '../../lib/utils'
import { LANGS } from '../../i18n'

const perDay = (f) => (/^\d(-\d)+$/.test(f) ? f.split('-').reduce((a, b) => a + Number(b), 0) : f === 'weekly' ? 1 / 7 : 0)
const days = (s) => Number(String(s).match(/\d+/)?.[0] || 0) * (/week/i.test(s) ? 7 : /month/i.test(s) ? 30 : 1)
const autoQty = (it) => (/tablet|capsule/i.test(it.form || '') && perDay(it.frequency) && days(it.duration) ? Math.ceil(perDay(it.frequency) * days(it.duration) * (parseFloat(it.dose) || 1)) : it.qty || 1)

function MedicineSearch({ onPick }) {
  const [q, setQ] = useState('')
  const meds = useData((d) => (q.length >= 2 ? d.list('medicines', (m) => m.active && (m.name + ' ' + m.generic).toLowerCase().includes(q.toLowerCase())).slice(0, 8) : []))
  const pick = (m) => { onPick(m); setQ('') }
  return (
    <div className="relative">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type medicine (brand or generic) to add…" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (meds[0]) pick(meds[0]); else if (q.trim()) pick({ name: q.trim() }) } }} />
      {q.length >= 2 && (
        <div className="absolute z-20 top-[52px] inset-x-0 bg-white rounded-2xl shadow-2xl border border-ink-100 p-1.5 max-h-80 overflow-y-auto">
          {meds.map((m) => (
            <button key={m.id} type="button" onClick={() => pick(m)} className="w-full text-left px-3 py-2 rounded-xl hover:bg-ink-100">
              <div className="font-semibold text-sm" translate="no">{m.name} <span className="text-ink-500 font-medium">{m.strength} · {m.form}</span></div>
              <div className="text-xs text-ink-500" translate="no">{m.generic}</div>
            </button>
          ))}
          <button type="button" onClick={() => pick({ name: q.trim() })} className="w-full text-left px-3 py-2 rounded-xl hover:bg-ink-100 text-sm text-brand-700 font-semibold">+ Add “{q.trim()}” (not in catalogue)</button>
        </div>
      )}
    </div>
  )
}

function RxEditor({ items, setItems, allergies }) {
  const upd = (i, patch) => setItems(items.map((x, j) => (j === i ? { ...x, ...patch, qty: patch.qty ?? autoQty({ ...x, ...patch }) } : x)))
  const add = (m) => setItems([...items, { medicineId: m.id || '', name: m.name, generic: m.generic || '', strength: m.strength || '', form: m.form || '', dose: /syrup/i.test(m.form || '') ? '5 ml' : '1 tablet', frequency: '', duration: '', timing: 'after_food', instructions: '', qty: 1 }])
  const allergyHit = (it) => allergies && allergies.toLowerCase().split(/[,;]/).map((s) => s.trim()).filter(Boolean).some((a) => (it.name + ' ' + it.generic).toLowerCase().includes(a.toLowerCase()))
  return (
    <div>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className={cls('rounded-2xl border p-3', allergyHit(it) ? 'border-red-400 bg-red-50' : 'border-ink-200')}>
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0"><div className="font-bold" translate="no">{i + 1}. {it.name} <span className="text-ink-500 font-semibold">{it.strength}</span></div><div className="text-xs text-ink-500" translate="no">{it.generic} {it.form && `· ${it.form}`}</div>
                {allergyHit(it) && <div className="text-xs font-bold text-red-700 mt-1">⚠ Patient is recorded as allergic to: {allergies}</div>}
              </div>
              <button type="button" aria-label="Remove medicine" onClick={() => setItems(items.filter((_, j) => j !== i))} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-white text-ink-500"><Trash2 size={16} /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
              <Input className="!h-10" placeholder="Dose" value={it.dose} onChange={(e) => upd(i, { dose: e.target.value })} aria-label="Dose" />
              <Select className="!h-10" value={it.frequency} onChange={(e) => upd(i, { frequency: e.target.value })} aria-label="Frequency"><option value="">Frequency…</option>{Object.entries(FREQUENCIES).map(([k, v]) => <option key={k} value={k}>{k} · {v.en}</option>)}</Select>
              <Input className="!h-10" placeholder="Duration e.g. 5 days" value={it.duration} onChange={(e) => upd(i, { duration: e.target.value })} aria-label="Duration" list="durations" />
              <Select className="!h-10" value={it.timing} onChange={(e) => upd(i, { timing: e.target.value })} aria-label="When">{Object.entries(TIMINGS).map(([k, v]) => <option key={k} value={k}>{v.en}</option>)}</Select>
              <Input className="!h-10" inputMode="numeric" placeholder="Qty" value={it.qty} onChange={(e) => upd(i, { qty: Number(e.target.value.replace(/\D/g, '')) || '' })} aria-label="Quantity" />
            </div>
            <Input className="!h-10 mt-2" placeholder="Special instructions (optional)" value={it.instructions} onChange={(e) => upd(i, { instructions: e.target.value })} />
          </div>
        ))}
      </div>
      <datalist id="durations">{['3 days', '5 days', '7 days', '10 days', '15 days', '1 month', '3 months', 'Continue'].map((x) => <option key={x} value={x} />)}</datalist>
      <div className="mt-3"><MedicineSearch onPick={add} /></div>
    </div>
  )
}

export default function Consult() {
  const { apptId } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const ask = useConfirm()
  const { user } = useAuth()
  const a = useData((d) => d.get('appointments', apptId))
  const p = useData((d) => a && d.get('patients', a.patientId))
  const mine = a?.doctorId === user.staffId
  const [cid, setCid] = useState(null)
  useEffect(() => {
    if (!a) return
    const existing = db.find('consultations', (c) => c.apptId === a.id)
    if (existing) setCid(existing.id)
    else if (mine && a.status !== 'cancelled') { try { setCid(openConsultation(a.id).id) } catch (e) { toast(e.message, 'error') } }
  }, [a?.id])
  const c = useData((d) => cid && d.get('consultations', cid))
  const rx = useData((d) => c?.prescriptionId && d.get('prescriptions', c.prescriptionId))
  const labs = useData((d) => d.list('labOrders', (l) => c?.labOrderIds?.includes(l.id)))
  const tests = useData((d) => d.list('labTests', (t) => t.active))
  const prev = useData((d) => d.list('consultations', (x) => x.patientId === a?.patientId && x.status === 'final' && x.id !== cid).sort((x, y) => y.date.localeCompare(x.date)))
  const prevRx = useData((d) => d.list('prescriptions', (r) => r.patientId === a?.patientId && r.status === 'final' && r.id !== c?.prescriptionId).sort((x, y) => y.date.localeCompare(x.date)))
  const prevLabs = useData((d) => d.list('labOrders', (l) => l.patientId === a?.patientId && !c?.labOrderIds?.includes(l.id)).sort((x, y) => y.createdAt.localeCompare(x.createdAt)))
  const adms = useData((d) => d.list('admissions', (x) => x.patientId === a?.patientId))

  const [f, setF] = useState(null)
  const [items, setItems] = useState([])
  const [rxMeta, setRxMeta] = useState({ advice: '', diet: '', patientNote: '', patientLang: '' })
  const [labSel, setLabSel] = useState([])
  const [labPri, setLabPri] = useState('routine')
  const [view, setView] = useState(null)
  const [histTab, setHistTab] = useState('visits')
  const loaded = useRef(false)
  useEffect(() => {
    if (c && !loaded.current) {
      loaded.current = true
      setF({ vitals: c.vitals || {}, complaints: c.complaints, symptoms: c.symptoms, duration: c.duration, exam: c.exam, diagnosis: c.diagnosis, plan: c.plan, followUpNote: c.followUpNote || '', followUpDate: c.followUpDate || '' })
      const r = c.prescriptionId && db.get('prescriptions', c.prescriptionId)
      if (r) { setItems(r.items || []); setRxMeta({ advice: r.advice || '', diet: r.diet || '', patientNote: r.patientNote || '', patientLang: r.patientLang || p?.lang || 'en' }) } else setRxMeta((m) => ({ ...m, patientLang: p?.lang || 'en' }))
    }
  }, [c?.id])

  // autosave notes as a draft (never finalised automatically)
  useEffect(() => {
    if (!f || !c || c.status === 'final' || !mine) return
    const t = setTimeout(() => { try { saveConsultation(c.id, f) } catch { /* shown on finish */ } }, 800)
    return () => clearTimeout(t)
  }, [f])

  if (!a || !p) return <Page title="Consultation" back><Empty title="Appointment not found" /></Page>
  const final = c?.status === 'final'
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setV = (k) => (e) => setF({ ...f, vitals: { ...f.vitals, [k]: e.target.value.replace(/[^\d.]/g, '') } })
  const v = f?.vitals || {}

  const saveRx = (finalise) => savePrescription({ id: rx && rx.status === 'draft' ? rx.id : undefined, consultationId: c.id, patientId: p.id, items, diagnosis: f.diagnosis, ...rxMeta, followUpDate: f.followUpDate }, finalise)
  const finish = async () => {
    try {
      saveConsultation(c.id, f)
      if (items.length || rxMeta.advice) {
        if (!(await ask({ title: 'Sign prescription and finish?', text: `${items.length} medicine(s). Signed prescriptions cannot be edited – only corrected with a new version.`, ok: 'Sign & finish' }))) return
        saveRx(true)
      }
      finaliseConsultation(c.id)
      toast('Consultation completed')
      nav('/s/opd')
    } catch (e) { toast(e.message, 'error') }
  }
  const order = () => {
    try { orderTests({ patientId: p.id, tests: labSel, consultationId: c.id, priority: labPri, bill: true }); setLabSel([]); toast('Tests ordered · sent to lab & billing') } catch (e) { toast(e.message, 'error') }
  }
  const copyRx = (r) => { setItems(r.items.map((x) => ({ ...x }))); setRxMeta({ ...rxMeta, advice: r.advice || '', diet: r.diet || '' }); toast('Copied – please review every medicine before signing', 'info') }

  return (
    <Page title={`Token ${a.token} · ${p.name}`} subtitle={`${APPT_TYPES[a.type]} · ${fmtDate(a.date + 'T00:00:00')}`} back="/s/opd" wide actions={<div className="flex gap-2">
      {a.type === 'online' && a.meetLink && <a href={a.meetLink} target="_blank" rel="noreferrer" className="h-11 px-4 rounded-xl bg-sky-600 text-white font-semibold flex items-center gap-2"><Video size={18} /> Join video</a>}
      {mine && !final && <Button size="lg" variant="success" icon={CheckCircle2} onClick={finish}>Finish & sign</Button>}
    </div>}>
      <div className="grid xl:grid-cols-[340px_1fr] gap-4">
        {/* ---------- left: patient ---------- */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="text-lg font-extrabold">{p.name}</div>
            <div className="text-sm text-ink-500"><span translate="no">{p.pid}</span> · {ageSex(p)} · <span translate="no">{fmtPhone(p.phone)}</span></div>
            <ClinicalAlerts p={p} className="mt-3" />
            {a.priority === 'emergency' && <div className="mt-3 rounded-xl bg-red-50 text-red-700 text-sm font-bold px-3 py-2">Emergency · {a.reason}</div>}
            {a.reason && a.priority !== 'emergency' && <div className="mt-3 text-sm"><span className="text-ink-500">Reason: </span><span translate="no">{a.reason}</span></div>}
            <div className="flex gap-2 mt-3"><Button size="sm" variant="outline" onClick={() => nav(`/s/patients/${p.id}`)}>Full record</Button><Button size="sm" variant="outline" icon={BedDouble} onClick={() => nav(`/s/ipd/admit?patient=${p.id}&doctor=${a.doctorId}`)}>Admit</Button></div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 font-bold mb-3"><History size={18} /> Previous records</div>
            <Tabs value={histTab} onChange={setHistTab} className="mb-3" tabs={[{ value: 'visits', label: `Visits ${prev.length}` }, { value: 'rx', label: `Rx ${prevRx.length}` }, { value: 'labs', label: `Labs ${prevLabs.length}` }, { value: 'ipd', label: `IPD ${adms.length}` }]} />
            <div className="space-y-2 max-h-[520px] overflow-y-auto">
              {histTab === 'visits' && prev.map((x) => <div key={x.id} className="rounded-xl bg-ink-100/60 p-3 text-sm"><div className="flex justify-between text-xs text-ink-500"><span>{fmtDate(x.date + 'T00:00:00')}</span><span>{doctorName(x.doctorId)}</span></div><div className="font-semibold mt-1" translate="no">{x.diagnosis || x.complaints}</div>{x.vitals && <div className="mt-1"><VitalChips v={x.vitals} /></div>}{x.plan && <div className="text-xs text-ink-500 mt-1" translate="no">{x.plan}</div>}</div>)}
              {histTab === 'rx' && prevRx.map((r) => <div key={r.id} className="rounded-xl bg-ink-100/60 p-3 text-sm"><div className="flex justify-between text-xs text-ink-500"><span>{fmtDate(r.date + 'T00:00:00')}</span><span>{doctorName(r.doctorId)}</span></div><div className="mt-1" translate="no">{r.items.map((i) => `${i.name} ${i.frequency}`).join(', ')}</div><div className="flex gap-1 mt-2"><Button size="sm" variant="ghost" onClick={() => setView({ rx: r })}>View</Button>{mine && !final && <Button size="sm" variant="ghost" icon={Copy} onClick={() => copyRx(r)}>Repeat</Button>}</div></div>)}
              {histTab === 'labs' && prevLabs.map((l) => <button key={l.id} onClick={() => setView({ lab: l })} className="w-full text-left rounded-xl bg-ink-100/60 p-3 text-sm"><div className="flex justify-between gap-2"><span className="font-semibold">{l.tests.map((t) => db.get('labTests', t)?.code).join(', ')}</span><LabStatus s={l.status} /></div><div className="text-xs text-ink-500">{fmtDate(l.createdAt)}</div></button>)}
              {histTab === 'ipd' && adms.map((x) => <button key={x.id} onClick={() => nav(`/s/ipd/${x.id}`)} className="w-full text-left rounded-xl bg-ink-100/60 p-3 text-sm"><div className="font-semibold" translate="no">{x.diagnosis}</div><div className="text-xs text-ink-500">{fmtDate(x.admittedAt)} – {x.dischargedAt ? fmtDate(x.dischargedAt) : 'admitted'}</div></button>)}
              {((histTab === 'visits' && !prev.length) || (histTab === 'rx' && !prevRx.length) || (histTab === 'labs' && !prevLabs.length) || (histTab === 'ipd' && !adms.length)) && <p className="text-sm text-ink-400 text-center py-4">Nothing yet</p>}
            </div>
          </Card>
        </div>

        {/* ---------- right: this visit ---------- */}
        {!f ? <Card className="p-2"><Empty title={mine ? 'Opening…' : 'No consultation notes for this visit'} /></Card> : (
          <div className="space-y-4 min-w-0">
            {!mine && <div className="rounded-xl bg-amber-50 text-amber-800 text-sm font-semibold px-4 py-2">Read only – this visit belongs to {doctorName(a.doctorId)}.</div>}
            <fieldset disabled={final || !mine} className="space-y-4 min-w-0">
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3"><h3 className="font-bold">Vital signs</h3>{v.height && v.weight && <Badge color="blue">BMI {bmi(v.height, v.weight)}</Badge>}</div>
                <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-9 gap-2">
                  {VITAL_FIELDS.map(([k, label, unit]) => {
                    const n = VITAL_NORMAL[k], val = Number(v[k])
                    const out = v[k] !== '' && v[k] != null && n && (val < n[0] || val > n[1])
                    return <label key={k} className="block"><span className="block text-[11px] font-semibold text-ink-500 mb-1 truncate">{label} <span className="text-ink-400">{unit}</span></span><Input inputMode="decimal" className={cls('!h-10 text-center font-semibold', out && '!border-amber-400 !bg-amber-50')} value={v[k] ?? ''} onChange={setV(k)} /></label>
                  })}
                </div>
              </Card>
              <Card className="p-5">
                <h3 className="font-bold mb-3">Clinical notes</h3>
                <div className="grid md:grid-cols-3 gap-x-3">
                  <Field label="Chief complaints" className="md:col-span-2"><Input value={f.complaints} onChange={set('complaints')} /></Field>
                  <Field label="Duration"><Input value={f.duration} onChange={set('duration')} placeholder="e.g. 3 days" /></Field>
                </div>
                <Field label="Symptoms"><Textarea rows={2} value={f.symptoms} onChange={set('symptoms')} /></Field>
                <Field label="Clinical examination"><Textarea rows={2} value={f.exam} onChange={set('exam')} /></Field>
                <Field label="Diagnosis"><Input value={f.diagnosis} onChange={set('diagnosis')} /></Field>
                <Field label="Treatment plan"><Textarea rows={2} value={f.plan} onChange={set('plan')} /></Field>
                <div className="grid md:grid-cols-[1fr_220px] gap-x-3">
                  <Field label="Follow-up instructions"><Input value={f.followUpNote} onChange={set('followUpNote')} /></Field>
                  <Field label="Follow-up date"><Input type="date" min={today()} value={f.followUpDate} onChange={set('followUpDate')} /></Field>
                </div>
                <div className="flex gap-2 -mt-2">{[7, 14, 30].map((n) => <button key={n} type="button" onClick={() => setF({ ...f, followUpDate: addDays(today(), n) })} className="h-8 px-3 rounded-full bg-ink-100 text-xs font-semibold">{`+${n} days`}</button>)}</div>
                {!final && mine && <p className="text-[11px] text-ink-400 mt-3 flex items-center gap-1"><Save size={12} /> Draft saved automatically</p>}
              </Card>
            </fieldset>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-3"><h3 className="font-bold flex items-center gap-2"><span className="text-xl text-brand-600">℞</span> Prescription</h3>{rx && <Badge color={rx.status === 'final' ? 'green' : 'amber'}>{rx.status === 'final' ? 'Signed' : 'Draft'}</Badge>}</div>
              {rx?.status === 'final' ? (
                <>
                  <PrescriptionView rx={rx} />
                  {mine && <Button variant="ghost" size="sm" icon={FileSignature} className="mt-2" onClick={async () => { const r = await ask({ title: 'Correct this prescription?', text: 'A new version will replace it. Both stay in the record.', input: 'Reason for the change', ok: 'Create corrected version' }); if (r) { try { const n = amendPrescription(rx.id, r); setItems(n.items); toast('Edit the new version and sign again', 'info') } catch (e) { toast(e.message, 'error') } } }}>Correct prescription</Button>}
                </>
              ) : mine && (!final || rx?.replaces) ? (
                <>
                  {rx?.replaces && <div className="rounded-xl bg-amber-50 text-amber-800 text-sm font-semibold px-3 py-2 mb-3">Corrected version of an earlier prescription – review and sign.</div>}
                  <RxEditor items={items} setItems={setItems} allergies={p.allergies} />
                  <div className="grid md:grid-cols-2 gap-x-3 mt-4">
                    <Field label="Advice"><Textarea rows={2} value={rxMeta.advice} onChange={(e) => setRxMeta({ ...rxMeta, advice: e.target.value })} /></Field>
                    <Field label="Diet instructions"><Textarea rows={2} value={rxMeta.diet} onChange={(e) => setRxMeta({ ...rxMeta, diet: e.target.value })} /></Field>
                  </div>
                  <div className="grid md:grid-cols-[1fr_200px] gap-x-3">
                    <Field label="Note for patient (any language)" hint="e.g. instructions in Hindi or Marathi"><Input value={rxMeta.patientNote} onChange={(e) => setRxMeta({ ...rxMeta, patientNote: e.target.value })} /></Field>
                    <Field label="Print instructions also in"><Select value={rxMeta.patientLang} onChange={(e) => setRxMeta({ ...rxMeta, patientLang: e.target.value })} translate="no">{LANGS.map((l) => <option key={l.code} value={l.code}>{l.code === 'en' ? 'English only' : l.label}</option>)}</Select></Field>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" icon={Printer} onClick={() => { try { const r = saveRx(false); setView({ rx: r }) } catch (e) { toast(e.message, 'error') } }}>Preview</Button>
                    <Button variant="outline" icon={Save} onClick={() => { try { saveRx(false); toast('Prescription draft saved') } catch (e) { toast(e.message, 'error') } }}>Save draft</Button>
                    {final && <Button icon={FileSignature} onClick={async () => { if (await ask({ title: 'Sign corrected prescription?', ok: 'Sign' })) { try { saveRx(true); toast('Corrected prescription signed') } catch (e) { toast(e.message, 'error') } } }}>Sign corrected prescription</Button>}
                  </div>
                </>
              ) : <p className="text-sm text-ink-500">No prescription for this visit.</p>}
            </Card>

            <Card className="p-5">
              <h3 className="font-bold flex items-center gap-2 mb-3"><FlaskConical size={18} /> Diagnostic tests</h3>
              {labs.map((l) => <div key={l.id} className="flex items-center justify-between gap-2 py-2 border-b border-ink-100 text-sm"><span className="font-semibold">{l.tests.map((t) => db.get('labTests', t)?.name).join(', ')}</span><LabStatus s={l.status} /></div>)}
              {mine && a.status !== 'cancelled' && <>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tests.map((t) => <button key={t.id} type="button" onClick={() => setLabSel(labSel.includes(t.id) ? labSel.filter((x) => x !== t.id) : [...labSel, t.id])} className={cls('h-8 px-3 rounded-full text-xs font-semibold border', labSel.includes(t.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-ink-200')} title={t.name}>{t.code}</button>)}
                </div>
                {labSel.length > 0 && <div className="flex flex-wrap items-center gap-2 mt-3"><span className="text-sm text-ink-500 flex-1">{labSel.map((x) => db.get('labTests', x)?.name).join(', ')}</span><Select className="!h-10 w-36" value={labPri} onChange={(e) => setLabPri(e.target.value)}><option value="routine">Routine</option><option value="urgent">Urgent</option></Select><Button onClick={order}>Order {labSel.length} test(s)</Button></div>}
              </>}
            </Card>

            {final && mine && <Addendum c={c} />}
            {final && c.addenda?.length > 0 && !mine && <Card className="p-4">{c.addenda.map((x, i) => <p key={i} className="text-sm"><b>{fmtDateTime(x.at)}:</b> {x.text}</p>)}</Card>}
          </div>
        )}
      </div>

      <Sheet open={!!view} onClose={() => setView(null)} title={view?.rx ? 'Prescription' : 'Lab report'} wide full>
        {view?.rx && <PrescriptionView rx={db.get('prescriptions', view.rx.id) || view.rx} />}
        {view?.lab && <LabReportView lo={view.lab} />}
      </Sheet>
    </Page>
  )
}

function Addendum({ c }) {
  const toast = useToast()
  const [t, setT] = useState('')
  return (
    <Card className="p-5">
      <h3 className="font-bold mb-2">Addendum</h3>
      <p className="text-xs text-ink-500 mb-3">Finalised notes cannot be changed. Add a dated addendum instead.</p>
      {(c.addenda || []).map((x, i) => <p key={i} className="text-sm mb-1"><b>{fmtDateTime(x.at)}:</b> <span translate="no">{x.text}</span></p>)}
      <div className="flex gap-2 mt-2"><Input value={t} onChange={(e) => setT(e.target.value)} placeholder="Add a note" /><Button onClick={() => { try { addAddendum(c.id, t); setT('') } catch (e) { toast(e.message, 'error') } }}>Add</Button></div>
    </Card>
  )
}
