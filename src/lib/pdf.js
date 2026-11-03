// Tiny dependency-free PDF writer (text, lines, rectangles, multiple A4 pages)
// used for prescriptions, bills, receipts, lab reports and discharge summaries,
// so they can be downloaded and shared even offline. PDFs are in English;
// the on-screen "Print" view also shows Hindi / Marathi patient instructions.
import { db } from './db'
import { FREQUENCIES, TIMINGS } from './actions/clinical'
import { flagOf } from './actions/lab'
import { balanceOf, PAY_METHODS } from './actions/billing'
import { ageSex, fmtNum } from './utils'

const esc = (s) => String(s ?? '').replace(/₹/g, 'Rs. ').replace(/[–—]/g, '-').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/µ/g, 'u').replace(/₂/g, '2').replace(/×/g, 'x').replace(/[^\x20-\x7E]/g, '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
const rs = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function makePdf(draw) {
  const H = 842
  const pages = [[]]
  let ops = pages[0]
  const rgb = (hex = '#0F172A') => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(3)).join(' ') }
  const width = (str, size, bold) => esc(str).length * size * (bold ? 0.55 : 0.5)
  const api = {
    text(x, y, str, { size = 10, bold = false, color, align } = {}) {
      let xx = x
      if (align === 'right') xx = x - width(str, size, bold)
      if (align === 'center') xx = x - width(str, size, bold) / 2
      ops.push(`BT ${rgb(color)} rg /${bold ? 'F2' : 'F1'} ${size} Tf ${xx.toFixed(1)} ${(H - y).toFixed(1)} Td (${esc(str)}) Tj ET`)
    },
    line(x1, y1, x2, y2, color = '#E2E8F0', w = 1) { ops.push(`${rgb(color)} RG ${w} w ${x1} ${H - y1} m ${x2} ${H - y2} l S`) },
    rect(x, y, w, h, color = '#F1F5F9') { ops.push(`${rgb(color)} rg ${x} ${H - y - h} ${w} ${h} re f`) },
    wrap(x, y, str, w, opts = {}) {
      const size = opts.size || 10
      const max = Math.max(8, Math.floor(w / (size * 0.5)))
      let yy = y
      for (const para of String(str ?? '').split('\n')) {
        let line = ''
        for (const word of para.split(/\s+/)) {
          if ((line + ' ' + word).trim().length > max) { api.text(x, yy, line.trim(), opts); yy += size * 1.45; line = word } else line += ' ' + word
        }
        if (line.trim()) { api.text(x, yy, line.trim(), opts); yy += size * 1.45 }
      }
      return yy
    },
    newPage() { ops = []; pages.push(ops) }
  }
  draw(api)
  const n = pages.length
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + i * 2} 0 R`).join(' ')}] /Count ${n} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>']
  pages.forEach((p, i) => {
    const content = p.join('\n')
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`)
    objs.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
  })
  let out = '%PDF-1.4\n'
  const offsets = []
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const xref = out.length
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([out], { type: 'application/pdf' })
}

export function saveBlob(blob, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 1000)
}
// Share a PDF file directly (WhatsApp etc.) – never a public link to medical data.
export async function shareBlob(blob, filename, text) {
  const file = new File([blob], filename, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename, text }); return 'shared' } catch (e) { if (e?.name === 'AbortError') return 'cancelled' }
  }
  saveBlob(blob, filename)
  return 'downloaded'
}

/* ---------- letterhead ---------- */
function letterhead(p, h, title) {
  p.rect(0, 0, 595, 78, h.color || '#0E7C74')
  p.text(40, 34, h.name, { size: 17, bold: true, color: '#FFFFFF' })
  p.text(40, 52, `${h.address || ''}, ${h.city || ''} ${h.pin || ''}`, { size: 8.5, color: '#D2F2EE' })
  p.text(40, 66, `Ph: ${h.phone || ''}${h.emergencyPhone ? '  |  Emergency: ' + h.emergencyPhone : ''}${h.regNo ? '  |  Reg: ' + h.regNo : ''}`, { size: 8.5, color: '#D2F2EE' })
  p.text(555, 34, title, { size: 11, bold: true, color: '#FFFFFF', align: 'right' })
  return 100
}
function patientBox(p, y, pt, extra = []) {
  p.rect(40, y, 515, 46, '#F1F5F9')
  p.text(50, y + 17, pt.name, { size: 11, bold: true })
  p.text(50, y + 33, `${pt.pid}   |   ${ageSex(pt)}   |   +91 ${pt.phone || '-'}`, { size: 9, color: '#334155' })
  extra.forEach(([k, v], i) => p.text(545, y + 17 + i * 16, `${k}: ${v}`, { size: 9, color: '#334155', align: 'right' }))
  return y + 62
}
function footer(p, h, note) {
  p.line(40, 800, 555, 800)
  p.text(40, 814, note || 'This is a computer-generated document.', { size: 7.5, color: '#64748B' })
  p.text(555, 814, `Generated by JeevO for ${h.shortName || h.name}`, { size: 7.5, color: '#64748B', align: 'right' })
}

