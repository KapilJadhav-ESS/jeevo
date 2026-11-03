import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { AlertTriangle, Siren } from 'lucide-react'
import { Badge, Avatar } from './ui'
import { APPT_STATUS } from '../lib/actions/appointments'
import { LAB_STATUS } from '../lib/actions/lab'
import { BILL_STATUS } from '../lib/actions/billing'
import { ageSex, cls, fmtPhone } from '../lib/utils'
import { db } from '../lib/db'

const APPT_COLOR = { booked: 'blue', arrived: 'amber', in_consultation: 'purple', completed: 'green', cancelled: 'gray', no_show: 'red' }
const LAB_COLOR = { ordered: 'blue', sample_collected: 'sky', processing: 'purple', result_entered: 'amber', verified: 'green', published: 'green', cancelled: 'gray' }
const BILL_COLOR = { unpaid: 'red', partial: 'amber', paid: 'green', refunded: 'gray', cancelled: 'gray' }

export const ApptStatus = ({ s }) => <Badge color={APPT_COLOR[s]} dot>{APPT_STATUS[s] || s}</Badge>
export const LabStatus = ({ s, patient }) => <Badge color={LAB_COLOR[s]} dot>{patient && ['result_entered', 'verified'].includes(s) ? 'Processing' : LAB_STATUS[s] || s}</Badge>
export const BillStatus = ({ s }) => <Badge color={BILL_COLOR[s]}>{BILL_STATUS[s] || s}</Badge>
export const EmergencyTag = () => <Badge color="red"><Siren size={12} /> Emergency</Badge>

export function QR({ text, size = 160, className = '' }) {
  const [url, setUrl] = useState('')
  useEffect(() => { QRCode.toDataURL(text, { margin: 1, width: size * 2, color: { dark: '#0E3B39' } }).then(setUrl).catch(() => {}) }, [text])
  return url ? <img src={url} width={size} height={size} alt="QR code" className={className} /> : <div style={{ width: size, height: size }} className="bg-ink-100 rounded-xl" />
}

export function PatientLine({ p, className = '', showPhone = true, right }) {
  if (!p) return null
  return (
    <div className={cls('flex items-center gap-3 min-w-0', className)}>
      <Avatar name={p.name} size={40} user={{ color: p.gender === 'female' ? '#DB2777' : p.gender === 'male' ? '#0E7C74' : '#64748B', name: p.name }} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-ink-900 truncate flex items-center gap-1.5">{p.name}{p.incomplete && <span title="Details pending" className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />}</div>
        <div className="text-xs text-ink-500 truncate"><span translate="no">{p.pid}</span> · {ageSex(p)}{showPhone && p.phone ? ` · ${fmtPhone(p.phone)}` : ''}</div>
      </div>
      {right}
    </div>
  )
}

// Allergy / condition strip – always visible on clinical screens
export function ClinicalAlerts({ p, className = '' }) {
  if (!p) return null
  return (
    <div className={cls('flex flex-wrap gap-2', className)}>
      {p.allergies ? <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1"><AlertTriangle size={14} /> Allergy: {p.allergies}</span> : <span className="rounded-lg bg-ink-100 text-ink-500 text-xs font-semibold px-2.5 py-1">No known allergies</span>}
      {p.conditions && <span className="rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold px-2.5 py-1">{p.conditions}</span>}
      {p.bloodGroup && <span className="rounded-lg bg-sky-50 text-sky-700 text-xs font-bold px-2.5 py-1">Blood {p.bloodGroup}</span>}
    </div>
  )
}

export const doctorName = (id) => db.get('staff', id)?.name || '—'
export const deptName = (id) => db.get('departments', id)?.name || ''
export const userName = (id) => db.getAny('users', id)?.name || '—'
