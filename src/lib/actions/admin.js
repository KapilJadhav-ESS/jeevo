// Hospital configuration, staff & HR, announcements, health content, feedback,
// and the platform (Super Admin) tenant controls.
import { db } from '../db'
import { uid, phone10, validPhone, today } from '../utils'
import { audit, fail, me, need, notify, notifyRole, req } from './core'
import { UNIT_ROLES, unitOf, rolesOf, can } from '../rbac'

// Owners manage only their own unit's staff, leave, shifts and attendance
export const staffUnit = (st) => st?.unit || unitOf({ role: st?.role }) || 'hospital'
const myUnit = () => (me()?.role === 'super_admin' ? null : unitOf(me()))
const ownUnit = (st) => { const u = myUnit(); if (u && staffUnit(st) !== u) fail('This person belongs to another unit') }

export function saveHospital(patch) {
  need('config.manage')
  req(patch.name, 'Enter the hospital name')
  db.update('hospitals', db.hospitalId, patch)
  audit('update', 'hospitals', db.hospitalId, 'Hospital profile updated')
}
// Each unit's own profile (letterhead, licence, GSTIN …) is kept by its owner
export const UNIT_SETTING = { hospital: 'unit.hospital', pharmacy: 'unit.pharmacy', lab: 'unit.lab' }
export function saveSettings(key, value) {
  if (key.startsWith('unit.')) { need('config.unit'); if (me().role !== 'super_admin' && UNIT_SETTING[myUnit()] !== key) fail('You can only change your own unit') } else need('config.manage')
  db.setSetting(key, value)
  audit('update', 'settings', key, `Settings changed: ${key}`)
}

export function saveDepartment(d) {
  need('config.manage')
  req(d.name, 'Enter the department name')
  if (d.id) db.update('departments', d.id, d)
  else db.insert('departments', { ...d, id: uid('dep'), active: true })
  audit(d.id ? 'update' : 'create', 'departments', d.id || '', `Department: ${d.name}`)
}

export function saveService(s) {
  need('config.manage')
  req(s.name, 'Enter the service name')
  if (!(Number(s.price) >= 0)) fail('Enter the price')
  const old = s.id ? db.get('services', s.id) : null
  if (s.id) db.update('services', s.id, { ...s, price: Number(s.price) })
  else db.insert('services', { ...s, id: uid('svc'), price: Number(s.price), active: true })
  audit(s.id ? 'update' : 'create', 'services', s.id || '', old && old.price !== Number(s.price) ? `Price changed ₹${old.price} → ₹${s.price}: ${s.name}` : `Service: ${s.name}`)
}

export function saveStaff(st) {
  need('staff.manage')
  req(st.name, 'Enter the name'); req(st.role, 'Choose the role')
  const unit = myUnit() || st.unit || 'hospital'
  if (!UNIT_ROLES[unit].includes(st.role)) fail('This role is not available in your unit')
  if (st.id) ownUnit(db.get('staff', st.id))
  // a hospital doctor may also be an administrator (e.g. the main doctor)
  const { alsoAdmin, ...rest } = st
  const extraRoles = alsoAdmin && unit === 'hospital' && st.role === 'doctor' ? ['admin'] : []
  if (extraRoles.length && !can(me(), 'config.manage')) fail('Only the hospital administrator can give administrator rights')
  st = { ...rest, unit }
  if (!validPhone(st.phone)) fail('Enter a valid 10-digit mobile number (used for login)')
  const phone = phone10(st.phone)
  const clash = db.find('users', (u) => phone10(u.phone) === phone && u.staffId && u.staffId !== st.id)
  if (clash) fail('Another staff member already uses this mobile number')
  if (st.role === 'doctor' && !st.regNo) fail('Enter the medical registration number')
  if (st.id) {
    const cur = db.get('staff', st.id)
    const curUser = cur.userId ? db.get('users', cur.userId) : null
    if (curUser?.id === me().id && (curUser.role !== st.role || String(curUser.extraRoles || []) !== String(extraRoles))) fail('You cannot change your own role')
    db.update('staff', st.id, { ...st, phone })
    if (cur.userId) db.update('users', cur.userId, { name: st.name, phone, role: st.role, unit, extraRoles })
    audit('update', 'staff', st.id, `Staff updated: ${st.name}${cur.role !== st.role ? ` (role ${cur.role} → ${st.role})` : ''}`)
    return db.get('staff', st.id)
  }
  const id = uid('st'), userId = uid('u')
  const row = db.insert('staff', {
    availability: st.role === 'doctor' ? { days: [1, 2, 3, 4, 5, 6], sessions: [{ start: '10:00', end: '13:00' }, { start: '17:00', end: '20:00' }], slotMins: 10, maxPerDay: 40, online: false } : null,
    fee: 0, followUpFee: 0, active: true, joinedOn: today(), shift: 'morning', ...st, id, userId, phone
  })
  db.insert('users', { id: userId, name: st.name, phone, role: st.role, unit, extraRoles, staffId: id, status: 'active' })
  audit('create', 'staff', id, `Staff added: ${st.name} (${st.role})`)
  return row
}
export function setStaffActive(id, active) {
  need('staff.manage')
  const st = db.get('staff', id)
  ownUnit(st)
  if (st.userId === me().id) fail('You cannot deactivate your own account')
  db.update('staff', id, { active })
  if (st.userId) db.update('users', st.userId, { status: active ? 'active' : 'inactive' })
  audit(active ? 'activate' : 'deactivate', 'staff', id, `${st.name} ${active ? 'activated' : 'deactivated'} – app access ${active ? 'restored' : 'removed'}`)
}

