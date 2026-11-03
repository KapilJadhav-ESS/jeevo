import { Route, Routes, useNavigate, useParams, NavLink } from 'react-router-dom'
import { Pill, FlaskConical, ClipboardList, Syringe, BedDouble, ChevronRight } from 'lucide-react'
import { Page, Card, Empty, Badge } from '../../components/ui'
import { LabStatus, doctorName } from '../../components/common'
import { PrescriptionView, LabReportView, DischargeView } from '../../components/Documents'
import { useData } from '../../lib/db'
import { fmtDate, cls } from '../../lib/utils'
import { FamilySwitch, useFamily } from './PatientApp'

const TABS = [['prescriptions', 'Prescriptions', Pill], ['reports', 'Reports', FlaskConical], ['history', 'History', ClipboardList], ['vaccinations', 'Vaccines', Syringe]]

function Shell({ children }) {
  return (
    <Page title="Health records" back="/p">
      <FamilySwitch className="mb-3" />
      <div className="grid grid-cols-4 gap-1 p-1 bg-ink-100 rounded-xl mb-4">
        {TABS.map(([to, label, Icon]) => (
          <NavLink key={to} to={`/p/records/${to}`} className={({ isActive }) => cls('h-14 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold', isActive ? 'bg-white shadow-sm text-brand-700' : 'text-ink-500')}><Icon size={18} />{label}</NavLink>
        ))}
      </div>
      {children}
    </Page>
  )
}

function Prescriptions() {
  const nav = useNavigate()
  const { current } = useFamily()
  const rows = useData((d) => d.list('prescriptions', (r) => r.patientId === current?.id && r.status === 'final').sort((a, b) => b.date.localeCompare(a.date)))
  return (
    <Shell>
      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="p-4" onClick={() => nav(`/p/records/prescriptions/${r.id}`)}>
            <div className="flex justify-between gap-3"><div className="min-w-0"><div className="font-bold">{doctorName(r.doctorId)}</div><div className="text-xs text-ink-500">{fmtDate(r.date + 'T00:00:00')} · <span translate="no">{r.rxNo}</span></div></div><ChevronRight className="text-ink-400" /></div>
            <div className="text-sm mt-2 text-ink-700 line-clamp-2" translate="no">{r.items.map((i) => i.name).join(', ') || r.advice}</div>
            {r.diagnosis && <div className="text-xs text-ink-500 mt-1" translate="no">{r.diagnosis}</div>}
          </Card>
        ))}
        {!rows.length && <Empty icon={Pill} title="No prescriptions yet" text="Prescriptions from your doctor will appear here." />}
      </div>
    </Shell>
  )
}

