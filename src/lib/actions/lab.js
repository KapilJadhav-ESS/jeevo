// Laboratory workflow: ordered → sample collected → processing → results entered
// → verified (by an authorised person) → published to the patient.
// Unverified results are never shown to patients as final.
import { db } from '../db'
import { uid, today } from '../utils'
import { audit, fail, me, need, nextNo, notifyPatient, notifyRole, notifyStaff, req, sendMessage } from './core'
import { createBill } from './billing'

export const LAB_STATUS = {
  ordered: 'Ordered', sample_collected: 'Sample collected', processing: 'Processing', result_entered: 'Awaiting verification',
  verified: 'Verified', published: 'Report ready', cancelled: 'Cancelled'
}
export const LAB_FLOW = ['ordered', 'sample_collected', 'processing', 'result_entered', 'verified', 'published']

export const canVerify = (user) => {
  if (!user) return false
  if (['admin', 'super_admin'].includes(user.role)) return true
  return !!db.get('staff', user.staffId)?.canVerifyLab
}

export function orderTests({ patientId, tests, consultationId, priority = 'routine', note = '', bill = false }) {
  const u = me()
  if (u.role !== 'doctor') need('lab.work')
  if (!tests?.length) fail('Choose at least one test')
  const lo = db.insert('labOrders', { id: uid('lo'), orderNo: nextNo('LB'), patientId, doctorId: u.staffId, consultationId, tests, status: 'ordered', priority, note, results: {}, remarks: '', files: [] })
  if (consultationId) { const c = db.get('consultations', consultationId); db.update('consultations', consultationId, { labOrderIds: [...(c.labOrderIds || []), lo.id] }) }
  audit('create', 'labOrders', lo.id, `Tests ordered: ${tests.map((t) => db.get('labTests', t)?.code).join(', ')}`)
  notifyRole(['lab_tech'], priority === 'urgent' ? 'Urgent test request' : 'New test request', `${db.get('patients', patientId)?.name} · ${tests.length} test(s)`, '/s/lab', 'lab')
  if (bill) billLabOrder(lo.id)
  return lo
}

export function billLabOrder(id) {
  const lo = db.get('labOrders', id)
  if (lo.billId) return db.get('bills', lo.billId)
  const b = createBill({ patientId: lo.patientId, labOrderId: id, items: lo.tests.map((t) => { const x = db.get('labTests', t); return { type: ['X-Ray', 'Ultrasound', 'ECG'].includes(x.category) ? 'radiology' : 'lab', refId: id, desc: x.name, qty: 1, rate: x.price, discount: 0, taxPct: 0 } }) }, null, { internal: true })
  db.update('labOrders', id, { billId: b.id })
  return b
}

export function collectSample(id) {
  const u = need('lab.work')
  const lo = db.get('labOrders', id)
  if (lo.status !== 'ordered') fail('Sample already registered')
  const n = db.list('labOrders', (x) => x.sampleId && x.collectedAt?.startsWith(today())).length + 1
  const sampleId = `S${today().replace(/-/g, '').slice(2)}-${String(n).padStart(3, '0')}`
  db.update('labOrders', id, { status: 'sample_collected', sampleId, collectedAt: new Date().toISOString(), collectedBy: u.id })
  audit('sample', 'labOrders', id, `Sample ${sampleId} collected`)
  return sampleId
}
export function setProcessing(id) {
  need('lab.work')
  db.update('labOrders', id, { status: 'processing' })
}

export function flagOf(param, value) {
  if (value === '' || value == null || param.low == null || param.high == null) return ''
  const n = Number(value)
  if (Number.isNaN(n)) return ''
  return n < param.low ? 'low' : n > param.high ? 'high' : ''
}

export function enterResults(id, results, remarks, files) {
  const u = need('lab.work')
  const lo = db.get('labOrders', id)
  if (['verified', 'published'].includes(lo.status)) fail('This report is verified. Ask an authorised person to reopen it.')
  if (lo.status === 'ordered') fail('Register the sample first')
  for (const t of lo.tests) {
    const test = db.get('labTests', t)
    for (const p of test.params) if (!String(results?.[t]?.[p.name] ?? '').trim() && !(files || []).length) fail(`Enter ${p.name} (${test.name})`)
  }
  db.update('labOrders', id, { results, remarks, files: files || lo.files || [], status: 'result_entered', enteredBy: u.id, enteredAt: new Date().toISOString() })
  audit('results', 'labOrders', id, 'Results entered')
  db.list('users', (x) => canVerify(x) && x.role === 'doctor').forEach((x) => db.insert('notifications', { id: uid('n'), userId: x.id, title: 'Report waiting for verification', body: db.get('patients', lo.patientId)?.name, link: '/s/lab', kind: 'lab', read: false }))
}

export function verifyReport(id) {
  const u = me()
  if (!canVerify(u)) fail('Only authorised staff can verify reports')
  const lo = db.get('labOrders', id)
  if (lo.status !== 'result_entered') fail('Enter the results first')
  if (lo.enteredBy === u.id && u.role === 'lab_tech') fail('Reports must be verified by a different authorised person')
  db.update('labOrders', id, { status: 'verified', verifiedBy: u.id, verifiedAt: new Date().toISOString() })
  audit('verify', 'labOrders', id, 'Report verified')
}

export function publishReport(id) {
  need('lab.work')
  const lo = db.get('labOrders', id)
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
  if (!canVerify(u)) fail('Only authorised staff can reopen reports')
  req(reason, 'Please enter the reason')
  db.update('labOrders', id, { status: 'result_entered', reopenedReason: reason, verifiedBy: null, verifiedAt: null, publishedAt: null })
  audit('reopen', 'labOrders', id, `Report reopened: ${reason}`)
}

export function cancelLabOrder(id, reason) {
  need('lab.work')
  db.update('labOrders', id, { status: 'cancelled', cancelReason: reason })
  audit('cancel', 'labOrders', id, `Cancelled: ${reason || ''}`)
}

export function saveLabTest(t) {
  need('config.manage')
  req(t.name, 'Enter the test name')
  if (!(Number(t.price) >= 0)) fail('Enter the price')
  const row = { ...t, price: Number(t.price), params: (t.params || []).filter((p) => p.name?.trim()).map((p) => ({ ...p, low: p.low === '' || p.low == null ? null : Number(p.low), high: p.high === '' || p.high == null ? null : Number(p.high) })) }
  if (!row.params.length) fail('Add at least one result field')
  if (t.id) { db.update('labTests', t.id, row); audit('update', 'labTests', t.id, `Test updated: ${t.name}`) } else { const r = db.insert('labTests', { ...row, id: uid('lt'), active: true }); audit('create', 'labTests', r.id, `Test added: ${t.name}`) }
}