export function applyLeave({ staffId, from, to, type, reason }) {
  const u = me()
  const sid = staffId || u.staffId
  if (sid !== u.staffId) { need('staff.manage'); ownUnit(db.get('staff', sid)) }
  req(from, 'Choose the start date'); req(to, 'Choose the end date')
  if (to < from) fail('End date must be on or after start date')
  const l = db.insert('leaves', { id: uid('lv'), staffId: sid, from, to, type: type || 'Casual leave', reason, status: 'pending' })
  notifyRole(['admin'], 'Leave request', `${db.get('staff', sid)?.name}: ${from} – ${to}`, '/s/staff/leave', 'hr')
  return l
}
export function decideLeave(id, approve) {
  need('leave.approve')
  const l = db.get('leaves', id)
  ownUnit(db.get('staff', l.staffId))
  db.update('leaves', id, { status: approve ? 'approved' : 'rejected', decidedBy: me().id })
  const st = db.get('staff', l.staffId)
  notify(st?.userId, approve ? 'Leave approved' : 'Leave not approved', `${l.from} – ${l.to}`, '/s/profile', 'hr')
  if (approve && st?.role === 'doctor') {
    const clash = db.list('appointments', (a) => a.doctorId === st.id && a.status === 'booked' && a.date >= l.from && a.date <= l.to)
    if (clash.length) notifyRole(['receptionist', 'admin'], 'Appointments to reschedule', `${st.name} is on leave – ${clash.length} booked appointment(s)`, '/s/appointments', 'hr')
  }
  audit(approve ? 'approve' : 'reject', 'leaves', id, `Leave ${approve ? 'approved' : 'rejected'} for ${st?.name}`)
}

export function markAttendance(staffId, date, status, time) {
  const u = me()
  if (staffId !== u.staffId) { need('staff.manage'); ownUnit(db.get('staff', staffId)) }
  const id = `at-${staffId}-${date}`
  const cur = db.get('attendance', id)
  if (cur) db.update('attendance', id, status === 'out' ? { out: time } : { status, in: cur.in || time })
  else db.insert('attendance', { id, staffId, date, status: status === 'out' ? 'present' : status, in: status === 'present' ? time : '', out: status === 'out' ? time : '' })
}
export function setShift(staffId, day, shift) {
  need('staff.manage')
  ownUnit(db.get('staff', staffId))
  const id = `sh-${staffId}-${day}`
  if (db.get('shifts', id)) db.update('shifts', id, { shift })
  else db.insert('shifts', { id, staffId, day, shift })
}

