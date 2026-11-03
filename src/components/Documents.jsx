// On-screen / printable views of medical documents, shared by the patient app
// and the hospital app. Printing supports A4 and A5 (common prescription pads).
import { useState } from 'react'
import { Download, Printer, Share2 } from 'lucide-react'
import { Button, Card, Chips, DocLink, useToast } from './ui'
import { db, useData } from '../lib/db'
import { FREQUENCIES, TIMINGS, flagOf, balanceOf, PAY_METHODS } from '../lib/actions'
import { prescriptionPdf, labReportPdf, billPdf, dischargePdf, saveBlob, shareBlob } from '../lib/pdf'
import { ageSex, cls, fmtDate, fmtDateTime, inr } from '../lib/utils'
import { getLang, LANGS } from '../i18n'

export function printPage(size = 'A4') {
  const st = document.createElement('style')
  st.textContent = `@page { size: ${size}; margin: ${size === 'A5' ? '8mm' : '12mm'}; }`
  document.head.appendChild(st)
  window.print()
  setTimeout(() => st.remove(), 500)
}

function Actions({ blob, name, shareText, paper = true }) {
  const toast = useToast()
  const [size, setSize] = useState('A4')
  return (
    <div className="no-print space-y-2 mt-4">
      {paper && <div className="flex items-center gap-2"><span className="text-xs font-semibold text-ink-500">Paper size</span><Chips value={size} onChange={setSize} options={['A4', 'A5']} className="!mx-0 !px-0" /></div>}
      <div className="grid grid-cols-3 gap-2">
        <Button variant="secondary" icon={Download} onClick={() => saveBlob(blob(), name)}>PDF</Button>
        <Button variant="secondary" icon={Printer} onClick={() => printPage(size)}>Print</Button>
        <Button variant="secondary" icon={Share2} onClick={async () => { const r = await shareBlob(blob(), name, shareText); if (r === 'downloaded') toast('PDF downloaded – attach it in WhatsApp to share', 'info') }}>Share</Button>
      </div>
    </div>
  )
}

function Letterhead({ title, right }) {
  const h = db.hospital() || {}
  return (
    <div className="flex items-start justify-between gap-4 border-b-2 pb-3 mb-3" style={{ borderColor: h.color || '#0E7C74' }}>
      <div>
        <div className="text-lg font-extrabold" style={{ color: h.color || '#0E7C74' }}>{h.name}</div>
        <div className="text-[11px] text-ink-500">{h.address}, {h.city} {h.pin} · Ph {h.phone}</div>
        {h.regNo && <div className="text-[11px] text-ink-500" translate="no">Reg: {h.regNo}</div>}
      </div>
      <div className="text-right"><div className="text-xs font-bold tracking-wider text-ink-500 uppercase">{title}</div>{right}</div>
    </div>
  )
}
function PatientStrip({ p, extra }) {
  return (
    <div className="rounded-xl bg-ink-100/70 px-3 py-2 text-sm flex flex-wrap gap-x-5 gap-y-1">
      <span className="font-bold">{p?.name}</span><span translate="no">{p?.pid}</span><span>{ageSex(p)}</span>{extra}
    </div>
  )
}

