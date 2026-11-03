// Security tests for supabase/setup.sql against a local PostgreSQL
// (load supabase/test/supabase-stub.sql and supabase/setup.sql first).  Usage:
//   PGDATABASE=jeevo_test node supabase/test/security.test.cjs
const { Client } = require('pg')
const db = new Client()
let pass = 0, fail = 0
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, extra) } }

async function as(authId, sql, params = []) {
  await db.query('begin')
  try {
    await db.query('set local role authenticated')
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(authId ? { sub: authId, role: 'authenticated' } : { role: 'anon' })])
    const r = await db.query(sql, params)
    await db.query('commit')
    return { ok: true, rows: r.rows }
  } catch (e) { await db.query('rollback'); return { ok: false, err: e.message } }
}
const rpc = (who, fn, ...args) => as(who, `select public.${fn}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as r`, args.map((a) => (a !== null && typeof a === 'object' ? JSON.stringify(a) : a))).then((x) => (x.ok ? { ok: true, r: x.rows[0].r } : x))
const H = 'city-hospital', H2 = 'other-clinic'
const save = (who, col, id, data, h = H) => rpc(who, 'save_record', h, col, id, data, false)
const put = (who, col, id, data, h = H) => rpc(who, 'save_record', h, col, id, data, true)
const recs = (res, col) => (res.r?.records || []).filter((x) => x.c === col).map((x) => x.d)
const get = (res, col, id) => recs(res, col).find((x) => x.id === id)

