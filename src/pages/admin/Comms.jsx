import { useState } from 'react'
import { Plus, Pin, Trash2, MessageCircle, Send, ShieldCheck, CheckCircle2, Smartphone } from 'lucide-react'
import { Page, Card, Button, Table, Field, Input, Select, Textarea, Toggle, Sheet, Badge, Empty, Chips, Stars, Tabs, useToast } from '../../components/ui'
import { PatientLine, doctorName, userName } from '../../components/common'
import PatientPicker from '../../components/PatientPicker'
import { useAuth } from '../../lib/auth'
import { db, useData } from '../../lib/db'
import { can } from '../../lib/rbac'
import { publishAnnouncement, removeAnnouncement, saveTip, approveTip, respondFeedback, sendMessage, markMessageSent, TEMPLATE_NAMES } from '../../lib/actions'
import { fmtDateTime, timeAgo, waLink, smsLink, today, addDays, cls } from '../../lib/utils'

function Announcements() {
  const toast = useToast()
  const { user } = useAuth()
  const [f, setF] = useState(null)
  const rows = useData((d) => d.list('announcements').sort((a, b) => (b.pinned - a.pinned) || b.createdAt.localeCompare(a.createdAt)))
  const pub = can(user, 'announcements.publish')
  const KIND = { timing: 'Changed timings', doctor: 'New doctor', camp: 'Health camp', vaccination: 'Vaccination drive', holiday: 'Holiday', notice: 'Notice' }
  return (
    <Page title="Announcements" wide actions={pub && <Button icon={Plus} onClick={() => setF({ title: '', body: '', audience: 'patients', kind: 'notice', pinned: false, expiresAt: addDays(today(), 7) })}>New announcement</Button>}>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rows.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-center gap-2 mb-2">{a.pinned && <Pin size={14} className="text-brand-600" />}<Badge color={a.audience === 'staff' ? 'purple' : a.audience === 'patients' ? 'sky' : 'green'}>{{ staff: 'Staff', patients: 'Patients', all: 'Everyone' }[a.audience]}</Badge><Badge>{KIND[a.kind]}</Badge><span className="text-[11px] text-ink-400 ml-auto">{timeAgo(a.createdAt)}</span></div>
            <div className="font-bold" translate="no">{a.title}</div><p className="text-sm text-ink-700 mt-1 whitespace-pre-line" translate="no">{a.body}</p>
            <div className="flex items-center justify-between mt-3 text-xs text-ink-500"><span>{userName(a.by)}{a.expiresAt ? ` · till ${fmtDateTime(a.expiresAt).split(',')[0]}` : ''}</span>{pub && <button aria-label="Delete" onClick={() => { removeAnnouncement(a.id); toast('Removed') }} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-red-50 text-red-600"><Trash2 size={15} /></button>}</div>
          </Card>
        ))}
        {!rows.length && <Empty title="No announcements" />}
      </div>
      <Sheet open={!!f} onClose={() => setF(null)} title="New announcement" footer={<Button block size="lg" icon={Send} onClick={() => { try { publishAnnouncement({ ...f, expiresAt: f.expiresAt ? new Date(f.expiresAt + 'T23:59:00').toISOString() : '' }); toast('Published – notifications sent'); setF(null) } catch (e) { toast(e.message, 'error') } }}>Publish</Button>}>
        {f && <>
          <Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Message" hint="Write in the language your patients read – English, Hindi or Marathi"><Textarea rows={4} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Who should see it"><Select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}><option value="patients">Patients</option><option value="staff">Staff only</option><option value="all">Everyone</option></Select></Field>
            <Field label="Type"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Show until"><Input type="date" min={today()} value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} /></Field>
          </div>
          <Toggle label="Pin to top" checked={f.pinned} onChange={(v) => setF({ ...f, pinned: v })} />
        </>}
      </Sheet>
    </Page>
  )
}

