import { useState } from 'react'
import { Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, IndianRupee, Undo2, Ban, Receipt, MessageCircle } from 'lucide-react'
import { Page, Card, Button, Table, Chips, SearchBox, Field, Input, Select, Sheet, Empty, Stat, useToast, useConfirm } from '../../components/ui'
import { PatientLine, BillStatus } from '../../components/common'
import { BillView } from '../../components/Documents'
import PatientPicker from '../../components/PatientPicker'
import { useAuth } from '../../lib/auth'
import { db, useData } from '../../lib/db'
import { can } from '../../lib/rbac'
import { createBill, recordPayment, refund, cancelBill, balanceOf, totals, sendMessage, PAY_METHODS, ITEM_TYPES } from '../../lib/actions'
import { fmtDate, inr, today, round2, cls } from '../../lib/utils'

function List() {
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const tab = sp.get('tab') || 'today'
  const [q, setQ] = useState('')
  const rows = useData((d) => d.list('bills', (b) => (tab === 'today' ? b.date === today() : tab === 'due' ? b.status !== 'cancelled' && balanceOf(b) > 0 : true)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    .filter((b) => !q || b.billNo.toLowerCase().includes(q.toLowerCase()) || db.get('patients', b.patientId)?.name.toLowerCase().includes(q.toLowerCase()))
  const pays = useData((d) => d.list('payments', (p) => p.at?.startsWith(today())))
  const byMethod = Object.entries(pays.reduce((m, p) => ({ ...m, [p.method]: (m[p.method] || 0) + p.amount }), {}))
  return (
    <Page title="Billing" wide actions={<Button icon={Plus} onClick={() => nav('new')}>New bill</Button>}>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Stat icon={IndianRupee} tone="green" label="Collected today" value={inr(pays.reduce((s, p) => s + p.amount, 0))} />
        {byMethod.slice(0, 4).map(([m, v]) => <Stat key={m} label={PAY_METHODS[m] || m} value={inr(v)} />)}
      </div>
      <div className="flex flex-col md:flex-row gap-3 mb-3">
        <Chips value={tab} onChange={(v) => setSp({ tab: v })} options={[{ value: 'today', label: 'Today' }, { value: 'due', label: 'Outstanding' }, { value: 'all', label: 'All bills' }]} />
        <SearchBox value={q} onChange={setQ} placeholder="Bill number or patient name" className="md:ml-auto md:w-80" />
      </div>
      <Table rows={rows.slice(0, 200)} onRow={(b) => nav(b.id)} empty="No bills" columns={[
        { label: 'Bill', render: (b) => <div><div className="font-semibold" translate="no">{b.billNo}</div><div className="text-xs text-ink-500">{fmtDate(b.createdAt)}</div></div> },
        { label: 'Patient', render: (b) => <Pat id={b.patientId} /> },
        { label: 'For', render: (b) => <span className="text-xs">{[...new Set(b.items.map((i) => ITEM_TYPES[i.type] || i.type))].join(', ')}</span>, hideMobile: true },
        { label: 'Total', right: true, render: (b) => inr(b.total, 2) },
        { label: 'Balance', right: true, render: (b) => { const x = balanceOf(b); return <span className={x > 0 ? 'text-red-600 font-semibold' : ''}>{inr(x, 2)}</span> } },
        { label: 'Status', render: (b) => <BillStatus s={b.status} /> }
      ]} />
    </Page>
  )
}
const Pat = ({ id }) => { const p = useData((d) => d.get('patients', id)); return <PatientLine p={p} showPhone={false} /> }

function NewBill() {
  const nav = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const [sp] = useSearchParams()
  const [pid, setPid] = useState(sp.get('patient'))
  const [items, setItems] = useState([])
  const [pay, setPay] = useState({ method: 'cash', amount: '', ref: '' })
  const services = useData((d) => d.list('services', (s) => s.active))
  const docs = useData((d) => d.list('staff', (s) => s.role === 'doctor' && s.active && s.fee > 0))
  const tests = useData((d) => d.list('labTests', (t) => t.active))
  const add = (it) => setItems([...items, { qty: 1, discount: 0, taxPct: 0, ...it }])
  const t = totals(items)
  const canDisc = can(user, 'billing.discount')
  const save = () => {
    try {
      const amt = pay.amount === '' ? t.total : Number(pay.amount)
      const b = createBill({ patientId: pid, items }, pay.method !== 'none' && amt > 0 ? { amount: amt, method: pay.method, ref: pay.ref } : null)
      toast(`Bill ${b.billNo} created`)
      nav(`/s/billing/${b.id}`, { replace: true })
    } catch (e) { toast(e.message, 'error') }
  }
  return (
    <Page title="New bill" back wide>
      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <Card className="p-5"><h3 className="font-bold mb-3">Patient</h3><PatientPicker value={pid} onChange={setPid} /></Card>
          <Card className="p-5">
            <h3 className="font-bold mb-3">Items</h3>
            <div className="grid sm:grid-cols-3 gap-2 mb-4">
              <Select value="" onChange={(e) => { const d = docs.find((x) => x.id === e.target.value); if (d) add({ type: 'consultation', desc: `Consultation – ${d.name}`, rate: d.fee }) }}><option value="">+ Consultation…</option>{docs.map((d) => <option key={d.id} value={d.id}>{d.name} · ₹{d.fee}</option>)}</Select>
              <Select value="" onChange={(e) => { const x = tests.find((y) => y.id === e.target.value); if (x) add({ type: ['X-Ray', 'Ultrasound', 'ECG'].includes(x.category) ? 'radiology' : 'lab', desc: x.name, rate: x.price }) }}><option value="">+ Lab / scan…</option>{tests.map((x) => <option key={x.id} value={x.id}>{x.name} · ₹{x.price}</option>)}</Select>
              <Select value="" onChange={(e) => { const x = services.find((y) => y.id === e.target.value); if (x) add({ type: x.category === 'Room' ? 'room' : x.category === 'Consultation' ? 'consultation' : 'procedure', desc: x.name, rate: x.price, taxPct: x.gst || 0 }) }}><option value="">+ Procedure / service…</option>{services.map((x) => <option key={x.id} value={x.id}>{x.name} · ₹{x.price}</option>)}</Select>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_100px_90px_36px] gap-2 items-center">
                  <Input className="!h-10" value={it.desc} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))} aria-label="Description" />
                  <Input className="!h-10 text-center" inputMode="numeric" value={it.qty} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value.replace(/\D/g, '')) || 0 } : x)))} aria-label="Quantity" />
                  <Input className="!h-10 text-right" inputMode="decimal" value={it.rate} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, rate: e.target.value.replace(/[^\d.]/g, '') } : x)))} aria-label="Rate" />
                  <Input className="!h-10 text-right" inputMode="decimal" disabled={!canDisc} value={it.discount} placeholder="Disc." onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, discount: e.target.value.replace(/[^\d.]/g, '') } : x)))} aria-label="Discount" />
                  <button aria-label="Remove item" onClick={() => setItems(items.filter((_, j) => j !== i))} className="h-10 grid place-items-center rounded-lg hover:bg-ink-100"><Trash2 size={16} /></button>
                </div>
              ))}
              <Button size="sm" variant="ghost" icon={Plus} onClick={() => add({ type: 'other', desc: '', rate: 0 })}>Custom item</Button>
            </div>
          </Card>
        </div>
        <Card className="p-5 h-fit lg:sticky lg:top-24">
          <h3 className="font-bold mb-3">Payment</h3>
          <div className="text-sm space-y-1 mb-3">
            <div className="flex justify-between"><span className="text-ink-500">Subtotal</span><span>{inr(t.subtotal, 2)}</span></div>
            {t.discount > 0 && <div className="flex justify-between"><span className="text-ink-500">Discount</span><span>− {inr(t.discount, 2)}</span></div>}
            {t.tax > 0 && <div className="flex justify-between"><span className="text-ink-500">Tax</span><span>{inr(t.tax, 2)}</span></div>}
            <div className="flex justify-between text-lg font-extrabold border-t border-ink-200 pt-2"><span>Total</span><span>{inr(t.total, 2)}</span></div>
          </div>
          <Field label="Payment method"><Select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{Object.entries(PAY_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}<option value="none">Not paid now</option></Select></Field>
          {pay.method !== 'none' && <div className="grid grid-cols-2 gap-2"><Field label="Amount received" hint="Leave empty for full amount"><Input inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value.replace(/[^\d.]/g, '') })} placeholder={String(t.total)} /></Field><Field label="Reference"><Input value={pay.ref} onChange={(e) => setPay({ ...pay, ref: e.target.value })} placeholder="UPI / card ref." /></Field></div>}
          <Button block size="lg" icon={Receipt} disabled={!pid || !items.length} onClick={save}>Create bill</Button>
        </Card>
      </div>
    </Page>
  )
}

