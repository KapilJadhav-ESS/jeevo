// Thin wrapper around Supabase. Everything the app sends to the server goes
// through the SQL functions in supabase/setup.sql, which enforce tenant
// isolation (one hospital never sees another's data) and role permissions.
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, CLOUD } from './config'

export const supabase = CLOUD
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'jeevo-auth' } })
  : null

export class CloudError extends Error {
  constructor(message, { network = false, code } = {}) { super(message); this.network = network; this.code = code }
}

const FRIENDLY = {
  not_member: 'You do not have access to this hospital.',
  not_authenticated: 'Please log in again.',
  hospital_exists: 'That hospital code is already taken. Please choose another.',
  invalid_hospital_code: 'Hospital code: use 3–40 lowercase letters, numbers or dashes.',
  hospital_not_found: 'No hospital found with that code.',
  already_member: 'You are already registered with this hospital.',
  token_taken: 'That token was just given to someone else. Please try again.',
  record_locked: 'This record is final and can no longer be edited.',
  hospital_suspended: 'This hospital’s account is suspended. Please contact JeevO support.'
}
const friendly = (msg = '') => {
  if (msg.startsWith('permission_denied')) return 'You do not have permission to do this.'
  return FRIENDLY[msg] || msg
}

async function rpc(fn, args) {
  let res
  try { res = await supabase.rpc(fn, args) } catch { throw new CloudError('No internet connection', { network: true }) }
  const { data, error } = res
  if (error) {
    const network = !error.code && /fetch|network|Failed|timeout/i.test(error.message || '')
    throw new CloudError(network ? 'No internet connection' : friendly(error.message), { network, code: error.code })
  }
  return data
}

export const api = {
  fetchHospital: (h) => rpc('fetch_hospital', { p_hospital: h }),
  fetchChanges: (h, since) => rpc('fetch_changes', { p_hospital: h, p_since: since }),
  saveRecords: (h, rows) => rpc('save_records', { p_hospital: h, p_rows: rows }),
  deleteRecord: (h, c, id) => rpc('delete_record', { p_hospital: h, p_collection: c, p_id: id }),
  linkMember: () => rpc('link_member', {}),
  createHospital: (h, info, admin) => rpc('create_hospital', { p_hospital: h, p_info: info, p_admin: admin }),
  hospitalPublic: (h) => rpc('hospital_public', { p_hospital: h }),
  registerPatient: (h, data) => rpc('register_patient', { p_hospital: h, p_data: data }),
  platformOverview: () => rpc('platform_overview', {}),
  platformSetHospital: (h, patch) => rpc('platform_set_hospital', { p_hospital: h, p_patch: patch })
}

/* ---------- Auth (OTP by SMS or email) ---------- */
const authErr = (error) => {
  const m = error?.message || 'Something went wrong'
  if (/phone.*(provider|disabled)|sms.*(provider|disabled)|Unsupported phone provider/i.test(m)) return 'SMS login is not set up yet. Please log in with your email instead.'
  if (/rate limit|too many/i.test(m)) return 'Too many attempts. Please wait a minute and try again.'
  if (/expired|invalid/i.test(m)) return 'Incorrect or expired code. Please try again.'
  if (/fetch|network/i.test(m)) return 'No internet connection'
  return m
}
const target = (id) => (id.includes('@') ? { email: id.trim().toLowerCase() } : { phone: '+91' + id.replace(/\D/g, '').slice(-10) })

export async function sendOtp(id) {
  const { error } = await supabase.auth.signInWithOtp({ ...target(id), options: { shouldCreateUser: true } })
  if (error) throw new CloudError(authErr(error))
}
export async function verifyOtp(id, token) {
  const t = target(id)
  const { data, error } = await supabase.auth.verifyOtp({ ...t, token, type: t.email ? 'email' : 'sms' })
  if (error) throw new CloudError(authErr(error))
  return data.session
}
export const getSession = async () => (await supabase.auth.getSession()).data.session
export const signOut = () => supabase.auth.signOut()

/* ---------- Realtime: ping on any change in this hospital ---------- */
export function subscribeChanges(h, onPing) {
  const ch = supabase
    .channel('hospital-' + h)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'changes', filter: `hospital_id=eq.${h}` }, () => onPing())
    .subscribe()
  return () => { try { supabase.removeChannel(ch) } catch { /* ignore */ } }
}

/* ---------- Medical documents (private bucket, signed URLs only) ---------- */
export async function uploadDataUrl(h, dataUrl, name = 'file') {
  const blob = await (await fetch(dataUrl)).blob()
  const ext = (blob.type.split('/')[1] || 'bin').replace('jpeg', 'jpg').replace(/[^a-z0-9]/g, '')
  const path = `${h}/${new Date().toISOString().slice(0, 7)}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${ext}`
  const { error } = await supabase.storage.from('documents').upload(path, blob, { contentType: blob.type, upsert: false })
  if (error) throw new CloudError('Upload failed – please check your internet and try again.', { network: true })
  return 'storage:' + path
}
// Patient documents are never public: a short-lived signed link is created on demand.
export async function signedUrl(ref, seconds = 300) {
  if (!ref?.startsWith('storage:')) return ref
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(ref.slice(8), seconds)
  if (error) throw new CloudError('Could not open the document.')
  return data.signedUrl
}
