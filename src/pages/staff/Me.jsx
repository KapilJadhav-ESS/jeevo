import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Plus, Trash2, LogIn, Bell } from 'lucide-react'
import { Page, Card, Button, Field, Input, Select, Toggle, Tabs, Badge, Kv, Empty, Avatar, useToast, useConfirm } from '../../components/ui'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { useAuth } from '../../lib/auth'
import { db, useData, resetDB } from '../../lib/db'
import { roleLabel } from '../../lib/rbac'
import { saveAvailability, applyLeave, markAttendance } from '../../lib/actions'
import { fmtDate, timeAgo, today, cls, fmtPhone } from '../../lib/utils'
import { CLOUD } from '../../lib/config'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function AvailabilityEditor({ staff, onSaved }) {
  const toast = useToast()
  const [av, setAv] = useState(() => JSON.parse(JSON.stringify(staff.availability || { days: [1, 2, 3, 4, 5, 6], sessions: [{ start: '10:00', end: '13:00' }], slotMins: 10, maxPerDay: 30, online: false })))
  const setS = (i, k, v) => setAv({ ...av, sessions: av.sessions.map((s, j) => (j === i ? { ...s, [k]: v } : s)) })
  return (
    <div>
      <Field label="Working days"><div className="flex flex-wrap gap-1.5">{DAYS.map((d, i) => <button key={d} type="button" onClick={() => setAv({ ...av, days: av.days.includes(i) ? av.days.filter((x) => x !== i) : [...av.days, i].sort() })} className={cls('h-10 w-12 rounded-xl text-sm font-semibold border', av.days.includes(i) ? 'bg-brand-600 text-white border-brand-600' : 'border-ink-200')}>{d}</button>)}</div></Field>
      <Field label="Consultation hours" hint="The gap between sessions is the break time">
        <div className="space-y-2">{av.sessions.map((s, i) => (
          <div key={i} className="flex items-center gap-2"><span className="text-sm w-20 text-ink-500">{i === 0 ? 'Session 1' : `Session ${i + 1}`}</span><Input type="time" className="!h-10" value={s.start} onChange={(e) => setS(i, 'start', e.target.value)} /><span>–</span><Input type="time" className="!h-10" value={s.end} onChange={(e) => setS(i, 'end', e.target.value)} />{av.sessions.length > 1 && <button type="button" aria-label="Remove session" onClick={() => setAv({ ...av, sessions: av.sessions.filter((_, j) => j !== i) })} className="h-10 w-10 grid place-items-center rounded-lg hover:bg-ink-100"><Trash2 size={16} /></button>}</div>
        ))}</div>
        {av.sessions.length < 3 && <Button type="button" size="sm" variant="ghost" icon={Plus} className="mt-1" onClick={() => setAv({ ...av, sessions: [...av.sessions, { start: '17:00', end: '20:00' }] })}>Add session</Button>}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Appointment duration (minutes)"><Select value={av.slotMins} onChange={(e) => setAv({ ...av, slotMins: Number(e.target.value) })}>{[5, 10, 12, 15, 20, 30].map((x) => <option key={x} value={x}>{x}</option>)}</Select></Field>
        <Field label="Maximum appointments per day"><Input inputMode="numeric" value={av.maxPerDay} onChange={(e) => setAv({ ...av, maxPerDay: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></Field>
      </div>
      <Toggle label="Offer online (video) consultation" checked={!!av.online} onChange={(v) => setAv({ ...av, online: v })} />
      <Button className="mt-3" onClick={() => { try { saveAvailability(staff.id, av); toast('Availability saved'); onSaved?.() } catch (e) { toast(e.message, 'error') } }}>Save availability</Button>
    </div>
  )
}

export default function Me({ tab: initial }) {
  const { user, logout, hospital: h } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const ask = useConfirm()
  const st = useData((d) => user.staffId && d.get('staff', user.staffId))
  const [tab, setTab] = useState(initial || 'profile')
  const leaves = useData((d) => d.list('leaves', (l) => l.staffId === user.staffId).sort((a, b) => b.from.localeCompare(a.from)))
  const att = useData((d) => d.list('attendance', (a) => a.staffId === user.staffId).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14))
  const todayAtt = att.find((a) => a.date === today())
  const notes = useData((d) => d.list('notifications', (n) => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  const [lv, setLv] = useState({ from: today(), to: today(), type: 'Casual leave', reason: '' })
  const time = () => new Date().toTimeString().slice(0, 5)
  return (
    <Page title="My account" wide>
      <Tabs value={tab} onChange={setTab} className="mb-4 max-w-2xl" tabs={[{ value: 'profile', label: 'Profile' }, ...(st?.role === 'doctor' ? [{ value: 'availability', label: 'Availability' }] : []), ...(st ? [{ value: 'leave', label: 'Leave & attendance' }] : []), { value: 'notifications', label: 'Notifications', count: notes.filter((n) => !n.read).length }]} />
      {tab === 'profile' && <div className="grid lg:grid-cols-2 gap-4 max-w-5xl">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-3"><Avatar user={user} size={56} /><div><div className="font-bold text-lg">{user.name}</div><div className="text-sm text-ink-500">{roleLabel(user.role)} · {h.name}</div></div></div>
          {st && <div className="divide-y divide-ink-100">
            <Kv k="Designation" v={st.designation} /><Kv k="Department" v={db.get('departments', st.deptId)?.name || '—'} /><Kv k="Qualification" v={st.qualification} />
            {st.regNo && <Kv k="Registration no." v={<span translate="no">{st.regNo}</span>} />}<Kv k="Mobile" v={<span translate="no">{fmtPhone(st.phone)}</span>} />
          </div>}
        </Card>
        <Card className="p-5 space-y-4">
          <div><div className="font-bold mb-2">Language</div><LanguageSwitcher /></div>
          <Button variant="outline" icon={LogOut} onClick={logout}>{CLOUD ? 'Log out' : 'Log out / switch demo account'}</Button>
          {!CLOUD && <Button variant="ghost" onClick={async () => { if (await ask({ title: 'Reset demo data?', text: 'All changes made on this device will be lost.', danger: true, ok: 'Reset' })) { await resetDB(); toast('Demo data reset') } }}>Reset demo data</Button>}
          <p className="text-xs text-ink-500">For security you are logged out automatically after 30 minutes without activity.</p>
        </Card>
      </div>}
      {tab === 'availability' && st && <Card className="p-5 max-w-2xl"><AvailabilityEditor staff={st} /><p className="text-xs text-ink-500 mt-4">For holidays and leave, apply under “Leave & attendance”. Patients cannot book on approved leave days.</p></Card>}
      {tab === 'leave' && st && <div className="grid lg:grid-cols-2 gap-4 max-w-5xl">
        <Card className="p-5">
          <h3 className="font-bold mb-3">Attendance today</h3>
          <div className="flex items-center gap-3 mb-4">
            {!todayAtt?.in ? <Button icon={LogIn} onClick={() => { markAttendance(st.id, today(), 'present', time()); toast('Checked in') }}>Check in</Button> : !todayAtt.out ? <Button variant="secondary" icon={LogOut} onClick={() => { markAttendance(st.id, today(), 'out', time()); toast('Checked out') }}>Check out</Button> : <Badge color="green">Done for today</Badge>}
            {todayAtt?.in && <span className="text-sm text-ink-500">In {todayAtt.in}{todayAtt.out ? ` · Out ${todayAtt.out}` : ''}</span>}
          </div>
          {att.map((a) => <div key={a.id} className="flex justify-between text-sm py-1.5 border-b border-ink-100"><span>{fmtDate(a.date + 'T00:00:00')}</span><span>{a.status === 'present' ? `${a.in || '—'} – ${a.out || '—'}` : <Badge color="red">Absent</Badge>}</span></div>)}
        </Card>
        <Card className="p-5">
          <h3 className="font-bold mb-3">Apply for leave</h3>
          <div className="grid grid-cols-2 gap-3"><Field label="From"><Input type="date" value={lv.from} onChange={(e) => setLv({ ...lv, from: e.target.value })} /></Field><Field label="To"><Input type="date" value={lv.to} onChange={(e) => setLv({ ...lv, to: e.target.value })} /></Field></div>
          <Field label="Type"><Select value={lv.type} onChange={(e) => setLv({ ...lv, type: e.target.value })}>{['Casual leave', 'Sick leave', 'Earned leave', 'Conference', 'Holiday'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="Reason"><Input value={lv.reason} onChange={(e) => setLv({ ...lv, reason: e.target.value })} /></Field>
          <Button onClick={() => { try { applyLeave(lv); toast('Leave request sent'); setLv({ ...lv, reason: '' }) } catch (e) { toast(e.message, 'error') } }}>Send request</Button>
          <div className="mt-4">{leaves.map((l) => <div key={l.id} className="flex justify-between items-center text-sm py-2 border-b border-ink-100"><span>{fmtDate(l.from + 'T00:00:00')} – {fmtDate(l.to + 'T00:00:00')} · {l.type}</span><Badge color={l.status === 'approved' ? 'green' : l.status === 'rejected' ? 'red' : 'amber'}>{{ approved: 'Approved', rejected: 'Rejected', pending: 'Pending' }[l.status]}</Badge></div>)}</div>
        </Card>
      </div>}
      {tab === 'notifications' && <Card className="divide-y divide-ink-100 max-w-3xl">
        {notes.map((n) => <button key={n.id} onClick={() => { db.update('notifications', n.id, { read: true }); n.link && nav(n.link) }} className={cls('w-full text-left px-4 py-3 flex gap-3', !n.read && 'bg-brand-50/50')}><span className={cls('h-2 w-2 rounded-full mt-2 shrink-0', n.read ? '' : 'bg-brand-600')} /><span className="flex-1 min-w-0"><span className="block font-semibold">{n.title}</span><span className="block text-sm text-ink-500" translate="no">{n.body}</span><span className="text-[11px] text-ink-400">{timeAgo(n.createdAt)}</span></span></button>)}
        {!notes.length && <Empty icon={Bell} title="No notifications" />}
      </Card>}
    </Page>
  )
}