function Detail() {
  const { id } = useParams()
  const toast = useToast()
  const ask = useConfirm()
  const { user } = useAuth()
  const b = useData((d) => d.get('bills', id))
  const [sheet, setSheet] = useState('')
  const [f, setF] = useState({ amount: '', method: 'cash', ref: '', reason: '' })
  if (!b) return <Page title="Bill" back><Empty title="Not found" /></Page>
  const bal = balanceOf(b)
  const paid = round2(b.paid - (b.refunded || 0))
  return (
    <Page title={`Bill ${b.billNo}`} back="/s/billing" wide>
      <div className="grid lg:grid-cols-[1fr_320px] gap-4 max-w-6xl">
        <div><BillView b={b} /></div>
        <div className="space-y-2">
          {bal > 0 && b.status !== 'cancelled' && <Button block size="lg" icon={IndianRupee} onClick={() => { setF({ ...f, amount: String(bal) }); setSheet('pay') }}>Collect {inr(bal, 2)}</Button>}
          {paid > 0 && <Button block variant="outline" icon={MessageCircle} onClick={() => { const p = db.list('payments', (x) => x.billId === b.id && x.kind === 'payment').pop(); const m = sendMessage(b.patientId, 'payment_receipt', { amount: inr(p.amount), bill: b.billNo, receipt: p.receiptNo }); toast(m?.status === 'blocked_no_consent' ? 'Patient has not agreed to messages' : 'Receipt sent', m?.status === 'blocked_no_consent' ? 'error' : 'success') }}>Send receipt on WhatsApp</Button>}
          {can(user, 'billing.refund') && paid > 0 && <Button block variant="outline" icon={Undo2} onClick={() => { setF({ ...f, amount: '', reason: '' }); setSheet('refund') }}>Refund</Button>}
          {can(user, 'billing.refund') && b.status !== 'cancelled' && <Button block variant="danger" icon={Ban} onClick={async () => { const r = await ask({ title: 'Cancel this bill?', input: 'Reason', danger: true, ok: 'Cancel bill' }); if (r) { try { cancelBill(b.id, r); toast('Bill cancelled') } catch (e) { toast(e.message, 'error') } } }}>Cancel bill</Button>}
          {!can(user, 'billing.refund') && <p className="text-xs text-ink-500">Refunds and cancellations need an administrator.</p>}
        </div>
      </div>
      <Sheet open={sheet === 'pay'} onClose={() => setSheet('')} title="Record payment" footer={<Button block size="lg" onClick={() => { try { const p = recordPayment(b.id, { amount: Number(f.amount), method: f.method, ref: f.ref }); toast(`Received · receipt ${p.receiptNo}`); setSheet('') } catch (e) { toast(e.message, 'error') } }}>Save payment</Button>}>
        <Field label="Amount (part payment allowed)"><Input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
        <Field label="Method"><div className="grid grid-cols-3 gap-2">{Object.entries(PAY_METHODS).map(([k, v]) => <button key={k} onClick={() => setF({ ...f, method: k })} className={cls('h-11 rounded-xl border text-sm font-semibold', f.method === k ? 'bg-brand-600 text-white border-brand-600' : 'border-ink-200')}>{v}</button>)}</div></Field>
        {f.method !== 'cash' && <Field label="Transaction reference"><Input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} /></Field>}
      </Sheet>
      <Sheet open={sheet === 'refund'} onClose={() => setSheet('')} title="Refund" footer={<Button block size="lg" variant="dangerSolid" onClick={() => { try { refund(b.id, { amount: Number(f.amount), method: f.method, reason: f.reason }); toast('Refund recorded'); setSheet('') } catch (e) { toast(e.message, 'error') } }}>Confirm refund</Button>}>
        <p className="text-sm text-ink-500 mb-3">Paid so far {inr(paid, 2)}. Refunds are recorded in the audit log with your name.</p>
        <Field label="Refund amount"><Input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/[^\d.]/g, '') })} /></Field>
        <Field label="Method"><Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>{Object.entries(PAY_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Reason"><Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
      </Sheet>
    </Page>
  )
}

export default function Billing() {
  return <Routes><Route index element={<List />} /><Route path="new" element={<NewBill />} /><Route path=":id" element={<Detail />} /></Routes>
}
