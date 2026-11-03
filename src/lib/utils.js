import { getLocale } from '../i18n'
export const uid = (p = '') => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)

export const inr = (n = 0, dec = 0) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec || 0 })
export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

export const cls = (...a) => a.filter(Boolean).join(' ')

const DAY = 86400000
export const daysFromNow = (d, h = 10, m = 0) => {
  const x = new Date(Date.now() + d * DAY)
  x.setHours(h, m, 0, 0)
  return x.toISOString()
}
export const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString()
export const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString()

// Indian formats: 03 Nov 2026, 03/11/2026
export const fmtDate = (iso, { year, ...opts } = {}) =>
  iso ? new Date(iso).toLocaleDateString(getLocale(), { day: '2-digit', month: 'short', year: year === false ? undefined : 'numeric', ...opts }) : '—'
export const fmtNum = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—')
export const fmtShort = (iso) => (iso ? new Date(iso).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' }) : '—')
export const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString(getLocale(), { hour: 'numeric', minute: '2-digit' }) : '')
export const fmtDateTime = (iso) => (iso ? `${fmtShort(iso)}, ${fmtTime(iso)}` : '—')
export const fmtWeekday = (iso) => new Date(iso).toLocaleDateString(getLocale(), { weekday: 'short' })
export const hhmm = (t) => { // '14:30' -> 2:30 pm
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const d = new Date(); d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString(getLocale(), { hour: 'numeric', minute: '2-digit' })
}
export const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(getLocale(), { month: 'long', year: 'numeric' })
}
export const ymOf = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
export const isoDay = (d = new Date()) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
export const today = () => isoDay(new Date())
export const addDays = (day, n) => { const d = new Date(day + 'T00:00:00'); d.setDate(d.getDate() + n); return isoDay(d) }
export const sameDay = (a, b) => isoDay(a) === isoDay(b)
export const toMin = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m }
export const fromMin = (n) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`

export const timeAgo = (iso) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 0) {
    const f = -s
    if (f < 3600) return `in ${Math.max(1, Math.round(f / 60))}m`
    if (f < 86400) return `in ${Math.round(f / 3600)}h`
    return `in ${Math.round(f / 86400)}d`
  }
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`
  return fmtShort(iso)
}

export const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export const initials = (name = '') =>
  name.replace(/^(Dr\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, '').split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase()

export const otp6 = () => String(Math.floor(100000 + Math.random() * 900000))

export const ageOf = (dob) => {
  if (!dob) return null
  const d = new Date(dob), n = new Date()
  let a = n.getFullYear() - d.getFullYear()
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--
  return a
}
export const dobFromAge = (age) => `${new Date().getFullYear() - Number(age)}-07-01`
export const ageSex = (p) => p ? [ageOf(p.dob) != null ? `${ageOf(p.dob)}y` : '', { male: 'M', female: 'F', other: 'O' }[p.gender] || ''].filter(Boolean).join(' / ') : ''
export const bmi = (h, w) => (h && w ? round2(w / ((h / 100) ** 2)).toFixed(1) : '')

export const phone10 = (s = '') => String(s).replace(/\D/g, '').slice(-10)
export const validPhone = (s) => /^[6-9]\d{9}$/.test(phone10(s))
export const fmtPhone = (s) => { const p = phone10(s); return p ? `+91 ${p.slice(0, 5)} ${p.slice(5)}` : '' }
export const validPin = (s) => /^[1-9]\d{5}$/.test(String(s || ''))

// Compress an image File to a JPEG data URL (keeps the local DB small)
export const fileToDataUrl = (file, max = 1600, quality = 0.82) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      if (!file.type.startsWith('image/') || file.type === 'image/gif') return resolve(reader.result)
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * scale)
        c.height = Math.round(img.height * scale)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => resolve(reader.result)
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })

export const downloadCSV = (filename, rows) => {
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 500)
}

export const shareText = async ({ title, text, url }) => {
  try {
    if (navigator.share) { await navigator.share({ title, text, url }); return 'shared' }
  } catch (e) { if (e?.name === 'AbortError') return 'cancelled' }
  try { await navigator.clipboard.writeText([text, url].filter(Boolean).join('\n')); return 'copied' } catch { return 'failed' }
}

export const waLink = (phone, text) => `https://wa.me/91${phone10(phone)}?text=${encodeURIComponent(text)}`
export const smsLink = (phone, text) => `sms:+91${phone10(phone)}?body=${encodeURIComponent(text)}`
export const telLink = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`
