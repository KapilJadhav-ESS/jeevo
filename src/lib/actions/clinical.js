// Consultations, prescriptions, vitals and nursing.
// Nothing here suggests diagnoses, medicines or doses: the treating doctor
// writes and approves every clinical decision. Finalised records are locked;
// corrections are made as a new, audited version.
import { db } from '../db'
import { uid, today } from '../utils'
import { audit, fail, me, need, nextNo, notifyPatient, notifyRole, req, sendMessage } from './core'
import { completeAppointment } from './appointments'

export const FREQUENCIES = {
  '1-0-0': { en: 'Once daily – morning', hi: 'दिन में एक बार – सुबह', mr: 'दिवसातून एकदा – सकाळी' },
  '0-0-1': { en: 'Once daily – night', hi: 'दिन में एक बार – रात', mr: 'दिवसातून एकदा – रात्री' },
  '0-1-0': { en: 'Once daily – afternoon', hi: 'दिन में एक बार – दोपहर', mr: 'दिवसातून एकदा – दुपारी' },
  '1-0-1': { en: 'Twice daily – morning & night', hi: 'दिन में दो बार – सुबह और रात', mr: 'दिवसातून दोनदा – सकाळी व रात्री' },
  '1-1-1': { en: 'Three times daily', hi: 'दिन में तीन बार', mr: 'दिवसातून तीन वेळा' },
  '1-1-1-1': { en: 'Four times daily', hi: 'दिन में चार बार', mr: 'दिवसातून चार वेळा' },
  SOS: { en: 'Only when needed', hi: 'केवल ज़रूरत होने पर', mr: 'फक्त गरज असल्यास' },
  STAT: { en: 'Immediately, once', hi: 'तुरंत, एक बार', mr: 'लगेच, एकदा' },
  weekly: { en: 'Once a week', hi: 'हफ़्ते में एक बार', mr: 'आठवड्यातून एकदा' }
}
export const TIMINGS = {
  after_food: { en: 'After food', hi: 'खाने के बाद', mr: 'जेवणानंतर' },
  before_food: { en: 'Before food', hi: 'खाने से पहले', mr: 'जेवणापूर्वी' },
  with_food: { en: 'With food', hi: 'खाने के साथ', mr: 'जेवणासोबत' },
  empty_stomach: { en: 'Empty stomach', hi: 'खाली पेट', mr: 'उपाशीपोटी' },
  bedtime: { en: 'At bedtime', hi: 'सोते समय', mr: 'झोपताना' },
  any: { en: 'Any time', hi: 'किसी भी समय', mr: 'कधीही' }
}
export const VITAL_FIELDS = [
  ['bpSys', 'BP systolic', 'mmHg', 70, 250], ['bpDia', 'BP diastolic', 'mmHg', 40, 150], ['pulse', 'Heart rate', '/min', 30, 220], ['temp', 'Temperature', '°F', 92, 108],
  ['spo2', 'SpO₂', '%', 50, 100], ['height', 'Height', 'cm', 30, 230], ['weight', 'Weight', 'kg', 1, 250], ['glucose', 'Blood glucose', 'mg/dL', 20, 600], ['resp', 'Respiratory rate', '/min', 6, 60]
]
// Values outside these ranges are highlighted for attention (no interpretation).
export const VITAL_NORMAL = { bpSys: [90, 139], bpDia: [60, 89], pulse: [60, 100], temp: [97, 99.5], spo2: [95, 100], glucose: [70, 140], resp: [12, 20] }

function checkVitals(v) {
  for (const [k, label, , min, max] of VITAL_FIELDS) {
    if (v[k] === '' || v[k] == null) continue
    const n = Number(v[k])
    if (Number.isNaN(n) || n < min || n > max) fail(`${label}: please check the value (${min}–${max})`)
  }
}

