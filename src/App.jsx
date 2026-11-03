import { Component, Suspense, lazy, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CloudOff, LogOut, RefreshCw } from 'lucide-react'
import { getLang, onLangChange } from './i18n'
import { AuthProvider, useAuth } from './lib/auth'
import { isStaff } from './lib/rbac'
import { OverlayProvider, Button, useToast } from './components/ui'
import { CLOUD } from './lib/config'
import { onSyncError, syncStatus, useDBVersion } from './lib/db'
import Login from './pages/Login'

const PatientApp = lazy(() => import('./pages/patient/PatientApp'))
const StaffApp = lazy(() => import('./pages/staff/StaffApp'))
const QueueTV = lazy(() => import('./pages/staff/QueueTV'))
const Onboarding = lazy(() => import('./pages/Onboarding'))

export const Loading = () => <div className="h-[60vh] grid place-items-center"><span className="h-8 w-8 rounded-full border-[3px] border-brand-600 border-r-transparent animate-spin" /></div>

function SyncBanner() {
  useDBVersion()
  const toast = useToast()
  useEffect(() => onSyncError((m) => toast(m, 'error')), [])
  if (!CLOUD) return null
  const s = syncStatus()
  if (s.online && !s.pending) return null
  return (
    <div className="sticky top-0 z-50 bg-amber-100 text-amber-900 text-xs font-semibold px-4 py-1.5 flex items-center gap-2 safe-top no-print">
      <CloudOff size={14} /> {s.online ? 'Saving changes…' : 'You are offline – changes will sync when you are back online'}
    </div>
  )
}

function Gate() {
  const { user, phase, error, logout, enter } = useAuth()
  const loc = useLocation()
  if (phase === 'loading') return <Loading />
  if (phase === 'signedOut' || (!CLOUD && !user)) return <Login />
  if (phase === 'joining') return <Suspense fallback={<Loading />}><Onboarding /></Suspense>
  if (phase === 'error' || !user) return (
    <div className="min-h-screen grid place-items-center p-8 text-center">
      <div>
        <CloudOff size={44} className="mx-auto text-ink-400" />
        <p className="font-bold mt-4">{phase === 'error' ? error : 'Your account is not active.'}</p>
        <p className="text-sm text-ink-500 mt-1">Please check your internet connection or contact the hospital office.</p>
        <div className="flex gap-2 justify-center mt-6">
          {phase === 'error' && <Button icon={RefreshCw} onClick={() => enter()}>Try again</Button>}
          <Button variant="outline" icon={LogOut} onClick={logout}>Log out</Button>
        </div>
      </div>
    </div>
  )
  const staff = isStaff(user) || user.role === 'super_admin'
  const home = user.role === 'super_admin' ? '/s/platform' : staff ? '/s' : '/p'
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/p/*" element={staff ? <Navigate to={home} replace /> : <PatientApp />} />
        <Route path="/s/*" element={staff ? <StaffApp /> : <Navigate to="/p" replace />} />
        <Route path="/tv" element={staff ? <QueueTV /> : <Navigate to="/p" replace />} />
        <Route path="*" element={<Navigate to={home} replace state={{ from: loc.pathname }} />} />
      </Routes>
    </Suspense>
  )
}

// Never show a blank screen: report the problem and offer a way back.
class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(e) { console.error(e) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-screen grid place-items-center p-8 text-center">
        <div><p className="text-lg font-bold">Something went wrong</p><p className="text-sm text-ink-500 mt-1">{String(this.state.error.message || '')}</p>
          <Button className="mt-5" onClick={() => { this.setState({ error: null }); window.location.hash = '#/' }}>Go to home</Button></div>
      </div>
    )
  }
}

export default function App() {
  const [lang, setLangState] = useState(getLang())
  useEffect(() => onLangChange(setLangState), [])
  return (
    <OverlayProvider key={lang}>
      <AuthProvider>
        <SyncBanner />
        <ErrorBoundary><Gate /></ErrorBoundary>
      </AuthProvider>
    </OverlayProvider>
  )
}
