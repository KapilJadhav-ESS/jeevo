import { useState } from 'react'
import { Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FlaskConical, TestTube, Play, ShieldCheck, Send, Plus, RotateCcw, Printer } from 'lucide-react'
import { Page, Card, Button, Table, Chips, Field, Input, Textarea, MediaPicker, Empty, Badge, Sheet, Select, useToast, useConfirm } from '../../components/ui'
import { LabStatus, PatientLine, doctorName, userName } from '../../components/common'
import { LabReportView } from '../../components/Documents'
import PatientPicker from '../../components/PatientPicker'
import { useAuth } from '../../lib/auth'
import { db, useData } from '../../lib/db'
import { can } from '../../lib/rbac'
import { collectSample, setProcessing, enterResults, verifyReport, publishReport, reopenReport, cancelLabOrder, orderTests, flagOf, canVerify, LAB_STATUS, billLabOrder } from '../../lib/actions'
import { fmtDateTime, timeAgo, cls, today } from '../../lib/utils'

const TABS = { pending: ['ordered', 'sample_collected', 'processing'], verify: ['result_entered'], done: ['verified'], published: ['published'] }

function Worklist() {
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const { user } = useAuth()
  const tab = sp.get('tab') || (can(user, 'lab.work') ? 'pending' : 'verify')
  const [newOrder, setNewOrder] = useState(false)
  const rows = useData((d) => d.list('labOrders', (l) => TABS[tab].includes(l.status) && (tab !== 'published' || l.publishedAt?.slice(0, 10) >= today().slice(0, 8) + '01')).sort((a, b) => (b.priority === 'urgent') - (a.priority === 'urgent') || a.createdAt.localeCompare(b.createdAt)))
  const counts = useData((d) => Object.fromEntries(Object.entries(TABS).map(([k, st]) => [k, d.list('labOrders', (l) => st.includes(l.status)).length])))
  return (
    <Page title="Laboratory" wide actions={can(user, 'lab.work') && <Button icon={Plus} onClick={() => setNewOrder(true)}>Walk-in test</Button>}>
      <Chips className="mb-4" value={tab} onChange={(v) => setSp({ tab: v })} options={[{ value: 'pending', label: 'To do', count: counts.pending }, { value: 'verify', label: 'Awaiting verification', count: counts.verify }, { value: 'done', label: 'Verified – to publish', count: counts.done }, { value: 'published', label: 'Published' }]} />
      <Table rows={rows} onRow={(l) => nav(l.id)} empty="Nothing here" columns={[
        { label: 'Patient', render: (l) => <Pat id={l.patientId} /> },
        { label: 'Tests', render: (l) => <TestNames ids={l.tests} /> },
        { label: 'Ordered', render: (l) => <span className="text-xs">{timeAgo(l.createdAt)} · {doctorName(l.doctorId)}</span>, hideMobile: true },
        { label: 'Sample', render: (l) => <span translate="no" className="font-mono text-xs">{l.sampleId || '—'}</span> },
        { label: 'Status', render: (l) => <div className="flex gap-1 items-center">{l.priority === 'urgent' && <Badge color="red">Urgent</Badge>}<LabStatus s={l.status} /></div> }
      ]} />
      <Sheet open={newOrder} onClose={() => setNewOrder(false)} title="Walk-in test order"><WalkIn onDone={(id) => { setNewOrder(false); nav(id) }} /></Sheet>
    </Page>
  )
}
const Pat = ({ id }) => { const p = useData((d) => d.get('patients', id)); return <PatientLine p={p} showPhone={false} /> }
const TestNames = ({ ids }) => { const t = useData((d) => ids.map((x) => d.get('labTests', x)?.name)); return <span className="text-sm">{t.join(', ')}</span> }

