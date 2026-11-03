// Lightweight app-wide translation layer (English / हिंदी / मराठी).
//
// Screens are written in English. When Marathi or Hindi is selected, this module
// translates every visible text node and the placeholder / aria-label / title /
// alt attributes as React renders them, using the dictionaries in t1–t3.txt
// plus patterns for dynamic text ("3h ago", "Ticket #PG-1043 created" …).
// The original English is remembered per node, so switching back is lossless.
// User-written content (posts, comments, names) is left as typed.
// Dictionaries: plain text files, one phrase per line:  English || हिंदी || मराठी
import t1 from './t1.txt?raw'
import t2 from './t2.txt?raw'
import t3 from './t3.txt?raw'
import t4 from './t4.txt?raw'
import { PATTERNS as JP } from './patterns'

export const LANGS = [
  { code: 'en', label: 'English', locale: 'en-IN' },
  { code: 'hi', label: 'हिंदी', locale: 'hi-IN-u-nu-latn' },
  { code: 'mr', label: 'मराठी', locale: 'mr-IN-u-nu-latn' }
]
const KEY = 'jeevo-lang'
const IDX = { mr: 1, hi: 2 }

const DICT = new Map()
for (const line of [t1, t2, t3, t4].join('\n').split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue
  const [en, hi, mr] = line.split('||').map((x) => x.trim())
  if (en && hi && mr && !DICT.has(en)) DICT.set(en, [en, mr, hi])
}

let lang = (() => {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && LANGS.some((l) => l.code === saved)) return saved
  } catch { /* ignore */ }
  const nav = (navigator.language || '').toLowerCase()
  return nav.startsWith('mr') ? 'mr' : nav.startsWith('hi') ? 'hi' : 'en'
})()

export const getLang = () => lang
export const getLocale = () => LANGS.find((l) => l.code === lang).locale

export const word = (en) => {
  if (lang === 'en') return en
  const row = DICT.get(en)
  return row ? row[IDX[lang]] : en
}

// Dynamic phrases ("Token 12 · 3 ahead", "Pay ₹400" …) live in patterns.js.
const PATTERNS = JP
export function translate(src) {
  if (lang === 'en' || !src) return src
  const m = src.match(/^(\s*)([\s\S]*?)(\s*)$/)
  const core = m[2]
  if (!core || !/[A-Za-z]/.test(core)) return src
  const row = DICT.get(core)
  if (row) return m[1] + row[IDX[lang]] + m[3]
  for (const p of PATTERNS) {
    const g = core.match(p.re)
    if (g) {
      const args = g.slice(1).map((x, i) => (p.raw.includes(i) || x == null ? x : translate(x)))
      return m[1] + p[lang](...args) + m[3]
    }
  }
  // "💬 General" → emoji + translated word
  const em = core.match(/^([^A-Za-z0-9₹(]+?)\s*([A-Za-z].*)$/)
  if (em && em[1].trim()) { const t = translate(em[2]); if (t !== em[2]) return m[1] + em[1] + ' ' + t + m[3] }
  // "A · B · C" → translate each segment that we know
  if (core.includes(' · ') || core.startsWith('· ') || core.endsWith(' ·')) {
    const parts = core.split(/(\s*·\s*)/)
    let changed = false
    const out = parts.map((x) => { if (!x.trim() || /^\s*·\s*$/.test(x)) return x; const t = translate(x); if (t !== x) changed = true; return t })
    if (changed) return m[1] + out.join('') + m[3]
  }
  // "Mon, Tue, Wed" → translate each item when every item is known
  if (core.includes(', ')) {
    const parts = core.split(', ')
    const out = parts.map((x) => translate(x))
    if (out.every((x, i) => x !== parts[i] || !/[A-Za-z]/.test(x))) return m[1] + out.join(', ') + m[3]
  }
  return src
}

/* ---------- DOM translator ---------- */
const ATTRS = ['placeholder', 'aria-label', 'title', 'alt']
const textRec = new WeakMap() // Text node -> { src, out }
const attrRec = new WeakMap() // Element -> { [attr]: { src, out } }
const skip = (el) => !el || el.closest?.('script,style,textarea,[translate="no"],[contenteditable="true"]')

function doText(node, force) {
  if (skip(node.parentElement)) return
  const cur = node.nodeValue
  const rec = textRec.get(node)
  const src = rec && cur === rec.out && !force ? null : rec && cur === rec.out ? rec.src : cur
  if (src === null) return
  const out = translate(src)
  textRec.set(node, { src, out })
  if (out !== cur) node.nodeValue = out
}
function doAttrs(el, force) {
  if (el.closest?.('script,style,[translate="no"]')) return
  let recs = attrRec.get(el)
  for (const a of ATTRS) {
    if (!el.hasAttribute(a)) continue
    const cur = el.getAttribute(a)
    const rec = recs?.[a]
    if (rec && cur === rec.out && !force) continue
    const src = rec && cur === rec.out ? rec.src : cur
    const out = translate(src)
    recs = recs || {}
    recs[a] = { src, out }
    attrRec.set(el, recs)
    if (out !== cur) el.setAttribute(a, out)
  }
}
function walk(root, force) {
  if (root.nodeType === 3) return doText(root, force)
  if (root.nodeType !== 1) return
  doAttrs(root, force)
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  let n
  while ((n = it.nextNode())) n.nodeType === 3 ? doText(n, force) : doAttrs(n, force)
}

let started = false
export function startTranslator() {
  if (started) return
  started = true
  applyDocLang()
  walk(document.body)
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') doText(m.target)
      else if (m.type === 'attributes') doAttrs(m.target)
      else m.addedNodes.forEach((n) => walk(n))
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS })
}

const subs = new Set()
export const onLangChange = (f) => { subs.add(f); return () => subs.delete(f) }
function applyDocLang() {
  document.documentElement.lang = lang === 'en' ? 'en' : lang
  document.title = 'JeevO'
}
// Pick one of {en, hi, mr} values (for content stored in all three languages)
export const pick = (obj) => (obj && (obj[lang] || obj.en)) || ''
export function setLang(code) {
  lang = code
  try { localStorage.setItem(KEY, code) } catch { /* ignore */ }
  applyDocLang()
  walk(document.body, true)
  subs.forEach((f) => f(code))
}
