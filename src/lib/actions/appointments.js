import { db } from '../db'
import { uid, today, toMin, fromMin, isoDay } from '../utils'
import { apptVars, audit, fail, me, need, nextNo, notifyPatient, notifyStaff, req, sendMessage } from './core'
import { registerPatient } from './patients'
import { createBill } from './billing'

export const APPT_TYPES = {
  general: 'General consultation', specialist: 'Specialist consultation', followup: 'Follow-up consultation', online: 'Online consultation', emergency: 'Emergency visit'
}
export const APPT_STATUS = {
  booked: 'Booked', arrived: 'Waiting', in_consultation: 'In consultation', completed: 'Completed', cancelled: 'Cancelled', no_show: 'Did not come'
}
const ACTIVE = ['booked', 'arrived', 'in_consultation']

export const doctors = () => db.list('staff', (s) => s.role === 'doctor' && s.active && !s.noOpd)

export function onLeave(doctorId, day) {
  return db.list('leaves', (l) => l.staffId === doctorId && l.status === 'approved' && l.from <= day && l.to >= day).length > 0
}
export function worksOn(doc, day) {
  const wd = new Date(day + 'T00:00:00').getDay()
  return !!doc?.availability?.days?.includes(wd) && !onLeave(doc.id, day)
}

// Free time slots for a doctor on a day (respecting sessions, breaks, leave,
// daily maximum and slots already booked).
export function slotsFor(doctorId, day) {
  const doc = db.get('staff', doctorId)
  if (!doc?.availability || !worksOn(doc, day)) return { slots: [], reason: onLeave(doctorId, day) ? 'leave' : 'off' }
  const av = doc.availability
  const taken = db.list('appointments', (a) => a.doctorId === doctorId && a.date === day && a.status !== 'cancelled')
  if (av.maxPerDay && taken.filter((a) => a.priority !== 'emergency').length >= av.maxPerDay) return { slots: [], reason: 'full' }
  const busy = new Set(taken.map((a) => a.time))
  const nowMin = day === today() ? new Date().getHours() * 60 + new Date().getMinutes() : -1
  const slots = []
  for (const s of av.sessions || []) {
    for (let m = toMin(s.start); m + av.slotMins <= toMin(s.end); m += av.slotMins) {
      const t = fromMin(m)
      slots.push({ time: t, session: toMin(s.start) < 15 * 60 ? 'morning' : 'evening', free: !busy.has(t) && m > nowMin })
    }
  }
  return { slots, reason: slots.some((s) => s.free) ? '' : 'full' }
}

export function nextToken(doctorId, day) {
  const max = Math.max(0, ...db.list('appointments', (a) => a.doctorId === doctorId && a.date === day).map((a) => Number(a.token) || 0))
  return max + 1
}

export function bookAppointment({ patientId, doctorId, date, time, type = 'general', reason = '', source, walkIn = false }) {
  const u = me()
  const p = db.get('patients', patientId)
  if (!p) fail('Please choose a patient')
  if (u.role === 'patient') {
    const mine = db.get('patients', u.patientId)
    if ((p.familyId || p.id) !== (mine.familyId || mine.id)) fail('You can only book for yourself or your family members')
  } else need('appointments.manage')
  const doc = db.get('staff', doctorId)
  if (!doc) fail('Please choose a doctor')
  if (walkIn) {
    // Walk-in at reception: next token for today, even outside fixed slots
    if (u.role === 'patient') fail('You do not have permission to do this.')
    const n = new Date(); date = today(); time = `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
  }
  req(date, 'Please choose a date'); req(time, 'Please choose a time slot')
  if (date < today()) fail('Please choose today or a later date')
  if (!worksOn(doc, date)) fail(onLeave(doctorId, date) ? 'The doctor is on leave on this day' : 'The doctor is not available on this day')
  if (!walkIn && db.find('appointments', (a) => a.doctorId === doctorId && a.date === date && a.time === time && a.status !== 'cancelled')) fail('Sorry, this slot was just booked. Please pick another.')
  if (db.find('appointments', (a) => a.patientId === patientId && a.doctorId === doctorId && a.date === date && ACTIVE.includes(a.status))) fail('This patient already has an appointment with this doctor on that day')
  if (type === 'online' && !doc.availability?.online) fail('This doctor does not offer online consultation')
  const a = db.insert('appointments', {
    id: uid('ap'), apptNo: nextNo('AP'), patientId, doctorId, deptId: doc.deptId, date, time, type, reason,
    token: nextToken(doctorId, date), fee: type === 'followup' ? doc.followUpFee : doc.fee, status: 'booked', priority: 'normal',
    source: source || (u.role === 'patient' ? 'app' : 'reception'), bookedBy: u.id,
    meetLink: type === 'online' ? `https://meet.jit.si/jeevo-${db.hospitalId}-${Math.random().toString(36).slice(2, 12)}` : ''
  })
  audit('create', 'appointments', a.id, `Booked ${a.apptNo} with ${doc.name}`)
  notifyPatient(patientId, 'Appointment confirmed', `${doc.name} · ${date} · Token ${a.token}`, '/p/appointments', 'appointment')
  notifyStaff(doctorId, 'New appointment', `${p.name} · ${date} ${time}`, '/s/appointments', 'appointment')
  sendMessage(patientId, 'appointment_confirmed', apptVars(a))
  return a
}

