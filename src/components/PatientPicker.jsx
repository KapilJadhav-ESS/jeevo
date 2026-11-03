import { useState } from 'react'
import { UserPlus, X } from 'lucide-react'
import { Button, Card, SearchBox, Sheet } from './ui'
import { PatientLine } from './common'
import { useData } from '../lib/db'
import { searchPatients } from '../lib/actions'
import { PatientForm } from '../pages/staff/Patients'

// Find a patient by name / mobile / Patient ID / QR, or register a new one inline.
export default function PatientPicker({ value, onChange, allowNew = true, autoFocus = true }) {
  const [q, setQ] = useState('')
  const [reg, setReg] = useState(false)
  const p = useData((d) => (value ? d.get('patients', value) : null))
  const res = useData(() => (q.trim().length >= 2 ? searchPatients(q, 6) : []))
  if (p) return (
    <Card className="p-3 shadow-none border border-brand-200 bg-brand-50/40">
      <PatientLine p={p} right={<button aria-label="Change patient" onClick={() => onChange(null)} className="h-9 w-9 grid place-items-center rounded-full hover:bg-white"><X size={18} /></button>} />
    </Card>
  )
  return (
    <div>
      <SearchBox autoFocus={autoFocus} value={q} onChange={setQ} placeholder="Search name, mobile, Patient ID" onKeyDown={(e) => e.key === 'Enter' && res[0] && onChange(res[0].id)} />
      {res.length > 0 && <Card className="mt-2 p-1 shadow-none border border-ink-200">{res.map((x) => <button key={x.id} onClick={() => onChange(x.id)} className="w-full text-left p-2 rounded-xl hover:bg-ink-100"><PatientLine p={x} /></button>)}</Card>}
      {q.trim().length >= 2 && !res.length && <p className="text-sm text-ink-500 mt-2">No patient found.</p>}
      {allowNew && <Button variant="ghost" size="sm" icon={UserPlus} className="mt-2" onClick={() => setReg(true)}>Register new patient</Button>}
      <Sheet open={reg} onClose={() => setReg(false)} title="Register patient" wide><PatientForm compact onSaved={(np) => { setReg(false); onChange(np.id) }} /></Sheet>
    </div>
  )
}
