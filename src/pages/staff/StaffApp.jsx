import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays, ListOrdered, Siren, Stethoscope, FlaskConical, Pill, Receipt, BedDouble, HeartPulse, UserCog,
  Megaphone, BookHeart, MessageSquareHeart, MessageCircle, BarChart3, Settings, ScrollText, Building2, Bell, Menu, X, LogOut, Search, Monitor, UserRound
} from 'lucide-react'
import { Avatar, IconButton, Page, Empty } from '../../components/ui'
import { PrescriptionView } from '../../components/Documents'
import { PatientLine } from '../../components/common'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { useAuth } from '../../lib/auth'
import { db, useData } from '../../lib/db'
import { can, roleLabel } from '../../lib/rbac'
import { searchPatients, canVerify } from '../../lib/actions'
import { cls } from '../../lib/utils'
import { CLOUD } from '../../lib/config'
import Dashboard from './Dashboard'

const Patients = lazy(() => import('./Patients'))
const Appointments = lazy(() => import('./Appointments'))
const Queue = lazy(() => import('./Queue'))
const Emergency = lazy(() => import('./Emergency'))
const Consult = lazy(() => import('./Consult'))
const Lab = lazy(() => import('./Lab'))
const Pharmacy = lazy(() => import('./Pharmacy'))
const Billing = lazy(() => import('./Billing'))
const Ipd = lazy(() => import('./Ipd'))
const Nursing = lazy(() => import('./Nursing'))
const Staff = lazy(() => import('../admin/Staff'))
const Comms = lazy(() => import('../admin/Comms'))
const Reports = lazy(() => import('../admin/Reports'))
const SettingsPage = lazy(() => import('../admin/Settings'))
const Platform = lazy(() => import('../admin/Platform'))
const Me = lazy(() => import('./Me'))

export const NAV = [
  { to: '/s', label: 'Dashboard', icon: LayoutDashboard, end: true, show: (u) => u.role !== 'super_admin' },
  { to: '/s/platform', label: 'Hospitals & plans', icon: Building2, perm: 'platform.manage' },
  { to: '/s/opd', label: 'My OPD', icon: Stethoscope, perm: 'consult', show: (u) => !db.get('staff', u.staffId)?.noOpd },
  { to: '/s/queue', label: 'Queue & tokens', icon: ListOrdered, perm: 'queue.manage' },
  { to: '/s/patients', label: 'Patients', icon: Users, perm: 'patients.view' },
  { to: '/s/appointments', label: 'Appointments', icon: CalendarDays, perm: 'appointments.view' },
  { to: '/s/emergency', label: 'Emergency', icon: Siren, perm: 'emergency.view' },
  { to: '/s/lab', label: 'Laboratory', icon: FlaskConical, show: (u) => can(u, 'lab.work') || canVerify(u) },
  { to: '/s/pharmacy', label: 'Pharmacy', icon: Pill, perm: 'pharmacy.dispense' },
  { to: '/s/billing', label: 'Billing', icon: Receipt, perm: 'billing.create' },
  { to: '/s/ipd', label: 'Beds & admissions', icon: BedDouble, perm: 'ipd.view' },
  { to: '/s/nursing', label: 'Nursing', icon: HeartPulse, perm: 'nursing' },
  { to: '/s/staff', label: 'Staff & HR', icon: UserCog, perm: 'staff.manage' },
  { to: '/s/announcements', label: 'Announcements', icon: Megaphone, show: (u) => u.role !== 'super_admin' },
  { to: '/s/content', label: 'Health content', icon: BookHeart, perm: 'healthtips.publish' },
  { to: '/s/messages', label: 'WhatsApp & SMS', icon: MessageCircle, perm: 'appointments.manage' },
  { to: '/s/feedback', label: 'Feedback', icon: MessageSquareHeart, perm: 'feedback.manage' },
  { to: '/s/reports', label: 'Reports', icon: BarChart3, perm: 'reports.view' },
  { to: '/s/settings', label: 'Settings', icon: Settings, perm: 'config.manage' },
  { to: '/s/audit', label: 'Audit log', icon: ScrollText, perm: 'audit.view' }
]
const visible = (u) => NAV.filter((n) => (!n.perm || can(u, n.perm)) && (!n.show || n.show(u)))