export function rescheduleAppointment(id, { date, time }) {
  const u = me()
  const a = db.get('appointments', id)
  if (!a || a.status !== 'booked') fail('Only booked appointments can be rescheduled')
  if (u.role !== 'patient') need('appointments.manage')
  const doc = db.get('staff', a.doctorId)
  if (!worksOn(doc, date)) fail('The doctor is not available on this day')
  if (db.find('appointments', (x) => x.id !== id && x.doctorId === a.doctorId && x.date === date && x.time === time && x.status !== 'cancelled')) fail('Sorry, this slot was just booked. Please pick another.')
  const out = db.update('appointments', id, { date, time, token: date === a.date ? a.token : nextToken(a.doctorId, date), rescheduledFrom: `${a.date} ${a.time}` })
  audit('update', 'appointments', id, `Rescheduled ${a.date} ${a.time} → ${date} ${time}`)
  notifyPatient(a.patientId, 'Appointment rescheduled', `${doc.name} · ${date} · Token ${out.token}`, '/p/appointments', 'appointment')
  sendMessage(a.patientId, 'appointment_rescheduled', apptVars(out))
  return out
}

export function cancelAppointment(id, reason = '') {
  const u = me()
  const a = db.get('appointments', id)
  if (!a || !['booked', 'arrived'].includes(a.status)) fail('This appointment can no longer be cancelled')
  if (u.role !== 'patient') need('appointments.manage')
  db.update('appointments', id, { status: 'cancelled', cancelReason: reason, cancelledBy: u.id, cancelledAt: new Date().toISOString() })
  audit('cancel', 'appointments', id, `Cancelled ${a.apptNo}${reason ? ': ' + reason : ''}`)
  sendMessage(a.patientId, 'appointment_cancelled', apptVars(a))
  if (u.role === 'patient') notifyStaff(a.doctorId, 'Appointment cancelled', `${db.get('patients', a.patientId)?.name} · ${a.date} ${a.time}`, '/s/appointments')
}

/* ---------- Queue ---------- */
export function checkIn(id, { collectFee, method } = {}) {
  need('queue.manage')
  const a = db.get('appointments', id)
  if (a.status !== 'booked') fail('Patient is already checked in')
  if (a.date !== today()) fail('Only today’s appointments can be checked in')
  let billId = a.billId
  if (!billId && a.fee > 0) {
    const doc = db.get('staff', a.doctorId)
    const b = createBill({ patientId: a.patientId, apptId: a.id, doctorId: a.doctorId, items: [{ type: 'consultation', refId: a.id, desc: `${a.type === 'followup' ? 'Follow-up' : 'Consultation'} – ${doc.name}`, qty: 1, rate: a.fee, discount: 0, taxPct: 0 }] }, collectFee ? { amount: a.fee, method } : null, { internal: true })
    billId = b.id
  }
  const out = db.update('appointments', id, { status: 'arrived', arrivedAt: new Date().toISOString(), billId })
  audit('checkin', 'appointments', id, `Checked in, token ${a.token}`)
  return out
}

