// Pharmacy: batch-wise stock, FEFO dispensing (first expiry, first out),
// low-stock and expiry alerts, returns, and pharmacy bills.
import { db } from '../db'
import { uid, ymOf, round2 } from '../utils'
import { audit, fail, me, need, req } from './core'
import { createBill } from './billing'

export const stockOf = (m) => (m.batches || []).filter((b) => !isExpired(b)).reduce((a, b) => a + Number(b.qty || 0), 0)
export const isExpired = (b) => b.expiry && b.expiry < ymOf()
export const monthsToExpiry = (b) => {
  const [y, mo] = b.expiry.split('-').map(Number)
  const n = new Date()
  return (y - n.getFullYear()) * 12 + (mo - (n.getMonth() + 1))
}

export function stockAlerts() {
  const meds = db.list('medicines', (m) => m.active)
  const out = { low: [], out: [], expiring: [], expired: [] }
  for (const m of meds) {
    const s = stockOf(m)
    if (s === 0) out.out.push(m)
    else if (s < (m.minStock || 0)) out.low.push(m)
    for (const b of m.batches || []) {
      if (!b.qty) continue
      if (isExpired(b)) out.expired.push({ m, b })
      else if (monthsToExpiry(b) <= 2) out.expiring.push({ m, b })
    }
  }
  return out
}

export function saveMedicine(m) {
  need('pharmacy.inventory')
  req(m.name, 'Enter the medicine name')
  req(m.generic, 'Enter the generic name')
  if (!(Number(m.mrp) > 0)) fail('Enter the selling price')
  const row = { ...m, mrp: Number(m.mrp), minStock: Number(m.minStock || 0), gst: Number(m.gst || 0) }
  if (m.id) { db.update('medicines', m.id, row); audit('update', 'medicines', m.id, `Medicine updated: ${m.name}`); return db.get('medicines', m.id) }
  const r = db.insert('medicines', { ...row, id: uid('med'), batches: [], active: true })
  audit('create', 'medicines', r.id, `Medicine added: ${m.name}`)
  return r
}

export function addStock(medicineId, { batch, expiry, qty, purchase, mrp }) {
  need('pharmacy.inventory')
  req(batch, 'Enter the batch number'); req(expiry, 'Enter the expiry month')
  if (!(Number(qty) > 0)) fail('Enter the quantity received')
  if (expiry < ymOf()) fail('This batch has already expired')
  const m = db.get('medicines', medicineId)
  const batches = [...(m.batches || [])]
  const i = batches.findIndex((b) => b.batch === batch)
  if (i >= 0) batches[i] = { ...batches[i], qty: Number(batches[i].qty) + Number(qty) }
  else batches.push({ batch, expiry, qty: Number(qty), purchase: Number(purchase || 0), mrp: Number(mrp || m.mrp) })
  db.update('medicines', medicineId, { batches })
  audit('stock_in', 'medicines', medicineId, `+${qty} (batch ${batch}, exp ${expiry})`)
}

export function adjustStock(medicineId, batch, newQty, reason) {
  need('pharmacy.inventory')
  req(reason, 'Please enter the reason')
  const m = db.get('medicines', medicineId)
  const old = m.batches.find((b) => b.batch === batch)
  db.update('medicines', medicineId, { batches: m.batches.map((b) => (b.batch === batch ? { ...b, qty: Number(newQty) } : b)) })
  audit('adjust', 'medicines', medicineId, `Batch ${batch}: ${old?.qty} → ${newQty} (${reason})`)
}

// Take quantity out of stock, earliest expiry first. Returns [{batch, qty, mrp}].
function takeFEFO(m, qty) {
  const batches = (m.batches || []).map((b) => ({ ...b })).sort((a, b) => a.expiry.localeCompare(b.expiry))
  let left = qty
  const used = []
  for (const b of batches) {
    if (left <= 0) break
    if (isExpired(b) || !b.qty) continue
    const take = Math.min(left, b.qty)
    b.qty -= take; left -= take
    used.push({ batch: b.batch, expiry: b.expiry, qty: take, mrp: b.mrp || m.mrp })
  }
  if (left > 0) fail(`Not enough stock of ${m.name} (available ${qty - left})`)
  return { batches, used }
}

// Dispense (all or part of) a prescription, or a walk-in sale (no prescription).
// lines: [{ medicineId, qty }]
export function dispense({ prescriptionId, patientId, lines, payment, discountPct = 0 }) {
  const u = need('pharmacy.dispense')
  const items = []
  const updates = []
  for (const l of lines.filter((x) => Number(x.qty) > 0)) {
    const m = db.get('medicines', l.medicineId)
    if (!m) fail('Medicine not found in catalogue')
    const { batches, used } = takeFEFO(m, Number(l.qty))
    updates.push([m.id, batches])
    for (const x of used) {
      const gross = x.qty * x.mrp
      items.push({ type: 'pharmacy', refId: prescriptionId || '', medicineId: m.id, batch: x.batch, desc: `${m.name} ${m.strength || ''} · Batch ${x.batch} · Exp ${x.expiry}`, qty: x.qty, rate: x.mrp, discount: round2(gross * discountPct / 100), taxPct: 0 })
    }
  }
  if (!items.length) fail('Enter the quantity to give')
  updates.forEach(([id, batches]) => db.update('medicines', id, { batches }))
  const bill = createBill({ patientId, prescriptionId, items }, payment)
  if (prescriptionId) {
    const rx = db.get('prescriptions', prescriptionId)
    const given = { ...(rx.dispensed || {}) }
    lines.forEach((l) => { given[l.medicineId] = (given[l.medicineId] || 0) + Number(l.qty || 0) })
    const complete = rx.items.filter((i) => i.medicineId).every((i) => (given[i.medicineId] || 0) >= (Number(i.qty) || 1))
    db.update('prescriptions', prescriptionId, { dispensed: given, dispenseStatus: complete ? 'dispensed' : 'partial', dispensedAt: new Date().toISOString(), dispensedBy: u.id, billIds: [...(rx.billIds || []), bill.id] })
  }
  audit('dispense', 'medicines', prescriptionId || patientId, `${items.length} line(s) dispensed, bill ${bill.billNo}`)
  return bill
}

// Return as per hospital policy: back into its batch, refund via billing.
export function returnMedicine({ medicineId, batch, qty, reason }) {
  need('pharmacy.dispense')
  req(reason, 'Please enter the reason for the return')
  const m = db.get('medicines', medicineId)
  const b = m.batches.find((x) => x.batch === batch)
  if (!b) fail('Batch not found')
  if (isExpired(b)) fail('Expired medicines cannot be taken back into stock')
  db.update('medicines', medicineId, { batches: m.batches.map((x) => (x.batch === batch ? { ...x, qty: Number(x.qty) + Number(qty) } : x)) })
  audit('return', 'medicines', medicineId, `Returned ${qty} (batch ${batch}) – ${reason}`)
}

export const findByBarcode = (code) => db.find('medicines', (m) => m.barcode && m.barcode === String(code).trim())

export const pharmacyQueue = () => db.list('prescriptions', (r) => r.status === 'final' && r.items?.some((i) => i.medicineId) && r.dispenseStatus !== 'dispensed')
  .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))

