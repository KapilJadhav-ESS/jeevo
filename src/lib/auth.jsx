import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { db, useData, connectHospital, disconnectHospital } from './db'
import { setSessionUser, runReminders } from './actions'
import { CLOUD } from './config'
import { api, getSession, signOut, supabase } from './cloud'
import { uid, phone10 } from './utils'

const KEY = 'jeevo-session'
const H_KEY = 'jeevo-last-hospital'
const AuthCtx = createContext(null)
const store = {
  get: (k) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch { /* ignore */ } }
}

// Session timeout for shared hospital computers: staff are logged out after
// 30 minutes without any activity (patients stay logged in on their own phone).
const IDLE_MS = 30 * 60 * 1000

// phase (cloud): loading → signedOut | joining | ready ;  demo: 'ready' or signed out
export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(() => {
    if (CLOUD) return null
    const id = store.get(KEY)
    const u = id && db.getAny('users', id)
    // demo: open the data of the logged-in user's hospital (or the one a Super Admin chose last)
    const h = u?.hospitalId || (u?.role === 'super_admin' && store.get(H_KEY))
    if (h && db.getAny('hospitals', h)) db.setHospital(h, true)
    return id
  })
  const [phase, setPhase] = useState(CLOUD ? 'loading' : 'ready')
  const [error, setError] = useState('')
  const user = useData((d) => (userId ? d.getAny('users', userId) : null))


  useEffect(() => {
    setSessionUser(user?.id || null)
    if (user && phase === 'ready' && user.role !== 'patient') { try { runReminders() } catch { /* ignore */ } }
  }, [user?.id, phase])

  const enter = useCallback(async (preferHospital) => {
    setError('')
    setPhase('loading')
    try {
      let members
      try { members = await api.linkMember() } catch (e) {
        if (!e.network) throw e
        const h = store.get(H_KEY), id = store.get(KEY)
        if (h && id) { await connectHospital(h); setUserId(id); setPhase('ready'); return }
        throw e
      }
      const active = members.filter((m) => m.status === 'active')
      const m = active.find((x) => x.hospitalId === (preferHospital || store.get(H_KEY))) || active[0]
      if (!m) {
        if (members.length) { setError('Your account has been deactivated. Please contact the hospital office if this is a mistake.'); setPhase('error'); return }
        setPhase('joining'); return
      }
      await connectHospital(m.hospitalId)
      store.set(H_KEY, m.hospitalId)
      store.set(KEY, m.userId)
      setUserId(m.userId)
      setPhase('ready')
    } catch (e) {
      setError(e.message || 'Could not connect. Please try again.')
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    if (!CLOUD) return
    getSession().then((s) => (s ? enter() : setPhase('signedOut'))).catch(() => setPhase('signedOut'))
    const { data } = supabase.auth.onAuthStateChange((evt) => { if (evt === 'SIGNED_OUT') { setUserId(null); setPhase('signedOut') } })
    return () => data.subscription.unsubscribe()
  }, [enter])

  const login = (id) => { // demo mode only
    const u = db.getAny('users', id)
    if (u?.hospitalId) { db.setHospital(u.hospitalId); store.set(H_KEY, u.hospitalId) }
    store.set(KEY, id)
    setUserId(id)
  }
  const logout = useCallback(async () => {
    store.set(KEY, null)
    setUserId(null)
    if (CLOUD) { disconnectHospital(); store.set(H_KEY, null); await signOut(); setPhase('signedOut') }
  }, [])
  const switchHospital = (id) => { store.set(H_KEY, id); if (CLOUD) enter(id); else db.setHospital(id) }

  // idle logout for staff
  useEffect(() => {
    if (!user || user.role === 'patient') return
    let last = Date.now()
    const bump = () => { last = Date.now() }
    const ev = ['pointerdown', 'keydown', 'scroll']
    ev.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    const t = setInterval(() => { if (Date.now() - last > IDLE_MS) { logout(); alert('You were logged out after 30 minutes of inactivity.') } }, 30000)
    return () => { ev.forEach((e) => window.removeEventListener(e, bump)); clearInterval(t) }
  }, [user?.id])

  const active = user && user.status === 'active' ? user : null
  return (
    <AuthCtx.Provider value={{ user: phase === 'ready' ? active : null, phase, error, login, logout, enter, switchHospital, hospital: db.hospital() || {} }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)

// Demo: find a login by mobile number across all hospitals
export const findUserByPhone = (p) => db.all('users').find((u) => phone10(u.phone) === phone10(p) && u.status === 'active')

// Demo self sign-up for patients
export function demoSignup({ name, phone, dob, gender, lang }, registerPatient) {
  const p = registerPatient({ name, phone, dob, gender, lang, consent: { whatsapp: true, sms: true } }, { quick: true, force: true, selfSignup: true })
  const u = db.insert('users', { id: uid('u'), name, phone: phone10(phone), role: 'patient', patientId: p.id, status: 'active' })
  db.update('patients', p.id, { userId: u.id })
  return u
}
