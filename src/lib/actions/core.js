// Shared building blocks for every action: who is acting, permission checks,
// audit trail, numbering, in-app notifications and patient messaging
// (WhatsApp / SMS) in the patient's own language, with consent checks.
import { db } from '../db'
import { can, unitOf, rolesOf } from '../rbac'
import { uid, phone10, fmtDate, hhmm, inr } from '../utils'
import { CLOUD } from '../config'

let sessionUserId = null
export const setSessionUser = (id) => { sessionUserId = id }
export const me = () => (sessionUserId ? db.getAny('users', sessionUserId) : null)
export const myStaff = () => { const u = me(); return u?.staffId ? db.get('staff', u.staffId) : null }

export class ActionError extends Error {}
export const fail = (msg) => { throw new ActionError(msg) }
export const need = (perm) => { const u = me(); if (!can(u, perm)) fail('You do not have permission to do this.'); return u }
export const req = (v, msg) => { if (v === undefined || v === null || String(v).trim() === '') fail(msg); return v }

/* ---------- Audit trail (who changed what, when) ---------- */
export function audit(action, entity, entityId, summary = '') {
  const u = me()
  db.insert('audit', { id: uid('au'), userId: u?.id, userName: u?.name, role: u?.role, unit: unitOf(u) || 'hospital', action, entity, entityId, summary, at: new Date().toISOString() })
}

/* ---------- Numbering: PREFIX-YYMM-0001 per hospital ---------- */
// Bills and receipts are numbered separately for each unit (hospital BL/RC, medical store PH/PR, laboratory LB-…/LR)
const NUMBERED = { AP: ['appointments', 'apptNo'], RX: ['prescriptions', 'rxNo'], LB: ['labOrders', 'orderNo'], BL: ['bills', 'billNo'], PH: ['bills', 'billNo'], LBL: ['bills', 'billNo'], RC: ['payments', 'receiptNo'], PR: ['payments', 'receiptNo'], LR: ['payments', 'receiptNo'], IP: ['admissions', 'admNo'], RF: ['referrals', 'refNo'], PID: ['patients', 'pid'] }
export function nextNo(prefix) {
  const counters = db.setting('counters', {})
  const [col, field] = NUMBERED[prefix] || []
  const own = (r) => prefix === 'PID' || String(r[field] || '').startsWith(prefix + '-')
  const used = col ? Math.max(0, ...db.list(col, own).map((r) => Number(String(r[field] || '').match(/(\d+)(?:-R\d+)?$/)?.[1]) || 0)) : 0
  const n = Math.max(counters[prefix] || 0, used, 1000) + 1
  if (!CLOUD) db.setSetting('counters', { ...counters, [prefix]: n }) // in the cloud the server keeps numbers unique
  if (prefix === 'PID') {
    const h = db.hospital()
    const pre = (h?.pidPrefix || h?.code || 'JV').replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase()
    return `${pre}-${String(n).padStart(6, '0')}`
  }
  const d = new Date()
  return `${prefix}-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}-${String(n).padStart(4, '0')}`
}

/* ---------- In-app notifications ---------- */
export function notify(userId, title, body = '', link = '', kind = 'info') {
  if (!userId) return
  db.insert('notifications', { id: uid('n'), userId, title, body, link, kind, read: false })
}
export const notifyRole = (roles, title, body, link, kind) =>
  db.list('users', (u) => roles.includes(u.role) && u.status === 'active').forEach((u) => notify(u.id, title, body, link, kind))
export const notifyStaff = (staffId, title, body, link, kind) => notify(db.get('staff', staffId)?.userId, title, body, link, kind)
// The app login(s) that should hear about a patient: the patient or their family head.
export function patientUsers(patientId) {
  const p = db.get('patients', patientId)
  if (!p) return []
  return db.list('users', (u) => u.role === 'patient' && u.patientId && (u.patientId === p.id || u.patientId === p.familyId || db.get('patients', u.patientId)?.familyId === (p.familyId || p.id))).map((u) => u.id)
}
export const notifyPatient = (patientId, title, body, link, kind) => patientUsers(patientId).forEach((id) => notify(id, title, body, link, kind))

