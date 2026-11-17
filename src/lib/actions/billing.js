import { db } from '../db'
import { uid, today, round2, inr } from '../utils'
import { audit, fail, me, need, nextNo, notifyPatient, req, sendMessage } from './core'
import { can, unitOf, seesUnitMoney } from '../rbac'

// Each unit (hospital / medical store / laboratory) keeps its own bill and receipt series
export const BILL_PREFIX = { hospital: 'BL', pharmacy: 'PH', lab: 'LBL' }
export const RECEIPT_PREFIX = { hospital: 'RC', pharmacy: 'PR', lab: 'LR' }
export const billUnit = (b) => b?.unit || 'hospital'
export const visibleBills = (user, rows) => rows.filter((b) => user?.role === 'patient' || seesUnitMoney(user, billUnit(b)))

export const PAY_METHODS = { upi: 'UPI', cash: 'Cash', card: 'Debit / credit card', netbanking: 'Net banking', insurance: 'Insurance (cashless)', other: 'Other' }
export const BILL_STATUS = { unpaid: 'Unpaid', partial: 'Part paid', paid: 'Paid', refunded: 'Refunded', cancelled: 'Cancelled' }
export const ITEM_TYPES = { consultation: 'Consultation', lab: 'Laboratory', pharmacy: 'Medicines', radiology: 'X-ray / scan', procedure: 'Procedure', room: 'Room / bed', other: 'Other' }

export function totals(items) {
  const subtotal = round2(items.reduce((a, i) => a + Number(i.qty || 0) * Number(i.rate || 0), 0))
  const discount = round2(items.reduce((a, i) => a + Number(i.discount || 0), 0))
  const tax = round2(items.reduce((a, i) => a + ((Number(i.qty || 0) * Number(i.rate || 0) - Number(i.discount || 0)) * Number(i.taxPct || 0)) / 100, 0))
  return { subtotal, discount, tax, total: round2(subtotal - discount + tax) }
}
export const balanceOf = (b) => round2(b.total - (b.paid || 0) + (b.refunded || 0))
const statusOf = (total, paid, refunded) => (refunded > 0 && paid - refunded <= 0 ? 'refunded' : paid - refunded >= total - 0.001 ? 'paid' : paid > 0 ? 'partial' : 'unpaid')

// `internal`: bills created automatically by another workflow (test orders,
// check-in fees, admission deposits) – any staff member may trigger those.
export function createBill({ patientId, items, apptId, doctorId, labOrderId, prescriptionId, admissionId, deposit, notes = '', unit }, payment, { internal = false } = {}) {
  const u = me()
  unit = unit || unitOf(u) || 'hospital'
  if (!internal) { need('billing.create'); if (u.role !== 'super_admin' && unitOf(u) !== unit) fail('You can only create bills for your own unit') }
  else if (!u || u.role === 'patient') fail('You do not have permission to do this.')
  if (!db.get('patients', patientId)) fail('Please choose a patient')
  const clean = items.filter((i) => i.desc && Number(i.qty) > 0).map((i) => ({ ...i, qty: Number(i.qty), rate: round2(i.rate), discount: round2(i.discount || 0), taxPct: Number(i.taxPct || 0) }))
  if (!clean.length) fail('Add at least one item')
  if (clean.some((i) => i.discount > 0 && i.discount > i.qty * i.rate)) fail('Discount cannot be more than the item amount')
  if (clean.some((i) => i.discount > 0) && !can(u, 'billing.discount')) fail('You do not have permission to give discounts.')
  const t = totals(clean)
  const b = db.insert('bills', { id: uid('bl'), billNo: nextNo(BILL_PREFIX[unit]), unit, patientId, date: today(), items: clean, ...t, paid: 0, refunded: 0, status: t.total > 0 ? 'unpaid' : 'paid', apptId, doctorId, labOrderId, prescriptionId, admissionId, ...(deposit ? { deposit: true } : {}), notes, createdBy: me().id })
  audit('create', 'bills', b.id, `Bill ${b.billNo} for ${inr(b.total)}`)
  if (payment?.amount > 0) recordPayment(b.id, payment)
  return db.get('bills', b.id)
}