export function publishAnnouncement(a) {
  const u = need('announcements.publish')
  req(a.title, 'Enter a title'); req(a.body, 'Enter the message')
  const row = db.insert('announcements', { id: uid('an'), pinned: false, ...a, by: u.id })
  if (a.audience !== 'patients') notifyRole(['doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_tech'], a.title, a.body.slice(0, 80), '/s/announcements', 'announcement')
  if (a.audience !== 'staff') notifyRole(['patient'], a.title, a.body.slice(0, 80), '/p', 'announcement')
  audit('publish', 'announcements', row.id, a.title)
  return row
}
export function removeAnnouncement(id) { need('announcements.publish'); db.remove('announcements', id); audit('delete', 'announcements', id, 'Announcement removed') }

// Health content must be reviewed by a qualified doctor before patients see it.
export function saveTip(t) {
  need('healthtips.publish')
  req(t.title?.en, 'Enter the English title')
  if (t.id) db.update('healthTips', t.id, { ...t, status: 'draft', reviewedBy: null, reviewedAt: null })
  else db.insert('healthTips', { ...t, id: uid('tip'), status: 'draft' })
}
export function approveTip(id) {
  const u = me()
  if (u.role !== 'doctor') fail('Health content must be reviewed and approved by a doctor')
  const t = db.get('healthTips', id)
  if (!t.title?.hi || !t.title?.mr || !t.body?.hi || !t.body?.mr) fail('Add the Hindi and Marathi text before publishing')
  db.update('healthTips', id, { status: 'published', reviewedBy: u.staffId, reviewedAt: new Date().toISOString() })
  audit('approve', 'healthTips', id, 'Health content reviewed & published')
}

export function submitFeedback(f) {
  const u = me()
  if (!f.ratings?.overall) fail('Please give an overall rating')
  return db.insert('feedback', { id: uid('fb'), status: 'new', patientId: u.patientId, ...f })
}
export function respondFeedback(id, response, status = 'resolved') {
  const u = need('feedback.manage')
  const f = db.get('feedback', id)
  db.update('feedback', id, { response, status, respondedBy: u.id, respondedAt: new Date().toISOString() })
  const pu = db.find('users', (x) => x.patientId === f.patientId)
  if (pu && response) notify(pu.id, 'Reply to your feedback', response.slice(0, 90), '/p/feedback', 'feedback')
}

/* ---------- Platform (Super Admin) ---------- */
export const PLANS = {
  starter: { name: 'Starter', price: 999, doctors: 2, staff: 5, desc: 'Single-doctor clinics' },
  growth: { name: 'Growth', price: 2999, doctors: 10, staff: 40, desc: 'Small & medium hospitals' },
  pro: { name: 'Pro', price: 6999, doctors: 50, staff: 200, desc: 'Multispecialty hospitals with IPD, lab & pharmacy' }
}
export function saveTenant(h) {
  need('platform.manage')
  req(h.name, 'Enter the hospital name')
  req(h.code, 'Enter a short code')
  if (!/^[a-z0-9-]{3,40}$/.test(h.code)) fail('Hospital code: use 3–40 lowercase letters, numbers or dashes.')
  if (db.all('hospitals').some((x) => x.code === h.code && x.id !== h.id)) fail('That hospital code is already taken. Please choose another.')
  if (h.id) db.update('hospitals', h.id, h)
  else {
    const id = 'h-' + h.code
    db.insert('hospitals', { status: 'active', plan: 'starter', ...h, id, hospitalId: undefined })
  }
}
export function setTenantStatus(id, status) {
  need('platform.manage')
  db.update('hospitals', id, { status })
}

/* ---------- Insurance / cashless ---------- */
export const PREAUTH_STATUS = { not_required: 'Not required', requested: 'Pre-auth requested', approved: 'Pre-auth approved', rejected: 'Pre-auth rejected' }
export const CLAIM_STATUS = { none: 'Not submitted', submitted: 'Claim submitted', query: 'Query raised', settled: 'Settled', rejected: 'Rejected' }
export const insurers = () => db.setting('insurers', [])
export function saveAdmissionInsurance(admissionId, ins) {
  const u = need('insurance.manage')
  req(ins.insurer, 'Choose the insurance company / TPA')
  const a = db.get('admissions', admissionId)
  db.update('admissions', admissionId, { insurance: { ...(a.insurance || {}), ...ins, updatedBy: u.id, updatedAt: new Date().toISOString() } })
  audit('insurance', 'admissions', admissionId, `Insurance: ${ins.insurer} · pre-auth ${ins.preauthStatus || '-'} · claim ${ins.claimStatus || '-'}`)
}