function Content() {
  const toast = useToast()
  const { user } = useAuth()
  const [f, setF] = useState(null)
  const rows = useData((d) => d.list('healthTips').sort((a, b) => (a.status === 'draft' ? -1 : 1)))
  const L = [['en', 'English'], ['hi', 'हिंदी'], ['mr', 'मराठी']]
  return (
    <Page title="Health content" subtitle="Patient education in English, Hindi and Marathi – reviewed by a doctor before publishing" wide actions={<Button icon={Plus} onClick={() => setF({ emoji: '💡', topic: 'prevention', title: { en: '', hi: '', mr: '' }, body: { en: '', hi: '', mr: '' } })}>New article</Button>}>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {rows.map((t) => (
          <Card key={t.id} className="p-4">
            <div className="flex items-start gap-3"><span className="text-3xl">{t.emoji}</span><div className="flex-1 min-w-0" translate="no"><div className="font-bold">{t.title.en}</div><div className="text-sm text-ink-500">{t.title.hi || '— Hindi missing'} · {t.title.mr || '— Marathi missing'}</div></div></div>
            <div className="flex items-center gap-2 mt-3">
              {t.status === 'published' ? <Badge color="green"><ShieldCheck size={12} /> Reviewed by {doctorName(t.reviewedBy)}</Badge> : <Badge color="amber">Draft – needs doctor review</Badge>}
              <div className="ml-auto flex gap-1"><Button size="sm" variant="ghost" onClick={() => setF(JSON.parse(JSON.stringify(t)))}>Edit</Button>{t.status === 'draft' && user.role === 'doctor' && <Button size="sm" variant="success" icon={CheckCircle2} onClick={() => { try { approveTip(t.id); toast('Reviewed & published') } catch (e) { toast(e.message, 'error') } }}>Approve</Button>}</div>
            </div>
          </Card>
        ))}
      </div>
      <Sheet open={!!f} onClose={() => setF(null)} title="Health article" wide footer={<Button block size="lg" onClick={() => { try { saveTip(f); toast('Saved as draft – a doctor must approve it'); setF(null) } catch (e) { toast(e.message, 'error') } }}>Save draft</Button>}>
        {f && <div translate="no">
          <div className="grid grid-cols-[80px_1fr] gap-3"><Field label="Icon"><Input value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })} /></Field><Field label="Topic"><Select value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}>{['diabetes', 'bp', 'seasonal', 'nutrition', 'prevention', 'women', 'children'].map((x) => <option key={x}>{x}</option>)}</Select></Field></div>
          {L.map(([k, l]) => <div key={k} className="rounded-2xl border border-ink-200 p-3 mb-3"><div className="text-xs font-bold text-ink-500 mb-2">{l}</div><Input className="mb-2" placeholder="Title" value={f.title[k]} onChange={(e) => setF({ ...f, title: { ...f.title, [k]: e.target.value } })} /><Textarea rows={3} placeholder="Simple, clear text" value={f.body[k]} onChange={(e) => setF({ ...f, body: { ...f.body, [k]: e.target.value } })} /></div>)}
          <p className="text-xs text-ink-500">Any change sends the article back for doctor review. Use simple words – avoid medical jargon.</p>
        </div>}
      </Sheet>
    </Page>
  )
}

const MSG_STATUS = { ready: ['Tap to send', 'amber'], queued: ['Queued', 'blue'], sent: ['Sent', 'green'], blocked_no_consent: ['No consent – not sent', 'red'], skipped: ['Off', 'gray'], failed: ['Failed', 'red'] }
function Messages() {
  const toast = useToast()
  const [f, setF] = useState('all')
  const [compose, setCompose] = useState(null)
  const cfg = useData((d) => d.setting('messaging', {}))
  const rows = useData((d) => d.list('messages', (m) => f === 'all' || m.status === f).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200))
  return (
    <Page title="WhatsApp & SMS" subtitle={`WhatsApp: ${{ click_to_chat: 'sent from your phone (click-to-chat)', api: 'WhatsApp Business API', demo: 'demo', off: 'off' }[cfg.whatsappProvider || 'click_to_chat']} · SMS: ${cfg.smsProvider || 'demo'}`} wide actions={<Button icon={MessageCircle} onClick={() => setCompose({ patientId: null, text: '', channel: 'whatsapp' })}>New message</Button>}>
      <Chips className="mb-3" value={f} onChange={setF} options={[{ value: 'all', label: 'All' }, ...Object.entries(MSG_STATUS).map(([k, [l]]) => ({ value: k, label: l }))]} />
      <Table rows={rows} empty="No messages" columns={[
        { label: 'Patient', render: (m) => <MsgPat id={m.patientId} /> },
        { label: 'Message', render: (m) => <div><div className="text-xs font-semibold text-ink-500">{TEMPLATE_NAMES[m.template] || m.template} · {m.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} · <span translate="no">{m.lang.toUpperCase()}</span></div><div className="text-sm line-clamp-2" translate="no">{m.text}</div></div> },
        { label: 'When', render: (m) => timeAgo(m.createdAt), nowrap: true, hideMobile: true },
        { label: 'Status', render: (m) => <Badge color={MSG_STATUS[m.status]?.[1]}>{MSG_STATUS[m.status]?.[0] || m.status}</Badge> },
        { label: '', right: true, render: (m) => m.status === 'ready' && <a href={m.channel === 'whatsapp' ? waLink(m.phone, m.text) : smsLink(m.phone, m.text)} target="_blank" rel="noreferrer" onClick={() => markMessageSent(m.id)} className="h-9 px-3 rounded-xl bg-[#25D366] text-white text-sm font-semibold inline-flex items-center gap-1.5"><Smartphone size={15} /> Send</a> }
      ]} />
      <p className="text-xs text-ink-500 mt-3">Messages are sent only to patients who agreed (consent recorded on their profile), in the patient’s chosen language. With click-to-chat, tap “Send” to open WhatsApp with the message ready. Connect a WhatsApp Business API / SMS provider in Settings to send automatically.</p>
      <Sheet open={!!compose} onClose={() => setCompose(null)} title="New message" footer={<Button block size="lg" icon={Send} onClick={() => { const m = sendMessage(compose.patientId, 'custom', { text: compose.text }, { channel: compose.channel }); toast(!m ? 'Choose a patient with a mobile number' : m.status === 'blocked_no_consent' ? 'Patient has not agreed to these messages' : 'Message added', !m || m.status === 'blocked_no_consent' ? 'error' : 'success'); if (m) setCompose(null) }}>Send</Button>}>
        {compose && <>
          <Field label="Patient"><PatientPicker value={compose.patientId} onChange={(id) => setCompose({ ...compose, patientId: id })} allowNew={false} /></Field>
          <Field label="Channel"><Tabs value={compose.channel} onChange={(v) => setCompose({ ...compose, channel: v })} tabs={[{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'sms', label: 'SMS' }]} /></Field>
          <Field label="Message"><Textarea rows={4} value={compose.text} onChange={(e) => setCompose({ ...compose, text: e.target.value })} /></Field>
        </>}
      </Sheet>
    </Page>
  )
}
const MsgPat = ({ id }) => { const p = useData((d) => d.get('patients', id)); return <PatientLine p={p} showPhone={false} /> }