function WalkIn({ onDone }) {
  const toast = useToast()
  const [pid, setPid] = useState(null)
  const [sel, setSel] = useState([])
  const tests = useData((d) => d.list('labTests', (t) => t.active))
  return (
    <>
      <PatientPicker value={pid} onChange={setPid} />
      <div className="flex flex-wrap gap-1.5 mt-4">{tests.map((t) => <button key={t.id} onClick={() => setSel(sel.includes(t.id) ? sel.filter((x) => x !== t.id) : [...sel, t.id])} className={cls('h-9 px-3 rounded-full text-xs font-semibold border', sel.includes(t.id) ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-ink-200')}>{t.name} · ₹{t.price}</button>)}</div>
      <Button block size="lg" className="mt-4" disabled={!pid || !sel.length} onClick={() => { try { const lo = orderTests({ patientId: pid, tests: sel, bill: true }); toast('Order created and billed'); onDone(lo.id) } catch (e) { toast(e.message, 'error') } }}>Create order</Button>
    </>
  )
}

function Order() {
  const { id } = useParams()
  const toast = useToast()
  const ask = useConfirm()
  const { user } = useAuth()
  const lo = useData((d) => d.get('labOrders', id))
  const p = useData((d) => lo && d.get('patients', lo.patientId))
  const tests = useData((d) => lo ? lo.tests.map((t) => d.get('labTests', t)) : [])
  const bill = useData((d) => lo?.billId ? d.get('bills', lo.billId) : d.find('bills', (b) => b.labOrderId === lo?.id))
  const [res, setRes] = useState(() => JSON.parse(JSON.stringify(lo?.results || {})))
  const [remarks, setRemarks] = useState(lo?.remarks || '')
  const [files, setFiles] = useState(lo?.files || [])
  if (!lo) return <Page title="Lab order" back><Empty title="Not found" /></Page>
  const run = (fn, msg) => { try { const r = fn(); toast(typeof msg === 'function' ? msg(r) : msg) } catch (e) { toast(e.message, 'error') } }
  const editable = ['sample_collected', 'processing', 'result_entered'].includes(lo.status) && can(user, 'lab.work')
  const setVal = (t, prm, v) => setRes({ ...res, [t]: { ...(res[t] || {}), [prm]: v } })
  return (
    <Page title={`Lab order ${lo.orderNo}`} back="/s/lab" wide>
      <div className="grid lg:grid-cols-[340px_1fr] gap-4">
        <div className="space-y-4">
          <Card className="p-5">
            <PatientLine p={p} />
            <div className="mt-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-ink-500">Status</span><LabStatus s={lo.status} /></div>
              <div className="flex justify-between"><span className="text-ink-500">Doctor</span><span>{doctorName(lo.doctorId)}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Ordered</span><span>{fmtDateTime(lo.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Sample ID</span><span className="font-mono" translate="no">{lo.sampleId || '—'}</span></div>
              {lo.collectedAt && <div className="flex justify-between"><span className="text-ink-500">Collected</span><span>{fmtDateTime(lo.collectedAt)} · {userName(lo.collectedBy)}</span></div>}
              {lo.enteredAt && <div className="flex justify-between"><span className="text-ink-500">Results by</span><span>{userName(lo.enteredBy)}</span></div>}
              {lo.verifiedAt && <div className="flex justify-between"><span className="text-ink-500">Verified by</span><span>{userName(lo.verifiedBy)}</span></div>}
              <div className="flex justify-between"><span className="text-ink-500">Payment</span><span>{bill ? (bill.status === 'paid' ? <Badge color="green">Paid</Badge> : <Badge color="red">Due</Badge>) : <button className="text-brand-700 font-semibold" onClick={() => run(() => billLabOrder(lo.id), 'Bill created')}>Create bill</button>}</span></div>
            </div>
            {lo.note && <p className="text-sm mt-3 rounded-xl bg-ink-100 p-2" translate="no">{lo.note}</p>}
          </Card>
          <Card className="p-5 space-y-2">
            <h3 className="font-bold mb-1">Workflow</h3>
            {lo.status === 'ordered' && can(user, 'lab.work') && <Button block icon={TestTube} onClick={() => run(() => collectSample(lo.id), (sid) => `Sample ${sid} registered`)}>Register sample & generate ID</Button>}
            {lo.status === 'sample_collected' && can(user, 'lab.work') && <Button block variant="secondary" icon={Play} onClick={() => run(() => setProcessing(lo.id), 'Marked as processing')}>Mark processing</Button>}
            {lo.status === 'result_entered' && canVerify(user) && <Button block icon={ShieldCheck} onClick={async () => { if (await ask({ title: 'Verify this report?', text: 'You confirm the results were checked by you.', ok: 'Verify' })) run(() => verifyReport(lo.id), 'Report verified') }}>Verify report</Button>}
            {lo.status === 'result_entered' && !canVerify(user) && <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-3 py-2">Waiting for an authorised person (pathologist) to verify.</p>}
            {lo.status === 'verified' && can(user, 'lab.work') && <Button block variant="success" icon={Send} onClick={() => run(() => publishReport(lo.id), 'Published – patient notified')}>Publish to patient</Button>}
            {['verified', 'published'].includes(lo.status) && canVerify(user) && <Button block variant="ghost" icon={RotateCcw} onClick={async () => { const r = await ask({ title: 'Reopen this report for correction?', input: 'Reason', ok: 'Reopen' }); if (r) run(() => reopenReport(lo.id, r), 'Report reopened') }}>Reopen for correction</Button>}
            {['ordered', 'sample_collected'].includes(lo.status) && can(user, 'lab.work') && <Button block variant="ghost" onClick={async () => { const r = await ask({ title: 'Cancel this order?', input: 'Reason', danger: true, ok: 'Cancel order' }); if (r) run(() => cancelLabOrder(lo.id, r), 'Order cancelled') }}>Cancel order</Button>}
            {lo.sampleId && <Button block variant="outline" icon={Printer} onClick={() => { const w = window.open('', '_blank', 'width=320,height=200'); w.document.write(`<body style="font-family:sans-serif;text-align:center"><div style="font-size:22px;font-weight:bold">${lo.sampleId}</div><div>${p.name}</div><div>${p.pid}</div><div>${tests.map((t) => t.code).join(', ')}</div><script>print()</script></body>`) }}>Print sample label</Button>}
          </Card>
        </div>
        <div className="min-w-0">
          {editable ? (
            <Card className="p-5">
              <h3 className="font-bold mb-4">Enter results</h3>
              {tests.map((t) => (
                <div key={t.id} className="mb-5">
                  <div className="font-bold text-brand-700 mb-2">{t.name}</div>
                  <div className="space-y-2">
                    {t.params.map((prm) => {
                      const val = res[t.id]?.[prm.name] ?? ''
                      const f = flagOf(prm, val)
                      return (
                        <div key={prm.name} className="grid grid-cols-[1fr_140px_auto] sm:grid-cols-[1fr_160px_200px] items-center gap-3">
                          <span className="text-sm font-semibold" translate="no">{prm.name} <span className="text-ink-400 font-normal">{prm.unit}</span></span>
                          <Input className={cls('!h-10', f && '!border-red-400 !bg-red-50 text-red-700 font-bold')} value={val} onChange={(e) => setVal(t.id, prm.name, e.target.value)} placeholder={prm.normal || ''} />
                          <span className="text-xs text-ink-500 hidden sm:block" translate="no">{prm.low != null ? `Normal ${prm.low} – ${prm.high}` : prm.normal ? `Normal: ${prm.normal}` : ''}{f && <b className="text-red-600 ml-2">{f === 'high' ? 'High' : 'Low'}</b>}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              <Field label="Remarks"><Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
              <Field label="Upload report (PDF or image, e.g. X-ray, ECG, ultrasound)"><MediaPicker value={files} onChange={setFiles} allowVideo="pdf" label="Add file" /></Field>
              <Button size="lg" onClick={() => run(() => enterResults(lo.id, res, remarks, files), 'Results saved – sent for verification')}>Save results</Button>
              <p className="text-xs text-ink-500 mt-2">Results are not shown to the patient until verified and published.</p>
            </Card>
          ) : ['result_entered', 'verified', 'published'].includes(lo.status) ? <LabReportView lo={lo} /> : <Card className="p-2"><Empty icon={FlaskConical} title={LAB_STATUS[lo.status]} text={lo.status === 'ordered' ? 'Register the sample to start.' : ''} /></Card>}
        </div>
      </div>
    </Page>
  )
}

export default function Lab() {
  return <Routes><Route index element={<Worklist />} /><Route path=":id" element={<Order />} /></Routes>
}