export function recordVitals({ patientId, admissionId, apptId, values, note }) {
  const u = need('vitals.record')
  const clean = Object.fromEntries(Object.entries(values).filter(([, x]) => x !== '' && x != null).map(([k, x]) => [k, Number(x)]))
  if (!Object.keys(clean).length) fail('Enter at least one reading')
  checkVitals(clean)
  const v = db.insert('vitals', { id: uid('vt'), patientId, admissionId, apptId, values: clean, note: note || '', by: u.id, at: new Date().toISOString() })
  audit('create', 'vitals', v.id, 'Vitals recorded')
  return v
}
export const latestVitals = (patientId, apptId) =>
  db.list('vitals', (v) => v.patientId === patientId && (!apptId || v.apptId === apptId)).sort((a, b) => b.at.localeCompare(a.at))[0]

/* ---------- Consultation ---------- */
export function openConsultation(apptId) {
  const u = need('consult')
  const a = db.get('appointments', apptId)
  let c = db.find('consultations', (x) => x.apptId === apptId)
  if (!c) {
    const triage = latestVitals(a.patientId, apptId)
    c = db.insert('consultations', { id: uid('cn'), apptId, patientId: a.patientId, doctorId: u.staffId, date: a.date, status: 'draft', vitals: triage?.values || {}, complaints: a.reason || '', symptoms: '', duration: '', exam: '', diagnosis: '', plan: '', followUpNote: '', followUpDate: '', labOrderIds: [] })
  }
  return c
}

export function saveConsultation(id, patch) {
  const u = need('consult')
  const c = db.get('consultations', id)
  if (c.status === 'final') fail('This record is final and can no longer be edited.')
  if (c.doctorId !== u.staffId) fail('Only the treating doctor can edit this consultation')
  if (patch.vitals) checkVitals(patch.vitals)
  return db.update('consultations', id, patch)
}

export function finaliseConsultation(id) {
  const u = need('consult')
  const c = db.get('consultations', id)
  if (c.doctorId !== u.staffId) fail('Only the treating doctor can finalise this consultation')
  req(c.diagnosis || c.complaints, 'Enter the chief complaint or diagnosis before finishing')
  db.update('consultations', id, { status: 'final', finalizedAt: new Date().toISOString(), finalizedBy: u.id })
  if (c.vitals && Object.keys(c.vitals).length) db.insert('vitals', { id: uid('vt'), patientId: c.patientId, apptId: c.apptId, values: c.vitals, by: u.id, at: new Date().toISOString(), note: 'Recorded in consultation' })
  completeAppointment(c.apptId)
  audit('finalise', 'consultations', id, 'Consultation notes finalised')
}

// Corrections after finalising: append an addendum (original stays unchanged)
export function addAddendum(id, text) {
  const u = need('consult')
  req(text, 'Enter the note')
  const c = db.get('consultations', id)
  db.update('consultations', id, { addenda: [...(c.addenda || []), { at: new Date().toISOString(), by: u.id, text }] })
  audit('addendum', 'consultations', id, 'Addendum added')
}

/* ---------- Prescriptions ---------- */
export function savePrescription({ id, consultationId, patientId, items, diagnosis, advice, diet, followUpDate, patientNote, patientLang }, finalise = false) {
  const u = need('prescribe')
  const clean = (items || []).filter((i) => i.name?.trim())
  if (finalise && !clean.length && !advice?.trim()) fail('Add at least one medicine or advice')
  for (const i of clean) {
    if (!i.dose?.trim()) fail(`Enter the dose for ${i.name}`)
    if (!i.frequency) fail(`Choose how often to take ${i.name}`)
    if (!i.duration?.trim()) fail(`Enter for how many days to take ${i.name}`)
  }
  const doc = db.get('staff', u.staffId)
  const base = { consultationId, patientId, doctorId: u.staffId, date: today(), items: clean, diagnosis, advice, diet, followUpDate, patientNote, patientLang: patientLang || db.get('patients', patientId)?.lang || 'en' }
  let rx
  if (id) {
    const cur = db.get('prescriptions', id)
    if (cur.status === 'final') fail('This record is final and can no longer be edited.')
    rx = db.update('prescriptions', id, base)
  } else rx = db.insert('prescriptions', { id: uid('rx'), rxNo: nextNo('RX'), status: 'draft', dispenseStatus: 'pending', ...base })
  if (consultationId) db.update('consultations', consultationId, { prescriptionId: rx.id, followUpDate: followUpDate || '' })
  if (finalise) {
    rx = db.update('prescriptions', rx.id, { status: 'final', signedBy: u.id, signedAt: new Date().toISOString(), doctorName: doc.name, doctorRegNo: doc.regNo })
    audit('finalise', 'prescriptions', rx.id, `Prescription ${rx.rxNo} signed (${clean.length} medicines)`)
    notifyPatient(patientId, 'New prescription', `From ${doc.name}`, '/p/prescriptions', 'prescription')
    if (clean.length) notifyRole(['pharmacist'], 'New prescription to dispense', `${db.get('patients', patientId)?.name} · ${clean.length} item(s)`, '/s/pharmacy', 'prescription')
    sendMessage(patientId, 'prescription_ready', { doctor: doc.name, date: new Date().toLocaleDateString('en-IN') })
  }
  return rx
}