function Feedback() {
  const toast = useToast()
  const [f, setF] = useState('open')
  const [reply, setReply] = useState(null)
  const rows = useData((d) => d.list('feedback', (x) => (f === 'open' ? x.status !== 'resolved' : f === 'complaint' ? x.kind === 'complaint' : true)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  const all = useData((d) => d.list('feedback'))
  const avg = (k) => (all.length ? (all.reduce((s, x) => s + (x.ratings[k] || 0), 0) / all.length).toFixed(1) : '—')
  const L = { doctor: 'Doctor', reception: 'Reception', waiting: 'Waiting time', cleanliness: 'Cleanliness', overall: 'Overall' }
  return (
    <Page title="Patient feedback" wide>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">{Object.entries(L).map(([k, l]) => <Card key={k} className="p-4"><div className="text-2xl font-extrabold">{avg(k)} <span className="text-amber-500 text-lg">★</span></div><div className="text-xs text-ink-500 font-semibold">{l}</div></Card>)}</div>
      <Chips className="mb-3" value={f} onChange={setF} options={[{ value: 'open', label: 'To review' }, { value: 'complaint', label: 'Complaints' }, { value: 'all', label: 'All' }]} />
      <div className="grid md:grid-cols-2 gap-3">
        {rows.map((x) => (
          <Card key={x.id} className={cls('p-4', x.kind === 'complaint' && 'border border-red-200')}>
            <div className="flex items-center gap-2"><Stars value={x.ratings.overall} size={18} />{x.kind === 'complaint' && <Badge color="red">Complaint</Badge>}{x.private && <Badge>Private</Badge>}<Badge color={x.status === 'resolved' ? 'green' : x.status === 'in_review' ? 'amber' : 'blue'} className="ml-auto">{{ new: 'New', in_review: 'In review', resolved: 'Resolved' }[x.status]}</Badge></div>
            <div className="text-xs text-ink-500 mt-2">{db.get('patients', x.patientId)?.name} · {doctorName(x.doctorId)} · {timeAgo(x.createdAt)}</div>
            <div className="flex flex-wrap gap-1.5 mt-2">{Object.entries(L).filter(([k]) => k !== 'overall').map(([k, l]) => <span key={k} className="text-[11px] rounded-md bg-ink-100 px-1.5 py-0.5">{l} {x.ratings[k]}/5</span>)}</div>
            {x.comment && <p className="text-sm mt-2" translate="no">{x.comment}</p>}
            {x.response && <p className="text-sm mt-2 rounded-xl bg-brand-50 p-2"><b>Reply:</b> <span translate="no">{x.response}</span></p>}
            {x.status !== 'resolved' && <div className="flex gap-2 mt-3"><Button size="sm" onClick={() => setReply({ id: x.id, text: '', status: 'resolved' })}>Reply & resolve</Button>{x.status === 'new' && <Button size="sm" variant="ghost" onClick={() => respondFeedback(x.id, '', 'in_review')}>Mark in review</Button>}</div>}
          </Card>
        ))}
        {!rows.length && <Empty title="Nothing to review" />}
      </div>
      <p className="text-xs text-ink-500 mt-3">Feedback is private. Patient details are never shown publicly.</p>
      <Sheet open={!!reply} onClose={() => setReply(null)} title="Reply to patient" footer={<Button block size="lg" onClick={() => { respondFeedback(reply.id, reply.text, reply.status); toast('Reply sent'); setReply(null) }}>Send reply</Button>}>
        {reply && <Textarea rows={4} value={reply.text} onChange={(e) => setReply({ ...reply, text: e.target.value })} placeholder="Thank the patient and say what you will do" />}
      </Sheet>
    </Page>
  )
}

export default function Comms({ tab }) {
  if (tab === 'content') return <Content />
  if (tab === 'messages') return <Messages />
  if (tab === 'feedback') return <Feedback />
  return <Announcements />
}