const Loading = () => <div className="h-[60vh] grid place-items-center"><span className="h-8 w-8 rounded-full border-[3px] border-brand-600 border-r-transparent animate-spin" /></div>

function SideNav({ onNavigate }) {
  const { user, hospital: h } = useAuth()
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-brand-600 grid place-items-center shrink-0"><svg viewBox="0 0 64 64" className="h-6 w-6"><path d="M27 12h10v15h15v10H37v15H27V37H12V27h15z" fill="#fff" /></svg></div>
        <div className="min-w-0"><div className="font-extrabold leading-tight truncate">{h.shortName || h.name || 'JeevO'}</div><div className="text-[11px] text-ink-500 truncate"><span translate="no">JeevO</span> · {roleLabel(user.role)}</div></div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
        {visible(user).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={onNavigate} className={({ isActive }) => cls('flex items-center gap-3 h-10 px-3 rounded-xl text-[14px] font-semibold transition', isActive ? 'bg-brand-600 text-white' : 'text-ink-700 hover:bg-ink-100')}>
            <n.icon size={18} /> <span className="truncate">{n.label}</span>
          </NavLink>
        ))}
        {can(user, 'queue.manage') && <a href="#/tv" target="_blank" rel="noreferrer" className="flex items-center gap-3 h-10 px-3 rounded-xl text-[14px] font-semibold text-ink-700 hover:bg-ink-100"><Monitor size={18} /> Queue TV display</a>}
      </nav>
      {!CLOUD && <div className="mx-3 mb-3 rounded-xl bg-amber-50 text-amber-800 text-[11px] font-semibold px-3 py-2">Demo mode – data is stored on this device only</div>}
    </div>
  )
}

// Global patient search: press "/" anywhere
function QuickSearch() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef()
  useEffect(() => {
    const k = (e) => { if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName)) { e.preventDefault(); ref.current?.focus() } }
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [])
  const res = useData(() => (q.trim().length >= 2 ? searchPatients(q, 8) : []))
  if (!can(user, 'patients.view')) return <div className="flex-1" />
  const go = (p) => { setQ(''); setOpen(false); ref.current?.blur(); nav(`/s/patients/${p.id}`) }
  return (
    <div className="relative flex-1 max-w-xl">
      <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
      <input ref={ref} value={q} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && res[0]) go(res[0]); if (e.key === 'Escape') ref.current.blur() }}
        placeholder="Search patient – name, mobile, Patient ID" className="w-full h-11 rounded-xl bg-ink-100 border border-transparent focus:bg-white focus:border-brand-400 pl-10 pr-12 text-[14px] outline-none transition" />
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-block">/</kbd>
      {open && q.trim().length >= 2 && (
        <div className="absolute top-12 inset-x-0 bg-white rounded-2xl shadow-2xl border border-ink-100 p-2 z-50">
          {res.map((p) => <button key={p.id} onMouseDown={() => go(p)} className="w-full text-left px-2 py-2 rounded-xl hover:bg-ink-100"><PatientLine p={p} /></button>)}
          {!res.length && <div className="p-3 text-sm text-ink-500">No patient found.</div>}
        </div>
      )}
    </div>
  )
}

