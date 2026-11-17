import { useEffect, useRef, useState } from 'react'
import { NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { Pill, Plus, PackagePlus, ScanBarcode, AlertTriangle, Undo2, Trash2, PackageX, Clock } from 'lucide-react'
import { Page, Card, Button, Table, SearchBox, Field, Input, Select, Sheet, Badge, Empty, Kv, Chips, useToast, useConfirm } from '../../components/ui'
import { PatientLine, BillStatus, doctorName } from '../../components/common'
import { PrescriptionView } from '../../components/Documents'
import PatientPicker from '../../components/PatientPicker'
import { useAuth } from '../../lib/auth'
import { db, useData } from '../../lib/db'
import { can } from '../../lib/rbac'
import { pharmacyQueue, dispense, stockOf, stockAlerts, saveMedicine, addStock, adjustStock, returnMedicine, findByBarcode, isExpired, monthsToExpiry, PAY_METHODS } from '../../lib/actions'
import { fmtDate, inr, timeAgo, cls, today, ymOf, downloadCSV } from '../../lib/utils'

function Tabs() {
  const t = [['/s/pharmacy', 'To dispense', true], ['/s/pharmacy/sale', 'Counter sale'], ['/s/pharmacy/stock', 'Stock & expiry'], ['/s/pharmacy/sales', 'Sales']]
  return <div className="flex gap-1 p-1 bg-ink-100 rounded-xl mb-4 overflow-x-auto no-scrollbar">{t.map(([to, l, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => cls('h-9 px-4 rounded-lg text-[13px] font-semibold grid place-items-center whitespace-nowrap', isActive ? 'bg-white shadow-sm' : 'text-ink-500')}>{l}</NavLink>)}</div>
}

function QueueList() {
  const nav = useNavigate()
  const rows = useData(() => pharmacyQueue())
  return (
    <Page title="Pharmacy" wide><Tabs />
      <Table rows={rows} onRow={(r) => nav(`rx/${r.id}`)} empty="No prescriptions waiting" columns={[
        { label: 'Patient', render: (r) => <Pat id={r.patientId} /> },
        { label: 'Doctor', render: (r) => doctorName(r.doctorId), hideMobile: true },
        { label: 'Medicines', render: (r) => <span className="text-sm" translate="no">{r.items.map((i) => i.name).join(', ')}</span> },
        { label: 'Received', render: (r) => timeAgo(r.signedAt || r.createdAt), nowrap: true },
        { label: 'Status', render: (r) => <Badge color={r.dispenseStatus === 'partial' ? 'amber' : 'blue'}>{r.dispenseStatus === 'partial' ? 'Part given' : 'New'}</Badge> }
      ]} />
    </Page>
  )
}
const Pat = ({ id }) => { const p = useData((d) => d.get('patients', id)); return <PatientLine p={p} showPhone={false} /> }

function PayBox({ total, pay, setPay }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-3">
      <Select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{Object.entries(PAY_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}<option value="none">Add to bill (pay later)</option></Select>
      <Input value={pay.ref} onChange={(e) => setPay({ ...pay, ref: e.target.value })} placeholder="UPI / card ref. (optional)" disabled={pay.method === 'none' || pay.method === 'cash'} />
      <div className="col-span-2 flex justify-between font-extrabold text-lg pt-2"><span>Total</span><span>{inr(total, 2)}</span></div>
    </div>
  )
}

function DispenseRx() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const rx = useData((d) => d.get('prescriptions', id))
  const meds = useData((d) => d.list('medicines'))
  const [lines, setLines] = useState(() => (rx?.items || []).filter((i) => i.medicineId).map((i) => ({ medicineId: i.medicineId, qty: Math.max(0, (Number(i.qty) || 1) - (rx.dispensed?.[i.medicineId] || 0)) })))
  const [pay, setPay] = useState({ method: 'cash', ref: '' })
  if (!rx) return <Page title="Prescription" back><Empty title="Not found" /></Page>
  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (meds.find((m) => m.id === l.medicineId)?.mrp || 0), 0)
  const done = () => {
    try {
      const b = dispense({ prescriptionId: rx.id, patientId: rx.patientId, lines, payment: pay.method === 'none' ? null : { amount: Math.round(total * 100) / 100, method: pay.method, ref: pay.ref } })
      toast(`Dispensed · bill ${b.billNo}`)
      nav('/s/pharmacy')
    } catch (e) { toast(e.message, 'error') }
  }
  return (
    <Page title="Dispense prescription" back="/s/pharmacy" wide>
      <div className="grid lg:grid-cols-2 gap-4">
        <div><PrescriptionView rx={rx} actions={false} /></div>
        <Card className="p-5 h-fit">
          <h3 className="font-bold mb-3">Medicines to give</h3>
          {rx.items.filter((i) => !i.medicineId).length > 0 && <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">Not in catalogue (give separately): {rx.items.filter((i) => !i.medicineId).map((i) => i.name).join(', ')}</p>}
          <div className="divide-y divide-ink-100">
            {lines.map((l, i) => {
              const m = meds.find((x) => x.id === l.medicineId)
              const st = stockOf(m)
              return (
                <div key={i} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0"><div className="font-semibold" translate="no">{m.name} <span className="text-ink-500 text-sm">{m.strength}</span></div><div className={cls('text-xs', st < l.qty ? 'text-red-600 font-bold' : 'text-ink-500')}>In stock {st} · {inr(m.mrp, 2)} each · given {rx.dispensed?.[m.id] || 0}</div></div>
                  <Input className="!h-10 w-20 text-center" inputMode="numeric" value={l.qty} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value.replace(/\D/g, '')) || 0 } : x)))} aria-label="Quantity" />
                  <span className="w-20 text-right font-semibold text-sm">{inr(l.qty * m.mrp, 2)}</span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-ink-500 mt-2">Stock is taken from the batch that expires first.</p>
          <PayBox total={total} pay={pay} setPay={setPay} />
          <Button block size="lg" className="mt-4" onClick={done}>Dispense & bill</Button>
        </Card>
      </div>
    </Page>
  )
}

