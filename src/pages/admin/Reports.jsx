import { useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { Page, Card, Button, Input, Stat, Tabs, Table, SearchBox, Select } from '../../components/ui'
import { ColumnChart, BarList, Ring } from '../../components/Charts'
import { db, useData } from '../../lib/db'
import { balanceOf, stockOf, ITEM_TYPES, PAY_METHODS, APPT_STATUS, LAB_STATUS } from '../../lib/actions'
import { addDays, today, inr, downloadCSV, fmtShort, fmtDateTime, ageSex } from '../../lib/utils'
import { useAuth } from '../../lib/auth'
import { unitOf, UNITS } from '../../lib/rbac'

const unitIs = (unit) => (r) => !unit || (r.unit || 'hospital') === unit
// null = platform admin (all units); otherwise the owner's own unit only
const useUnit = () => { const { user } = useAuth(); return user.role === 'super_admin' ? null : unitOf(user) }

const inRange = (iso, from, to) => iso && iso.slice(0, 10) >= from && iso.slice(0, 10) <= to
const pname = (id) => db.get('patients', id)?.name || ''
const dname = (id) => db.get('staff', id)?.name || ''

function useReport(from, to, unit) {
  return useData((d) => {
    const pays = d.list('payments', (p) => inRange(p.at, from, to) && unitIs(unit)(p))
    const bills = d.list('bills', (b) => b.status !== 'cancelled' && inRange(b.createdAt, from, to) && unitIs(unit)(b))
    const appts = d.list('appointments', (a) => a.date >= from && a.date <= to)
    const days = []
    for (let x = from; x <= to && days.length < 62; x = addDays(x, 1)) days.push(x)
    const byCat = {}, byDept = {}, byDoc = {}, byMethod = {}
    bills.forEach((b) => b.items.forEach((i) => { const v = i.qty * i.rate - (i.discount || 0); byCat[i.type] = (byCat[i.type] || 0) + v }))
    bills.filter((b) => b.doctorId || b.apptId).forEach((b) => { const doc = b.doctorId || d.get('appointments', b.apptId)?.doctorId; const dep = d.get('staff', doc)?.deptId; byDoc[doc] = (byDoc[doc] || 0) + b.total; byDept[dep] = (byDept[dep] || 0) + b.total })
    bills.filter((b) => b.labOrderId).forEach((b) => { const k = (b.unit || 'hospital') === 'lab' ? 'dep-lab' : 'dep-cardio'; byDept[k] = (byDept[k] || 0) + b.total })
    pays.forEach((p) => { byMethod[p.method] = (byMethod[p.method] || 0) + p.amount })
    const done = appts.filter((a) => a.status === 'completed')
    const waits = done.filter((a) => a.arrivedAt && a.startedAt).map((a) => (new Date(a.startedAt) - new Date(a.arrivedAt)) / 60000).filter((x) => x >= 0 && x < 600)
    const durs = done.filter((a) => a.startedAt && a.completedAt).map((a) => (new Date(a.completedAt) - new Date(a.startedAt)) / 60000).filter((x) => x >= 0 && x < 240)
    const beds = d.list('beds')
    return {
      pays, bills, appts,
      series: days.map((x) => ({ label: fmtShort(x + 'T00:00:00').split(' ')[0], value: pays.filter((p) => p.at.startsWith(x)).reduce((s, p) => s + p.amount, 0) })),
      collected: pays.reduce((s, p) => s + p.amount, 0), billed: bills.reduce((s, b) => s + b.total, 0),
      outstanding: d.list('bills', (b) => b.status !== 'cancelled' && unitIs(unit)(b)).reduce((s, b) => s + Math.max(0, balanceOf(b)), 0),
      byCat: Object.entries(byCat).map(([k, v]) => ({ label: ITEM_TYPES[k] || k, value: v })).sort((a, b) => b.value - a.value),
      byDept: Object.entries(byDept).map(([k, v]) => ({ label: d.get('departments', k)?.name || 'Other', value: v })).sort((a, b) => b.value - a.value),
      byDoc: Object.entries(byDoc).map(([k, v]) => ({ label: dname(k) || 'Other', value: v })).sort((a, b) => b.value - a.value),
      byMethod: Object.entries(byMethod).map(([k, v]) => ({ label: PAY_METHODS[k] || k, value: v })).sort((a, b) => b.value - a.value),
      util: appts.length ? done.length / appts.filter((a) => a.status !== 'cancelled').length : 0,
      noShow: appts.filter((a) => a.status === 'no_show').length,
      avgWait: waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0,
      avgDur: durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : 0,
      occupancy: beds.length ? beds.filter((b) => b.status === 'occupied').length / beds.length : 0,
      docPerf: d.list('staff', (s) => s.role === 'doctor' && !s.noOpd).map((s) => { const mine = appts.filter((a) => a.doctorId === s.id); const fb = d.list('feedback', (f) => f.doctorId === s.id); return { s, total: mine.length, seen: mine.filter((a) => a.status === 'completed').length, noshow: mine.filter((a) => a.status === 'no_show').length, rating: fb.length ? (fb.reduce((x, f) => x + f.ratings.doctor, 0) / fb.length).toFixed(1) : '—', revenue: byDoc[s.id] || 0 } })
    }
  })
}

const EXPORTS = [ // [name, builder, units that may export it]
  ['Patient registrations', ['hospital'], (from, to) => [['Patient ID', 'Name', 'Age/Sex', 'Mobile', 'City', 'Registered'], ...db.list('patients', (p) => inRange(p.createdAt, from, to)).map((p) => [p.pid, p.name, ageSex(p), p.phone, p.city, p.createdAt.slice(0, 10)])]],
  ['Appointments', ['hospital'], (from, to) => [['Appt ID', 'Date', 'Time', 'Token', 'Patient', 'Doctor', 'Type', 'Status', 'Fee', 'Source'], ...db.list('appointments', (a) => a.date >= from && a.date <= to).map((a) => [a.apptNo, a.date, a.time, a.token, pname(a.patientId), dname(a.doctorId), a.type, APPT_STATUS[a.status], a.fee, a.source])]],
  ['Revenue (payments)', ['hospital', 'pharmacy', 'lab'], (from, to, unit) => [['Receipt', 'Date', 'Bill', 'Patient', 'Method', 'Reference', 'Amount', 'Type'], ...db.list('payments', (p) => inRange(p.at, from, to) && unitIs(unit)(p)).map((p) => [p.receiptNo, p.at.slice(0, 16).replace('T', ' '), db.get('bills', p.billId)?.billNo, pname(p.patientId), PAY_METHODS[p.method], p.ref, p.amount, p.kind])]],
  ['Bills & outstanding', ['hospital', 'pharmacy', 'lab'], (from, to, unit) => [['Bill', 'Date', 'Patient', 'Total', 'Paid', 'Refunded', 'Balance', 'Status'], ...db.list('bills', (b) => inRange(b.createdAt, from, to) && unitIs(unit)(b)).map((b) => [b.billNo, b.date, pname(b.patientId), b.total, b.paid, b.refunded || 0, balanceOf(b), b.status])]],
  ['Doctor performance', ['hospital'], (from, to) => [['Doctor', 'Appointments', 'Seen', 'No-show', 'Avg rating'], ...db.list('staff', (s) => s.role === 'doctor').map((s) => { const m = db.list('appointments', (a) => a.doctorId === s.id && a.date >= from && a.date <= to); const fb = db.list('feedback', (f) => f.doctorId === s.id); return [s.name, m.length, m.filter((a) => a.status === 'completed').length, m.filter((a) => a.status === 'no_show').length, fb.length ? (fb.reduce((x, f) => x + f.ratings.doctor, 0) / fb.length).toFixed(1) : ''] })]],
  ['Laboratory', ['lab', 'hospital'], (from, to, unit) => [['Order', 'Date', 'Patient', 'Referred by', 'Tests', 'Status', 'Verified by'], ...db.list('labOrders', (l) => inRange(l.createdAt, from, to) && (!unit || (l.unit || 'lab') === unit)).map((l) => [l.orderNo, l.createdAt.slice(0, 10), pname(l.patientId), dname(l.doctorId) || l.referredBy || '', l.tests.map((t) => db.get('labTests', t)?.code).join(' '), LAB_STATUS[l.status], db.getAny('users', l.verifiedBy)?.name || ''])]],
  ['Pharmacy inventory', ['pharmacy'], () => [['Medicine', 'Generic', 'Strength', 'Stock', 'Min', 'MRP', 'Nearest expiry'], ...db.list('medicines').map((m) => [m.name, m.generic, m.strength, stockOf(m), m.minStock, m.mrp, [...m.batches].filter((b) => b.qty).sort((a, b) => a.expiry.localeCompare(b.expiry))[0]?.expiry || ''])]],
  ['Admissions & discharges', ['hospital'], (from, to) => [['IP No.', 'Patient', 'Doctor', 'Bed', 'Admitted', 'Discharged', 'Diagnosis', 'Status'], ...db.list('admissions', (a) => inRange(a.admittedAt, from, to) || inRange(a.dischargedAt, from, to)).map((a) => [a.admNo, pname(a.patientId), dname(a.doctorId), db.get('beds', a.bedId)?.label, a.admittedAt.slice(0, 10), a.dischargedAt?.slice(0, 10) || '', a.diagnosis, a.status])]]
]

function Audit() {
  const unit = useUnit()
  const [q, setQ] = useState('')
  const [ent, setEnt] = useState('all')
  const rows = useData((d) => d.list('audit', (a) => unitIs(unit)(a) && (ent === 'all' || a.entity === ent) && (!q || (a.userName + a.summary + a.action).toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 300))
  const ents = useData((d) => [...new Set(d.list('audit').map((a) => a.entity))])
  return (
    <Page title="Audit log" subtitle="Every change to patient records, prescriptions, clinical notes and billing" wide actions={<Button variant="outline" icon={Download} onClick={() => downloadCSV(`audit-${today()}.csv`, [['When', 'User', 'Role', 'Action', 'Record', 'ID', 'Details'], ...rows.map((a) => [a.at, a.userName, a.role, a.action, a.entity, a.entityId, a.summary])])}>Export</Button>}>
      <div className="flex flex-col md:flex-row gap-3 mb-3"><SearchBox value={q} onChange={setQ} placeholder="Search user or action" className="flex-1" /><Select className="md:w-56" value={ent} onChange={(e) => setEnt(e.target.value)}><option value="all">All records</option>{ents.map((e) => <option key={e}>{e}</option>)}</Select></div>
      <Table rows={rows} columns={[{ label: 'When', render: (a) => fmtDateTime(a.at), nowrap: true }, { label: 'User', render: (a) => <b>{a.userName}</b> }, { label: 'Action', key: 'action' }, { label: 'Record', key: 'entity', hideMobile: true }, { label: 'Details', render: (a) => <span className="text-sm" translate="no">{a.summary}</span> }]} />
    </Page>
  )
}

export default function Reports({ audit }) {
  const [from, setFrom] = useState(addDays(today(), -29))
  const [to, setTo] = useState(today())
  const [tab, setTab] = useState('finance')
  const unit = useUnit()
  const r = useReport(from, to, unit)
  if (audit) return <Audit />
  return (
    <Page title="Reports" subtitle={unit ? `${UNITS[unit]} – only this unit’s income` : 'All units'} wide>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input type="date" className="w-44" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /><span>–</span><Input type="date" className="w-44" value={to} max={today()} onChange={(e) => setTo(e.target.value)} />
        {[[0, 'Today'], [6, '7 days'], [29, '30 days']].map(([n, l]) => <Button key={l} size="sm" variant="ghost" onClick={() => { setFrom(addDays(today(), -n)); setTo(today()) }}>{l}</Button>)}
        <Tabs className="ml-auto w-full md:w-80" value={tab} onChange={setTab} tabs={[{ value: 'finance', label: 'Financial' }, ...(unit === 'hospital' || !unit ? [{ value: 'ops', label: 'Operational' }] : []), { value: 'export', label: 'Export' }]} />
      </div>
      {tab === 'finance' && <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Collected" value={inr(r.collected)} tone="green" /><Stat label="Billed" value={inr(r.billed)} /><Stat label="Outstanding (all time)" value={inr(r.outstanding)} tone="red" /><Stat label="Bills" value={r.bills.length} tone="sky" />
        </div>
        <Card className="p-5 mt-4"><h3 className="font-bold mb-4">Daily collection</h3><ColumnChart data={r.series} format={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${Math.round(v)}`)} height={180} ariaLabel="Daily collection" /></Card>
        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          <Card className="p-5"><h3 className="font-bold mb-4">Revenue by service</h3><BarList data={r.byCat} format={(v) => inr(v)} /></Card>
          <Card className="p-5"><h3 className="font-bold mb-4">Payment methods</h3><BarList data={r.byMethod} format={(v) => inr(v)} color="#16968B" /></Card>
          {(!unit || unit === 'hospital') && <Card className="p-5"><h3 className="font-bold mb-4">Department-wise revenue</h3><BarList data={r.byDept} format={(v) => inr(v)} /></Card>}
          {(!unit || unit === 'hospital') && <Card className="p-5"><h3 className="font-bold mb-4">Doctor-wise revenue (OPD)</h3><BarList data={r.byDoc} format={(v) => inr(v)} /></Card>}
        </div>
      </>}
      {tab === 'ops' && <>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Stat label="Appointments" value={r.appts.length} /><Stat label="Avg. waiting time" value={`${r.avgWait} min`} tone="amber" /><Stat label="Avg. consultation" value={`${r.avgDur} min`} tone="purple" /><Stat label="No-shows" value={r.noShow} tone="red" />
          <Card className="p-4 flex items-center gap-3"><Ring value={r.occupancy} size={64} stroke={7} color="#0E7C74" /><div className="text-xs font-semibold text-ink-500">Bed occupancy now</div></Card>
        </div>
        <Card className="p-5 mt-4">
          <div className="flex items-center gap-3 mb-3"><h3 className="font-bold flex-1">Doctor performance</h3><Ring value={r.util} size={56} stroke={6} /><span className="text-xs text-ink-500 w-28">Appointment utilisation</span></div>
          <Table rows={r.docPerf} rowKey={(x) => x.s.id} columns={[{ label: 'Doctor', render: (x) => <b>{x.s.name}</b> }, { label: 'Appointments', right: true, render: (x) => x.total }, { label: 'Seen', right: true, render: (x) => x.seen }, { label: 'No-show', right: true, render: (x) => x.noshow }, { label: 'Rating', right: true, render: (x) => `${x.rating} ★` }, { label: 'Revenue', right: true, render: (x) => inr(x.revenue) }]} />
        </Card>
      </>}
      {tab === 'export' && <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
        {EXPORTS.filter(([, units]) => !unit || units.includes(unit)).map(([name, , fn]) => <Card key={name} className="p-4 flex items-center gap-3"><FileSpreadsheet className="text-brand-600" /><span className="flex-1 font-semibold">{name}</span><Button size="sm" variant="secondary" icon={Download} onClick={() => downloadCSV(`${name.toLowerCase().replace(/\W+/g, '-')}-${from}-to-${to}.csv`, fn(from, to, unit))}>CSV</Button></Card>)}
        <p className="text-xs text-ink-500 md:col-span-2 xl:col-span-4">CSV files open in Excel / Google Sheets. Exports contain patient data – share them only with authorised people.</p>
      </div>}
    </Page>
  )
}