/* ---------- Prescription ---------- */
export function prescriptionPdf(rx) {
  const h = db.hospital(), pt = db.get('patients', rx.patientId), doc = db.get('staff', rx.doctorId)
  const con = rx.consultationId ? db.get('consultations', rx.consultationId) : null
  return makePdf((p) => {
    let y = letterhead(p, h, 'PRESCRIPTION')
    p.text(40, y + 4, doc?.name || '', { size: 12, bold: true })
    p.text(40, y + 18, `${doc?.qualification || ''}  |  ${doc?.designation || ''}`, { size: 9, color: '#334155' })
    p.text(40, y + 31, `Reg. No.: ${doc?.regNo || '-'}`, { size: 9, color: '#334155' })
    p.text(555, y + 4, `Date: ${fmtNum(rx.date + 'T00:00:00')}`, { size: 9, align: 'right' })
    p.text(555, y + 18, `Rx No.: ${rx.rxNo}`, { size: 9, align: 'right' })
    y = patientBox(p, y + 44, pt, [['Allergies', pt.allergies || 'None known']])
    const v = con?.vitals || {}
    const vit = [v.bpSys && `BP ${v.bpSys}/${v.bpDia}`, v.pulse && `Pulse ${v.pulse}`, v.temp && `Temp ${v.temp}F`, v.spo2 && `SpO2 ${v.spo2}%`, v.weight && `Wt ${v.weight} kg`].filter(Boolean).join('   ')
    if (vit) { p.text(40, y, 'Vitals: ' + vit, { size: 9, color: '#334155' }); y += 16 }
    if (con?.complaints) y = p.wrap(40, y, 'Complaints: ' + con.complaints, 515, { size: 9.5 })
    if (rx.diagnosis) { y = p.wrap(40, y + 2, 'Diagnosis: ' + rx.diagnosis, 515, { size: 10, bold: true }) }
    y += 10
    p.text(40, y + 8, 'Rx', { size: 20, bold: true, color: h.color || '#0E7C74' })
    y += 22
    p.rect(40, y, 515, 20, '#E2E8F0')
    ;[['#', 46], ['Medicine', 62], ['Dose', 290], ['Frequency', 345], ['Duration', 460], ['When', 512]].forEach(([t, x]) => p.text(x, y + 13, t, { size: 8.5, bold: true }))
    y += 20
    rx.items.forEach((it, i) => {
      const yy = y + 14
      p.text(46, yy, String(i + 1), { size: 9 })
      p.text(62, yy, `${it.form ? it.form.slice(0, 3) + '. ' : ''}${it.name} ${it.strength || ''}`.slice(0, 44), { size: 9.5, bold: true })
      if (it.generic) p.text(62, yy + 12, `(${it.generic})`.slice(0, 52), { size: 7.5, color: '#64748B' })
      p.text(290, yy, it.dose || '', { size: 9 })
      p.text(345, yy, `${it.frequency}`, { size: 9, bold: true })
      p.text(345, yy + 12, (FREQUENCIES[it.frequency]?.en || '').slice(0, 24), { size: 7.5, color: '#64748B' })
      p.text(460, yy, it.duration || '', { size: 9 })
      p.text(512, yy, (TIMINGS[it.timing]?.en || '').replace(' food', ''), { size: 8.5 })
      let ny = yy + 24
      if (it.instructions) ny = p.wrap(62, yy + 24, 'Note: ' + it.instructions, 480, { size: 8, color: '#334155' }) + 2
      p.line(40, ny - 6, 555, ny - 6, '#E2E8F0')
      y = ny - 6
    })
    y += 14
    if (rx.advice) { p.text(40, y, 'Advice', { size: 10, bold: true }); y = p.wrap(40, y + 14, rx.advice, 515, { size: 9.5, color: '#334155' }) + 4 }
    if (rx.diet) { p.text(40, y, 'Diet', { size: 10, bold: true }); y = p.wrap(40, y + 14, rx.diet, 515, { size: 9.5, color: '#334155' }) + 4 }
    if (rx.followUpDate) { p.text(40, y + 4, `Follow-up on: ${fmtNum(rx.followUpDate + 'T00:00:00')}`, { size: 10, bold: true, color: h.color || '#0E7C74' }); y += 20 }
    p.text(555, 760, doc?.name || '', { size: 10, bold: true, align: 'right' })
    p.text(555, 774, rx.status === 'final' ? `Digitally signed on ${fmtNum(rx.signedAt)}` : 'DRAFT - not valid', { size: 8, color: rx.status === 'final' ? '#16A34A' : '#DC2626', align: 'right' })
    footer(p, h, 'Take medicines only as prescribed. Do not change the dose without asking your doctor.')
  })
}