function Reports() {
  const nav = useNavigate()
  const { current } = useFamily()
  const rows = useData((d) => d.list('labOrders', (l) => l.patientId === current?.id && l.status !== 'cancelled').sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  const tests = useData((d) => d.list('labTests'))
  return (
    <Shell>
      <div className="space-y-3">
        {rows.map((l) => (
          <Card key={l.id} className="p-4" onClick={() => nav(`/p/records/reports/${l.id}`)}>
            <div className="flex justify-between gap-3"><div className="font-bold text-sm min-w-0">{l.tests.map((t) => tests.find((x) => x.id === t)?.name).join(', ')}</div><LabStatus s={l.status} patient /></div>
            <div className="text-xs text-ink-500 mt-1">{fmtDate(l.createdAt)} · {doctorName(l.doctorId)}</div>
          </Card>
        ))}
        {!rows.length && <Empty icon={FlaskConical} title="No test reports" />}
      </div>
    </Shell>
  )
}

function History() {
  const nav = useNavigate()
  const { current } = useFamily()
  const cons = useData((d) => d.list('consultations', (c) => c.patientId === current?.id && c.status === 'final').sort((a, b) => b.date.localeCompare(a.date)))
  const adms = useData((d) => d.list('admissions', (a) => a.patientId === current?.id).sort((a, b) => b.admittedAt.localeCompare(a.admittedAt)))
  return (
    <Shell>
      {current && (current.conditions || current.allergies) && (
        <Card className="p-4 mb-3">
          {current.conditions && <div className="text-sm"><span className="text-ink-500">Existing conditions: </span><span className="font-semibold" translate="no">{current.conditions}</span></div>}
          {current.allergies && <div className="text-sm mt-1"><span className="text-ink-500">Allergies: </span><span className="font-semibold text-red-600" translate="no">{current.allergies}</span></div>}
        </Card>
      )}
      {adms.length > 0 && <>
        <h3 className="font-bold mb-2">Hospital stays</h3>
        <div className="space-y-3 mb-5">{adms.map((a) => (
          <Card key={a.id} className="p-4" onClick={() => nav(`/p/records/admission/${a.id}`)}>
            <div className="flex items-center gap-2"><BedDouble size={18} className="text-brand-600" /><span className="font-bold flex-1" translate="no">{a.diagnosis}</span>{a.status === 'admitted' ? <Badge color="amber">Admitted</Badge> : <Badge color="green">Discharged</Badge>}</div>
            <div className="text-xs text-ink-500 mt-1">{fmtDate(a.admittedAt)} – {a.dischargedAt ? fmtDate(a.dischargedAt) : 'now'} · {doctorName(a.doctorId)}</div>
          </Card>))}
        </div>
      </>}
      <h3 className="font-bold mb-2">Previous consultations</h3>
      <div className="space-y-3">
        {cons.map((c) => (
          <Card key={c.id} className="p-4" onClick={() => c.prescriptionId && nav(`/p/records/prescriptions/${c.prescriptionId}`)}>
            <div className="flex justify-between"><span className="font-bold">{doctorName(c.doctorId)}</span><span className="text-xs text-ink-500">{fmtDate(c.date + 'T00:00:00')}</span></div>
            <div className="text-sm mt-1" translate="no">{c.diagnosis || c.complaints}</div>
            {c.followUpDate && <div className="text-xs text-brand-700 font-semibold mt-1">Follow-up: {fmtDate(c.followUpDate + 'T00:00:00')}</div>}
          </Card>
        ))}
        {!cons.length && <Empty title="No consultations yet" />}
      </div>
    </Shell>
  )
}

function Vaccinations() {
  const { current } = useFamily()
  const list = [...(current?.vaccinations || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  return (
    <Shell>
      <Card className="divide-y divide-ink-100">
        {list.map((v, i) => <div key={i} className="flex items-center gap-3 px-4 py-3"><Syringe size={18} className="text-brand-600" /><span className="flex-1 font-semibold" translate="no">{v.name}</span><span className="text-sm text-ink-500">{fmtDate(v.date)}</span></div>)}
        {!list.length && <Empty icon={Syringe} title="No vaccination records" text="Ask the hospital to add your vaccination details." />}
      </Card>
    </Shell>
  )
}

const RxDetail = () => { const { id } = useParams(); const rx = useData((d) => d.get('prescriptions', id)); return <Page title="Prescription" back>{rx ? <PrescriptionView rx={rx} /> : <Empty title="Not found" />}</Page> }
const LabDetail = () => { const { id } = useParams(); const lo = useData((d) => d.get('labOrders', id)); return <Page title="Lab report" back>{lo ? <LabReportView lo={lo} patientView /> : <Empty title="Not found" />}</Page> }
const AdmDetail = () => { const { id } = useParams(); const a = useData((d) => d.get('admissions', id)); return <Page title="Hospital stay" back>{a?.dischargeSummary?.final ? <DischargeView a={a} /> : <Card className="p-5 text-sm text-ink-500 text-center">The discharge summary will be available here after discharge.</Card>}</Page> }

export default function Records() {
  return (
    <Routes>
      <Route index element={<Prescriptions />} />
      <Route path="prescriptions" element={<Prescriptions />} />
      <Route path="prescriptions/:id" element={<RxDetail />} />
      <Route path="reports" element={<Reports />} />
      <Route path="reports/:id" element={<LabDetail />} />
      <Route path="history" element={<History />} />
      <Route path="admission/:id" element={<AdmDetail />} />
      <Route path="vaccinations" element={<Vaccinations />} />
    </Routes>
  )
}
