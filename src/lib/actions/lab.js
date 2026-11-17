// Laboratory workflow: ordered → sample collected → processing → results entered
// → verified (by an authorised person) → published to the patient.
// Unverified results are never shown to patients as final.
import { db } from '../db'
import { uid, today } from '../utils'
import { audit, fail, me, need, nextNo, notifyPatient, notifyRole, notifyStaff, req, sendMessage } from './core'
import { createBill } from './billing'
import { can, rolesOf, unitOf } from '../rbac'

// Two kinds of test orders:
//  • unit 'lab'      – the pathology laboratory (a separately owned unit)
//  • unit 'hospital' – investigations the hospital does itself (ECG, 2D echo, stress test, X-ray)
export const orderUnit = (lo) => lo?.unit || 'lab'
const workPerm = (unit) => (unit === 'lab' ? 'lab.work' : 'investigations')
export const canWorkOn = (user, lo) => can(user, workPerm(orderUnit(lo)))

export const LAB_STATUS = {
  ordered: 'Ordered', sample_collected: 'Sample collected', processing: 'Processing', result_entered: 'Awaiting verification',
  verified: 'Verified', published: 'Report ready', cancelled: 'Cancelled'
}
export const LAB_FLOW = ['ordered', 'sample_collected', 'processing', 'result_entered', 'verified', 'published']

// Who may verify a report: for the laboratory its owner or staff marked as
// authorised verifiers; for hospital investigations a doctor.
export const canVerify = (user, lo) => {
  if (!user) return false
  const roles = rolesOf(user)
  if (roles.includes('super_admin')) return true
  const unit = lo ? orderUnit(lo) : unitOf(user) === 'lab' ? 'lab' : 'hospital'
  if (unit === 'lab') return roles.includes('lab_admin') || (unitOf(user) === 'lab' && !!db.get('staff', user.staffId)?.canVerifyLab)
  return roles.includes('doctor')
}

export function orderTests({ patientId, tests, consultationId, priority = 'routine', note = '', bill = false, referredBy = '' }) {
  const u = me()
  if (u.role !== 'doctor' && !can(u, 'lab.work') && !can(u, 'investigations')) fail('You do not have permission to do this.')
  if (!tests?.length) fail('Choose at least one test')
  // one order per unit: pathology goes to the laboratory, ECG / echo / X-ray stay in the hospital
  const byUnit = {}
  tests.forEach((t) => { const un = db.get('labTests', t)?.unit || 'lab'; (byUnit[un] = byUnit[un] || []).push(t) })
  const orders = Object.entries(byUnit).map(([unit, ts]) => {
    const lo = db.insert('labOrders', { id: uid('lo'), orderNo: nextNo('LB'), unit, patientId, doctorId: u.staffId, referredBy: u.role === 'doctor' ? u.name : referredBy || '', consultationId, tests: ts, status: 'ordered', priority, note, results: {}, remarks: '', files: [] })
    if (consultationId) { const c = db.get('consultations', consultationId); db.update('consultations', consultationId, { labOrderIds: [...(c.labOrderIds || []), lo.id] }) }
    audit('create', 'labOrders', lo.id, `Tests ordered: ${ts.map((t) => db.get('labTests', t)?.code).join(', ')}`)
    if (unit === 'lab') notifyRole(['lab_tech', 'lab_admin'], priority === 'urgent' ? 'Urgent test request' : 'New test request', `${db.get('patients', patientId)?.name} · ${ts.length} test(s)`, '/s/lab', 'lab')
    if (bill) billLabOrder(lo.id)
    return lo
  })
  return orders[0]
}

export function billLabOrder(id) {
  const lo = db.get('labOrders', id)
  if (lo.billId) return db.get('bills', lo.billId)
  const b = createBill({ patientId: lo.patientId, labOrderId: id, items: lo.tests.map((t) => { const x = db.get('labTests', t); return { type: orderUnit(lo) === 'hospital' ? 'radiology' : 'lab', refId: id, desc: x.name, qty: 1, rate: x.price, discount: 0, taxPct: 0 } }), unit: orderUnit(lo) }, null, { internal: true })
  db.update('labOrders', id, { billId: b.id })
  return b
}

const needWork = (lo) => { const u = me(); if (!canWorkOn(u, lo)) fail('You do not have permission to do this.'); return u }

export function collectSample(id) {
  const lo = db.get('labOrders', id)
  const u = needWork(lo)
  if (lo.status !== 'ordered') fail('Sample already registered')
  const n = db.list('labOrders', (x) => x.sampleId && x.collectedAt?.startsWith(today())).length + 1
  const sampleId = `S${today().replace(/-/g, '').slice(2)}-${String(n).padStart(3, '0')}`
  db.update('labOrders', id, { status: 'sample_collected', sampleId, collectedAt: new Date().toISOString(), collectedBy: u.id })
  audit('sample', 'labOrders', id, `Sample ${sampleId} collected`)
  return sampleId
}
export function setProcessing(id) {
  needWork(db.get('labOrders', id))
  db.update('labOrders', id, { status: 'processing' })
}