/* ---------- Bill / receipt ---------- */
export function billPdf(b) {
  const h = db.hospital(), pt = db.get('patients', b.patientId)
  const pays = db.list('payments', (x) => x.billId === b.id).sort((a, c) => a.at.localeCompare(c.at))
  return makePdf((p) => {
    let y = letterhead(p, h, b.status === 'paid' ? 'BILL / RECEIPT' : 'BILL')
    p.text(40, y + 4, `Bill No.: ${b.billNo}`, { size: 10, bold: true })
    p.text(555, y + 4, `Date: ${fmtNum(b.createdAt)}`, { size: 9, align: 'right' })
    if (h.gstin) p.text(555, y + 18, `GSTIN: ${h.gstin}`, { size: 8.5, color: '#64748B', align: 'right' })
    y = patientBox(p, y + 20, pt)
    const head = () => {
      p.rect(40, y, 515, 20, '#E2E8F0')
      ;[['Description', 46], ['Qty', 330], ['Rate', 400], ['Disc.', 455], ['Amount', 549]].forEach(([t, x], i) => p.text(x, y + 13, t, { size: 8.5, bold: true, align: i === 4 ? 'right' : undefined }))
      y += 20
    }
    head()
    b.items.forEach((it) => {
      if (y > 720) { p.newPage(); y = 50; head() }
      p.text(46, y + 14, String(it.desc).slice(0, 52), { size: 9 })
      p.text(330, y + 14, String(it.qty), { size: 9 })
      p.text(400, y + 14, rs(it.rate).replace('Rs. ', ''), { size: 9 })
      p.text(455, y + 14, it.discount ? rs(it.discount).replace('Rs. ', '') : '-', { size: 9 })
      p.text(549, y + 14, rs(it.qty * it.rate - (it.discount || 0)).replace('Rs. ', ''), { size: 9, align: 'right' })
      p.line(40, y + 22, 555, y + 22)
      y += 22
    })
    y += 10
    const row = (k, v, bold) => { p.text(420, y + 12, k, { size: 9.5, bold }); p.text(549, y + 12, v, { size: 9.5, bold, align: 'right' }); y += 16 }
    row('Subtotal', rs(b.subtotal))
    if (b.discount) row('Discount', '- ' + rs(b.discount))
    if (b.tax) row('Tax', rs(b.tax))
    row('Total', rs(b.total), true)
    row('Paid', rs(b.paid))
    if (b.refunded) row('Refunded', rs(b.refunded))
    row('Balance', rs(balanceOf(b)), true)
    if (pays.length) {
      y += 10
      p.text(40, y, 'Payments', { size: 10, bold: true }); y += 6
      pays.forEach((x) => { p.text(40, y + 12, `${fmtNum(x.at)}  ${x.receiptNo}  ${PAY_METHODS[x.method] || x.method}${x.ref ? ' (' + x.ref + ')' : ''}  ${x.kind === 'refund' ? 'REFUND ' + (x.reason || '') : ''}`.slice(0, 95), { size: 8.5, color: '#334155' }); p.text(549, y + 12, rs(x.amount), { size: 8.5, align: 'right' }); y += 14 })
    }
    p.text(40, 770, db.setting('billing', {}).receiptFooter || 'Thank you.', { size: 9, color: '#334155' })
    p.text(555, 770, 'Authorised signatory', { size: 9, align: 'right' })
    footer(p, h)
  })
}