export function recordPayment(billId, { amount, method = 'cash', ref = '' }) {
  const u = me()
  const b = db.get('bills', billId)
  if (!b) fail('Bill not found')
  if (u.role === 'patient') {
    // online payment by the patient (simulated gateway in the demo)
    if (!['upi', 'card', 'netbanking'].includes(method)) fail('Choose an online payment method')
  } else { need('billing.create'); if (!seesUnitMoney(u, billUnit(b))) fail('This bill belongs to another unit – collect it at that counter') }
  amount = round2(amount)
  if (!(amount > 0)) fail('Enter the amount received')
  const bal = balanceOf(b)
  if (amount > bal + 0.001) fail(`Amount is more than the balance (${inr(bal)})`)
  if (amount < bal && !db.setting('billing', {}).allowPartial && u.role !== 'patient') fail('Part payments are switched off in billing settings')
  const p = db.insert('payments', { id: uid('pm'), receiptNo: nextNo(RECEIPT_PREFIX[billUnit(b)]), unit: billUnit(b), billId, patientId: b.patientId, amount, kind: 'payment', method, ref, by: u.id, at: new Date().toISOString() })
  const paid = round2((b.paid || 0) + amount)
  db.update('bills', billId, { paid, status: statusOf(b.total, paid, b.refunded || 0) })
  if (b.apptId) db.update('appointments', b.apptId, { paid: paid >= b.total })
  audit('payment', 'bills', billId, `${inr(amount)} by ${method}${ref ? ' (' + ref + ')' : ''} · receipt ${p.receiptNo}`)
  notifyPatient(b.patientId, 'Payment received', `${inr(amount)} for bill ${b.billNo}. Receipt ${p.receiptNo}`, '/p/bills', 'payment')
  sendMessage(b.patientId, 'payment_receipt', { amount: inr(amount), bill: b.billNo, receipt: p.receiptNo })
  return p
}

// Refunds need an administrator, a reason, and are always audited.
export function refund(billId, { amount, method = 'cash', reason }) {
  const u = need('billing.refund')
  const b = db.get('bills', billId)
  if (!seesUnitMoney(u, billUnit(b))) fail('Only the owner of this unit can refund')
  req(reason, 'Please enter the reason for the refund')
  amount = round2(amount)
  const refundable = round2((b.paid || 0) - (b.refunded || 0))
  if (!(amount > 0) || amount > refundable + 0.001) fail(`Refund must be between ₹1 and ${inr(refundable)}`)
  const p = db.insert('payments', { id: uid('pm'), receiptNo: nextNo(RECEIPT_PREFIX[billUnit(b)]), unit: billUnit(b), billId, patientId: b.patientId, amount: -amount, kind: 'refund', method, reason, authorizedBy: u.id, by: u.id, at: new Date().toISOString() })
  const refunded = round2((b.refunded || 0) + amount)
  db.update('bills', billId, { refunded, status: statusOf(b.total, b.paid, refunded) })
  audit('refund', 'bills', billId, `Refund ${inr(amount)} – ${reason}`)
  return p
}

export function cancelBill(billId, reason) {
  const u = need('billing.refund')
  const b = db.get('bills', billId)
  if (!seesUnitMoney(u, billUnit(b))) fail('Only the owner of this unit can cancel its bills')
  req(reason, 'Please enter the reason')
  if ((b.paid || 0) - (b.refunded || 0) > 0) fail('Refund the payments first, then cancel the bill')
  db.update('bills', billId, { status: 'cancelled', cancelReason: reason, cancelledBy: me().id })
  audit('cancel', 'bills', billId, `Bill cancelled – ${reason}`)
}

export const patientBalance = (patientId) => round2(db.list('bills', (b) => b.patientId === patientId && b.status !== 'cancelled').reduce((a, b) => a + balanceOf(b), 0))