// Counter sale (OTC / without prescription) with barcode support
function Sale() {
  const toast = useToast()
  const [pid, setPid] = useState(null)
  const [q, setQ] = useState('')
  const [cart, setCart] = useState([])
  const [pay, setPay] = useState({ method: 'cash', ref: '' })
  const [disc, setDisc] = useState(0)
  const ref = useRef()
  const res = useData((d) => (q.length >= 2 ? d.list('medicines', (m) => m.active && (m.name + m.generic + (m.barcode || '')).toLowerCase().includes(q.toLowerCase())).slice(0, 6) : []))
  const add = (m) => { setCart((c) => c.some((x) => x.medicineId === m.id) ? c.map((x) => (x.medicineId === m.id ? { ...x, qty: x.qty + 1 } : x)) : [...c, { medicineId: m.id, qty: 1 }]); setQ(''); ref.current?.focus() }
  const scan = async () => {
    if (!('BarcodeDetector' in window)) return toast('Use a USB barcode scanner, or type the code and press Enter', 'info')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const v = document.createElement('video'); v.srcObject = stream; await v.play()
      const det = new window.BarcodeDetector()
      const end = Date.now() + 8000
      while (Date.now() < end) { const codes = await det.detect(v); if (codes[0]) { const m = findByBarcode(codes[0].rawValue); m ? add(m) : toast('Barcode not in catalogue', 'error'); break } await new Promise((r) => setTimeout(r, 300)) }
      stream.getTracks().forEach((t) => t.stop())
    } catch { toast('Camera not available', 'error') }
  }
  const meds = useData((d) => d.list('medicines'))
  const gross = cart.reduce((s, l) => s + l.qty * (meds.find((m) => m.id === l.medicineId)?.mrp || 0), 0)
  const total = Math.round(gross * (1 - disc / 100) * 100) / 100
  const sell = () => {
    try { const b = dispense({ patientId: pid, lines: cart, discountPct: disc, payment: pay.method === 'none' ? null : { amount: total, method: pay.method, ref: pay.ref } }); toast(`Sale complete · ${b.billNo}`); setCart([]); setPid(null); setDisc(0) } catch (e) { toast(e.message, 'error') }
  }
  return (
    <Page title="Pharmacy" wide><Tabs />
      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        <Card className="p-5">
          <div className="flex gap-2"><SearchBox inputRef={ref} value={q} onChange={setQ} placeholder="Medicine name or scan barcode" className="flex-1" onKeyDown={(e) => { if (e.key === 'Enter') { const m = findByBarcode(q) || res[0]; if (m) add(m) } }} /><Button variant="secondary" icon={ScanBarcode} onClick={scan}>Scan</Button></div>
          {res.length > 0 && <div className="mt-2 border border-ink-200 rounded-2xl p-1">{res.map((m) => <button key={m.id} onClick={() => add(m)} className="w-full flex justify-between text-left px-3 py-2 rounded-xl hover:bg-ink-100 text-sm"><span translate="no"><b>{m.name}</b> {m.strength} <span className="text-ink-500">{m.generic}</span></span><span>{inr(m.mrp, 2)} · {stockOf(m)} left</span></button>)}</div>}
          <div className="mt-4 divide-y divide-ink-100">
            {cart.map((l, i) => { const m = meds.find((x) => x.id === l.medicineId); return (
              <div key={l.medicineId} className="py-2.5 flex items-center gap-3"><span className="flex-1 font-semibold text-sm" translate="no">{m.name} {m.strength}</span>
                <Input className="!h-10 w-20 text-center" inputMode="numeric" value={l.qty} onChange={(e) => setCart(cart.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value.replace(/\D/g, '')) || 0 } : x)))} aria-label="Quantity" />
                <span className="w-20 text-right text-sm font-semibold">{inr(l.qty * m.mrp, 2)}</span>
                <button aria-label="Remove" onClick={() => setCart(cart.filter((_, j) => j !== i))} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-ink-100"><Trash2 size={16} /></button></div>) })}
            {!cart.length && <Empty icon={Pill} title="Add medicines to the bill" />}
          </div>
        </Card>
        <Card className="p-5 h-fit">
          <h3 className="font-bold mb-2">Customer</h3>
          <PatientPicker value={pid} onChange={setPid} autoFocus={false} />
          <Field label="Discount %" className="mt-3"><Input inputMode="numeric" value={disc} onChange={(e) => setDisc(Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0))} /></Field>
          <PayBox total={total} pay={pay} setPay={setPay} />
          <Button block size="lg" className="mt-4" disabled={!pid || !cart.length} onClick={sell}>Complete sale</Button>
        </Card>
      </div>
    </Page>
  )
}