export function startConsultation(id) {
  const u = me()
  const a = db.get('appointments', id)
  if (u.role !== 'doctor' && !['admin', 'super_admin', 'receptionist'].includes(u.role)) fail('You do not have permission to do this.')
  if (!['arrived', 'booked'].includes(a.status)) fail('This patient is not waiting')
  // a doctor sees one patient at a time: the previous one is completed
  db.list('appointments', (x) => x.doctorId === a.doctorId && x.status === 'in_consultation' && x.id !== id).forEach((x) => db.update('appointments', x.id, { status: 'completed', completedAt: new Date().toISOString() }))
  const out = db.update('appointments', id, { status: 'in_consultation', startedAt: new Date().toISOString(), arrivedAt: a.arrivedAt || new Date().toISOString() })
  alertUpcoming(a.doctorId, a.date)
  return out
}

export function completeAppointment(id) {
  const a = db.get('appointments', id)
  const out = db.update('appointments', id, { status: 'completed', completedAt: new Date().toISOString(), startedAt: a.startedAt || new Date().toISOString() })
  alertUpcoming(a.doctorId, a.date)
  return out
}
export function markNoShow(id) {
  need('queue.manage')
  db.update('appointments', id, { status: 'no_show' })
  audit('update', 'appointments', id, 'Marked as did not come')
}
export function setPriority(id, emergency) {
  need('queue.manage')
  db.update('appointments', id, { priority: emergency ? 'emergency' : 'normal' })
  audit('priority', 'appointments', id, emergency ? 'Marked as emergency' : 'Emergency flag removed')
}

// Ordered queue for a doctor today: emergencies first, then by token.
export function queueFor(doctorId, day = today()) {
  const rows = db.list('appointments', (a) => a.doctorId === doctorId && a.date === day && a.status !== 'cancelled')
  const rank = (a) => ({ in_consultation: 0, arrived: 1, booked: 2, completed: 3, no_show: 4 }[a.status])
  return rows.sort((a, b) => {
    const r = rank(a) - rank(b)
    if (r) return r
    if (rank(a) >= 3) return String(b.completedAt || '').localeCompare(String(a.completedAt || ''))
    const e = (b.priority === 'emergency') - (a.priority === 'emergency')
    return e || a.token - b.token
  })
}

export function avgConsultMins(doctorId) {
  const done = db.list('appointments', (a) => a.doctorId === doctorId && a.status === 'completed' && a.startedAt && a.completedAt).slice(0, 30)
  if (done.length < 3) return db.get('staff', doctorId)?.availability?.slotMins || db.setting('opd', {}).avgConsultMins || 10
  return Math.max(3, Math.round(done.reduce((s, a) => s + (new Date(a.completedAt) - new Date(a.startedAt)) / 60000, 0) / done.length))
}

// Position and approximate wait for one appointment
export function waitInfo(a) {
  if (!a || a.date !== today() || !['booked', 'arrived'].includes(a.status)) return null
  const q = queueFor(a.doctorId).filter((x) => ['in_consultation', 'arrived', 'booked'].includes(x.status))
  const pos = q.findIndex((x) => x.id === a.id)
  const ahead = q.slice(0, pos).filter((x) => x.status !== 'booked' || x.token < a.token).length
  const current = q.find((x) => x.status === 'in_consultation')
  return { ahead, minutes: ahead * avgConsultMins(a.doctorId), current: current?.token || null }
}

// When the queue moves, tell patients who are close to their turn (once).
function alertUpcoming(doctorId, day) {
  if (day !== today()) return
  const n = db.setting('messaging', {}).tokenAlertAhead || 3
  const q = queueFor(doctorId).filter((x) => ['arrived', 'booked'].includes(x.status))
  q.slice(0, n).forEach((a, i) => {
    if (a.tokenAlerted) return
    db.update('appointments', a.id, { tokenAlerted: true })
    notifyPatient(a.patientId, 'Your turn is coming soon', `Token ${a.token} · ${i} patient(s) ahead`, '/p/appointments', 'queue')
    sendMessage(a.patientId, 'token_near', { ...apptVars(a), ahead: i })
  })
}

