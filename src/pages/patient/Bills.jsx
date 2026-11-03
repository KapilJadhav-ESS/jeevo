import { useState } from 'react'
import { Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { Wallet, CheckCircle2, Smartphone, CreditCard, Landmark, ShieldCheck } from 'lucide-react'
import { Page, Card, Empty, Button, Tabs, Input, Field, useToast } from '../../components/ui'
import { BillStatus } from '../../components/common'
import { BillView } from '../../components/Documents'
import { useData } from '../../lib/db'
import { balanceOf, recordPayment } from '../../lib/actions'
import { fmtDate, inr, cls } from '../../lib/utils'
import { FamilySwitch, useFamily } from './PatientApp'

function List() {
  const nav = useNavigate()
  const { ids } = useFamily()
  const bills = useData((d) => d.list('bills', (b) => ids.includes(b.patientId) && b.status !== 'cancelled').sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  const due = bills.filter((b) => balanceOf(b) > 0)
  const total = due.reduce((s, b) => s + balanceOf(b), 0)
  return (
    <Page title="Bills & payments" back="/p">
      <Card className="p-5 bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        <div className="text-sm text-brand-100">Total outstanding (family)</div>
        <div className="text-3xl font-extrabold mt-1">{inr(total, 2)}</div>
        <div className="text-xs text-brand-100 mt-1">{`${due.length} bill(s) to pay`}</div>
      </Card>
      <h3 className="font-bold mt-5 mb-2">All bills</h3>
      <div className="space-y-3">
        {bills.map((b) => <BillRow key={b.id} b={b} onClick={() => nav(b.id)} />)}
        {!bills.length && <Empty icon={Wallet} title="No bills yet" />}
      </div>
    </Page>
  )
}

function BillRow({ b, onClick }) {
  const p = useData((d) => d.get('patients', b.patientId))
  const bal = balanceOf(b)
  return (
    <Card className="p-4" onClick={onClick}>
      <div className="flex justify-between gap-3">
        <div className="min-w-0"><div className="font-bold truncate" translate="no">{b.items[0]?.desc}{b.items.length > 1 ? ` +${b.items.length - 1}` : ''}</div><div className="text-xs text-ink-500">{fmtDate(b.createdAt)} · {p?.name} · <span translate="no">{b.billNo}</span></div></div>
        <div className="text-right shrink-0"><div className="font-extrabold">{inr(b.total, 2)}</div><BillStatus s={b.status} /></div>
      </div>
      {bal > 0 && <div className="mt-3 flex items-center justify-between rounded-xl bg-red-50 px-3 py-2"><span className="text-sm font-semibold text-red-700">Balance {inr(bal, 2)}</span><span className="text-sm font-bold text-brand-700">Pay now →</span></div>}
    </Card>
  )
}

function Detail() {
  const { id } = useParams()
  const nav = useNavigate()
  const b = useData((d) => d.get('bills', id))
  if (!b) return <Page title="Bill" back><Empty title="Not found" /></Page>
  return (
    <Page title="Bill" back>
      {balanceOf(b) > 0 && <Button block size="lg" className="mb-4" onClick={() => nav('pay')}>Pay {inr(balanceOf(b), 2)} online</Button>}
      <BillView b={b} />
    </Page>
  )
}

// Simulated payment gateway (no real gateway connected in the demo)
function Pay() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const b = useData((d) => d.get('bills', id))
  const [method, setMethod] = useState('upi')
  const [vpa, setVpa] = useState('')
  const [card, setCard] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  if (!b) return null
  const amt = balanceOf(b)
  const pay = () => {
    if (method === 'upi' && !/^[\w.-]+@[\w]+$/.test(vpa)) return toast('Enter a valid UPI ID, e.g. name@okaxis', 'error')
    if (method === 'card' && card.replace(/\D/g, '').length < 12) return toast('Enter a valid card number', 'error')
    setBusy(true)
    setTimeout(() => {
      setBusy(false)
      if (method === 'card' && card.replace(/\D/g, '').endsWith('0002')) return toast('Payment declined by bank. Please try another method.', 'error')
      try { setDone(recordPayment(b.id, { amount: amt, method, ref: method === 'upi' ? 'UPI' + Date.now().toString().slice(-10) : 'PG' + Date.now().toString().slice(-10) })) } catch (e) { toast(e.message, 'error') }
    }, 1400)
  }
  if (done) return (
    <Page title="Payment successful" back="/p/bills">
      <div className="text-center py-8"><CheckCircle2 size={72} className="mx-auto text-accent-500" /><div className="text-2xl font-extrabold mt-3">{inr(done.amount, 2)}</div><p className="text-sm text-ink-500 mt-1">Receipt <span translate="no">{done.receiptNo}</span> · sent on WhatsApp / SMS</p></div>
      <Button block size="lg" onClick={() => nav(`/p/bills/${b.id}`)}>View receipt</Button>
    </Page>
  )
  return (
    <Page title="Pay securely" back>
      <Card className="p-4 text-center"><div className="text-sm text-ink-500">Amount to pay</div><div className="text-3xl font-extrabold">{inr(amt, 2)}</div><div className="text-xs text-ink-500" translate="no">{b.billNo}</div></Card>
      <Tabs className="mt-4" value={method} onChange={setMethod} tabs={[{ value: 'upi', label: 'UPI' }, { value: 'card', label: 'Card' }, { value: 'netbanking', label: 'Net banking' }]} />
      <Card className="p-4 mt-3">
        {method === 'upi' && <>
          <div className="grid grid-cols-4 gap-2 mb-4">{['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((x) => <button key={x} onClick={() => setVpa(`ramesh@${x.toLowerCase()}`)} className="h-14 rounded-xl border border-ink-200 text-xs font-bold flex flex-col items-center justify-center gap-1"><Smartphone size={18} className="text-brand-600" />{x}</button>)}</div>
          <Field label="UPI ID"><Input value={vpa} onChange={(e) => setVpa(e.target.value.trim())} placeholder="name@okaxis" /></Field>
        </>}
        {method === 'card' && <Field label="Card number" hint="Demo: any number works; ending in 0002 is declined"><Input inputMode="numeric" value={card} onChange={(e) => setCard(e.target.value.replace(/[^\d ]/g, '').slice(0, 19))} placeholder="4111 1111 1111 1111" /></Field>}
        {method === 'netbanking' && <div className="grid grid-cols-2 gap-2">{['SBI', 'HDFC', 'ICICI', 'Bank of Maharashtra'].map((x) => <button key={x} className={cls('h-12 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 border-ink-200')}><Landmark size={16} />{x}</button>)}</div>}
      </Card>
      <p className="text-xs text-ink-500 flex items-center gap-1.5 mt-3"><ShieldCheck size={14} className="text-accent-600" /> Demo payment gateway – no money is charged.</p>
      <Button block size="lg" className="mt-4" icon={method === 'card' ? CreditCard : undefined} loading={busy} onClick={pay}>Pay {inr(amt, 2)}</Button>
    </Page>
  )
}

export default function Bills() {
  return <Routes><Route index element={<List />} /><Route path=":id" element={<Detail />} /><Route path=":id/pay" element={<Pay />} /></Routes>
}