function Stock() {
  const { user } = useAuth()
  const toast = useToast()
  const ask = useConfirm()
  const [q, setQ] = useState('')
  const [f, setF] = useState('all')
  const [edit, setEdit] = useState(null)
  const [batch, setBatch] = useState(null)
  const [ret, setRet] = useState(null)
  const al = useData(() => stockAlerts())
  const rows = useData((d) => d.list('medicines', (m) => (!q || (m.name + m.generic).toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a.name.localeCompare(b.name)))
    .filter((m) => f === 'all' || (f === 'low' && al.low.includes(m)) || (f === 'out' && al.out.includes(m)) || (f === 'exp' && (al.expiring.some((x) => x.m.id === m.id) || al.expired.some((x) => x.m.id === m.id))))
  const inv = can(user, 'pharmacy.inventory')
  return (
    <Page title="Pharmacy" wide actions={inv && <Button icon={Plus} onClick={() => setEdit({ name: '', generic: '', strength: '', form: 'Tablet', manufacturer: '', category: '', mrp: '', minStock: 20, barcode: '', gst: 12 })}>Add medicine</Button>}><Tabs />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[[PackageX, 'Out of stock', al.out.length, 'out', 'text-red-600 bg-red-50'], [AlertTriangle, 'Low stock', al.low.length, 'low', 'text-amber-700 bg-amber-50'], [Clock, 'Expiring ≤ 2 months', al.expiring.length, 'exp', 'text-violet-700 bg-violet-50'], [Trash2, 'Expired batches', al.expired.length, 'exp', 'text-red-700 bg-red-50']].map(([Icon, l, n, k, tone]) => (
          <button key={l} onClick={() => setF(f === k ? 'all' : k)} className={cls('rounded-2xl p-4 text-left flex items-center gap-3', tone, f === k && 'ring-2 ring-current')}><Icon size={22} /><span><span className="block text-2xl font-extrabold">{n}</span><span className="text-xs font-semibold">{l}</span></span></button>
        ))}
      </div>
      <div className="flex gap-2 mb-3"><SearchBox value={q} onChange={setQ} placeholder="Search medicine" className="flex-1" /><Button variant="outline" onClick={() => downloadCSV(`stock-${today()}.csv`, [['Medicine', 'Generic', 'Strength', 'Batch', 'Expiry', 'Qty', 'MRP', 'Purchase'], ...rows.flatMap((m) => m.batches.map((b) => [m.name, m.generic, m.strength, b.batch, b.expiry, b.qty, b.mrp, b.purchase])) ])}>Export</Button></div>
      <Table rows={rows} columns={[
        { label: 'Medicine', render: (m) => <div translate="no"><div className="font-semibold">{m.name} <span className="text-ink-500 font-medium">{m.strength}</span></div><div className="text-xs text-ink-500">{m.generic} · {m.form} · {m.manufacturer}</div></div> },
        { label: 'Batches', render: (m) => <div className="flex flex-wrap gap-1">{m.batches.filter((b) => b.qty > 0).map((b) => <span key={b.batch} className={cls('text-[11px] rounded-md px-1.5 py-0.5 font-semibold', isExpired(b) ? 'bg-red-100 text-red-700 line-through' : monthsToExpiry(b) <= 2 ? 'bg-amber-100 text-amber-800' : 'bg-ink-100')} translate="no">{b.batch} · {b.expiry} · {b.qty}</span>)}</div> },
        { label: 'Stock', right: true, render: (m) => { const s = stockOf(m); return <span className={cls('font-bold', s === 0 ? 'text-red-600' : s < m.minStock ? 'text-amber-700' : '')}>{s} <span className="text-xs text-ink-400 font-normal">/ {`min ${m.minStock}`}</span></span> } },
        { label: 'MRP', right: true, render: (m) => inr(m.mrp, 2) },
        { label: '', right: true, render: (m) => inv && <div className="flex justify-end gap-1">
          <Button size="sm" variant="secondary" icon={PackagePlus} onClick={() => setBatch({ m, batch: '', expiry: '', qty: '', purchase: '', mrp: m.mrp })}>Stock in</Button>
          <Button size="sm" variant="ghost" onClick={() => setEdit(m)}>Edit</Button>
          <Button size="sm" variant="ghost" icon={Undo2} onClick={() => setRet({ m, batch: m.batches[0]?.batch, qty: 1, reason: '' })} aria-label="Return" />
        </div> }
      ]} />
      {al.expired.length > 0 && inv && <Card className="p-4 mt-4 bg-red-50 shadow-none"><div className="font-bold text-red-700 mb-2">Expired stock – remove from shelves</div>{al.expired.map(({ m, b }) => <div key={m.id + b.batch} className="flex items-center justify-between text-sm py-1"><span translate="no">{m.name} · batch {b.batch} · exp {b.expiry} · qty {b.qty}</span><Button size="sm" variant="danger" onClick={async () => { if (await ask({ title: 'Write off this expired batch?', ok: 'Write off', danger: true })) { adjustStock(m.id, b.batch, 0, 'Expired – written off'); toast('Written off') } }}>Write off</Button></div>)}</Card>}

      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit medicine' : 'Add medicine'} footer={<Button block size="lg" onClick={() => { try { saveMedicine(edit); toast('Saved'); setEdit(null) } catch (e) { toast(e.message, 'error') } }}>Save</Button>}>
        {edit && <div className="grid grid-cols-2 gap-x-3">
          <Field label="Brand name" className="col-span-2"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
          <Field label="Generic name" className="col-span-2"><Input value={edit.generic} onChange={(e) => setEdit({ ...edit, generic: e.target.value })} /></Field>
          <Field label="Strength"><Input value={edit.strength} onChange={(e) => setEdit({ ...edit, strength: e.target.value })} /></Field>
          <Field label="Form"><Select value={edit.form} onChange={(e) => setEdit({ ...edit, form: e.target.value })}>{['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drops', 'Gel', 'Inhaler', 'Sachet', 'Solution', 'Other'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="Manufacturer"><Input value={edit.manufacturer} onChange={(e) => setEdit({ ...edit, manufacturer: e.target.value })} /></Field>
          <Field label="Category"><Input value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} /></Field>
          <Field label="Selling price (MRP per unit)"><Input inputMode="decimal" value={edit.mrp} onChange={(e) => setEdit({ ...edit, mrp: e.target.value })} /></Field>
          <Field label="Minimum stock level"><Input inputMode="numeric" value={edit.minStock} onChange={(e) => setEdit({ ...edit, minStock: e.target.value })} /></Field>
          <Field label="Barcode" className="col-span-2"><Input value={edit.barcode || ''} onChange={(e) => setEdit({ ...edit, barcode: e.target.value })} /></Field>
        </div>}
      </Sheet>
      <Sheet open={!!batch} onClose={() => setBatch(null)} title={`Stock in · ${batch?.m.name}`} footer={<Button block size="lg" onClick={() => { try { addStock(batch.m.id, batch); toast('Stock added'); setBatch(null) } catch (e) { toast(e.message, 'error') } }}>Add stock</Button>}>
        {batch && <div className="grid grid-cols-2 gap-x-3">
          <Field label="Batch number"><Input value={batch.batch} onChange={(e) => setBatch({ ...batch, batch: e.target.value.toUpperCase() })} /></Field>
          <Field label="Expiry (month)"><Input type="month" min={ymOf()} value={batch.expiry} onChange={(e) => setBatch({ ...batch, expiry: e.target.value })} /></Field>
          <Field label="Quantity received"><Input inputMode="numeric" value={batch.qty} onChange={(e) => setBatch({ ...batch, qty: e.target.value })} /></Field>
          <Field label="Purchase price / unit"><Input inputMode="decimal" value={batch.purchase} onChange={(e) => setBatch({ ...batch, purchase: e.target.value })} /></Field>
          <Field label="MRP / unit"><Input inputMode="decimal" value={batch.mrp} onChange={(e) => setBatch({ ...batch, mrp: e.target.value })} /></Field>
        </div>}
      </Sheet>
      <Sheet open={!!ret} onClose={() => setRet(null)} title={`Return · ${ret?.m.name}`} footer={<Button block size="lg" onClick={() => { try { returnMedicine({ medicineId: ret.m.id, batch: ret.batch, qty: ret.qty, reason: ret.reason }); toast('Return recorded – refund through Billing if needed'); setRet(null) } catch (e) { toast(e.message, 'error') } }}>Record return</Button>}>
        {ret && <>
          <Field label="Batch"><Select value={ret.batch} onChange={(e) => setRet({ ...ret, batch: e.target.value })}>{ret.m.batches.map((b) => <option key={b.batch} value={b.batch}>{b.batch} · exp {b.expiry}</option>)}</Select></Field>
          <Field label="Quantity returned"><Input inputMode="numeric" value={ret.qty} onChange={(e) => setRet({ ...ret, qty: Number(e.target.value.replace(/\D/g, '')) || '' })} /></Field>
          <Field label="Reason"><Input value={ret.reason} onChange={(e) => setRet({ ...ret, reason: e.target.value })} placeholder="As per hospital return policy" /></Field>
        </>}
      </Sheet>
    </Page>
  )
}

function Sales() {
  const nav = useNavigate()
  const [day, setDay] = useState(today())
  const rows = useData((d) => d.list('bills', (b) => b.date === day && b.unit === 'pharmacy').sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  return (
    <Page title="Pharmacy" wide><Tabs />
      <div className="flex items-center gap-3 mb-3"><Input type="date" className="w-48" value={day} onChange={(e) => setDay(e.target.value)} /><span className="font-bold">{inr(rows.reduce((s, b) => s + b.total, 0), 2)}</span><span className="text-sm text-ink-500">{rows.length} bill(s)</span></div>
      <Table rows={rows} onRow={(b) => nav(`/s/billing/${b.id}`)} columns={[{ label: 'Bill', render: (b) => <b translate="no">{b.billNo}</b> }, { label: 'Patient', render: (b) => <Pat id={b.patientId} /> }, { label: 'Items', render: (b) => b.items.length }, { label: 'Total', right: true, render: (b) => inr(b.total, 2) }, { label: 'Status', render: (b) => <BillStatus s={b.status} /> }]} />
    </Page>
  )
}

export default function Pharmacy() {
  return <Routes><Route index element={<QueueList />} /><Route path="rx/:id" element={<DispenseRx />} /><Route path="sale" element={<Sale />} /><Route path="stock" element={<Stock />} /><Route path="sales" element={<Sales />} /></Routes>
}
