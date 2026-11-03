// Cloud mode only: a signed-in person who is not yet linked to a hospital.
// Patients join a hospital with its code (self-registration); a hospital owner
// can set up a new hospital and becomes its administrator.
import { useState } from 'react'
import { Building2, UserPlus, LogOut } from 'lucide-react'
import { Card, Button, Field, Input, Select, Tabs, useToast } from '../components/ui'
import { useAuth } from '../lib/auth'
import { api } from '../lib/cloud'
import { DEFAULT_HOSPITAL } from '../lib/config'
import { dobFromAge } from '../lib/utils'
import { LANGS, getLang } from '../i18n'
import { Hero } from './Login'

export default function Onboarding() {
  const { enter, logout } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState('patient')
  const [busy, setBusy] = useState(false)
  const [p, setP] = useState({ code: DEFAULT_HOSPITAL, name: '', age: '', gender: '', lang: getLang() })
  const [h, setH] = useState({ code: '', name: '', type: 'General physician clinic', city: '', phone: '', adminName: '' })
  const join = async () => {
    if (!p.code || !p.name || !p.age) return toast('Please fill hospital code, name and age', 'error')
    setBusy(true)
    try { await api.registerPatient(p.code.trim().toLowerCase(), { name: p.name.trim(), dob: dobFromAge(p.age), gender: p.gender, lang: p.lang }); await enter(p.code.trim().toLowerCase()) } catch (e) { toast(e.message, 'error'); setBusy(false) }
  }
  const create = async () => {
    if (!/^[a-z0-9-]{3,40}$/.test(h.code)) return toast('Hospital code: use 3–40 lowercase letters, numbers or dashes.', 'error')
    if (!h.name || !h.adminName) return toast('Please fill all fields', 'error')
    setBusy(true)
    try { await api.createHospital(h.code, { name: h.name, shortName: h.name.split(' ')[0], type: h.type, city: h.city, phone: h.phone, color: '#0E7C74', plan: 'starter' }, { name: h.adminName }); await enter(h.code) } catch (e) { toast(e.message, 'error'); setBusy(false) }
  }
  return (
    <div className="min-h-screen max-w-[560px] mx-auto">
      <Hero title="Almost there" sub="Join your hospital or set up a new one" />
      <div className="-mt-14 px-4 pb-10 relative">
        <Card className="p-5">
          <Tabs className="mb-4" value={mode} onChange={setMode} tabs={[{ value: 'patient', label: 'I am a patient' }, { value: 'hospital', label: 'Set up a hospital' }]} />
          {mode === 'patient' ? <>
            <Field label="Hospital code" hint="Ask the reception, or scan the QR at the hospital"><Input value={p.code} onChange={(e) => setP({ ...p, code: e.target.value })} /></Field>
            <Field label="Full name"><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Age"><Input inputMode="numeric" value={p.age} onChange={(e) => setP({ ...p, age: e.target.value.replace(/\D/g, '') })} /></Field><Field label="Gender"><Select value={p.gender} onChange={(e) => setP({ ...p, gender: e.target.value })}><option value="">Choose</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></Select></Field></div>
            <Field label="Message language"><Select value={p.lang} onChange={(e) => setP({ ...p, lang: e.target.value })} translate="no">{LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</Select></Field>
            <p className="text-xs text-ink-500 mb-4">If the hospital already registered you with this mobile number, your existing records are linked automatically.</p>
            <Button block size="lg" icon={UserPlus} loading={busy} onClick={join}>Register</Button>
          </> : <>
            <Field label="Hospital / clinic name"><Input value={h.name} onChange={(e) => setH({ ...h, name: e.target.value })} /></Field>
            <Field label="Short code" hint="Lowercase, e.g. sai-clinic-pune"><Input value={h.code} onChange={(e) => setH({ ...h, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="City"><Input value={h.city} onChange={(e) => setH({ ...h, city: e.target.value })} /></Field><Field label="Phone"><Input value={h.phone} onChange={(e) => setH({ ...h, phone: e.target.value })} /></Field></div>
            <Field label="Your name (administrator)"><Input value={h.adminName} onChange={(e) => setH({ ...h, adminName: e.target.value })} /></Field>
            <Button block size="lg" icon={Building2} loading={busy} onClick={create}>Create hospital</Button>
          </>}
        </Card>
        <Button block variant="ghost" icon={LogOut} className="mt-4" onClick={logout}>Log out</Button>
      </div>
    </div>
  )
}