/* ---------- Prescription ---------- */
export function PrescriptionView({ rx, actions = true }) {
  const p = useData((d) => d.get('patients', rx.patientId))
  const doc = useData((d) => d.get('staff', rx.doctorId))
  const con = useData((d) => rx.consultationId && d.get('consultations', rx.consultationId))
  const [pl, setPl] = useState(rx.patientLang && rx.patientLang !== 'en' ? rx.patientLang : getLang() !== 'en' ? getLang() : '')
  const v = con?.vitals || {}
  return (
    <>
      <Card className="p-4 lg:p-6 print-area">
        <Letterhead title="Prescription" right={<><div className="text-sm font-semibold" translate="no">{rx.rxNo}</div><div className="text-xs text-ink-500">{fmtDate(rx.date + 'T00:00:00')}</div></>} />
        <div className="mb-3"><div className="font-bold">{doc?.name}</div><div className="text-xs text-ink-500">{doc?.qualification} · {doc?.designation}</div><div className="text-xs text-ink-500" translate="no">Reg. No. {doc?.regNo}</div></div>
        <PatientStrip p={p} extra={<span className={p?.allergies ? 'text-red-600 font-bold' : ''}>Allergies: {p?.allergies || 'None known'}</span>} />
        {(v.bpSys || v.pulse || v.temp || v.weight) && <div className="text-xs text-ink-500 mt-2">Vitals: {[v.bpSys && `BP ${v.bpSys}/${v.bpDia}`, v.pulse && `Pulse ${v.pulse}`, v.temp && `Temp ${v.temp}°F`, v.spo2 && `SpO₂ ${v.spo2}%`, v.weight && `Wt ${v.weight} kg`].filter(Boolean).join(' · ')}</div>}
        {rx.diagnosis && <div className="mt-3 text-sm"><span className="text-ink-500">Diagnosis: </span><span className="font-bold" translate="no">{rx.diagnosis}</span></div>}
        <div className="text-2xl font-extrabold text-brand-700 mt-3" translate="no">℞</div>
        <div className="divide-y divide-ink-100">
          {rx.items.map((it, i) => (
            <div key={i} className="py-2.5">
              <div className="flex justify-between gap-3">
                <div className="min-w-0" translate="no"><div className="font-bold">{i + 1}. {it.name} <span className="font-semibold text-ink-500">{it.strength}</span></div>{it.generic && <div className="text-xs text-ink-500">{it.generic}</div>}</div>
                <div className="text-right text-sm shrink-0"><div className="font-bold" translate="no">{it.frequency}</div><div className="text-xs text-ink-500">{it.duration}</div></div>
              </div>
              <div className="text-sm text-ink-700 mt-1"><span translate="no">{it.dose}</span> · {FREQUENCIES[it.frequency]?.en} · {TIMINGS[it.timing]?.en}</div>
              {pl && <div className="text-sm text-brand-800 mt-0.5 font-semibold" translate="no">{FREQUENCIES[it.frequency]?.[pl]} · {TIMINGS[it.timing]?.[pl]}</div>}
              {it.instructions && <div className="text-xs text-ink-500 mt-0.5" translate="no">{it.instructions}</div>}
            </div>
          ))}
        </div>
        {rx.advice && <div className="mt-3 text-sm"><div className="font-bold">Advice</div><p className="text-ink-700" translate="no">{rx.advice}</p></div>}
        {rx.diet && <div className="mt-2 text-sm"><div className="font-bold">Diet</div><p className="text-ink-700" translate="no">{rx.diet}</p></div>}
        {rx.patientNote && <div className="mt-2 text-sm rounded-xl bg-brand-50 p-3 text-brand-900" translate="no">{rx.patientNote}</div>}
        {rx.followUpDate && <div className="mt-3 font-bold text-brand-700">Follow-up on {fmtDate(rx.followUpDate + 'T00:00:00')}</div>}
        <div className="mt-5 text-right text-sm">
          <div className="font-bold">{doc?.name}</div>
          <div className={cls('text-xs', rx.status === 'final' ? 'text-accent-700' : 'text-red-600')}>{rx.status === 'final' ? `Digitally signed · ${fmtDateTime(rx.signedAt || rx.createdAt)}` : rx.status === 'superseded' ? 'Replaced by a corrected prescription' : 'Draft – not valid until signed'}</div>
        </div>
      </Card>
      {actions && (
        <>
          <div className="no-print flex items-center gap-2 mt-3 text-xs">
            <span className="text-ink-500 font-semibold">Instructions also in:</span>
            {LANGS.filter((l) => l.code !== 'en').map((l) => <button key={l.code} onClick={() => setPl(pl === l.code ? '' : l.code)} translate="no" className={cls('h-8 px-3 rounded-full font-semibold border', pl === l.code ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-ink-200')}>{l.label}</button>)}
          </div>
          {rx.status === 'final' && <Actions blob={() => prescriptionPdf(rx)} name={`Prescription-${rx.rxNo}.pdf`} shareText={`Prescription from ${doc?.name}`} />}
        </>
      )}
    </>
  )
}

/* ---------- Lab report ---------- */
export function LabReportView({ lo, patientView }) {
  const p = useData((d) => d.get('patients', lo.patientId))
  const doc = useData((d) => d.get('staff', lo.doctorId))
  const tests = useData((d) => lo.tests.map((t) => d.get('labTests', t)))
  const ver = useData((d) => d.getAny('users', lo.verifiedBy))
  if (patientView && lo.status !== 'published') return <Card className="p-5 text-center text-sm text-ink-500">Your report will appear here after it is checked and verified by the laboratory.</Card>
  return (
    <>
      <Card className="p-4 lg:p-6 print-area">
        <Letterhead title="Laboratory report" right={<><div className="text-sm font-semibold" translate="no">{lo.orderNo}</div><div className="text-xs text-ink-500">Sample <span translate="no">{lo.sampleId || '—'}</span></div></>} />
        <PatientStrip p={p} extra={<span>Ref. by {doc?.name || 'Self'}</span>} />
        <div className="text-xs text-ink-500 mt-2">Collected {fmtDateTime(lo.collectedAt)} · Reported {fmtDateTime(lo.verifiedAt || lo.enteredAt)}</div>
        {tests.map((t) => (
          <div key={t.id} className="mt-4">
            <div className="font-bold text-brand-700">{t.name}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm mt-1">
                <thead><tr className="text-left text-[11px] uppercase text-ink-500 border-b border-ink-200"><th className="py-1.5">Test</th><th>Result</th><th>Unit</th><th>Reference range</th></tr></thead>
                <tbody>
                  {t.params.map((prm) => {
                    const val = lo.results?.[t.id]?.[prm.name] ?? ''
                    const f = flagOf(prm, val)
                    return (
                      <tr key={prm.name} className="border-b border-ink-100">
                        <td className="py-2 pr-2" translate="no">{prm.name}</td>
                        <td className={cls('font-bold whitespace-nowrap', f && 'text-red-600')} translate="no">{val || '—'}{f && <span className="ml-1 text-[10px] font-extrabold">{f === 'high' ? '▲ High' : '▼ Low'}</span>}</td>
                        <td className="text-ink-500" translate="no">{prm.unit}</td>
                        <td className="text-ink-500 whitespace-nowrap" translate="no">{prm.low != null ? `${prm.low} – ${prm.high}` : prm.normal}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {lo.remarks && <p className="text-sm mt-3"><span className="text-ink-500">Remarks: </span><span translate="no">{lo.remarks}</span></p>}
        {lo.files?.length > 0 && <div className="mt-3 space-y-1">{lo.files.map((f, i) => <DocLink key={i} file={f} />)}</div>}
        <div className="mt-4 flex justify-between items-end gap-3 text-xs">
          <span className="text-ink-500 max-w-[60%]">Values marked High/Low are outside the reference range. Please discuss the results with your doctor.</span>
          <span className="text-right"><span className="block font-bold text-sm">{ver?.name}</span><span className={lo.verifiedAt ? 'text-accent-700' : 'text-red-600'}>{lo.verifiedAt ? `Verified · ${fmtDateTime(lo.verifiedAt)}` : 'Not verified – provisional'}</span></span>
        </div>
      </Card>
      {['verified', 'published'].includes(lo.status) && <Actions blob={() => labReportPdf(lo)} name={`Lab-report-${lo.orderNo}.pdf`} shareText="Lab report" />}
    </>
  )
}

/* ---------- Bill ---------- */
export function BillView({ b, actions = true }) {
  const p = useData((d) => d.get('patients', b.patientId))
  const pays = useData((d) => d.list('payments', (x) => x.billId === b.id).sort((a, c) => a.at.localeCompare(c.at)))
  return (
    <>
      <Card className="p-4 lg:p-6 print-area">
        <Letterhead title="Bill" right={<><div className="text-sm font-semibold" translate="no">{b.billNo}</div><div className="text-xs text-ink-500">{fmtDate(b.createdAt)}</div></>} />
        <PatientStrip p={p} />
        <table className="w-full text-sm mt-3">
          <thead><tr className="text-left text-[11px] uppercase text-ink-500 border-b border-ink-200"><th className="py-1.5">Item</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{b.items.map((it, i) => (
            <tr key={i} className="border-b border-ink-100">
              <td className="py-2 pr-2" translate="no">{it.desc}{it.discount > 0 && <span className="block text-[11px] text-accent-700">Discount {inr(it.discount, 2)}</span>}</td>
              <td className="text-right">{it.qty}</td><td className="text-right whitespace-nowrap">{inr(it.rate, 2)}</td><td className="text-right whitespace-nowrap font-semibold">{inr(it.qty * it.rate - (it.discount || 0), 2)}</td>
            </tr>))}
          </tbody>
        </table>
        <div className="ml-auto max-w-[260px] mt-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-ink-500">Subtotal</span><span>{inr(b.subtotal, 2)}</span></div>
          {b.discount > 0 && <div className="flex justify-between"><span className="text-ink-500">Discount</span><span>− {inr(b.discount, 2)}</span></div>}
          {b.tax > 0 && <div className="flex justify-between"><span className="text-ink-500">Tax</span><span>{inr(b.tax, 2)}</span></div>}
          <div className="flex justify-between font-extrabold text-base border-t border-ink-200 pt-1"><span>Total</span><span>{inr(b.total, 2)}</span></div>
          <div className="flex justify-between"><span className="text-ink-500">Paid</span><span>{inr(b.paid, 2)}</span></div>
          {b.refunded > 0 && <div className="flex justify-between"><span className="text-ink-500">Refunded</span><span>{inr(b.refunded, 2)}</span></div>}
          <div className={cls('flex justify-between font-bold', balanceOf(b) > 0 ? 'text-red-600' : 'text-accent-700')}><span>Balance</span><span>{inr(balanceOf(b), 2)}</span></div>
        </div>
        {pays.length > 0 && <div className="mt-4"><div className="text-xs font-bold text-ink-500 uppercase mb-1">Payments</div>{pays.map((x) => (
          <div key={x.id} className="flex justify-between text-sm py-1 border-b border-ink-100 last:border-0"><span>{fmtDateTime(x.at)} · {PAY_METHODS[x.method]} · <span translate="no">{x.receiptNo}</span>{x.kind === 'refund' && <span className="text-red-600"> · Refund: {x.reason}</span>}</span><span className={x.amount < 0 ? 'text-red-600 font-semibold' : 'font-semibold'}>{inr(x.amount, 2)}</span></div>
        ))}</div>}
      </Card>
      {actions && <Actions blob={() => billPdf(b)} name={`Bill-${b.billNo}.pdf`} shareText="Hospital bill" paper={false} />}
    </>
  )
}

/* ---------- Discharge summary ---------- */
export function DischargeView({ a }) {
  const p = useData((d) => d.get('patients', a.patientId))
  const doc = useData((d) => d.get('staff', a.doctorId))
  const s = a.dischargeSummary || {}
  const Sec = ({ t, v }) => (v ? <div className="mt-3"><div className="text-xs font-bold uppercase text-brand-700">{t}</div><p className="text-sm whitespace-pre-line" translate="no">{v}</p></div> : null)
  return (
    <>
      <Card className="p-4 lg:p-6 print-area">
        <Letterhead title="Discharge summary" right={<div className="text-sm font-semibold" translate="no">{a.admNo}</div>} />
        <PatientStrip p={p} extra={<span>Consultant: {doc?.name}</span>} />
        <div className="text-xs text-ink-500 mt-2">Admitted {fmtDateTime(a.admittedAt)} · Discharged {a.dischargedAt ? fmtDateTime(a.dischargedAt) : '—'}</div>
        <Sec t="Reason for admission" v={a.reason} />
        <Sec t="Final diagnosis" v={s.diagnosis} />
        <Sec t="Course in hospital" v={s.course} />
        <Sec t="Procedures" v={s.procedures} />
        <Sec t="Condition at discharge" v={s.condition} />
        <Sec t="Medicines" v={s.medications} />
        <Sec t="Advice" v={s.advice} />
        {s.followUp && <div className="mt-3 font-bold text-brand-700">Follow-up on {fmtDate(s.followUp + 'T00:00:00')}</div>}
      </Card>
      {s.final && <Actions blob={() => dischargePdf(a)} name={`Discharge-${a.admNo}.pdf`} shareText="Discharge summary" paper={false} />}
    </>
  )
}