/* ---------- WhatsApp / SMS messages in the patient's language ---------- */
const TPL = {
  appointment_confirmed: {
    en: 'Hello {name}, your appointment with {doctor} is confirmed for {date} at {time}. Token: {token}. – {hospital}',
    hi: 'नमस्ते {name}, {doctor} के साथ आपकी अपॉइंटमेंट {date} को {time} बजे तय है. टोकन: {token}. – {hospital}',
    mr: 'नमस्कार {name}, {doctor} यांच्यासोबत तुमची भेट {date} रोजी {time} वाजता निश्चित झाली आहे. टोकन: {token}. – {hospital}'
  },
  appointment_reminder: {
    en: 'Reminder: {name}, you have an appointment with {doctor} on {date} at {time}. Token {token}. Please carry old reports. – {hospital}',
    hi: 'याद दिलाना: {name}, {date} को {time} बजे {doctor} के साथ आपकी अपॉइंटमेंट है. टोकन {token}. पुरानी रिपोर्ट साथ लाएँ. – {hospital}',
    mr: 'आठवण: {name}, {date} रोजी {time} वाजता {doctor} यांच्यासोबत तुमची भेट आहे. टोकन {token}. जुने रिपोर्ट सोबत आणा. – {hospital}'
  },
  appointment_cancelled: {
    en: 'Hello {name}, your appointment with {doctor} on {date} has been cancelled. Call {phone} to book again. – {hospital}',
    hi: 'नमस्ते {name}, {date} को {doctor} के साथ आपकी अपॉइंटमेंट रद्द हो गई है. दोबारा बुक करने के लिए {phone} पर कॉल करें. – {hospital}',
    mr: 'नमस्कार {name}, {date} रोजीची {doctor} यांच्यासोबतची तुमची भेट रद्द झाली आहे. पुन्हा बुक करण्यासाठी {phone} वर कॉल करा. – {hospital}'
  },
  appointment_rescheduled: {
    en: 'Hello {name}, your appointment with {doctor} is moved to {date} at {time}. New token: {token}. – {hospital}',
    hi: 'नमस्ते {name}, {doctor} के साथ आपकी अपॉइंटमेंट अब {date} को {time} बजे है. नया टोकन: {token}. – {hospital}',
    mr: 'नमस्कार {name}, {doctor} यांच्यासोबतची तुमची भेट आता {date} रोजी {time} वाजता आहे. नवीन टोकन: {token}. – {hospital}'
  },
  token_near: {
    en: '{name}, your turn is coming soon. Token {token} – about {ahead} patient(s) ahead of you. Please reach the OPD of {doctor}. – {hospital}',
    hi: '{name}, आपकी बारी जल्द आने वाली है. टोकन {token} – आपसे पहले लगभग {ahead} मरीज़. कृपया {doctor} की OPD पर पहुँचें. – {hospital}',
    mr: '{name}, तुमचा नंबर लवकरच येत आहे. टोकन {token} – तुमच्या आधी सुमारे {ahead} रुग्ण. कृपया {doctor} यांच्या OPD जवळ या. – {hospital}'
  },
  prescription_ready: {
    en: 'Hello {name}, your prescription from {doctor} ({date}) is ready. Open the JeevO app or collect a printed copy at the hospital. – {hospital}',
    hi: 'नमस्ते {name}, {doctor} का आपका पर्चा ({date}) तैयार है. JeevO ऐप में देखें या अस्पताल से प्रिंट लें. – {hospital}',
    mr: 'नमस्कार {name}, {doctor} यांचे तुमचे प्रिस्क्रिप्शन ({date}) तयार आहे. JeevO ॲपमध्ये पहा किंवा रुग्णालयातून प्रत घ्या. – {hospital}'
  },
  report_ready: {
    en: 'Hello {name}, your lab report ({tests}) is ready. Open the JeevO app to view it or collect it from the lab. – {hospital}',
    hi: 'नमस्ते {name}, आपकी लैब रिपोर्ट ({tests}) तैयार है. JeevO ऐप में देखें या लैब से लें. – {hospital}',
    mr: 'नमस्कार {name}, तुमचा लॅब रिपोर्ट ({tests}) तयार आहे. JeevO ॲपमध्ये पहा किंवा लॅबमधून घ्या. – {hospital}'
  },
  payment_receipt: {
    en: 'Payment of {amount} received for bill {bill}. Receipt {receipt}. Thank you. – {hospital}',
    hi: 'बिल {bill} के लिए {amount} का भुगतान मिला. रसीद {receipt}. धन्यवाद. – {hospital}',
    mr: 'बिल {bill} साठी {amount} रक्कम मिळाली. पावती {receipt}. धन्यवाद. – {hospital}'
  },
  followup_reminder: {
    en: 'Hello {name}, your follow-up visit with {doctor} is due on {date}. Reply or call {phone} to book. – {hospital}',
    hi: 'नमस्ते {name}, {doctor} के साथ आपकी फॉलो-अप जाँच {date} को है. बुक करने के लिए {phone} पर कॉल करें. – {hospital}',
    mr: 'नमस्कार {name}, {doctor} यांच्याकडे तुमची फॉलो-अप तपासणी {date} रोजी आहे. बुक करण्यासाठी {phone} वर कॉल करा. – {hospital}'
  },
  discharge: {
    en: 'Hello {name}, you have been discharged. Please follow the advice in your discharge summary. Follow-up: {date}. Get well soon! – {hospital}',
    hi: 'नमस्ते {name}, आपको छुट्टी दे दी गई है. डिस्चार्ज सारांश में दी गई सलाह का पालन करें. फॉलो-अप: {date}. जल्दी स्वस्थ हों! – {hospital}',
    mr: 'नमस्कार {name}, तुम्हाला डिस्चार्ज दिला आहे. डिस्चार्ज सारांशातील सल्ला पाळा. फॉलो-अप: {date}. लवकर बरे व्हा! – {hospital}'
  },
  custom: { en: '{text}', hi: '{text}', mr: '{text}' }
}
export const TEMPLATE_NAMES = {
  appointment_confirmed: 'Appointment confirmation', appointment_reminder: 'Appointment reminder', appointment_cancelled: 'Appointment cancelled',
  appointment_rescheduled: 'Appointment rescheduled', token_near: 'Queue update', prescription_ready: 'Prescription ready', report_ready: 'Lab report ready',
  payment_receipt: 'Payment receipt', followup_reminder: 'Follow-up reminder', discharge: 'Discharge', custom: 'Custom message'
}

