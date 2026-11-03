// Inpatients: admission, bed allocation and transfer, discharge summary.
import { db } from '../db'
import { uid, round2 } from '../utils'
import { audit, fail, me, need, nextNo, notifyPatient, req, sendMessage } from './core'
import { balanceOf, createBill } from './billing'

export const BED_STATUS = { available: 'Available', occupied: 'Occupied', reserved: 'Reserved', maintenance: 'Under maintenance' }

export function admitPatient({ patientId, doctorId, deptId, bedId, reason, diagnosis, expectedDischarge, emergency, deposit, method }) {
  need('ipd.admit')
  if (!patientId) fail('Please choose a patient')
  req(doctorId, 'Choose the attending doctor'); req(bedId, 'Choose a bed')
  if (db.find('admissions', (a) => a.patientId === patientId && a.status === 'admitted')) fail('This patient is already admitted')
  const bed = db.get('beds', bedId)
  if (!['available', 'reserved'].includes(bed.status)) fail('This bed is not available')
  const a = db.insert('admissions', { id: uid('ad'), admNo: nextNo('IP'), patientId, doctorId, deptId: deptId || db.get('staff', doctorId)?.deptId, bedId, reason, diagnosis, expectedDischarge, emergency: !!emergency, status: 'admitted', admittedAt: new Date().toISOString(), notes: [], admittedBy: me().id })
  db.update('beds', bedId, { status: 'occupied', admissionId: a.id, reservedFor: '' })
  if (Number(deposit) > 0) createBill({ patientId, admissionId: a.id, items: [{ type: 'room', refId: a.id, desc: 'Advance deposit – ' + a.admNo, qty: 1, rate: Number(deposit), discount: 0, taxPct: 0 }] }, { amount: Number(deposit), method: method || 'cash' }, { internal: true })
  audit('admit', 'admissions', a.id, `Admitted to ${bed.label}`)
  notifyPatient(patientId, 'Admission', `Admitted – bed ${bed.label}`, '/p/history', 'admission')
  return a
}

export function transferBed(admissionId, bedId) {
  need('ipd.admit')
  const a = db.get('admissions', admissionId)
  const to = db.get('beds', bedId)
  if (to.status !== 'available') fail('This bed is not available')
  const from = db.get('beds', a.bedId)
  db.update('beds', from.id, { status: 'available', admissionId: null })
  db.update('beds', bedId, { status: 'occupied', admissionId })
  db.update('admissions', admissionId, { bedId, transfers: [...(a.transfers || []), { from: from.label, to: to.label, at: new Date().toISOString(), by: me().id }] })
  audit('transfer', 'admissions', admissionId, `Bed ${from.label} → ${to.label}`)
}

export function setBedStatus(bedId, status, note = '') {
  need('ipd.admit')
  const b = db.get('beds', bedId)
  if (b.status === 'occupied') fail('Discharge or transfer the patient first')
  db.update('beds', bedId, { status, reservedFor: status === 'reserved' ? note : '' })
  audit('update', 'beds', bedId, `Bed ${b.label}: ${status}`)
}

export const daysAdmitted = (a) => Math.max(1, Math.ceil(((a.dischargedAt ? new Date(a.dischargedAt) : new Date()) - new Date(a.admittedAt)) / 86400000))

// Room + nursing charges for the stay so far (not yet billed)
export function stayCharges(a) {
  const bed = db.get('beds', a.bedId)
  const ward = db.get('wards', bed?.wardId)
  const days = daysAdmitted(a)
  const billedDays = a.billedDays || 0
  const n = days - billedDays
  if (n <= 0) return []
  const nursing = db.get('services', 'svc-nursing')
  return [
    { type: 'room', refId: a.id, desc: `${ward?.name || 'Room'} – ${n} day(s)`, qty: n, rate: ward?.dailyRate || 0, discount: 0, taxPct: 0 },
    ...(nursing ? [{ type: 'room', refId: a.id, desc: `Nursing charges – ${n} day(s)`, qty: n, rate: nursing.price, discount: 0, taxPct: 0 }] : [])
  ]
}
export function billStay(admissionId) {
  need('billing.create')
  const a = db.get('admissions', admissionId)
  const items = stayCharges(a)
  if (!items.length) fail('Room charges are already billed up to today')
  const b = createBill({ patientId: a.patientId, admissionId, items })
  db.update('admissions', admissionId, { billedDays: daysAdmitted(a) })
  return b
}
export const admissionBalance = (admissionId) => round2(db.list('bills', (b) => b.admissionId === admissionId && b.status !== 'cancelled').reduce((s, b) => s + balanceOf(b), 0))

export function saveDischargeSummary(admissionId, summary) {
  const u = need('ipd.discharge')
  if (u.role !== 'doctor' && !['admin', 'super_admin'].includes(u.role)) fail('Only doctors can prepare the discharge summary')
  const a = db.get('admissions', admissionId)
  if (a.dischargeSummary?.final) fail('This record is final and can no longer be edited.')
  db.update('admissions', admissionId, { dischargeSummary: { ...summary, preparedBy: u.id, preparedAt: new Date().toISOString() } })
  audit('update', 'admissions', admissionId, 'Discharge summary saved')
}

export function discharge(admissionId) {
  const u = need('ipd.discharge')
  const a = db.get('admissions', admissionId)
  if (!a.dischargeSummary?.diagnosis) fail('Prepare the discharge summary first')
  if (u.role !== 'doctor' && !['admin', 'super_admin'].includes(u.role)) fail('Only doctors can discharge patients')
  db.update('admissions', admissionId, { status: 'discharged', dischargedAt: new Date().toISOString(), dischargedBy: u.id, dischargeSummary: { ...a.dischargeSummary, final: true } })
  db.update('beds', a.bedId, { status: 'available', admissionId: null })
  db.list('nursingTasks', (t) => t.admissionId === admissionId && t.status === 'pending').forEach((t) => db.update('nursingTasks', t.id, { status: 'cancelled' }))
  audit('discharge', 'admissions', admissionId, 'Patient discharged')
  notifyPatient(a.patientId, 'Discharge summary ready', 'You can view and download it in Medical history.', '/p/history', 'admission')
  sendMessage(a.patientId, 'discharge', { date: a.dischargeSummary.followUp || '' })
}
