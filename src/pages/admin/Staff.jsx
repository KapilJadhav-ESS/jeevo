import { useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { Plus, UserCheck, UserX, CalendarClock, Check, X } from 'lucide-react'
import { Page, Card, Button, Table, Field, Input, Select, Toggle, Sheet, Badge, Grid, SearchBox, Avatar, useToast, useConfirm } from '../../components/ui'
import { useData, db } from '../../lib/db'
import { ROLES, STAFF_ROLES, roleLabel } from '../../lib/rbac'
import { saveStaff, setStaffActive, decideLeave, setShift, markAttendance } from '../../lib/actions'
import { AvailabilityEditor } from '../staff/Me'
import { addDays, today, fmtDate, fmtWeekday, fmtPhone, cls, downloadCSV } from '../../lib/utils'

function Tabs() {
  const t = [['/s/staff', 'Directory', true], ['/s/staff/shifts', 'Shifts'], ['/s/staff/leave', 'Leave'], ['/s/staff/attendance', 'Attendance']]
  return <div className="flex gap-1 p-1 bg-ink-100 rounded-xl mb-4 max-w-xl">{t.map(([to, l, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => cls('flex-1 h-9 rounded-lg text-[13px] font-semibold grid place-items-center', isActive ? 'bg-white shadow-sm' : 'text-ink-500')}>{l}</NavLink>)}</div>
}

function Directory() {
  const toast = useToast()
  const ask = useConfirm()
  const [q, setQ] = useState('')
  const [role, setRole] = useState('all')
  const [edit, setEdit] = useState(null)
  const [avail, setAvail] = useState(null)
  const depts = useData((d) => d.list('departments'))
  const rows = useData((d) => d.list('staff', (s) => (role === 'all' || s.role === role) && (!q || (s.name + s.designation + s.phone).toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a.name.localeCompare(b.name)))
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.value })
  return (
    <Page title="Staff & HR" wide actions={<Button icon={Plus} onClick={() => setEdit({ name: '', role: 'receptionist', designation: '', deptId: '', phone: '', email: '', qualification: '', regNo: '', fee: 0, followUpFee: 0, shift: 'morning', canVerifyLab: false })}>Add staff</Button>}>
      <Tabs />
      <div className="flex flex-col md:flex-row gap-3 mb-3"><SearchBox value={q} onChange={setQ} placeholder="Search staff" className="flex-1" /><Select className="md:w-60" value={role} onChange={(e) => setRole(e.target.value)}><option value="all">All roles</option>{STAFF_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}</Select></div>
      <Table rows={rows} onRow={setEdit} columns={[
        { label: 'Name', render: (s) => <div className="flex items-center gap-3"><Avatar user={s} size={36} /><div><div className="font-semibold">{s.name}</div><div className="text-xs text-ink-500">{s.designation}</div></div></div> },
        { label: 'Role', render: (s) => <Badge color={s.role === 'doctor' ? 'purple' : s.role === 'admin' ? 'blue' : 'gray'}>{roleLabel(s.role)}</Badge> },
        { label: 'Department', render: (s) => db.get('departments', s.deptId)?.name || '—', hideMobile: true },
        { label: 'Mobile (login)', render: (s) => <span translate="no">{fmtPhone(s.phone)}</span>, nowrap: true },
        { label: 'Registration', render: (s) => <span className="text-xs" translate="no">{s.regNo || '—'}</span>, hideMobile: true },
        { label: 'Status', render: (s) => s.active ? <Badge color="green">Active</Badge> : <Badge color="red">Inactive</Badge> },
        { label: '', right: true, render: (s) => <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {s.role === 'doctor' && <Button size="sm" variant="ghost" icon={CalendarClock} onClick={() => setAvail(s)}>Hours</Button>}
          <Button size="sm" variant="ghost" icon={s.active ? UserX : UserCheck} onClick={async () => { if (await ask({ title: `${s.active ? 'Deactivate' : 'Activate'} ${s.name}?`, text: s.active ? 'They will no longer be able to log in.' : '', danger: s.active, ok: s.active ? 'Deactivate' : 'Activate' })) { try { setStaffActive(s.id, !s.active); toast('Updated') } catch (e) { toast(e.message, 'error') } } }}>{s.active ? 'Deactivate' : 'Activate'}</Button>
        </div> }
      ]} />
      <Sheet open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit staff' : 'Add staff member'} wide footer={<Button block size="lg" onClick={() => { try { saveStaff(edit); toast(edit.id ? 'Saved' : 'Staff added – they can log in with their mobile number'); setEdit(null) } catch (e) { toast(e.message, 'error') } }}>Save</Button>}>
        {edit && <Grid cols={2}>
          <Field label="Full name"><Input value={edit.name} onChange={set('name')} /></Field>
          <Field label="Role (app access)"><Select value={edit.role} onChange={set('role')}>{STAFF_ROLES.map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}</Select></Field>
          <Field label="Designation"><Input value={edit.designation} onChange={set('designation')} /></Field>
          <Field label="Department"><Select value={edit.deptId || ''} onChange={set('deptId')}><option value="">—</option>{depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
          <Field label="Mobile number (used to log in)"><Input inputMode="numeric" maxLength={10} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Email"><Input type="email" value={edit.email || ''} onChange={set('email')} /></Field>
          <Field label="Qualification"><Input value={edit.qualification || ''} onChange={set('qualification')} /></Field>
          <Field label="Professional registration no." hint="MMC / MNC / pharmacy council"><Input value={edit.regNo || ''} onChange={set('regNo')} /></Field>
          {edit.role === 'doctor' && <><Field label="Consultation fee (₹)"><Input inputMode="numeric" value={edit.fee} onChange={(e) => setEdit({ ...edit, fee: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></Field><Field label="Follow-up fee (₹)"><Input inputMode="numeric" value={edit.followUpFee} onChange={(e) => setEdit({ ...edit, followUpFee: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></Field></>}
          <Field label="Working hours / shift"><Select value={edit.shift || 'morning'} onChange={set('shift')}><option value="morning">Morning (8 am – 2 pm)</option><option value="evening">Evening (2 pm – 8 pm)</option><option value="night">Night (8 pm – 8 am)</option><option value="general">General (9 am – 6 pm)</option></Select></Field>
          {['doctor', 'lab_tech'].includes(edit.role) && <div className="sm:col-span-2"><Toggle label="Authorised to verify lab reports" checked={!!edit.canVerifyLab} onChange={(v) => setEdit({ ...edit, canVerifyLab: v })} /></div>}
        </Grid>}
      </Sheet>
      <Sheet open={!!avail} onClose={() => setAvail(null)} title={`Availability – ${avail?.name}`}>{avail && <AvailabilityEditor staff={avail} onSaved={() => setAvail(null)} />}</Sheet>
    </Page>
  )
}

function Shifts() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i))
  const staff = useData((d) => d.list('staff', (s) => s.active && s.role !== 'admin').sort((a, b) => a.role.localeCompare(b.role)))
  const shifts = useData((d) => d.list('shifts'))
  const tone = { morning: 'bg-amber-50 text-amber-800', evening: 'bg-sky-50 text-sky-800', night: 'bg-violet-100 text-violet-800', off: 'bg-ink-100 text-ink-400', general: 'bg-accent-50 text-accent-700' }
  return (
    <Page title="Staff & HR" wide><Tabs />
      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead><tr className="bg-ink-100/60 text-left text-xs text-ink-500"><th className="px-4 py-2.5">Staff</th>{days.map((d) => <th key={d} className="px-2 py-2.5 text-center">{fmtWeekday(d + 'T00:00:00')} {Number(d.slice(8))}</th>)}</tr></thead>
          <tbody>{staff.map((s) => (
            <tr key={s.id} className="border-t border-ink-100"><td className="px-4 py-2"><div className="font-semibold">{s.name}</div><div className="text-xs text-ink-500">{roleLabel(s.role)}</div></td>
              {days.map((d) => { const v = shifts.find((x) => x.staffId === s.id && x.day === d)?.shift || 'off'; return (
                <td key={d} className="px-1 py-1 text-center"><select aria-label="Shift" value={v} onChange={(e) => setShift(s.id, d, e.target.value)} className={cls('h-9 w-full rounded-lg text-xs font-semibold border-0 text-center appearance-none', tone[v])}>{['morning', 'evening', 'night', 'general', 'off'].map((x) => <option key={x} value={x}>{{ morning: 'Morning', evening: 'Evening', night: 'Night', general: 'General', off: 'Off' }[x]}</option>)}</select></td>) })}
            </tr>))}</tbody>
        </table>
      </Card>
    </Page>
  )
}

function Leave() {
  const toast = useToast()
  const rows = useData((d) => d.list('leaves').sort((a, b) => (a.status === 'pending' ? -1 : 1) - (b.status === 'pending' ? -1 : 1) || b.from.localeCompare(a.from)))
  return (
    <Page title="Staff & HR" wide><Tabs />
      <Table rows={rows} columns={[
        { label: 'Staff', render: (l) => <b>{db.get('staff', l.staffId)?.name}</b> }, { label: 'Dates', render: (l) => `${fmtDate(l.from + 'T00:00:00')} – ${fmtDate(l.to + 'T00:00:00')}`, nowrap: true },
        { label: 'Type', key: 'type' }, { label: 'Reason', key: 'reason', hideMobile: true },
        { label: 'Status', render: (l) => <Badge color={l.status === 'approved' ? 'green' : l.status === 'rejected' ? 'red' : 'amber'}>{{ approved: 'Approved', rejected: 'Rejected', pending: 'Pending' }[l.status]}</Badge> },
        { label: '', right: true, render: (l) => l.status === 'pending' && <div className="flex justify-end gap-1"><Button size="sm" variant="success" icon={Check} onClick={() => { decideLeave(l.id, true); toast('Leave approved') }}>Approve</Button><Button size="sm" variant="danger" icon={X} onClick={() => { decideLeave(l.id, false); toast('Leave rejected') }}>Reject</Button></div> }
      ]} />
      <p className="text-xs text-ink-500 mt-2">When a doctor’s leave is approved, those days are blocked for booking and reception is told about appointments to reschedule.</p>
    </Page>
  )
}

function Attendance() {
  const [day, setDay] = useState(today())
  const staff = useData((d) => d.list('staff', (s) => s.active))
  const att = useData((d) => d.list('attendance', (a) => a.date === day))
  return (
    <Page title="Staff & HR" wide><Tabs />
      <div className="flex gap-3 items-center mb-3"><Input type="date" className="w-48" value={day} max={today()} onChange={(e) => setDay(e.target.value)} /><span className="text-sm text-ink-500">{att.filter((a) => a.status === 'present').length} present of {staff.length}</span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => downloadCSV(`attendance-${day}.csv`, [['Staff', 'Role', 'Status', 'In', 'Out'], ...staff.map((s) => { const a = att.find((x) => x.staffId === s.id); return [s.name, roleLabel(s.role), a?.status || 'not marked', a?.in || '', a?.out || ''] })])}>Export</Button></div>
      <Table rows={staff} columns={[
        { label: 'Staff', render: (s) => <b>{s.name}</b> }, { label: 'Role', render: (s) => roleLabel(s.role) },
        { label: 'Status', render: (s) => { const a = att.find((x) => x.staffId === s.id); return a ? <Badge color={a.status === 'present' ? 'green' : 'red'}>{a.status === 'present' ? 'Present' : a.status === 'leave' ? 'On leave' : 'Absent'}</Badge> : <Badge>Not marked</Badge> } },
        { label: 'In / out', render: (s) => { const a = att.find((x) => x.staffId === s.id); return a?.in ? `${a.in} – ${a.out || '…'}` : '—' } },
        { label: '', right: true, render: (s) => !att.find((x) => x.staffId === s.id) && <div className="flex justify-end gap-1"><Button size="sm" variant="secondary" onClick={() => markAttendance(s.id, day, 'present', '09:00')}>Present</Button><Button size="sm" variant="ghost" onClick={() => markAttendance(s.id, day, 'absent', '')}>Absent</Button></div> }
      ]} />
    </Page>
  )
}

export default function Staff() {
  return <Routes><Route index element={<Directory />} /><Route path="shifts" element={<Shifts />} /><Route path="leave" element={<Leave />} /><Route path="attendance" element={<Attendance />} /></Routes>
}