/* ---------- Lab report ---------- */
export function labReportPdf(lo) {
  const h = db.hospital(), pt = db.get('patients', lo.patientId), doc = db.get('staff', lo.doctorId)
  const ver = db.getAny('users', lo.verifiedBy)
  return makePdf((p) => {
    let y = letterhead(p, h, 'LABORATORY REPORT')
    y = patientBox(p, y, pt, [['Ref. by', doc?.name || 'Self'], ['Sample', lo.sampleId || '-']])
    p.text(40, y, `Order ${lo.orderNo}   |   Collected ${fmtNum(lo.collectedAt)}   |   Reported ${fmtNum(lo.verifiedAt || lo.enteredAt)}`, { size: 8.5, color: '#64748B' })
    y += 16
    for (const tid of lo.tests) {
      const t = db.get('labTests', tid)
      if (y > 700) { p.newPage(); y = 50 }
      p.text(40, y + 10, t.name, { size: 11, bold: true, color: h.color || '#0E7C74' }); y += 18
      p.rect(40, y, 515, 18, '#E2E8F0')
      ;[['Test', 46], ['Result', 260], ['Unit', 350], ['Reference range', 430]].forEach(([s, x]) => p.text(x, y + 12, s, { size: 8.5, bold: true }))
      y += 18
      for (const prm of t.params) {
        const val = lo.results?.[tid]?.[prm.name] ?? ''
        const flag = flagOf(prm, val)
        p.text(46, y + 13, prm.name, { size: 9 })
        p.text(260, y + 13, `${val}${flag ? (flag === 'high' ? '  H' : '  L') : ''}`, { size: 9, bold: !!flag, color: flag ? '#DC2626' : '#0F172A' })
        p.text(350, y + 13, prm.unit || '', { size: 8.5, color: '#334155' })
        p.text(430, y + 13, prm.low != null ? `${prm.low} - ${prm.high}` : prm.normal || '', { size: 8.5, color: '#334155' })
        p.line(40, y + 20, 555, y + 20)
        y += 20
      }
      y += 8
    }
    if (lo.remarks) y = p.wrap(40, y + 6, 'Remarks: ' + lo.remarks, 515, { size: 9 })
    p.text(40, 760, 'H = above, L = below the reference range. Results must be interpreted by your doctor.', { size: 8, color: '#64748B' })
    p.text(555, 760, ver?.name || '', { size: 10, bold: true, align: 'right' })
    p.text(555, 774, lo.verifiedAt ? `Verified on ${fmtNum(lo.verifiedAt)}` : 'NOT VERIFIED - provisional', { size: 8, color: lo.verifiedAt ? '#16A34A' : '#DC2626', align: 'right' })
    footer(p, h)
  })
}

/* ---------- Discharge summary ---------- */
export function dischargePdf(a) {
  const h = db.hospital(), pt = db.get('patients', a.patientId), doc = db.get('staff', a.doctorId), s = a.dischargeSummary || {}
  return makePdf((p) => {
    let y = letterhead(p, h, 'DISCHARGE SUMMARY')
    y = patientBox(p, y, pt, [['IP No.', a.admNo], ['Consultant', doc?.name || '']])
    p.text(40, y, `Admitted: ${fmtNum(a.admittedAt)}     Discharged: ${a.dischargedAt ? fmtNum(a.dischargedAt) : '-'}`, { size: 9, color: '#334155' })
    y += 20
    const sec = (title, body) => {
      if (!body) return
      if (y > 720) { p.newPage(); y = 50 }
      p.text(40, y, title, { size: 10, bold: true, color: h.color || '#0E7C74' })
      y = p.wrap(40, y + 14, body, 515, { size: 9.5 }) + 8
    }
    sec('Reason for admission', a.reason)
    sec('Final diagnosis', s.diagnosis)
    sec('Course in hospital', s.course)
    sec('Procedures', s.procedures)
    sec('Condition at discharge', s.condition)
    sec('Medicines', s.medications)
    sec('Advice', s.advice)
    sec('Follow-up', s.followUp ? fmtNum(s.followUp + 'T00:00:00') : '')
    p.text(555, 760, db.getAny('users', s.preparedBy)?.name || doc?.name || '', { size: 10, bold: true, align: 'right' })
    p.text(555, 774, s.final ? 'Final' : 'DRAFT', { size: 8, color: s.final ? '#16A34A' : '#DC2626', align: 'right' })
    footer(p, h, 'In case of emergency, call the hospital emergency number above.')
  })
}

