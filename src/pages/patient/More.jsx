import { useState } from 'react'
import { Route, Routes, useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { Bell, Phone, Siren, Ambulance, MapPin, MessageCircle, LogOut, UserPlus, Download, ShieldCheck, Languages, Star, ChevronRight, Pencil, QrCode, Mail, Clock } from 'lucide-react'
import { Page, Card, Button, Empty, Field, Input, Select, Textarea, Toggle, Stars, Badge, Sheet, Avatar, useToast, useConfirm } from '../../components/ui'
import { QR, doctorName } from '../../components/common'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { useAuth } from '../../lib/auth'
import { db, useData, resetDB } from '../../lib/db'
import { registerPatient, updatePatient, setConsent, submitFeedback } from '../../lib/actions'
import { CLOUD } from '../../lib/config'
import { canInstall, promptInstall, isStandalone } from '../../lib/install'
import { ageSex, fmtDate, timeAgo, telLink, waLink, dobFromAge, cls } from '../../lib/utils'
import { pick, LANGS } from '../../i18n'
import { DoctorList } from './Book'
import { useFamily } from './PatientApp'

function Contact() {
  const { hospital: h } = useAuth()
  const depts = useData((d) => d.list('departments', (x) => x.active))
  return (
    <Page title="Contact hospital" back>
      <Card className="p-4">
        <div className="font-bold text-lg">{h.name}</div>
        <div className="text-sm text-ink-500 flex gap-2 mt-1"><MapPin size={16} className="shrink-0 mt-0.5" />{h.address}, {h.city} {h.pin}</div>
        <div className="text-sm text-ink-500 flex gap-2 mt-1"><Clock size={16} className="shrink-0 mt-0.5" />{h.timings}</div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <a href={telLink(h.phone)} className="h-12 rounded-xl bg-brand-600 text-white font-semibold grid place-items-center"><span className="flex items-center gap-2"><Phone size={18} /> Call</span></a>
          <a href={waLink(h.whatsapp || h.phone, 'Hello')} target="_blank" rel="noreferrer" className="h-12 rounded-xl bg-[#25D366] text-white font-semibold grid place-items-center"><span className="flex items-center gap-2"><MessageCircle size={18} /> WhatsApp</span></a>
          <a href={h.mapUrl} target="_blank" rel="noreferrer" className="h-12 rounded-xl bg-brand-50 text-brand-800 font-semibold grid place-items-center">Directions</a>
          {h.email && <a href={`mailto:${h.email}`} className="h-12 rounded-xl bg-brand-50 text-brand-800 font-semibold grid place-items-center"><span className="flex items-center gap-2"><Mail size={16} /> Email</span></a>}
        </div>
      </Card>
      <Emergency inline />
      <h3 className="font-bold mt-5 mb-2">Departments</h3>
      <div className="grid grid-cols-2 gap-2">{depts.map((d) => <Card key={d.id} className="p-3 text-sm font-semibold">{d.icon} {d.name}</Card>)}</div>
    </Page>
  )
}

function Emergency({ inline }) {
  const { hospital: h } = useAuth()
  const body = (
    <div className="space-y-3 mt-4">
      <a href={telLink(h.emergencyPhone || '108')} className="flex items-center gap-4 rounded-2xl bg-red-600 text-white p-4 shadow-float"><Siren size={30} /><div className="flex-1"><div className="font-extrabold text-lg">Hospital emergency</div><div className="text-red-100" translate="no">{h.emergencyPhone}</div></div><Phone /></a>
      <a href={telLink(h.ambulancePhone || '108')} className="flex items-center gap-4 rounded-2xl bg-white border border-red-200 text-red-700 p-4"><Ambulance size={30} /><div className="flex-1"><div className="font-extrabold text-lg">Ambulance</div><div translate="no">{h.ambulancePhone || '108'}</div></div><Phone /></a>
      <a href={telLink('112')} className="flex items-center gap-4 rounded-2xl bg-white border border-ink-200 p-4"><ShieldCheck size={26} className="text-ink-700" /><div className="flex-1"><div className="font-bold">National emergency number</div><div className="text-ink-500">112</div></div><Phone className="text-ink-500" /></a>
      <p className="text-xs text-ink-500">In an emergency, come directly to the Emergency department – registration can be done later. Emergency services are available 24×7.</p>
    </div>
  )
  return inline ? body : <Page title="Emergency" back>{body}</Page>
}

function Notifications() {
  const { user } = useAuth()
  const nav = useNavigate()
  const rows = useData((d) => d.list('notifications', (n) => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  return (
    <Page title="Notifications" back actions={rows.some((n) => !n.read) && <Button size="sm" variant="ghost" onClick={() => rows.forEach((n) => !n.read && db.update('notifications', n.id, { read: true }))}>Mark all read</Button>}>
      <Card className="divide-y divide-ink-100">
        {rows.map((n) => (
          <button key={n.id} onClick={() => { db.update('notifications', n.id, { read: true }); n.link && nav(n.link) }} className={cls('w-full text-left px-4 py-3 flex gap-3', !n.read && 'bg-brand-50/50')}>
            <span className={cls('h-2 w-2 rounded-full mt-2 shrink-0', n.read ? 'bg-transparent' : 'bg-brand-600')} />
            <span className="flex-1 min-w-0"><span className="block font-semibold">{n.title}</span><span className="block text-sm text-ink-500" translate="no">{n.body}</span><span className="block text-[11px] text-ink-400 mt-0.5">{timeAgo(n.createdAt)}</span></span>
          </button>
        ))}
        {!rows.length && <Empty icon={Bell} title="No notifications" />}
      </Card>
    </Page>
  )
}

function MemberForm({ open, onClose, member }) {
  const toast = useToast()
  const { user } = useAuth()
  const [f, setF] = useState(() => member ? { ...member } : { name: '', age: '', gender: '', relation: 'child', lang: db.get('patients', user.patientId)?.lang || 'en' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = () => {
    try {
      if (member) updatePatient(member.id, { name: f.name, gender: f.gender, address: f.address, city: f.city, pin: f.pin, altPhone: f.altPhone, emergencyName: f.emergencyName, emergencyPhone: f.emergencyPhone, bloodGroup: f.bloodGroup, allergies: f.allergies, conditions: f.conditions, lang: f.lang })
      else registerPatient({ name: f.name.trim(), dob: f.age ? dobFromAge(f.age) : '', ageOnly: true, gender: f.gender, relation: f.relation, familyId: user.patientId, lang: f.lang, consent: db.get('patients', user.patientId)?.consent }, { quick: true, force: true })
      toast(member ? 'Details saved' : 'Family member added')
      onClose()
    } catch (e) { toast(e.message, 'error') }
  }
  return (
    <Sheet open={open} onClose={onClose} title={member ? 'Edit details' : 'Add family member'} footer={<Button block size="lg" onClick={save}>Save</Button>}>
      <Field label="Full name"><Input value={f.name} onChange={set('name')} /></Field>
      {!member && <div className="grid grid-cols-2 gap-3"><Field label="Age (years)"><Input inputMode="numeric" value={f.age} onChange={(e) => setF({ ...f, age: e.target.value.replace(/\D/g, '').slice(0, 3) })} /></Field>
        <Field label="Relation"><Select value={f.relation} onChange={set('relation')}><option value="spouse">Spouse</option><option value="child">Child</option><option value="parent">Parent</option><option value="other">Other</option></Select></Field></div>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Gender"><Select value={f.gender} onChange={set('gender')}><option value="">Choose</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></Select></Field>
        <Field label="Message language"><Select value={f.lang} onChange={set('lang')} translate="no">{LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</Select></Field>
      </div>
      {member && <>
        <Field label="Address"><Input value={f.address || ''} onChange={set('address')} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="City"><Input value={f.city || ''} onChange={set('city')} /></Field><Field label="PIN code"><Input inputMode="numeric" maxLength={6} value={f.pin || ''} onChange={set('pin')} /></Field></div>
        <Field label="Alternate mobile"><Input inputMode="numeric" maxLength={10} value={f.altPhone || ''} onChange={set('altPhone')} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Emergency contact name"><Input value={f.emergencyName || ''} onChange={set('emergencyName')} /></Field><Field label="Emergency contact mobile"><Input inputMode="numeric" maxLength={10} value={f.emergencyPhone || ''} onChange={set('emergencyPhone')} /></Field></div>
        <Field label="Blood group (optional)"><Select value={f.bloodGroup || ''} onChange={set('bloodGroup')}><option value="">Not known</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b}>{b}</option>)}</Select></Field>
        <Field label="Allergies (optional)"><Input value={f.allergies || ''} onChange={set('allergies')} placeholder="e.g. Penicillin" /></Field>
        <Field label="Existing medical conditions (optional)"><Input value={f.conditions || ''} onChange={set('conditions')} placeholder="e.g. Diabetes" /></Field>
      </>}
    </Sheet>
  )
}

function Profile() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const ask = useConfirm()
  const { members } = useFamily()
  const me = members.find((m) => m.id === user.patientId)
  const [edit, setEdit] = useState(null)
  const [qr, setQr] = useState(null)
  const [, force] = useState(0)
  if (!me) return null
  return (
    <Page title="Profile">
      <Card className="p-4 flex items-center gap-3">
        <Avatar name={me.name} size={56} user={{ name: me.name, color: '#0E7C74' }} />
        <div className="flex-1 min-w-0"><div className="font-bold text-lg truncate">{me.name}</div><div className="text-sm text-ink-500"><span translate="no">{me.pid}</span> · {ageSex(me)}</div><div className="text-xs text-ink-500" translate="no">+91 {me.phone}</div></div>
        <Button size="sm" variant="secondary" icon={QrCode} onClick={() => setQr(me)}>QR</Button>
      </Card>
      {me.incomplete && <button onClick={() => setEdit(me)} className="mt-3 w-full rounded-xl bg-amber-50 text-amber-800 text-sm font-semibold px-4 py-3 text-left">Some details are missing – tap to complete your profile</button>}

      <h3 className="font-bold mt-5 mb-2">My family</h3>
      <Card className="divide-y divide-ink-100">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={m.name} size={38} user={{ name: m.name, color: m.gender === 'female' ? '#DB2777' : '#0E7C74' }} />
            <div className="flex-1 min-w-0"><div className="font-semibold truncate">{m.name}</div><div className="text-xs text-ink-500"><span translate="no">{m.pid}</span> · {ageSex(m)} · {m.relation === 'self' ? 'You' : { spouse: 'Spouse', child: 'Child', parent: 'Parent' }[m.relation] || 'Family'}</div></div>
            <button aria-label="Show QR" onClick={() => setQr(m)} className="h-9 w-9 grid place-items-center rounded-full hover:bg-ink-100"><QrCode size={18} /></button>
            <button aria-label="Edit" onClick={() => setEdit(m)} className="h-9 w-9 grid place-items-center rounded-full hover:bg-ink-100"><Pencil size={16} /></button>
          </div>
        ))}
        <button onClick={() => setEdit('new')} className="w-full flex items-center gap-3 px-4 py-3.5 text-brand-700 font-semibold"><UserPlus size={20} /> Add family member</button>
      </Card>

      <h3 className="font-bold mt-5 mb-2">Language</h3>
      <Card className="p-4"><LanguageSwitcher /><p className="text-xs text-ink-500 mt-2">SMS / WhatsApp messages are sent in each person’s message language.</p></Card>

      <h3 className="font-bold mt-5 mb-2">Privacy & consent</h3>
      <Card className="px-4">
        <Toggle label="WhatsApp messages" desc="Appointment, report and payment updates on WhatsApp" checked={!!me.consent?.whatsapp} onChange={(v) => { setConsent(me.id, { whatsapp: v }); force((x) => x + 1) }} />
        <Toggle label="SMS messages" desc="Reminders by SMS" checked={!!me.consent?.sms} onChange={(v) => { setConsent(me.id, { sms: v }); force((x) => x + 1) }} />
      </Card>
      <p className="text-xs text-ink-500 mt-2 px-1">Your health records are private. Only the doctors and staff treating you can see them, and every access is recorded. To download or delete your data, contact the hospital (Digital Personal Data Protection Act, 2023).</p>

      <Card className="mt-5 divide-y divide-ink-100">
        {[[Star, 'My feedback', '/p/feedback'], [Phone, 'Contact hospital', '/p/contact'], [Siren, 'Emergency', '/p/emergency']].map(([Icon, label, to]) => (
          <button key={to} onClick={() => nav(to)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left"><Icon size={20} className="text-brand-600" /><span className="flex-1 font-semibold">{label}</span><ChevronRight size={18} className="text-ink-400" /></button>
        ))}
        {!isStandalone() && canInstall() && <button onClick={promptInstall} className="w-full flex items-center gap-3 px-4 py-3.5 text-left"><Download size={20} className="text-brand-600" /><span className="flex-1 font-semibold">Install app on this phone</span></button>}
      </Card>
      {!isStandalone() && !canInstall() && <p className="text-xs text-ink-500 mt-2 px-1">To install: open the browser menu ⋮ and choose “Add to Home screen”.</p>}

      <div className="space-y-2 mt-6">
        <Button block variant="outline" icon={LogOut} onClick={logout}>{CLOUD ? 'Log out' : 'Log out / switch demo account'}</Button>
        {!CLOUD && <Button block variant="ghost" onClick={async () => { if (await ask({ title: 'Reset demo data?', text: 'All changes made on this device will be lost.', danger: true, ok: 'Reset' })) { await resetDB(); toast('Demo data reset') } }}>Reset demo data</Button>}
      </div>

      {edit && <MemberForm open onClose={() => setEdit(null)} member={edit === 'new' ? null : edit} />}
      <Sheet open={!!qr} onClose={() => setQr(null)} title="Patient QR code">
        {qr && <div className="text-center pb-4"><QR text={`JEEVO:${qr.pid}`} size={220} className="mx-auto" /><div className="font-bold text-lg mt-3">{qr.name}</div><div className="text-ink-500" translate="no">{qr.pid}</div><p className="text-sm text-ink-500 mt-3">Show this at the reception for quick check-in.</p></div>}
      </Sheet>
    </Page>
  )
}

function FeedbackList() {
  const nav = useNavigate()
  const { ids } = useFamily()
  const rows = useData((d) => d.list('feedback', (f) => ids.includes(f.patientId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  return (
    <Page title="My feedback" back actions={<Button size="sm" onClick={() => nav('/p/feedback/new')}>New</Button>}>
      <div className="space-y-3">
        {rows.map((f) => (
          <Card key={f.id} className="p-4">
            <div className="flex justify-between"><Stars value={f.ratings.overall} size={18} /><Badge color={f.status === 'resolved' ? 'green' : f.status === 'in_review' ? 'amber' : 'blue'}>{{ new: 'Received', in_review: 'In review', resolved: 'Resolved' }[f.status]}</Badge></div>
            {f.comment && <p className="text-sm mt-2" translate="no">{f.comment}</p>}
            {f.response && <p className="text-sm mt-2 rounded-xl bg-brand-50 p-3"><span className="font-bold">Hospital: </span><span translate="no">{f.response}</span></p>}
            <div className="text-[11px] text-ink-400 mt-2">{fmtDate(f.createdAt)}{f.doctorId ? ` · ${doctorName(f.doctorId)}` : ''}</div>
          </Card>
        ))}
        {!rows.length && <Empty icon={Star} title="No feedback yet" />}
      </div>
    </Page>
  )
}

function FeedbackNew() {
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const toast = useToast()
  const a = useData((d) => sp.get('appt') && d.get('appointments', sp.get('appt')))
  const [r, setR] = useState({ doctor: 0, reception: 0, waiting: 0, cleanliness: 0, overall: 0 })
  const [comment, setComment] = useState('')
  const [complaint, setComplaint] = useState(false)
  const L = { doctor: 'Doctor experience', reception: 'Reception experience', waiting: 'Waiting time', cleanliness: 'Cleanliness', overall: 'Overall hospital experience' }
  const send = () => {
    try { submitFeedback({ apptId: a?.id, doctorId: a?.doctorId, patientId: a?.patientId, ratings: r, comment, private: true, kind: complaint ? 'complaint' : 'feedback' }); toast('Thank you for your feedback!'); nav('/p/feedback', { replace: true }) } catch (e) { toast(e.message, 'error') }
  }
  return (
    <Page title="Rate your visit" back>
      {a && <p className="text-sm text-ink-500 mb-3">{doctorName(a.doctorId)} · {fmtDate(a.date + 'T00:00:00')}</p>}
      <Card className="p-4 space-y-4">{Object.entries(L).map(([k, label]) => <div key={k}><div className="font-semibold text-sm mb-1">{label}</div><Stars value={r[k]} onChange={(v) => setR({ ...r, [k]: v })} size={32} /></div>)}</Card>
      <Field label="Your comments" className="mt-4"><Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell us what went well or what we can improve" /></Field>
      <Card className="px-4"><Toggle label="This is a complaint" desc="The hospital administrator will look into it and reply" checked={complaint} onChange={setComplaint} /></Card>
      <p className="text-xs text-ink-500 mt-2">Your feedback is private and shared only with the hospital management.</p>
      <Button block size="lg" className="mt-4" onClick={send}>Submit</Button>
    </Page>
  )
}

function Tip() {
  const { id } = useParams()
  const t = useData((d) => d.get('healthTips', id))
  if (!t || t.status !== 'published') return <Page title="Health awareness" back><Empty title="Not found" /></Page>
  return (
    <Page title="Health awareness" back>
      <Card className="p-5" translate="no">
        <div className="text-5xl">{t.emoji}</div>
        <h2 className="text-xl font-extrabold mt-3">{pick(t.title)}</h2>
        <p className="text-[16px] leading-relaxed text-ink-700 mt-3">{pick(t.body)}</p>
      </Card>
      <p className="text-xs text-ink-500 mt-3">Reviewed by {doctorName(t.reviewedBy)} on {fmtDate(t.reviewedAt)}. For awareness only – please consult your doctor for medical advice.</p>
    </Page>
  )
}

function Updates() {
  const loc = useLocation()
  const rows = useData((d) => d.list('announcements', (a) => a.audience !== 'staff' && (!a.expiresAt || a.expiresAt > new Date().toISOString())).sort((a, b) => (b.pinned - a.pinned) || b.createdAt.localeCompare(a.createdAt)))
  return (
    <Page title="Hospital updates" back>
      <div className="space-y-3">{rows.map((a) => (
        <Card key={a.id} id={a.id} className={cls('p-4', loc.hash === '#' + a.id && 'ring-2 ring-brand-300')}>
          <div className="font-bold" translate="no">{a.title}</div><p className="text-sm text-ink-700 mt-1 whitespace-pre-line" translate="no">{a.body}</p><div className="text-[11px] text-ink-400 mt-2">{timeAgo(a.createdAt)}</div>
        </Card>))}
        {!rows.length && <Empty title="No updates" />}
      </div>
    </Page>
  )
}

export default function More() {
  return (
    <Routes>
      <Route path="doctors" element={<DoctorList />} />
      <Route path="contact" element={<Contact />} />
      <Route path="emergency" element={<Emergency />} />
      <Route path="notifications" element={<Notifications />} />
      <Route path="profile" element={<Profile />} />
      <Route path="feedback" element={<FeedbackList />} />
      <Route path="feedback/new" element={<FeedbackNew />} />
      <Route path="tips/:id" element={<Tip />} />
      <Route path="updates" element={<Updates />} />
      <Route path="*" element={<Page title="Not found" back="/p"><Empty title="Page not found" /></Page>} />
    </Routes>
  )
}