/* ---------- Emergency ---------- */
// Minimal details so treatment is never delayed; the record is completed later.
export function registerEmergency({ name, phone, age, gender, complaint, doctorId, broughtBy, patientId }) {
  need('emergency.register')
  let p = patientId ? db.get('patients', patientId) : null
  if (!p) {
    p = registerPatient({ name: name?.trim() || `Unknown (${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})`, phone: phone || '', dob: age ? `${new Date().getFullYear() - Number(age)}-07-01` : `${new Date().getFullYear() - 30}-07-01`, ageOnly: true, gender: gender || '', emergencyName: broughtBy || '', familyId: undefined, lang: 'en' }, { quick: true, force: true, emergency: true })
    db.update('patients', p.id, { emergencyRegistered: true, incomplete: true })
  }
  const doc = doctorId ? db.get('staff', doctorId) : doctors()[0]
  const now = new Date()
  const a = db.insert('appointments', {
    id: uid('ap'), apptNo: nextNo('AP'), patientId: p.id, doctorId: doc.id, deptId: db.find('departments', (d) => /emergency/i.test(d.name))?.id || doc.deptId,
    date: today(), time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, type: 'emergency', priority: 'emergency',
    token: nextToken(doc.id, today()), fee: 0, status: 'arrived', arrivedAt: now.toISOString(), reason: complaint || 'Emergency', source: 'walk-in', bookedBy: me().id
  })
  audit('emergency', 'appointments', a.id, `Emergency registration: ${complaint || ''}`)
  notifyStaff(doc.id, 'Emergency patient waiting', `${p.name} – ${complaint || 'Emergency'}`, '/s/queue', 'emergency')
  db.list('users', (u) => u.role === 'nurse').forEach((u) => db.insert('notifications', { id: uid('n'), userId: u.id, title: 'Emergency patient arrived', body: `${p.name} – ${complaint || ''}`, link: '/s/emergency', kind: 'emergency', read: false }))
  return { patient: p, appointment: a }
}

/* ---------- Reminders (run when someone opens the app) ---------- */
export function runReminders() {
  const cfg = db.setting('messaging', {})
  if (!cfg.autoReminders) return
  const t = today()
  const tomorrow = isoDay(Date.now() + 86400000)
  db.list('appointments', (a) => a.status === 'booked' && (a.date === tomorrow || a.date === t) && !a.reminded).forEach((a) => {
    db.update('appointments', a.id, { reminded: true })
    sendMessage(a.patientId, 'appointment_reminder', apptVars(a))
  })
  db.list('consultations', (c) => c.followUpDate === tomorrow && !c.followUpReminded).forEach((c) => {
    db.update('consultations', c.id, { followUpReminded: true })
    sendMessage(c.patientId, 'followup_reminder', { doctor: db.get('staff', c.doctorId)?.name, date: c.followUpDate })
    notifyPatient(c.patientId, 'Follow-up reminder', `Your follow-up with ${db.get('staff', c.doctorId)?.name} is due tomorrow.`, '/p/book', 'reminder')
  })
}

/* ---------- Doctor availability ---------- */
export function saveAvailability(staffId, availability) {
  const u = me()
  const st = db.get('staff', staffId)
  if (!(u.role === 'doctor' && u.staffId === staffId)) need('staff.manage')
  if (!availability.days?.length) fail('Choose at least one working day')
  for (const s of availability.sessions || []) if (toMin(s.end) <= toMin(s.start)) fail('Session end time must be after start time')
  const ss = [...availability.sessions].sort((a, b) => toMin(a.start) - toMin(b.start))
  for (let i = 1; i < ss.length; i++) if (toMin(ss[i].start) < toMin(ss[i - 1].end)) fail('Sessions overlap – please check the break time')
  if (!(availability.slotMins >= 5)) fail('Appointment duration must be at least 5 minutes')
  db.update('staff', staffId, { availability: { ...availability, sessions: ss } })
  audit('update', 'staff', staffId, `Availability updated for ${st.name}`)
}