export function flagOf(param, value) {
  if (value === '' || value == null || param.low == null || param.high == null) return ''
  const n = Number(value)
  if (Number.isNaN(n)) return ''
  return n < param.low ? 'low' : n > param.high ? 'high' : ''
}

export function enterResults(id, results, remarks, files) {
  const lo = db.get('labOrders', id)
  const u = needWork(lo)
  if (['verified', 'published'].includes(lo.status)) fail('This report is verified. Ask an authorised person to reopen it.')
  if (lo.status === 'ordered') fail('Register the sample first')
  for (const t of lo.tests) {
    const test = db.get('labTests', t)
    for (const p of test.params) if (!String(results?.[t]?.[p.name] ?? '').trim() && !(files || []).length) fail(`Enter ${p.name} (${test.name})`)
  }
  db.update('labOrders', id, { results, remarks, files: files || lo.files || [], status: 'result_entered', enteredBy: u.id, enteredAt: new Date().toISOString() })
  audit('results', 'labOrders', id, 'Results entered')
  db.list('users', (x) => x.id !== u.id && x.role !== 'super_admin' && canVerify(x, lo)).forEach((x) => db.insert('notifications', { id: uid('n'), userId: x.id, title: 'Report waiting for verification', body: db.get('patients', lo.patientId)?.name, link: '/s/lab', kind: 'lab', read: false }))
}

export function verifyReport(id) {
  const u = me()
  const lo = db.get('labOrders', id)
  if (!canVerify(u, lo)) fail('Only authorised staff can verify reports')
  if (lo.status !== 'result_entered') fail('Enter the results first')
  if (lo.enteredBy === u.id && orderUnit(lo) === 'lab') fail('Reports must be verified by a different authorised person')
  db.update('labOrders', id, { status: 'verified', verifiedBy: u.id, verifiedAt: new Date().toISOString() })
  audit('verify', 'labOrders', id, 'Report verified')
}

export function publishReport(id) {
  const lo = db.get('labOrders', id)
  needWork(lo)
  if (lo.status !== 'verified') fail('Only verified reports can be published')
  db.update('labOrders', id, { status: 'published', publishedAt: new Date().toISOString() })
  const names = lo.tests.map((t) => db.get('labTests', t)?.name).join(', ')
  notifyPatient(lo.patientId, 'Lab report ready', names, '/p/reports', 'lab')
  notifyStaff(lo.doctorId, 'Lab report ready', `${db.get('patients', lo.patientId)?.name} – ${names}`, `/s/patients/${lo.patientId}`, 'lab')
  sendMessage(lo.patientId, 'report_ready', { tests: names })
  audit('publish', 'labOrders', id, 'Report published to patient')
}

export function reopenReport(id, reason) {
  const u = me()
  if (!canVerify(u, db.get('labOrders', id))) fail('Only authorised staff can reopen reports')
  req(reason, 'Please enter the reason')
  db.update('labOrders', id, { status: 'result_entered', reopenedReason: reason, verifiedBy: null, verifiedAt: null, publishedAt: null })
  audit('reopen', 'labOrders', id, `Report reopened: ${reason}`)
}

export function cancelLabOrder(id, reason) {
  needWork(db.get('labOrders', id))
  db.update('labOrders', id, { status: 'cancelled', cancelReason: reason })
  audit('cancel', 'labOrders', id, `Cancelled: ${reason || ''}`)
}

export function saveLabTest(t) {
  const u = need('config.labtests')
  const unit = rolesOf(u).includes('lab_admin') ? 'lab' : rolesOf(u).includes('admin') ? 'hospital' : t.unit || 'lab'
  if (t.id && (db.get('labTests', t.id)?.unit || 'lab') !== unit && u.role !== 'super_admin') fail('This test belongs to another unit')
  t = { ...t, unit }
  req(t.name, 'Enter the test name')
  if (!(Number(t.price) >= 0)) fail('Enter the price')
  const row = { ...t, price: Number(t.price), params: (t.params || []).filter((p) => p.name?.trim()).map((p) => ({ ...p, low: p.low === '' || p.low == null ? null : Number(p.low), high: p.high === '' || p.high == null ? null : Number(p.high) })) }
  if (!row.params.length) fail('Add at least one result field')
  if (t.id) { db.update('labTests', t.id, row); audit('update', 'labTests', t.id, `Test updated: ${t.name}`) } else { const r = db.insert('labTests', { ...row, id: uid('lt'), active: true }); audit('create', 'labTests', r.id, `Test added: ${t.name}`) }
}