export function messageText(template, lang, vars) {
  const t = TPL[template] || TPL.custom
  return (t[lang] || t.en).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

// Common variables for an appointment-related message
export function apptVars(a) {
  const p = db.get('patients', a.patientId), doc = db.get('staff', a.doctorId), h = db.hospital()
  return { name: p?.name, doctor: doc?.name, date: fmtDate(a.date + 'T00:00:00'), time: hhmm(a.time), token: a.token, hospital: h?.shortName || h?.name, phone: h?.phone }
}

// Queue a WhatsApp/SMS message. Respects patient consent and the hospital's
// provider settings. 'click_to_chat' means staff send it from their own phone
// via WhatsApp (wa.me link); an API provider sends automatically from the server.
export function sendMessage(patientId, template, vars = {}, { channel } = {}) {
  const p = db.get('patients', patientId)
  if (!p || !phone10(p.phone)) return null
  const cfg = db.setting('messaging', {})
  const ch = channel || (cfg.whatsappProvider && cfg.whatsappProvider !== 'off' ? 'whatsapp' : 'sms')
  const consent = ch === 'whatsapp' ? p.consent?.whatsapp : p.consent?.sms
  const h = db.hospital()
  const text = messageText(template, p.lang || 'en', { hospital: h?.shortName || h?.name, phone: h?.phone, name: p.name, ...vars })
  const provider = ch === 'whatsapp' ? cfg.whatsappProvider || 'click_to_chat' : cfg.smsProvider || 'demo'
  const status = !consent ? 'blocked_no_consent' : provider === 'click_to_chat' ? 'ready' : provider === 'off' ? 'skipped' : 'queued'
  const m = db.insert('messages', { id: uid('msg'), patientId, phone: phone10(p.phone), channel: ch, template, lang: p.lang || 'en', text, status, provider, by: me()?.id })
  // Demo: an "API" provider is simulated – mark as sent a moment later.
  if (!CLOUD && status === 'queued' && provider === 'demo') setTimeout(() => db.update('messages', m.id, { status: 'sent', sentAt: new Date().toISOString() }), 1200)
  return m
}
export const markMessageSent = (id) => db.update('messages', id, { status: 'sent', sentAt: new Date().toISOString() })

export const money = inr
