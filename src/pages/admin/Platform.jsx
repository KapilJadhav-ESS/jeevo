import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, Users, CalendarDays, IndianRupee, ArrowRight } from 'lucide-react'
import { Page, Card, Button, Table, Field, Input, Select, Sheet, Badge, Stat, Grid, useToast } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { db, useData } from '../../lib/db'
import { saveTenant, setTenantStatus, PLANS } from '../../lib/actions'
import { inr, today, fmtDate } from '../../lib/utils'
import { CLOUD } from '../../lib/config'
import { api } from '../../lib/cloud'

// Super Admin: all hospitals & clinics (tenants), subscription plans and usage.
export default function Platform() {
  const toast = useToast()
  const nav = useNavigate()
  const { switchHospital } = useAuth()
  const [f, setF] = useState(null)
  const [remote, setRemote] = useState(null)
  const load = () => api.platformOverview().then(setRemote).catch((e) => toast(e.message, 'error'))
  useEffect(() => { if (CLOUD) load() }, [])
  const local = useData((d) => d.all('hospitals'))
  const hs = CLOUD ? remote || [] : local
  // usage per tenant (demo: computed from local data; cloud: platform_overview RPC – counts only, no patient data)
  const usage = useData((d) => CLOUD ? Object.fromEntries(hs.map((h) => [h.id, { appts30: 0, ...h.usage }])) : Object.fromEntries(hs.map((h) => {
    const of = (c, fn = () => true) => d.all(c).filter((r) => r.hospitalId === h.id && fn(r)).length
    return [h.id, { patients: of('patients'), staff: of('staff'), doctors: of('staff', (s) => s.role === 'doctor'), apptsToday: of('appointments', (a) => a.date === today()), appts30: of('appointments', (a) => a.date >= today().slice(0, 8) + '01') }]
  })))
  const mrr = hs.filter((h) => h.status === 'active').reduce((s, h) => s + (PLANS[h.plan]?.price || 0), 0)
  return (
    <Page title="Platform – hospitals & clinics" wide actions={<Button icon={Plus} onClick={() => setF({ name: '', code: '', type: 'General physician clinic', city: '', state: 'Maharashtra', plan: 'starter', phone: '' })}>Add hospital</Button>}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat icon={Building2} label="Hospitals & clinics" value={hs.length} sub={`${hs.filter((h) => h.status === 'active').length} active`} />
        <Stat icon={Users} tone="sky" label="Patients (all tenants)" value={Object.values(usage).reduce((s, u) => s + u.patients, 0)} />
        <Stat icon={CalendarDays} tone="purple" label="Appointments today" value={Object.values(usage).reduce((s, u) => s + u.apptsToday, 0)} />
        <Stat icon={IndianRupee} tone="green" label="Monthly subscription revenue" value={inr(mrr)} />
      </div>
      <Table rows={hs} columns={[
        { label: 'Hospital', render: (h) => <div><div className="font-semibold">{h.name}</div><div className="text-xs text-ink-500">{h.type} · {h.city} · code <span translate="no">{h.code}</span></div></div> },
        { label: 'Plan', render: (h) => <Badge color={h.plan === 'pro' ? 'purple' : h.plan === 'growth' ? 'blue' : 'gray'}>{PLANS[h.plan]?.name}</Badge> },
        { label: 'Usage', render: (h) => { const u = usage[h.id]; const lim = PLANS[h.plan]; return <span className="text-xs">{`${u.doctors}/${lim?.doctors} doctors · ${u.staff}/${lim?.staff} staff · ${u.patients} patients · ${u.appts30} appts this month`}</span> } },
        { label: 'Since', render: (h) => fmtDate(h.createdAt), hideMobile: true },
        { label: 'Status', render: (h) => <Badge color={h.status === 'active' ? 'green' : 'red'}>{h.status === 'active' ? 'Active' : 'Suspended'}</Badge> },
        { label: '', right: true, render: (h) => <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setF({ ...h })}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={async () => { const st = h.status === 'active' ? 'suspended' : 'active'; try { if (CLOUD) { await api.platformSetHospital(h.id, { status: st }); load() } else setTenantStatus(h.id, st); toast('Updated') } catch (e) { toast(e.message, 'error') } }}>{h.status === 'active' ? 'Suspend' : 'Activate'}</Button>
          <Button size="sm" variant="secondary" icon={ArrowRight} onClick={() => { switchHospital(h.id); nav('/s/reports') }}>Open</Button>
        </div> }
      ]} />
      <h3 className="font-bold mt-6 mb-3">Subscription plans</h3>
      <div className="grid md:grid-cols-3 gap-3">{Object.entries(PLANS).map(([k, p]) => <Card key={k} className="p-5"><div className="font-bold text-lg">{p.name}</div><div className="text-2xl font-extrabold mt-1">{inr(p.price)}<span className="text-sm text-ink-500 font-semibold"> / month</span></div><div className="text-sm text-ink-500 mt-1">{p.desc}</div><div className="text-sm mt-3">{`Up to ${p.doctors} doctors · ${p.staff} staff`}</div><div className="text-xs text-ink-400 mt-1">{`${hs.filter((h) => h.plan === k).length} hospital(s)`}</div></Card>)}</div>
      {!CLOUD && <p className="text-xs text-ink-500 mt-4">Demo: “Open” lets you view a hospital’s reports. In the cloud version each hospital’s data is isolated in the database; the platform admin sees only usage numbers unless granted access.</p>}
      <Sheet open={!!f} onClose={() => setF(null)} title={f?.id ? 'Edit hospital' : 'Add hospital / clinic'} footer={<Button block size="lg" onClick={async () => { try { if (CLOUD) { if (!f.id) throw new Error('New hospitals sign up from the app (Set up a hospital) – then appear here.'); await api.platformSetHospital(f.id, { name: f.name, plan: f.plan, type: f.type, city: f.city, phone: f.phone }); load() } else saveTenant(f); toast('Saved'); setF(null) } catch (e) { toast(e.message, 'error') } }}>Save</Button>}>
        {f && <Grid cols={2}>
          <Field label="Name" className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Code (used in links & login)"><Input value={f.code} disabled={!!f.id} onChange={(e) => setF({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} /></Field>
          <Field label="Type"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{['Multispecialty hospital', 'General physician clinic', 'Multispecialty clinic', 'Dental clinic', 'Diagnostic centre', 'Pathology laboratory', 'Nursing home', 'Day-care hospital'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Field label="City"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
          <Field label="Phone"><Input value={f.phone || ''} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Plan" className="sm:col-span-2"><Select value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })}>{Object.entries(PLANS).map(([k, p]) => <option key={k} value={k}>{p.name} – {inr(p.price)}/month</option>)}</Select></Field>
        </Grid>}
      </Sheet>
    </Page>
  )
}