export default function StaffApp() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [drawer, setDrawer] = useState(false)
  const unread = useData((d) => d.list('notifications', (n) => n.userId === user.id && !n.read).length)
  useEffect(() => { setDrawer(false) }, [loc.pathname])
  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden lg:block w-[248px] shrink-0 bg-white border-r border-ink-200/70 h-screen sticky top-0 no-print"><SideNav /></aside>
      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden no-print">
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setDrawer(false)} />
          <div className="absolute left-0 inset-y-0 w-[280px] bg-white shadow-2xl animate-fade-in"><button aria-label="Close" onClick={() => setDrawer(false)} className="absolute right-3 top-5 h-9 w-9 grid place-items-center rounded-full hover:bg-ink-100"><X size={20} /></button><SideNav onNavigate={() => setDrawer(false)} /></div>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-ink-200/70 no-print safe-top">
          <div className="h-16 px-3 lg:px-8 flex items-center gap-2 lg:gap-4">
            <button aria-label="Menu" onClick={() => setDrawer(true)} className="lg:hidden h-10 w-10 grid place-items-center rounded-xl hover:bg-ink-100"><Menu size={22} /></button>
            <QuickSearch />
            <LanguageSwitcher className="hidden xl:inline-flex" />
            <IconButton icon={Bell} label="Notifications" badge={unread} onClick={() => nav('/s/notifications')} className="shadow-none bg-ink-100" />
            <button onClick={() => nav('/s/me')} className="flex items-center gap-2 rounded-full hover:bg-ink-100 pl-1 pr-3 h-11" aria-label="My account">
              <Avatar user={user} size={36} />
              <span className="hidden md:block text-left leading-tight"><span className="block text-sm font-semibold max-w-[160px] truncate">{user.name}</span><span className="block text-[11px] text-ink-500">{roleLabel(user.role)}</span></span>
            </button>
            <button aria-label="Log out" title="Log out" onClick={logout} className="hidden md:grid h-10 w-10 place-items-center rounded-xl hover:bg-ink-100 text-ink-500"><LogOut size={18} /></button>
          </div>
        </div>
        <main>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route index element={user.role === 'super_admin' ? <Navigate to="/s/platform" replace /> : <Dashboard />} />
              <Route path="patients/*" element={<Gate perm="patients.view"><Patients /></Gate>} />
              <Route path="appointments/*" element={<Gate perm="appointments.view"><Appointments /></Gate>} />
              <Route path="queue" element={<Gate perm="queue.manage"><Queue /></Gate>} />
              <Route path="emergency" element={<Gate perm="emergency.view"><Emergency /></Gate>} />
              <Route path="opd" element={<Gate perm="consult"><Queue doctorView /></Gate>} />
              <Route path="consult/:apptId" element={<Gate perm="consult"><Consult /></Gate>} />
              <Route path="lab/*" element={<Gate ok={can(user, 'lab.work') || canVerify(user)}><Lab /></Gate>} />
              <Route path="pharmacy/*" element={<Gate perm="pharmacy.dispense"><Pharmacy /></Gate>} />
              <Route path="billing/*" element={<Gate perm="billing.create"><Billing /></Gate>} />
              <Route path="ipd/*" element={<Gate perm="ipd.view"><Ipd /></Gate>} />
              <Route path="nursing/*" element={<Gate perm="nursing"><Nursing /></Gate>} />
              <Route path="staff/*" element={<Gate perm="staff.manage"><Staff /></Gate>} />
              <Route path="announcements" element={<Comms tab="announcements" />} />
              <Route path="content" element={<Gate perm="healthtips.publish"><Comms tab="content" /></Gate>} />
              <Route path="messages" element={<Gate perm="appointments.manage"><Comms tab="messages" /></Gate>} />
              <Route path="feedback" element={<Gate perm="feedback.manage"><Comms tab="feedback" /></Gate>} />
              <Route path="reports/*" element={<Gate perm="reports.view"><Reports /></Gate>} />
              <Route path="settings/*" element={<Gate perm="config.manage"><SettingsPage /></Gate>} />
              <Route path="audit" element={<Gate perm="audit.view"><Reports audit /></Gate>} />
              <Route path="platform" element={<Gate perm="platform.manage"><Platform /></Gate>} />
              <Route path="rx/:id" element={<Gate perm="patients.view"><RxPage /></Gate>} />
              <Route path="notifications" element={<Me tab="notifications" />} />
              <Route path="me" element={<Me />} />
              <Route path="profile" element={<Me />} />
              <Route path="*" element={<Navigate to="/s" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function RxPage() {
  const { id } = useParams()
  const rx = useData((d) => d.get('prescriptions', id))
  return <Page title="Prescription" back wide><div className="max-w-3xl">{rx ? <PrescriptionView rx={rx} /> : <Empty title="Not found" />}</div></Page>
}

function Gate({ perm, ok, children }) {
  const { user } = useAuth()
  const allowed = ok ?? can(user, perm)
  if (!allowed) return <div className="p-10 text-center"><UserRound className="mx-auto text-ink-400" size={40} /><p className="font-bold mt-3">You do not have access to this section.</p><p className="text-sm text-ink-500">Each role only sees what it needs. Contact your administrator if you need access.</p></div>
  return children
}
