import { db } from '../db'
import { uid, phone10, validPhone, validPin } from '../utils'
import { audit, fail, me, need, nextNo, req } from './core'

const norm = (s = '') => s.toLowerCase().replace(/\s+/g, ' ').trim()

// Search by mobile number, Patient ID, name or QR content ("JEEVO:<pid>").
export function searchPatients(q, limit = 30) {
  const raw = String(q || '').trim()
  if (!raw) return db.list('patients').slice(0, limit)
  const qr = raw.match(/^JEEVO:(.+)$/i)
  const s = norm(qr ? qr[1] : raw)
  const digits = s.replace(/\D/g, '')
  return db.list('patients', (p) =>
    norm(p.pid).includes(s) || norm(p.name).includes(s) ||
    (digits.length >= 4 && (phone10(p.phone).includes(digits) || phone10(p.altPhone).includes(digits)))
  ).slice(0, limit)
}

// Possible duplicates: same mobile + similar name, or same name + same date of birth.
export function findDuplicates({ name, phone, dob }, exceptId) {
  const n = norm(name), ph = phone10(phone)
  if (!n) return []
  return db.list('patients', (p) => p.id !== exceptId && (
    (ph && phone10(p.phone) === ph && (norm(p.name) === n || norm(p.name).split(' ')[0] === n.split(' ')[0])) ||
    (dob && p.dob === dob && norm(p.name) === n)
  ))
}

export const familyOf = (p) => (p ? db.list('patients', (x) => (x.familyId || x.id) === (p.familyId || p.id)) : [])

function validate(d, quick, emergency) {
  req(d.name, 'Please enter the patient’s name')
  if (!d.dob) fail('Please enter date of birth or age')
  if (!quick) req(d.gender, 'Please choose gender')
  if (d.phone && !validPhone(d.phone)) fail('Enter a valid 10-digit Indian mobile number')
  if (!emergency && !d.phone && !d.familyId) fail('Mobile number is required (or add the patient under a family member)')
  if (d.altPhone && !validPhone(d.altPhone)) fail('Alternate mobile number is not valid')
  if (d.emergencyPhone && !validPhone(d.emergencyPhone)) fail('Emergency contact number is not valid')
  if (d.pin && !validPin(d.pin)) fail('PIN code must be 6 digits')
}

const COMPLETE = ['name', 'dob', 'gender', 'phone', 'address', 'city', 'pin', 'emergencyPhone']
const isIncomplete = (d) => COMPLETE.some((k) => !String(d[k] || '').trim())

export function registerPatient(data, { quick = false, force = false, emergency = false, selfSignup = false } = {}) {
  const u = me()
  if (!selfSignup && u?.role !== 'patient') need('patients.register')
  if (u?.role === 'patient') {
    const mineP = db.get('patients', u.patientId)
    if (!data.familyId || (db.get('patients', data.familyId)?.familyId || data.familyId) !== (mineP.familyId || mineP.id)) fail('You can only add members to your own family')
  }
  validate(data, quick, emergency)
  if (!force) {
    const dups = findDuplicates(data)
    if (dups.length) { const e = new Error('duplicate'); e.duplicates = dups; throw e }
  }
  const id = uid('p')
  const head = data.familyId ? db.get('patients', data.familyId) : null
  const p = db.insert('patients', {
    id, pid: nextNo('PID'), lang: 'en', relation: 'self', vaccinations: [], allergies: '', conditions: '', bloodGroup: '',
    ...data,
    phone: phone10(data.phone || head?.phone || ''), altPhone: phone10(data.altPhone || ''), emergencyPhone: phone10(data.emergencyPhone || ''),
    familyId: head ? head.familyId || head.id : id,
    consent: { treatment: true, whatsapp: !!data.consent?.whatsapp, sms: !!data.consent?.sms, at: new Date().toISOString(), by: u?.id, ...(data.consent || {}) },
    incomplete: isIncomplete({ ...data, phone: data.phone || head?.phone }), createdBy: u?.id
  })
  audit('create', 'patients', p.id, quick ? 'Quick registration' : 'Patient registered')
  return p
}

export function updatePatient(id, patch) {
  const u = me()
  const p = db.get('patients', id)
  if (!p) fail('Patient not found')
  if (u?.role === 'patient') {
    const mineP = db.get('patients', u.patientId)
    if ((p.familyId || p.id) !== (mineP?.familyId || mineP?.id)) fail('You can only edit your own family’s details')
  } else need('patients.register')
  const next = { ...p, ...patch }
  validate(next, true, next.emergencyRegistered)
  const out = db.update('patients', id, { ...patch, phone: phone10(next.phone), altPhone: phone10(next.altPhone || ''), emergencyPhone: phone10(next.emergencyPhone || ''), incomplete: isIncomplete(next) })
  audit('update', 'patients', id, 'Patient details updated: ' + Object.keys(patch).join(', '))
  return out
}

export function setConsent(id, consent) {
  const p = db.get('patients', id)
  db.update('patients', id, { consent: { ...p.consent, ...consent, at: new Date().toISOString(), by: me()?.id } })
  audit('consent', 'patients', id, Object.entries(consent).map(([k, v]) => `${k}: ${v ? 'yes' : 'no'}`).join(', '))
}

export function addVaccination(patientId, v) {
  need('patients.clinical')
  req(v.name, 'Vaccine name is required')
  const p = db.get('patients', patientId)
  db.update('patients', patientId, { vaccinations: [...(p.vaccinations || []), { name: v.name, date: v.date, dose: v.dose || '', by: me()?.id }] })
  audit('update', 'patients', patientId, 'Vaccination added: ' + v.name)
}

// Everything clinical about a patient, newest first (for the doctor and the patient)
export function patientTimeline(patientId) {
  const items = []
  db.list('appointments', (a) => a.patientId === patientId).forEach((a) => items.push({ kind: 'appointment', at: `${a.date}T${a.time}`, rec: a }))
  db.list('consultations', (c) => c.patientId === patientId && c.status === 'final').forEach((c) => items.push({ kind: 'consultation', at: c.finalizedAt || c.createdAt, rec: c }))
  db.list('prescriptions', (r) => r.patientId === patientId && r.status === 'final').forEach((r) => items.push({ kind: 'prescription', at: r.createdAt, rec: r }))
  db.list('labOrders', (l) => l.patientId === patientId).forEach((l) => items.push({ kind: 'lab', at: l.createdAt, rec: l }))
  db.list('admissions', (a) => a.patientId === patientId).forEach((a) => items.push({ kind: 'admission', at: a.admittedAt, rec: a }))
  return items.sort((a, b) => String(b.at).localeCompare(String(a.at)))
}
