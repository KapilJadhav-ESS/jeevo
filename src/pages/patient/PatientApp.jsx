import { createContext, lazy, Suspense, useContext, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Home as HomeIcon, CalendarDays, FolderHeart, Wallet, UserRound } from 'lucide-react'
import { cls } from '../../lib/utils'
import { useAuth } from '../../lib/auth'
import { useData } from '../../lib/db'
import { familyOf } from '../../lib/actions'
import Home from './Home'

const Book = lazy(() => import('./Book'))
const Appointments = lazy(() => import('./Appointments'))
const Records = lazy(() => import('./Records'))
const Bills = lazy(() => import('./Bills'))
const More = lazy(() => import('./More'))

// Which family member the patient is looking at (records, bills, booking)
const FamilyCtx = createContext(null)
export const useFamily = () => useContext(FamilyCtx)

function FamilyProvider({ children }) {
  const { user } = useAuth()
  const members = useData((d) => familyOf(d.get('patients', user.patientId)))
  const [active, setActive] = useState(user.patientId)
  const current = members.find((m) => m.id === active) || members[0]
  return <FamilyCtx.Provider value={{ members, current, setActive, ids: members.map((m) => m.id) }}>{children}</FamilyCtx.Provider>
}

const Item = ({ to, icon: Icon, label, end }) => (
  <NavLink to={to} end={end} className={({ isActive }) => cls('flex-1 flex flex-col items-center justify-center gap-0.5 h-full text-[11px] font-semibold transition', isActive ? 'text-brand-700' : 'text-ink-400')}>
    {({ isActive }) => (<><Icon size={23} strokeWidth={isActive ? 2.4 : 1.9} /><span className="leading-tight text-center">{label}</span></>)}
  </NavLink>
)

const Loading = () => <div className="h-[60vh] grid place-items-center"><span className="h-8 w-8 rounded-full border-[3px] border-brand-600 border-r-transparent animate-spin" /></div>

export default function PatientApp() {
  const loc = useLocation()
  useEffect(() => { document.body.classList.add('patient-mode'); return () => document.body.classList.remove('patient-mode') }, [])
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  const hideNav = /\/p\/book|\/pay|\/feedback\/new/.test(loc.pathname)
  return (
    <FamilyProvider>
      <div className="patient-shell">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route index element={<Home />} />
            <Route path="book/*" element={<Book />} />
            <Route path="appointments/*" element={<Appointments />} />
            <Route path="records/*" element={<Records />} />
            <Route path="prescriptions" element={<Navigate to="/p/records/prescriptions" replace />} />
            <Route path="reports" element={<Navigate to="/p/records/reports" replace />} />
            <Route path="history" element={<Navigate to="/p/records/history" replace />} />
            <Route path="bills/*" element={<Bills />} />
            <Route path="*" element={<More />} />
          </Routes>
        </Suspense>
        {!hideNav && (
          <nav className="fixed bottom-0 inset-x-0 z-40 mx-auto max-w-[520px] no-print">
            <div className="bg-white/95 backdrop-blur border-t border-ink-200/70 safe-bottom">
              <div className="flex items-center h-16 px-1">
                <Item to="/p" end icon={HomeIcon} label="Home" />
                <Item to="/p/appointments" icon={CalendarDays} label="Appointments" />
                <Item to="/p/records" icon={FolderHeart} label="Records" />
                <Item to="/p/bills" icon={Wallet} label="Bills" />
                <Item to="/p/profile" icon={UserRound} label="Profile" />
              </div>
            </div>
          </nav>
        )}
      </div>
    </FamilyProvider>
  )
}

// Chips to switch between family members
export function FamilySwitch({ className = '' }) {
  const { members, current, setActive } = useFamily()
  if (members.length < 2) return null
  return (
    <div className={cls('flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1', className)}>
      {members.map((m) => (
        <button key={m.id} onClick={() => setActive(m.id)} className={cls('shrink-0 h-10 pl-1.5 pr-3.5 rounded-full text-[13px] font-semibold border flex items-center gap-2 transition', current?.id === m.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-700 border-ink-200')}>
          <span className={cls('h-7 w-7 rounded-full grid place-items-center text-[11px] font-bold', current?.id === m.id ? 'bg-white/20' : 'bg-brand-50 text-brand-700')}>{m.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}</span>
          {m.name.split(' ')[0]}
        </button>
      ))}
    </div>
  )
}