;(async () => {
  await db.connect()
  await db.query('truncate public.records, public.members, public.changes, public.platform_admins; delete from auth.users')
  const mk = async (phone) => (await db.query('insert into auth.users(phone) values($1) returning id', [phone])).rows[0].id
  const ADMIN = await mk('919000000001'), DOC = await mk('919000000002'), DOC2 = await mk('919000000003'), RECEP = await mk('919000000004')
  const NURSE = await mk('919000000005'), PHARM = await mk('919000000006'), LAB = await mk('919000000007'), PATH = await mk('919000000008')
  const PAT = await mk('919876543210'), PAT2 = await mk('919811111111'), OUT = await mk('919999999999'), ADMIN2 = await mk('919000000099'), WALKIN = await mk('919822222222')

  console.log('Tenants & membership')
  ok('anonymous cannot read a hospital', !(await rpc(null, 'fetch_hospital', H)).ok)
  ok('creating a hospital works', (await rpc(ADMIN, 'create_hospital', H, { name: 'City Hospital', city: 'Nashik' }, { name: 'Admin' })).ok)
  ok('hospital code must be unique', !(await rpc(OUT, 'create_hospital', H, { name: 'X' }, { name: 'X' })).ok)
  ok('a second, separate clinic', (await rpc(ADMIN2, 'create_hospital', H2, { name: 'Other Clinic' }, { name: 'Dr Other' })).ok)
  const staff = [['doc', '9000000002', 'doctor'], ['doc2', '9000000003', 'doctor'], ['recep', '9000000004', 'receptionist'], ['nurse', '9000000005', 'nurse'], ['pharm', '9000000006', 'pharmacist'], ['lab', '9000000007', 'lab_tech'], ['path', '9000000008', 'doctor']]
  const seed = await rpc(ADMIN, 'save_records', H, [
    ...staff.flatMap(([k, ph, role]) => [{ c: 'staff', id: 'st_' + k, d: { name: k, role, phone: ph, userId: 'u_' + k, canVerifyLab: k === 'path', active: true } }, { c: 'users', id: 'u_' + k, d: { name: k, role, phone: ph, staffId: 'st_' + k, status: 'active' } }]),
    { c: 'patients', id: 'p_head', d: { pid: 'CIT-001001', name: 'Ramesh', phone: '9876543210', familyId: 'p_head', allergies: 'Penicillin', address: 'Main Road' } },
    { c: 'patients', id: 'p_child', d: { pid: 'CIT-001002', name: 'Aarav', phone: '9876543210', familyId: 'p_head' } },
    { c: 'patients', id: 'p_other', d: { pid: 'CIT-001003', name: 'Someone Else', phone: '9811111111', familyId: 'p_other' } },
    { c: 'labTests', id: 'lt_cbc', d: { name: 'CBC', price: 300, params: [{ name: 'Hb', low: 12, high: 16 }] } },
    { c: 'beds', id: 'bed1', d: { label: 'G-01', status: 'available' } }
  ])
  ok('admin loads staff, patients and catalogues', seed.ok && seed.r === 19, seed.err)
  for (const id of [DOC, DOC2, RECEP, NURSE, PHARM, LAB, PATH]) await rpc(id, 'link_member')
  const lp = await rpc(PAT, 'link_member')
  ok('patient registered at reception is linked by mobile on first login', lp.ok && lp.r.length === 1 && lp.r[0].role === 'patient', JSON.stringify(lp))
  await rpc(PAT2, 'link_member')
  const ld = await rpc(DOC, 'link_member')
  ok('doctor login linked with doctor role', ld.r?.[0]?.role === 'doctor')
  ok('unknown phone gets no membership', (await rpc(OUT, 'link_member')).r.length === 0)
  ok('non-member cannot read hospital data', !(await rpc(OUT, 'fetch_hospital', H)).ok)
  ok('staff of another clinic cannot read this hospital', !(await rpc(ADMIN2, 'fetch_hospital', H)).ok)
  ok('staff of another clinic cannot write into this hospital', !(await save(ADMIN2, 'patients', 'p_x', { name: 'Intruder', familyId: 'p_x' })).ok)
  ok('a patient cannot write into another hospital', !(await save(PAT, 'appointments', 'ap_x', { patientId: 'p_head', status: 'booked', source: 'app' }, H2)).ok)

  console.log('Patients see only their own family')
  let pv = await rpc(PAT, 'fetch_hospital', H)
  ok('patient sees own family members', recs(pv, 'patients').length === 2)
  ok('patient does not see other patients', !get(pv, 'patients', 'p_other'))
  ok('patient sees doctors but not their phone numbers', get(pv, 'staff', 'st_doc') && !get(pv, 'staff', 'st_doc').phone && !get(pv, 'staff', 'st_recep'))
  ok('patient cannot read staff user accounts', recs(pv, 'users').length === 1)
  ok('patient can add a family member', (await put(PAT, 'patients', 'p_new', { name: 'Wife', familyId: 'p_head', pid: 'CIT-9' })).ok)
  ok('patient cannot attach someone to another family', !(await put(PAT, 'patients', 'p_bad', { name: 'X', familyId: 'p_other' })).ok)
  ok('patient cannot edit another family', !(await save(PAT, 'patients', 'p_other', { name: 'Hacked' })).ok)
  ok('patient cannot change their vaccination record', !(await save(PAT, 'patients', 'p_child', { vaccinations: [{ name: 'Fake' }] })).ok)

  console.log('Appointments')
  ok('patient books for a family member', (await put(PAT, 'appointments', 'ap1', { patientId: 'p_child', doctorId: 'st_doc', date: '2030-01-10', time: '10:00', token: 1, status: 'booked', source: 'app', apptNo: 'AP-1' })).ok)
  ok('patient cannot book for someone else', !(await put(PAT, 'appointments', 'ap2', { patientId: 'p_other', doctorId: 'st_doc', date: '2030-01-10', time: '10:10', token: 2, status: 'booked', source: 'app' })).ok)
  ok('patient cannot jump the queue as emergency', !(await put(PAT, 'appointments', 'ap3', { patientId: 'p_head', doctorId: 'st_doc', date: '2030-01-10', time: '10:20', token: 2, status: 'booked', source: 'app', priority: 'emergency' })).ok)
  ok('patient can cancel own booking', (await save(PAT, 'appointments', 'ap1', { status: 'cancelled', cancelReason: 'x' })).ok)
  ok('reception books (token clash is fixed by the server)', (await put(RECEP, 'appointments', 'ap4', { patientId: 'p_other', doctorId: 'st_doc', date: '2030-01-10', time: '10:30', token: 1, status: 'booked', source: 'reception', apptNo: 'AP-1' })).ok)
  await put(RECEP, 'appointments', 'ap5', { patientId: 'p_head', doctorId: 'st_doc', date: '2030-01-10', time: '10:40', token: 1, status: 'booked', source: 'reception', apptNo: 'AP-1' })
  const t = (await db.query("select data->>'token' t, data->>'apptNo' n from records where collection='appointments' and id in ('ap4','ap5') order by id")).rows
  ok('duplicate token and number are made unique', t[0].t !== t[1].t && t[0].n !== t[1].n, JSON.stringify(t))
  ok('pharmacist cannot book appointments', !(await put(PHARM, 'appointments', 'ap6', { patientId: 'p_head', doctorId: 'st_doc', date: '2030-01-11', time: '10:00', token: 1, status: 'booked' })).ok)
  ok('doctor cannot change another doctor’s appointment', !(await save(DOC2, 'appointments', 'ap4', { status: 'completed' })).ok)
  ok('doctor may update own appointment', (await save(DOC, 'appointments', 'ap4', { status: 'in_consultation' })).ok)

  console.log('Clinical records')
  ok('doctor writes own consultation', (await put(DOC, 'consultations', 'cn1', { patientId: 'p_head', doctorId: 'st_doc', status: 'draft', diagnosis: 'Fever' })).ok)
  ok('another doctor cannot edit it', !(await save(DOC2, 'consultations', 'cn1', { diagnosis: 'Changed' })).ok)
  ok('nurse cannot write consultation notes', !(await save(NURSE, 'consultations', 'cn1', { diagnosis: 'x' })).ok)
  await save(DOC, 'consultations', 'cn1', { status: 'final' })
  ok('finalised consultation cannot be edited', !(await save(DOC, 'consultations', 'cn1', { diagnosis: 'Edited later' })).ok)
  ok('…but an addendum can be appended', (await save(DOC, 'consultations', 'cn1', { addenda: [{ text: 'Correction' }] })).ok)
  ok('receptionist cannot read clinical notes', !get(await rpc(RECEP, 'fetch_hospital', H), 'consultations', 'cn1'))
  ok('pharmacist cannot read clinical notes', !get(await rpc(PHARM, 'fetch_hospital', H), 'consultations', 'cn1'))
  ok('nurse can read clinical notes', !!get(await rpc(NURSE, 'fetch_hospital', H), 'consultations', 'cn1'))
  pv = await rpc(PAT, 'fetch_hospital', H)
  ok('patient sees own finalised consultation', !!get(pv, 'consultations', 'cn1') && !get(pv, 'consultations', 'cn1').addenda)
  ok('doctor writes a prescription', (await put(DOC, 'prescriptions', 'rx1', { patientId: 'p_head', doctorId: 'st_doc', status: 'draft', items: [{ name: 'Dolo' }], rxNo: 'RX-1' })).ok)
  ok('receptionist cannot write prescriptions', !(await put(RECEP, 'prescriptions', 'rx2', { patientId: 'p_head', doctorId: 'st_doc', status: 'final' })).ok)
  ok('patient cannot see a draft prescription', !get(await rpc(PAT, 'fetch_hospital', H), 'prescriptions', 'rx1'))
  await save(DOC, 'prescriptions', 'rx1', { status: 'final' })
  ok('signed prescription cannot be edited', !(await save(DOC, 'prescriptions', 'rx1', { items: [{ name: 'Other' }] })).ok)
  ok('pharmacist records dispensing', (await save(PHARM, 'prescriptions', 'rx1', { dispenseStatus: 'dispensed', dispensed: { m1: 9 } })).ok)
  ok('pharmacist cannot change the medicines', !(await save(PHARM, 'prescriptions', 'rx1', { items: [] })).ok)
  ok('doctor may supersede (correct) it', (await save(DOC, 'prescriptions', 'rx1', { status: 'superseded', supersededReason: 'dose' })).ok)
  ok('vitals are append-only', (await put(NURSE, 'vitals', 'v1', { patientId: 'p_head', values: { pulse: 80 }, by: 'u_nurse' })).ok && !(await save(NURSE, 'vitals', 'v1', { values: { pulse: 60 } })).ok)

  console.log('Laboratory')
  ok('doctor orders a test', (await put(DOC, 'labOrders', 'lo1', { patientId: 'p_head', doctorId: 'st_doc', tests: ['lt_cbc'], status: 'ordered', orderNo: 'LB-1' })).ok)
  ok('lab enters results', (await save(LAB, 'labOrders', 'lo1', { status: 'result_entered', results: { lt_cbc: { Hb: '9' } }, enteredBy: 'u_lab' })).ok)
  pv = await rpc(PAT, 'fetch_hospital', H)
  ok('patient cannot see unverified results', get(pv, 'labOrders', 'lo1') && !get(pv, 'labOrders', 'lo1').results)
  ok('lab technician cannot verify (not authorised)', !(await save(LAB, 'labOrders', 'lo1', { status: 'verified', verifiedBy: 'u_lab' })).ok)
  ok('lab cannot publish before verification', !(await save(LAB, 'labOrders', 'lo1', { status: 'published' })).ok)
  ok('pathologist verifies', (await save(PATH, 'labOrders', 'lo1', { status: 'verified', verifiedBy: 'u_path' })).ok)
  ok('verified results cannot be changed', !(await save(LAB, 'labOrders', 'lo1', { results: { lt_cbc: { Hb: '14' } } })).ok)
  ok('lab publishes verified report', (await save(LAB, 'labOrders', 'lo1', { status: 'published' })).ok)
  ok('patient now sees the results', !!get(await rpc(PAT, 'fetch_hospital', H), 'labOrders', 'lo1')?.results)

  console.log('Billing')
  ok('doctor’s test order raises a bill', (await put(DOC, 'bills', 'b1', { patientId: 'p_head', total: 300, paid: 0, refunded: 0, status: 'unpaid', billNo: 'BL-1', labOrderId: 'lo1' })).ok)
  ok('receptionist records a payment', (await put(RECEP, 'payments', 'pm1', { patientId: 'p_head', billId: 'b1', amount: 100, method: 'cash', kind: 'payment', receiptNo: 'RC-1' })).ok && (await save(RECEP, 'bills', 'b1', { paid: 100, status: 'partial' })).ok)
  ok('payments cannot be edited afterwards', !(await save(RECEP, 'payments', 'pm1', { amount: 1 })).ok)
  ok('receptionist cannot refund', !(await put(RECEP, 'payments', 'pm2', { patientId: 'p_head', billId: 'b1', amount: -50, kind: 'refund', authorizedBy: 'u_recep' })).ok)
  ok('patient pays own bill online', (await put(PAT, 'payments', 'pm3', { patientId: 'p_head', billId: 'b1', amount: 200, method: 'upi', kind: 'payment' })).ok && (await save(PAT, 'bills', 'b1', { paid: 300, status: 'paid' })).ok)
  ok('patient cannot change bill amounts', !(await save(PAT, 'bills', 'b1', { total: 1 })).ok)
  ok('nothing financial can be deleted', !(await rpc(ADMIN, 'delete_record', H, 'bills', 'b1')).ok)
  const lv = await rpc(LAB, 'fetch_hospital', H)
  ok('lab sees allergies but not addresses', get(lv, 'patients', 'p_head')?.allergies === 'Penicillin' && !get(lv, 'patients', 'p_head')?.address)

  console.log('Roles, audit and admin')
  ok('staff cannot promote themselves', !(await save(RECEP, 'users', 'u_recep', { role: 'admin' })).ok)
  ok('doctor can edit own availability only', (await save(DOC, 'staff', 'st_doc', { availability: { days: [1] } })).ok && !(await save(DOC, 'staff', 'st_doc', { fee: 9999 })).ok)
  ok('audit log is append-only', (await put(RECEP, 'audit', 'a1', { userId: 'u_recep', action: 'x' })).ok && !(await save(ADMIN, 'audit', 'a1', { action: 'hidden' })).ok)
  ok('audit entries cannot be forged for another user', !(await put(RECEP, 'audit', 'a2', { userId: 'u_doc', action: 'x' })).ok)
  ok('only admins read the audit log', !get(await rpc(DOC, 'fetch_hospital', H), 'audit', 'a1') && !!get(await rpc(ADMIN, 'fetch_hospital', H), 'audit', 'a1'))
  ok('only a doctor can publish health content', !(await put(ADMIN, 'healthTips', 't1', { status: 'published', reviewedBy: 'st_x' })).ok && (await put(DOC, 'healthTips', 't2', { status: 'published', reviewedBy: 'st_doc' })).ok)
  ok('admin cannot change own plan', !(await save(ADMIN, 'hospitals', H, { plan: 'pro' })).ok)
  ok('deactivated staff lose access', (await save(ADMIN, 'users', 'u_nurse', { status: 'inactive' })).ok && !(await rpc(NURSE, 'fetch_hospital', H)).ok)

  console.log('Self registration & platform')
  ok('new patient self-registers with a hospital code', (await rpc(WALKIN, 'register_patient', H, { name: 'Walk In', dob: '1990-01-01' })).ok)
  const wv = await rpc(WALKIN, 'fetch_hospital', H)
  ok('new patient sees just themselves', wv.ok && recs(wv, 'patients').length === 1)
  ok('non-platform admin cannot list tenants', !(await rpc(ADMIN, 'platform_overview')).ok)
  await db.query('insert into public.platform_admins values ($1)', [OUT])
  const po = await rpc(OUT, 'platform_overview')
  ok('platform admin sees tenants with usage only', po.ok && po.r.length === 2 && po.r.every((h) => h.usage && !h.patients))
  ok('platform admin can suspend a tenant', (await rpc(OUT, 'platform_set_hospital', H2, { status: 'suspended' })).ok && !(await rpc(ADMIN2, 'fetch_hospital', H2)).ok)
  const chg = await rpc(DOC, 'fetch_changes', H, 0)
  ok('change feed respects visibility', chg.ok && !recs(chg, 'audit').length)

  console.log(`\n${pass} passed, ${fail} failed`)
  await db.end()
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })
