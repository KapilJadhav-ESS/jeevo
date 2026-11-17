import { useState } from 'react'
import { ArrowLeft, ArrowRight, Smartphone, Stethoscope, UserRound, HeartPulse, ShieldCheck, Building2, UserPlus } from 'lucide-react'
import { Button, Field, Input, Select, Card, Tabs, Avatar, useToast } from '../components/ui'
import { useAuth, findUserByPhone, demoSignup } from '../lib/auth'
import { db } from '../lib/db'
import { registerPatient } from '../lib/actions'
import { userRoleLabel } from '../lib/rbac'
import { otp6, validPhone, dobFromAge } from '../lib/utils'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { CLOUD, BRAND_NAME } from '../lib/config'
import { sendOtp, verifyOtp } from '../lib/cloud'
import { LANGS, setLang } from '../i18n'

const LANG_KEY = 'jeevo-lang'
const langChosen = () => { try { return !!localStorage.getItem(LANG_KEY) } catch { return true } }

export default function Login() {
  const [chosen, setChosen] = useState(langChosen())
  if (!chosen) return <LanguageFirst onDone={() => setChosen(true)} />
  return CLOUD ? <CloudLogin /> : <DemoLogin />
}

// First launch: choose a language before anything else (big, simple buttons).
function LanguageFirst({ onDone }) {
  const pickLang = (c) => { setLang(c); onDone() }
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 to-brand-900 text-white grid place-items-center p-6">
      <div className="w-full max-w-sm text-center">
        <Logo className="mx-auto" big />
        <h1 className="text-2xl font-extrabold mt-6" translate="no">Choose your language</h1>
        <p className="text-brand-100 mt-1" translate="no">अपनी भाषा चुनें · तुमची भाषा निवडा</p>
        <div className="mt-8 space-y-3" translate="no">
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => pickLang(l.code)} className="w-full h-16 rounded-2xl bg-white text-brand-800 text-xl font-bold shadow-float active:scale-[.98] transition">{l.label}</button>
          ))}
        </div>
        <p className="text-xs text-brand-200 mt-6" translate="no">You can change this any time in Settings.</p>
      </div>
    </div>
  )
}

// Hospital logo (Radhakrishna Hospital) on a white tile
export function Logo({ className = '', big }) {
  return (
    <div className={`${big ? 'h-20 w-20 rounded-3xl' : 'h-12 w-12 rounded-2xl'} bg-white grid place-items-center shadow-sm ${className}`}>
      <img src="logo.png" alt="" className={big ? 'h-16 w-16' : 'h-10 w-10'} />
    </div>
  )
}

export function Hero({ title, sub }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white px-6 pt-14 pb-24 safe-top">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-300/20 blur-2xl" />
      <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-sky-300/10 blur-2xl" />
      <div className="relative flex justify-end -mt-6 mb-6"><LanguageSwitcher dark /></div>
      <div className="relative">
        <Logo className="mb-5" />
        <p className="text-brand-100 text-sm font-semibold tracking-wide">Radhakrishna Hospital</p>
        <h1 className="text-[27px] font-extrabold leading-tight mt-1">{title}</h1>
        {sub && <p className="text-brand-100 text-sm mt-1">{sub}</p>}
      </div>
    </div>
  )
}

const DEMO = {
  patient: [['u-patient', 'Book appointments, see token status, prescriptions, reports and bills for the whole family']],
  owners: [
    ['u-sanjay', 'Hospital administrator – OPD, beds, hospital billing & income, hospital staff, settings'],
    ['u-umesh', 'Main doctor and administrator – today’s OPD, prescriptions, ECG / 2D echo, plus admin'],
    ['u-avinash', 'Medical store owner – stock, sales and income of the medical store only'],
    ['u-bapuji', 'Laboratory owner – verifies reports, lab prices, lab income and staff only']
  ],
  staff: [
    ['u-kavita', 'Gynaecologist – maternity OPD, prescriptions, deliveries'],
    ['u-recep1', 'Reception – register patients, tokens, queue, hospital billing'],
    ['u-nurse1', 'Nurse – ward & ICU patients, vitals, tasks, medicines given'],
    ['u-pharm1', 'Pharmacist – dispense prescriptions, counter sales'],
    ['u-yogita', 'Lab technologist – samples, result entry'],
    ['u-a-doc', 'A different (sample) clinic – its data is completely separate'],
    ['u-super', 'Platform – all hospitals & clinics, plans, usage']
  ]
}

function DemoLogin() {
  const { login } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('patient')
  const [step, setStep] = useState('pick')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [sent, setSent] = useState('')
  const [err, setErr] = useState('')
  const [reg, setReg] = useState({ name: '', age: '', gender: '', lang: 'en' })

  const send = () => {
    setErr('')
    if (!validPhone(phone)) return setErr('Enter a valid 10-digit Indian mobile number')
    const code = otp6(); setSent(code); setOtp(''); setStep('otp')
  }
  const verify = () => {
    if (otp !== sent) return setErr('Incorrect code. Please try again.')
    const u = findUserByPhone(phone)
    if (u) return login(u.id)
    setStep('register')
  }
  const signup = () => {
    setErr('')
    if (!reg.name.trim()) return setErr('Please enter your name')
    if (!(Number(reg.age) > 0 && Number(reg.age) < 120)) return setErr('Please enter your age')
    try {
      const u = demoSignup({ name: reg.name.trim(), phone, dob: dobFromAge(reg.age), gender: reg.gender, lang: reg.lang }, registerPatient)
      setLang(reg.lang)
      toast('Welcome! Your Patient ID has been created.')
      login(u.id)
    } catch (e) { setErr(e.message) }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1fr_560px] bg-canvas">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white p-12">
        <div className="flex items-center gap-3"><Logo /><span><span className="block text-xl font-extrabold">Radhakrishna Hospital</span><span className="block text-sm text-brand-100">Pimpalgaon Baswant · Reg. No. 348</span></span></div>
        <div>
          <h1 className="text-4xl font-extrabold leading-tight max-w-lg">Your health, simplified.</h1>
          <p className="text-brand-100 mt-3 max-w-md">Appointments, tokens, prescriptions, lab reports, medical store and bills — in English, हिंदी and मराठी.</p>
          <p className="text-brand-100/80 text-sm mt-2 max-w-md">Dr. Umesh Aher · Dr. Kavita Umesh Aher</p>
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-lg">
            {[['📱', 'Patient app'], ['💬', 'WhatsApp & SMS'], ['🏥', 'Hospital web app']].map(([e, t]) => <div key={t} className="rounded-2xl bg-white/10 p-4"><div className="text-2xl">{e}</div><div className="text-sm font-semibold mt-2">{t}</div></div>)}
          </div>
        </div>
        <LanguageSwitcher dark className="self-start" />
      </div>
      <div className="max-w-[560px] w-full mx-auto">
        <div className="lg:hidden"><Hero title={BRAND_NAME || 'Your health, simplified.'} sub="Pimpalgaon Baswant · Appointments · Reports · Bills" /></div>
        <div className="-mt-14 lg:mt-0 px-4 lg:px-10 pb-10 lg:py-16 relative">
          <Card className="p-5 lg:p-7">
            {step === 'pick' && (
              <>
                <h2 className="text-lg font-bold">Welcome 🙏</h2>
                <p className="text-sm text-ink-500 mb-4">Log in with your mobile number</p>
                <Field error={err}>
                  <div className="flex gap-2">
                    <span className="h-12 px-3 rounded-xl border border-ink-200 grid place-items-center text-[15px] font-semibold text-ink-700">+91</span>
                    <Input inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && send()} />
                  </div>
                </Field>
                <Button block size="lg" icon={Smartphone} onClick={send}>Send OTP</Button>
                <p className="text-xs text-ink-500 mt-3 text-center">New patient? Enter your mobile number – you can register in one minute.</p>

                <div className="flex items-center gap-3 my-6"><span className="flex-1 h-px bg-ink-200" /><span className="text-xs font-semibold text-ink-400 uppercase tracking-wide">or try a demo account</span><span className="flex-1 h-px bg-ink-200" /></div>
                <Tabs className="mb-3" value={tab} onChange={setTab} tabs={[{ value: 'patient', label: 'Patient app' }, { value: 'owners', label: 'Management' }, { value: 'staff', label: 'Staff' }]} />
                <div className="space-y-2">
                  {DEMO[tab].map(([id, desc]) => {
                    const u = db.getAny('users', id)
                    if (!u) return null
                    const h = u.hospitalId && db.getAny('hospitals', u.hospitalId)
                    return (
                      <button key={id} onClick={() => login(id)} className="w-full flex items-center gap-3 p-3 rounded-2xl border border-ink-200 hover:border-brand-300 hover:bg-brand-50/40 text-left transition">
                        <Avatar user={u} size={42} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[15px] truncate">{u.name}</div>
                          <div className="text-xs font-semibold text-brand-700">{userRoleLabel(u)}{h && id === 'u-a-doc' ? ` · ${h.name}` : ''}</div>
                          <div className="text-xs text-ink-500 line-clamp-2">{desc}</div>
                        </div>
                        <ArrowRight size={18} className="text-ink-400 shrink-0" />
                      </button>
                    )
                  })}
                </div>
                <p className="text-[11px] text-ink-400 mt-4 text-center">Demo mode: sample data stays on this device. No SMS or WhatsApp messages are sent.</p>
              </>
            )}
            {step === 'otp' && (
              <>
                <button onClick={() => setStep('pick')} className="flex items-center gap-1 text-sm text-ink-500 mb-3"><ArrowLeft size={16} /> Change number</button>
                <h2 className="text-lg font-bold">Enter verification code</h2>
                <p className="text-sm text-ink-500">Sent to +91 {phone}</p>
                <div className="my-4 rounded-xl bg-amber-50 text-amber-800 text-sm font-semibold px-3 py-2">Demo mode: your OTP is {sent}</div>
                <Field error={err}>
                  <Input autoFocus inputMode="numeric" maxLength={6} placeholder="• • • • • •" className="text-center tracking-[0.6em] text-xl font-bold" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && otp.length === 6 && verify()} />
                </Field>
                <Button block size="lg" icon={ShieldCheck} disabled={otp.length !== 6} onClick={verify}>Verify & continue</Button>
              </>
            )}
            {step === 'register' && (
              <>
                <h2 className="text-lg font-bold flex items-center gap-2"><UserPlus size={20} /> New patient registration</h2>
                <p className="text-sm text-ink-500 mb-4">+91 {phone} · {db.hospital()?.name}</p>
                <Field label="Full name"><Input value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} placeholder="e.g. Sunil Pawar" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Age (years)"><Input inputMode="numeric" value={reg.age} onChange={(e) => setReg({ ...reg, age: e.target.value.replace(/\D/g, '').slice(0, 3) })} /></Field>
                  <Field label="Gender"><Select value={reg.gender} onChange={(e) => setReg({ ...reg, gender: e.target.value })}><option value="">Choose</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></Select></Field>
                </div>
                <Field label="Preferred language for messages">
                  <Select value={reg.lang} onChange={(e) => setReg({ ...reg, lang: e.target.value })} translate="no">{LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</Select>
                </Field>
                <p className="text-xs text-ink-500 mb-4">By registering you agree that the hospital may store your health records and contact you by SMS / WhatsApp about appointments and reports. You can change this any time in Profile.</p>
                {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
                <Button block size="lg" onClick={signup}>Create my Patient ID</Button>
              </>
            )}
          </Card>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-ink-500 lg:hidden">
            <div><HeartPulse className="mx-auto mb-1 text-brand-600" size={20} />Patients</div>
            <div><Stethoscope className="mx-auto mb-1 text-brand-600" size={20} />Doctors</div>
            <div><Building2 className="mx-auto mb-1 text-brand-600" size={20} />Hospitals</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CloudLogin() {
  const { enter } = useAuth()
  const [mode, setMode] = useState('phone')
  const [step, setStep] = useState('id')
  const [id, setId] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const valid = mode === 'phone' ? validPhone(id) : /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id.trim())
  const send = async () => {
    setErr('')
    if (!valid) return setErr(mode === 'phone' ? 'Enter a valid 10-digit Indian mobile number' : 'Enter a valid email address')
    setBusy(true)
    try { await sendOtp(id); setStep('otp'); setCode('') } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }
  const verify = async () => {
    setErr(''); setBusy(true)
    try { await verifyOtp(id, code); await enter() } catch (e) { setErr(e.message); setBusy(false) }
  }
  return (
    <div className="min-h-screen max-w-[560px] mx-auto">
      <Hero title={BRAND_NAME || 'Your health, simplified.'} sub="Appointments · Reports · Bills" />
      <div className="-mt-14 px-4 pb-10 relative">
        <Card className="p-5">
          {step === 'id' ? (
            <>
              <h2 className="text-lg font-bold">Welcome 🙏</h2>
              <p className="text-sm text-ink-500 mb-4">Patients and hospital staff log in with their registered mobile number</p>
              <Tabs className="mb-4" value={mode} onChange={(v) => { setMode(v); setId(''); setErr('') }} tabs={[{ value: 'phone', label: 'Mobile' }, { value: 'email', label: 'Email' }]} />
              <Field error={err}>
                {mode === 'phone' ? (
                  <div className="flex gap-2">
                    <span className="h-12 px-3 rounded-xl border border-ink-200 grid place-items-center text-[15px] font-semibold text-ink-700">+91</span>
                    <Input inputMode="numeric" maxLength={10} placeholder="10-digit mobile number" value={id} onChange={(e) => setId(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && send()} />
                  </div>
                ) : <Input type="email" inputMode="email" placeholder="you@example.com" value={id} onChange={(e) => setId(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />}
              </Field>
              <Button block size="lg" icon={Smartphone} loading={busy} onClick={send}>Send OTP</Button>
            </>
          ) : (
            <>
              <button onClick={() => setStep('id')} className="flex items-center gap-1 text-sm text-ink-500 mb-3"><ArrowLeft size={16} /> Change number</button>
              <h2 className="text-lg font-bold">Enter verification code</h2>
              <p className="text-sm text-ink-500 mb-5">{mode === 'phone' ? `Sent to +91 ${id}` : `Sent to ${id}`}</p>
              <Field error={err}>
                <Input autoFocus inputMode="numeric" maxLength={6} placeholder="• • • • • •" className="text-center tracking-[0.6em] text-xl font-bold" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && verify()} />
              </Field>
              <Button block size="lg" icon={UserRound} loading={busy} disabled={code.length !== 6} onClick={verify}>Verify & continue</Button>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