// A signed prescription is never edited. A correction creates a new version
// that replaces it; both stay in the record and in the audit trail.
export function amendPrescription(id, reason) {
  const u = need('prescribe')
  req(reason, 'Please enter the reason for the change')
  const old = db.get('prescriptions', id)
  if (old.doctorId !== u.staffId) fail('Only the prescribing doctor can amend this prescription')
  if (old.dispenseStatus === 'dispensed') fail('Medicines have already been given. Please write a new prescription.')
  db.update('prescriptions', id, { status: 'superseded', supersededReason: reason })
  const rx = db.insert('prescriptions', { ...old, id: uid('rx'), rxNo: old.rxNo + '-R' + ((old.revision || 0) + 1), revision: (old.revision || 0) + 1, replaces: id, status: 'draft', signedAt: null, createdAt: new Date().toISOString() })
  if (old.consultationId) db.update('consultations', old.consultationId, { prescriptionId: rx.id })
  audit('amend', 'prescriptions', id, `Prescription amended: ${reason}`)
  return rx
}

/* ---------- Nursing ---------- */
export function addNursingTask({ patientId, admissionId, title, due, assignedTo }) {
  const u = need('nursing')
  req(title, 'Enter the task')
  const t = db.insert('nursingTasks', { id: uid('nt'), patientId, admissionId, title, due: due || new Date().toISOString(), assignedTo, status: 'pending', fromDoctor: u.role === 'doctor', by: u.id })
  if (assignedTo) {
    const st = db.get('staff', assignedTo)
    if (st?.userId) db.insert('notifications', { id: uid('n'), userId: st.userId, title: 'New nursing task', body: title, link: '/s/nursing', kind: 'task', read: false })
  }
  audit('create', 'nursingTasks', t.id, title)
  return t
}
export function completeTask(id, note = '') {
  const u = need('nursing')
  db.update('nursingTasks', id, { status: 'done', doneAt: new Date().toISOString(), doneBy: u.id, note })
  audit('complete', 'nursingTasks', id, 'Task completed')
}
export function recordMedication({ patientId, admissionId, medicine, dose, route, note }) {
  const u = need('nursing')
  req(medicine, 'Enter the medicine'); req(dose, 'Enter the dose')
  const m = db.insert('medAdmin', { id: uid('ma'), patientId, admissionId, medicine, dose, route: route || 'Oral', note: note || '', by: u.id, at: new Date().toISOString() })
  audit('create', 'medAdmin', m.id, `${medicine} ${dose} ${route || ''}`)
  return m
}
export function addAdmissionNote(admissionId, kind, text) {
  const u = me()
  if (kind === 'doctor_visit' || kind === 'treatment') { if (u.role !== 'doctor') fail('Only doctors can add doctor notes') } else need('nursing')
  req(text, 'Enter the note')
  const a = db.get('admissions', admissionId)
  if (a.status !== 'admitted') fail('This patient has been discharged')
  db.update('admissions', admissionId, { notes: [...(a.notes || []), { at: new Date().toISOString(), by: u.id, kind, text }] })
  audit('note', 'admissions', admissionId, `${kind.replace('_', ' ')} note added`)
}
