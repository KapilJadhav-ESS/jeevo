// Demo data: Radhakrishna Hospital, Pimpalgaon Baswant (Tal. Niphad, Dist. Nashik).
// Hospital, doctors, owners, laboratory, services, timings and empanelled
// insurers are the hospital's real details (from its letterhead and brochure).
// ALL PATIENTS AND THEIR MEDICAL DATA ARE FICTIONAL. Staff marked as
// placeholders, prices and licence numbers are samples to be replaced.
// A small fictional second clinic shows that each hospital's data is separate.
// Dates are generated relative to today.
import { isoDay, addDays, minsAgo, hoursAgo, daysFromNow } from './utils'

const H1 = 'h-radhakrishna'
const H2 = 'h-demo-clinic'
const COLORS = ['#1B1E4A', '#6E1824', '#0E7C74', '#2563EB', '#9333EA', '#DB2777', '#EA580C', '#0891B2', '#4F46E5', '#16A34A', '#B45309']

export const INSURERS = [
  'Star Health and Allied Insurance Company Limited', 'ICICI Lombard Health Care General Insurance', 'HDFC ERGO General Insurance Company Limited',
  'Apollo Munich Health Insurance Company Limited', 'Cholamandalam MS General Insurance', 'Aditya Birla Health Insurance Co. Limited',
  'SBI General Insurance Company Limited', 'The New India Health Assurance Co. Ltd.', 'Genins India Insurance TPA Ltd.', 'ERICSON Insurance TPA Pvt. Limited',
  'Health India TPA Services Pvt. Limited', 'TATA AIG Health Insurance', 'NAVI General Insurance', 'East West Assist Insurance TPA Pvt. Ltd.',
  'Max Bupa Health Insurance Co. Ltd.', 'CARE Health Insurance Ltd.', 'Universal Sompo General Insurance Company Limited',
  'Paramount TPA for Royal Sundaram Insurance Company', 'Bharti AXA General Insurance Company Limited', 'Medi Assist Insurance TPA Private Limited',
  'Acko General Insurance Company', 'MD India Private Medical Insurance', 'Reliance General Insurance Company'
]

// Facilities listed in the hospital brochure (shown to patients)
export const FACILITIES = [
  'Well-equipped ICU', 'Modern operation theatre', 'Diabetes treatment', 'Ventilator', '2D Echo', 'Stress test', 'High blood pressure treatment',
  'Blood storage centre', 'ECG', 'X-ray', 'General ward and special rooms', 'Urinary tract disease & kidney stone treatment', 'Treatment of all types of fractures',
  'Arthritis treatment', 'Knee arthroscopy (keyhole surgery)', '24-hour ambulance', '24-hour pathology lab', '24-hour medical store',
  'Maternity home', 'Infertility treatment', 'Cancer diagnosis & treatment', 'Family planning advice', 'Sexual health problems & guidance', 'Uterus disorders – diagnosis & surgery'
]

export function buildSeed() {
  const T = isoDay(new Date())
  const d = (n) => addDays(T, n)
  const at = (day, time) => new Date(`${day}T${time}:00`).toISOString()
  const s = {
    hospitals: [], departments: [], users: [], staff: [], patients: [], appointments: [], consultations: [],
    prescriptions: [], medicines: [], labTests: [], labOrders: [], services: [], bills: [], payments: [],
    wards: [], beds: [], admissions: [], vitals: [], nursingTasks: [], medAdmin: [], announcements: [],
    healthTips: [], notifications: [], messages: [], feedback: [], leaves: [], attendance: [], shifts: [],
    audit: [], settings: [], referrals: []
  }
  const add = (col, row, h = H1) => { const r = { hospitalId: h, createdAt: row.createdAt || hoursAgo(24 * 30), ...row }; s[col].push(r); return r }

  /* ---------- Hospital (tenant) ---------- */
  s.hospitals.push(
    {
      id: H1, code: 'radhakrishna', pidPrefix: 'RKH', name: 'Radhakrishna Hospital', shortName: 'Radhakrishna', type: 'Multispecialty hospital',
      logo: 'logo.png', tagline: 'Medicine · Cardiac care · Maternity',
      address: 'Near Chinchkhed Chaufuli, Mumbai–Agra Road, near IDBI Bank, behind Bhandari Plaza, Pimpalgaon Baswant, Tal. Niphad',
      addressMr: 'चिंचखेड चौफुली जवळ, मुंबई–आग्रा रोड, आय.डी.बी.आय. बँकेच्या जवळ, भंडारी प्लाझाच्यामागे, पिंपळगाव बसवंत, ता. निफाड, जि. नाशिक – ४२२२०९',
      city: 'Pimpalgaon Baswant, Dist. Nashik', state: 'Maharashtra', pin: '422209',
      phone: '(02550) 252020', whatsapp: '7420980442', emergencyPhone: '7420980442', ambulancePhone: '7420980442', email: 'drumeshaher@gmail.com',
      regNo: '348', rohiniCode: '8900080383548', mapUrl: 'https://maps.google.com/?q=Radhakrishna+Hospital+Pimpalgaon+Baswant',
      timings: 'OPD: 11 am – 4 pm and 6 – 8 pm · Saturday closed · Emergency & ambulance 24×7',
      facilities: FACILITIES, plan: 'growth', status: 'active', color: '#6E1824', createdAt: hoursAgo(24 * 400)
    },
    {
      id: H2, code: 'demo-clinic', pidPrefix: 'DMC', name: 'Demo Family Clinic (sample)', shortName: 'Demo Clinic', type: 'General physician clinic',
      address: 'Main Road', city: 'Lasalgaon, Dist. Nashik', state: 'Maharashtra', pin: '422306', phone: '9000000900', whatsapp: '9000000900',
      emergencyPhone: '9000000900', ambulancePhone: '108', email: 'clinic@example.com', regNo: 'SAMPLE-01', timings: 'Mon–Sat 10 am – 2 pm',
      plan: 'starter', status: 'active', color: '#2563EB', createdAt: hoursAgo(24 * 120)
    }
  )

  /* ---------- Departments ---------- */
  ;[['dep-med', 'General Medicine & Diabetes', '🩺'], ['dep-cardio', 'Cardiac care (ECG, 2D Echo, Stress test)', '❤️'], ['dep-obgy', 'Obstetrics & Gynaecology · Maternity', '🤰'],
    ['dep-icu', 'ICU', '🏥'], ['dep-ot', 'Operation Theatre', '🔪'], ['dep-xray', 'X-ray', '🩻'], ['dep-emer', 'Emergency & Ambulance (24×7)', '🚑'],
    ['dep-lab', 'Pathology – Radhakrushna Clinical Laboratory', '🧪'], ['dep-pharm', 'Medical Store (24×7)', '💊']
  ].forEach(([id, name, icon]) => add('departments', { id, name, icon, active: true }))
  add('departments', { id: 'dep-a-gen', name: 'General Medicine', icon: '🩺', active: true }, H2)

  /* ---------- Staff & logins (three units, three owners) ---------- */
  // OPD: 11 am – 4 pm and 6 – 8 pm, closed on Saturday (6)
  const opd = { days: [0, 1, 2, 3, 4, 5], sessions: [{ start: '11:00', end: '16:00' }, { start: '18:00', end: '20:00' }], slotMins: 10, maxPerDay: 60, online: true }
  const STAFF = [
    // id, name, role, unit, designation, dept, qualification, regNo, fee, availability, extra
    ['st-sanjay', 'Sanjay Aher', 'admin', 'hospital', 'Hospital Owner & Administrator', null, '', '', 0, null, {}],
    ['st-umesh', 'Dr. Umesh Aher', 'doctor', 'hospital', 'Consultant Physician & Echocardiologist', 'dep-med', 'FCPS (Medicine), M.D. Medicine (J.J.H. Mumbai)', '2006/01/236', 400, opd,
      { extraRoles: ['admin'], experience: 18, languages: ['Marathi', 'Hindi', 'English'], qualificationNote: 'Certified Course on Echocardiography, JROP Institute of Echocardiography Delhi · Accredited by Indian Academy of Echocardiography' }],
    ['st-kavita', 'Dr. Kavita Umesh Aher', 'doctor', 'hospital', 'Consultant Gynaecologist & Obstetrician', 'dep-obgy', 'M.B.B.S., D.G.O.', '2010/09/2862', 400, { ...opd, slotMins: 15, maxPerDay: 40 },
      { experience: 15, languages: ['Marathi', 'Hindi', 'English'] }],
    ['st-recep1', 'Sneha Pagar', 'receptionist', 'hospital', 'Reception & Billing (placeholder)', null, 'B.Com', '', 0, null, { placeholder: true }],
    ['st-nurse1', 'Rupali Bhamre', 'nurse', 'hospital', 'Staff Nurse – ICU (placeholder)', 'dep-icu', 'GNM', 'MNC-SAMPLE-1', 0, null, { placeholder: true }],
    ['st-nurse2', 'Anita Wagh', 'nurse', 'hospital', 'Staff Nurse – Maternity (placeholder)', 'dep-obgy', 'ANM', 'MNC-SAMPLE-2', 0, null, { placeholder: true, shift: 'evening' }],
    ['st-avinash', 'Avinash Aher', 'pharmacy_admin', 'pharmacy', 'Medical Store Owner', 'dep-pharm', 'B.Pharm', 'Pharmacist reg. (placeholder)', 0, null, {}],
    ['st-pharm1', 'Rohan Kshirsagar', 'pharmacist', 'pharmacy', 'Pharmacist (placeholder)', 'dep-pharm', 'D.Pharm', 'MSPC-SAMPLE-1', 0, null, { placeholder: true }],
    ['st-pharm2', 'Priya Deore', 'pharmacist', 'pharmacy', 'Pharmacist (placeholder)', 'dep-pharm', 'D.Pharm', 'MSPC-SAMPLE-2', 0, null, { placeholder: true, shift: 'night' }],
    ['st-bapuji', 'Bapuji Dhomse', 'lab_admin', 'lab', 'Laboratory Owner', 'dep-lab', 'B.Sc. (Micro), C.M.L.T., D.M.L.T.', 'MCVC/MLT/0039/2024', 0, null, { canVerifyLab: true }],
    ['st-yogita', 'Yogita Dhomse', 'lab_tech', 'lab', 'Lab Technologist', 'dep-lab', 'B.Sc. (Micro), D.M.L.T.', 'D/MLT/0351/2021', 0, null, {}],
    ['st-labtech3', 'Ganesh Sonawane', 'lab_tech', 'lab', 'Lab Technician (placeholder)', 'dep-lab', 'D.M.L.T.', 'MLT-SAMPLE-3', 0, null, { placeholder: true, shift: 'night' }]
  ]
  STAFF.forEach(([id, name, role, unit, designation, deptId, qualification, regNo, fee, availability, extra], i) => {
    const uidv = 'u-' + id.slice(3)
    const phone = '90000' + String(10001 + i * 37).slice(-5) // demo login numbers (not real)
    const { extraRoles, ...rest } = extra
    add('staff', { id, userId: uidv, name, role, unit, designation, deptId, phone, email: '', qualification, regNo, fee, followUpFee: Math.round(fee / 2), availability, active: true, joinedOn: d(-1500 + i * 30), shift: 'morning', color: COLORS[i % COLORS.length], noOpd: role !== 'doctor', ...rest, createdAt: hoursAgo(24 * 380) })
    add('users', { id: uidv, name, phone, role, unit, extraRoles: extraRoles || [], staffId: id, status: 'active', color: COLORS[i % COLORS.length], createdAt: hoursAgo(24 * 380) })
  })
  // Fictional second clinic (separate tenant)
  add('staff', { id: 'st-a-doc', userId: 'u-a-doc', name: 'Dr. Demo Doctor', role: 'doctor', unit: 'hospital', designation: 'Family Physician (sample)', deptId: 'dep-a-gen', phone: '9000000900', qualification: 'MBBS', regNo: 'SAMPLE', fee: 250, followUpFee: 150, availability: { days: [1, 2, 3, 4, 5, 6], sessions: [{ start: '10:00', end: '14:00' }], slotMins: 10, maxPerDay: 40, online: false }, active: true, color: '#2563EB' }, H2)
  add('users', { id: 'u-a-doc', name: 'Dr. Demo Doctor', phone: '9000000900', role: 'doctor', unit: 'hospital', extraRoles: ['admin'], staffId: 'st-a-doc', status: 'active', color: '#2563EB' }, H2)
  s.users.push({ id: 'u-super', hospitalId: null, name: 'JeevO Platform Admin', phone: '9000000000', role: 'super_admin', status: 'active', color: '#0F172A', createdAt: hoursAgo(24 * 500) })

  /* ---------- Patients (all fictional) ---------- */
  const P = []
  let pidN = 15700
  const VILLAGES = ['Pimpalgaon Baswant', 'Niphad', 'Lasalgaon', 'Ozar', 'Chandwad', 'Vinchur', 'Saykheda', 'Kundewadi', 'Shirwade Vani', 'Palkhed']
  const pat = (row, h = H1) => {
    pidN++
    const r = add('patients', {
      id: 'p-' + pidN, pid: (h === H1 ? 'RKH-' : 'DMC-') + String(pidN).padStart(6, '0'), gender: 'male', lang: 'mr', city: 'Pimpalgaon Baswant', pin: '422209',
      consent: { treatment: true, whatsapp: true, sms: true, at: hoursAgo(24 * 200) }, vaccinations: [], allergies: '', conditions: '', bloodGroup: '', relation: 'self', insurance: null,
      createdAt: hoursAgo(24 * (30 + (pidN % 200))), ...row
    }, h)
    P.push(r)
    return r
  }
  const head = pat({ id: 'p-sunil', name: 'Sunil Kadam', dob: '1974-03-18', phone: '9876500001', address: 'Kadam Wasti, Nashik Road side', bloodGroup: 'B+', allergies: 'Sulfa drugs', conditions: 'Type 2 diabetes, Hypertension',
    emergencyName: 'Manisha Kadam (wife)', emergencyPhone: '9876500002', userId: 'u-patient', familyId: 'p-sunil', insurance: { insurer: 'Star Health and Allied Insurance Company Limited', policyNo: 'SAMPLE-POL-1001', validTill: d(200) } })
  pat({ id: 'p-manisha', name: 'Manisha Kadam', dob: '1980-11-02', gender: 'female', phone: '9876500002', address: head.address, bloodGroup: 'O+', familyId: 'p-sunil', relation: 'spouse', emergencyName: 'Sunil Kadam', emergencyPhone: '9876500001' })
  pat({ id: 'p-om', name: 'Om Kadam', dob: '2015-06-09', phone: '9876500001', address: head.address, bloodGroup: 'B+', familyId: 'p-sunil', relation: 'child', emergencyName: 'Sunil Kadam', emergencyPhone: '9876500001',
    vaccinations: [{ name: 'BCG', date: '2015-06-10' }, { name: 'OPV 0', date: '2015-06-10' }, { name: 'Hepatitis B – 1', date: '2015-06-10' }, { name: 'Pentavalent – 1', date: '2015-07-21' }, { name: 'MMR – 1', date: '2016-03-12' }, { name: 'DPT booster – 2', date: '2020-06-15' }] })
  pat({ id: 'p-shanta', name: 'Shantabai Kadam', dob: '1956-01-20', gender: 'female', phone: '9876500001', address: head.address, conditions: 'Osteoarthritis (knees)', familyId: 'p-sunil', relation: 'parent', emergencyName: 'Sunil Kadam', emergencyPhone: '9876500001' })

  const NAMES = [
    ['Dnyaneshwar Shinde', 'male', 1962], ['Sangita Gaikwad', 'female', 1984], ['Prashant Bhalerao', 'male', 1991], ['Rekha Pawar', 'female', 1979], ['Bhausaheb Kale', 'male', 1955],
    ['Pooja Sonawane', 'female', 1996], ['Kisan Jadhav', 'male', 1948], ['Vaishali Nikam', 'female', 1988], ['Amol Thorat', 'male', 2000], ['Lata Borse', 'female', 1966],
    ['Shaikh Sallauddin', 'male', 1975], ['Jyoti Mogal', 'female', 1990], ['Yash Kshirsagar', 'male', 2016], ['Suman Ahire', 'female', 1971], ['Ramdas Deore', 'male', 1960],
    ['Komal Gangurde', 'female', 1998], ['Vitthal Kute', 'male', 1952], ['Swati Kadam', 'female', 1993], ['Aarush Patil', 'male', 2021], ['Nazma Pathan', 'female', 1985],
    ['Bapu Wagh', 'male', 1950], ['Priyanka Darade', 'female', 1997], ['Tushar Shewale', 'male', 1987], ['Sakshi Mali', 'female', 2011], ['Haribhau Sangle', 'male', 1958],
    ['Mangal Bachhav', 'female', 1983], ['Rahul Chaudhari', 'male', 1995], ['Ashwini Holkar', 'female', 1994], ['Sopan Dhikale', 'male', 1964], ['Kavya Raut', 'female', 2002]
  ]
  const BG = ['A+', 'B+', 'O+', 'AB+', 'O-', 'B-', '', '']
  NAMES.forEach(([name, gender, y], i) => pat({
    name, gender, dob: `${y}-${String((i % 12) + 1).padStart(2, '0')}-${String((i * 3) % 27 + 1).padStart(2, '0')}`,
    phone: '98765' + String(10011 + i * 113).slice(-5), address: `${VILLAGES[i % VILLAGES.length]}`, city: VILLAGES[i % VILLAGES.length], bloodGroup: BG[i % BG.length],
    lang: ['mr', 'mr', 'hi', 'mr', 'en'][i % 5], conditions: i % 5 === 0 ? 'Hypertension' : i % 7 === 0 ? 'Type 2 diabetes' : '', allergies: i % 9 === 0 ? 'Penicillin' : '',
    consent: { treatment: true, whatsapp: i % 4 !== 3, sms: true, at: hoursAgo(24 * 100) }, incomplete: i === 28,
    insurance: i % 6 === 1 ? { insurer: INSURERS[i % INSURERS.length], policyNo: 'SAMPLE-POL-' + (2000 + i), validTill: d(300) } : null
  }))
  const others = P.slice(4)
  pat({ name: 'Sample Patient One', gender: 'male', dob: '1970-02-02', phone: '9000000911', address: 'Lasalgaon' }, H2)
  pat({ name: 'Sample Patient Two', gender: 'female', dob: '1988-07-19', phone: '9000000912', address: 'Lasalgaon' }, H2)
  add('users', { id: 'u-patient', name: 'Sunil Kadam', phone: '9876500001', role: 'patient', patientId: 'p-sunil', status: 'active', color: '#1B1E4A', createdAt: hoursAgo(24 * 200) })

  /* ---------- Medical store catalogue (sample prices) ---------- */
  const MEDS = [
    ['Dolo 650', 'Paracetamol', '650 mg', 'Tablet', 'Micro Labs', 'Analgesic', 2.1, 100, [['DL2411', '2027-06', 420], ['DL2502', '2027-11', 300]]],
    ['Glycomet GP 1', 'Metformin + Glimepiride', '500 mg / 1 mg', 'Tablet', 'USV', 'Antidiabetic', 6.2, 100, [['GG2405', '2026-12', 25], ['GG2501', '2027-09', 300]]],
    ['Glycomet 500 SR', 'Metformin', '500 mg', 'Tablet', 'USV', 'Antidiabetic', 2.4, 100, [['GM2412', '2027-08', 350]]],
    ['Telma 40', 'Telmisartan', '40 mg', 'Tablet', 'Glenmark', 'Antihypertensive', 8.9, 60, [['TL2407', '2027-01', 180]]],
    ['Amlong 5', 'Amlodipine', '5 mg', 'Tablet', 'Micro Labs', 'Antihypertensive', 3.1, 60, [['AM2403', '2026-11', 40], ['AM2502', '2028-01', 200]]],
    ['Ecosprin 75', 'Aspirin', '75 mg', 'Tablet', 'USV', 'Antiplatelet', 0.6, 100, [['EC2412', '2028-01', 500]]],
    ['Clopilet 75', 'Clopidogrel', '75 mg', 'Tablet', 'Sun Pharma', 'Antiplatelet', 4.2, 60, [['CL2410', '2027-06', 150]]],
    ['Atorva 40', 'Atorvastatin', '40 mg', 'Tablet', 'Zydus', 'Lipid lowering', 11.4, 60, [['AT2409', '2027-08', 210]]],
    ['Sorbitrate 5', 'Isosorbide dinitrate', '5 mg', 'Tablet', 'Abbott', 'Anti-anginal', 1.2, 50, [['SB2408', '2027-03', 12]]],
    ['Metolar XR 25', 'Metoprolol', '25 mg', 'Tablet', 'Cipla', 'Beta blocker', 5.8, 60, [['MX2406', '2027-05', 140]]],
    ['Pan 40', 'Pantoprazole', '40 mg', 'Tablet', 'Alkem', 'Antacid', 7.6, 80, [['PN2411', '2027-07', 260]]],
    ['Augmentin 625 Duo', 'Amoxicillin + Clavulanic acid', '625 mg', 'Tablet', 'GSK', 'Antibiotic', 20.5, 40, [['AG2409', '2027-02', 90]]],
    ['Azee 500', 'Azithromycin', '500 mg', 'Tablet', 'Cipla', 'Antibiotic', 23.8, 30, [['AZ2410', '2027-04', 45]]],
    ['Cetzine 10', 'Cetirizine', '10 mg', 'Tablet', 'Dr. Reddy’s', 'Antihistamine', 1.9, 60, [['CZ2408', '2027-05', 140]]],
    ['Ondem 4', 'Ondansetron', '4 mg', 'Tablet', 'Alkem', 'Antiemetic', 5.5, 30, [['ON2405', '2026-12', 0]]],
    ['ORS (Electral)', 'Oral rehydration salts', '21.8 g', 'Sachet', 'FDC', 'Rehydration', 22, 40, [['EL2410', '2027-10', 120]]],
    ['Folvite 5', 'Folic acid', '5 mg', 'Tablet', 'Pfizer', 'Supplement (pregnancy)', 1.4, 60, [['FV2410', '2028-03', 400]]],
    ['Ferium XT', 'Ferrous ascorbate + Folic acid', '100 mg', 'Tablet', 'Emcure', 'Haematinic', 15.9, 40, [['FX2407', '2027-04', 110]]],
    ['Shelcal 500', 'Calcium + Vitamin D3', '500 mg', 'Tablet', 'Torrent', 'Supplement', 7.1, 60, [['SC2411', '2028-02', 240]]],
    ['Duphaston 10', 'Dydrogesterone', '10 mg', 'Tablet', 'Abbott', 'Gynaecology', 52, 20, [['DU2409', '2027-03', 8]]],
    ['Meftal Spas', 'Mefenamic acid + Dicyclomine', '250/10 mg', 'Tablet', 'Blue Cross', 'Antispasmodic', 4.6, 40, [['MS2410', '2027-06', 90]]],
    ['Zerodol SP', 'Aceclofenac + Paracetamol + Serratiopeptidase', '100/325/15 mg', 'Tablet', 'Ipca', 'Analgesic', 10.8, 50, [['ZS2408', '2027-02', 160]]],
    ['Insulin Mixtard 30/70', 'Human insulin (biphasic)', '40 IU/ml', 'Injection', 'Novo Nordisk', 'Antidiabetic', 165, 5, [['IN2411', '2026-12', 8]]],
    ['Inj. Ceftriaxone 1 g', 'Ceftriaxone', '1 g', 'Injection', 'Alkem', 'Antibiotic', 58, 20, [['CF2410', '2027-05', 60]]],
    ['RL 500 ml', 'Ringer lactate', '500 ml', 'IV fluid', 'Baxter', 'IV fluid', 45, 40, [['RL2411', '2027-11', 140]]],
    ['NS 500 ml', 'Sodium chloride 0.9%', '500 ml', 'IV fluid', 'Baxter', 'IV fluid', 40, 40, [['NS2411', '2027-11', 25]]],
    ['Calpol Syrup', 'Paracetamol', '250 mg/5 ml', 'Syrup', 'GSK', 'Paediatric', 48, 10, [['CP2407', '2026-12', 18]]],
    ['Metrogyl 400', 'Metronidazole', '400 mg', 'Tablet', 'J B Chemicals', 'Antibiotic', 1.7, 40, [['MG2401', '2025-12', 35], ['MG2502', '2027-11', 80]]],
    ['Asthalin Inhaler', 'Salbutamol', '100 mcg', 'Inhaler', 'Cipla', 'Bronchodilator', 155, 5, [['AS2406', '2027-06', 9]]],
    ['Volini Gel', 'Diclofenac', '30 g', 'Gel', 'Sun Pharma', 'Topical', 145, 5, [['VG2409', '2027-09', 14]]]
  ]
  MEDS.forEach(([name, generic, strength, form, manufacturer, category, mrp, minStock, batches], i) => add('medicines', {
    id: 'med-' + (i + 1), name, generic, strength, form, manufacturer, category, mrp, gst: 12, minStock, barcode: '890' + String(1000000000 + i * 7331).slice(0, 10), active: true,
    batches: batches.map(([batch, expiry, qty]) => ({ batch, expiry, qty, purchase: Math.round(mrp * 0.72 * 100) / 100, mrp }))
  }))
  const med = (name) => s.medicines.find((m) => m.name === name)
  add('medicines', { id: 'med-a1', name: 'Dolo 650', generic: 'Paracetamol', strength: '650 mg', form: 'Tablet', manufacturer: 'Micro Labs', category: 'Analgesic', mrp: 2.1, gst: 12, minStock: 50, active: true, batches: [{ batch: 'DL2499', expiry: '2027-03', qty: 150, purchase: 1.5, mrp: 2.1 }] }, H2)

  /* ---------- Tests: pathology lab (unit lab) & hospital investigations (unit hospital) ---------- */
  const TESTS = [
    // code, name, category, unit, sample, price, tat, params [name, unit, low, high, normalText]
    ['RBS', 'Random Plasma Glucose', 'Biochemistry', 'lab', 'Fluoride plasma', 60, 1, [['Random Plasma Glucose', 'mg%', 70, 140]]],
    ['FBS', 'Fasting Plasma Glucose', 'Biochemistry', 'lab', 'Fluoride plasma', 60, 1, [['Fasting Plasma Glucose', 'mg%', 70, 110]]],
    ['PPBS', 'Post Prandial Plasma Glucose', 'Biochemistry', 'lab', 'Fluoride plasma', 60, 1, [['PP Plasma Glucose', 'mg%', 70, 140]]],
    ['HBA1C', 'HbA1c (Glycated Haemoglobin)', 'Biochemistry', 'lab', 'EDTA blood', 450, 6, [['HbA1c', '%', 4, 5.6]]],
    ['CREAT', 'Serum Creatinine', 'Biochemistry', 'lab', 'Serum', 150, 2, [['S.Creatinine Level', 'mg%', 0.7, 1.4]]],
    ['UREA', 'Blood Urea', 'Biochemistry', 'lab', 'Serum', 150, 2, [['Blood Urea', 'mg%', 15, 40]]],
    ['LIPID', 'Lipid Profile', 'Biochemistry', 'lab', 'Serum', 600, 6, [['Total cholesterol', 'mg%', 0, 200], ['Triglycerides', 'mg%', 0, 150], ['HDL cholesterol', 'mg%', 40, 60], ['LDL cholesterol', 'mg%', 0, 100]]],
    ['LFT', 'Liver Function Test', 'Biochemistry', 'lab', 'Serum', 700, 6, [['Total bilirubin', 'mg%', 0.2, 1.2], ['SGOT (AST)', 'U/L', 0, 40], ['SGPT (ALT)', 'U/L', 0, 41], ['Alkaline phosphatase', 'U/L', 44, 147]]],
    ['ELEC', 'Serum Electrolytes', 'Biochemistry', 'lab', 'Serum', 500, 4, [['Sodium', 'mEq/L', 135, 145], ['Potassium', 'mEq/L', 3.5, 5.1], ['Chloride', 'mEq/L', 98, 107]]],
    ['TROP', 'Troponin I (rapid)', 'Biochemistry', 'lab', 'Serum', 900, 1, [['Troponin I', '', null, null, 'Negative']]],
    ['CBC', 'Complete Blood Count (CBC)', 'Haematology', 'lab', 'EDTA blood', 300, 2, [['Haemoglobin', 'gm%', 12, 16], ['Total WBC count', '/cumm', 4000, 11000], ['Platelet count', 'lakh/cumm', 1.5, 4.5], ['RBC count', 'million/cumm', 4.0, 5.5]]],
    ['BGRP', 'Blood Group & Rh', 'Haematology', 'lab', 'EDTA blood', 100, 1, [['Blood group', '', null, null, '']]],
    ['TSH', 'Thyroid Stimulating Hormone (TSH)', 'Hormones', 'lab', 'Serum', 350, 12, [['TSH', 'µIU/mL', 0.4, 4.5]]],
    ['UPT', 'Urine Pregnancy Test', 'Clinical pathology', 'lab', 'Urine', 100, 1, [['UPT', '', null, null, 'Negative']]],
    ['URINE', 'Urine Routine & Microscopy', 'Clinical pathology', 'lab', 'Urine', 150, 2, [['Colour', '', null, null, 'Pale yellow'], ['Albumin', '', null, null, 'Nil'], ['Sugar', '', null, null, 'Nil'], ['Pus cells', '/hpf', 0, 5]]],
    ['WIDAL', 'Widal Test', 'Serology', 'lab', 'Serum', 250, 4, [['S. typhi O', 'titre', null, null, '< 1:80'], ['S. typhi H', 'titre', null, null, '< 1:160']]],
    ['DENGUE', 'Dengue NS1 Antigen', 'Serology', 'lab', 'Serum', 600, 4, [['NS1 antigen', '', null, null, 'Negative']]],
    ['MP', 'Malaria Parasite (Rapid)', 'Serology', 'lab', 'EDTA blood', 300, 2, [['P. vivax / P. falciparum', '', null, null, 'Not detected']]],
    ['ECG', 'ECG (12-lead)', 'Cardiac', 'hospital', 'Patient', 300, 1, [['Impression', '', null, null, '']]],
    ['ECHO', '2D Echo', 'Cardiac', 'hospital', 'Patient', 1500, 1, [['LVEF', '%', 55, 70], ['Impression', '', null, null, '']]],
    ['TMT', 'Stress Test (TMT)', 'Cardiac', 'hospital', 'Patient', 2000, 2, [['Result', '', null, null, 'Negative for inducible ischaemia'], ['Impression', '', null, null, '']]],
    ['XRCHEST', 'X-ray Chest PA View', 'X-ray', 'hospital', 'Patient', 400, 2, [['Impression', '', null, null, '']]],
    ['XRKNEE', 'X-ray Knee AP/Lateral', 'X-ray', 'hospital', 'Patient', 500, 2, [['Impression', '', null, null, '']]]
  ]
  TESTS.forEach(([code, name, category, unit, sample, price, tat, params]) => add('labTests', {
    id: 'lt-' + code.toLowerCase(), code, name, category, unit, sample, price, tat, active: true,
    params: params.map(([pname, punit, low, high, normal]) => ({ name: pname, unit: punit, low, high, normal: normal || '' }))
  }))
  const test = (id) => s.labTests.find((t) => t.id === id)

  const SERVICES = [
    ['svc-reg', 'Registration / file charges', 'Registration', 50], ['svc-dress', 'Dressing', 'Procedure', 150], ['svc-inj', 'Injection charges', 'Procedure', 50],
    ['svc-neb', 'Nebulisation', 'Procedure', 150], ['svc-iv', 'IV fluid administration', 'Procedure', 300], ['svc-plaster', 'Plaster application', 'Procedure', 1500],
    ['svc-normal', 'Normal delivery package', 'Maternity', 15000], ['svc-lscs', 'Caesarean (LSCS) package', 'Maternity', 35000],
    ['svc-ot', 'Operation theatre charges', 'Procedure', 5000], ['svc-vent', 'Ventilator (per day)', 'Room', 3000], ['svc-o2', 'Oxygen (per day)', 'Room', 800],
    ['svc-er', 'Emergency consultation', 'Consultation', 600], ['svc-amb', 'Ambulance (within 20 km)', 'Other', 800], ['svc-blood', 'Blood storage – unit handling', 'Other', 1500],
    ['svc-nursing', 'Nursing charges (per day)', 'Room', 400], ['svc-visit', 'Doctor visit (inpatient)', 'Consultation', 500]
  ]
  SERVICES.forEach(([id, name, category, price]) => add('services', { id, name, category, price, gst: 0, active: true, sample: true }))

  /* ---------- Wards & beds: ICU 10 · General 2 rooms × 4 · Semi-special 10 rooms × 2 · Special 10 rooms ---------- */
  const ward = (id, name, type, floor, dailyRate) => add('wards', { id, name, type, floor, dailyRate })
  const bedAdd = (id, wardId, label, room) => add('beds', { id, wardId, label, room, status: 'available' })
  ward('w-icu', 'ICU', 'ICU', 1, 5000)
  for (let i = 1; i <= 10; i++) bedAdd(`bed-icu-${i}`, 'w-icu', `ICU-${String(i).padStart(2, '0')}`, 'ICU')
  ward('w-gen', 'General Ward', 'General', 1, 800)
  ;[1, 2].forEach((r) => ['A', 'B', 'C', 'D'].forEach((b) => bedAdd(`bed-gw${r}${b}`, 'w-gen', `GW${r}-${b}`, `General room ${r}`)))
  ward('w-semi', 'Semi-Special Rooms', 'Semi-private', 2, 1500)
  for (let r = 1; r <= 10; r++) ['A', 'B'].forEach((b) => bedAdd(`bed-ss${r}${b}`, 'w-semi', `S${200 + r}-${b}`, `Room ${200 + r}`))
  ward('w-special', 'Special Rooms', 'Private', 3, 2500)
  for (let r = 1; r <= 10; r++) bedAdd(`bed-sp${r}`, 'w-special', `SP-${300 + r}`, `Room ${300 + r}`)
  const bed = (id) => s.beds.find((b) => b.id === id)
  bed('bed-ss10B').status = 'maintenance'
  bed('bed-sp10').status = 'reserved'
  bed('bed-sp10').reservedFor = 'Planned delivery – Dr. Kavita Aher'

  /* ---------- Appointments, consultations, bills ---------- */
  const docs = s.staff.filter((x) => x.role === 'doctor' && x.hospitalId === H1)
  let apN = 300, rxN = 200, labN = 150, conN = 400
  const rcN = { hospital: 700, pharmacy: 300, lab: 400 }
  const billNo = { hospital: 900, pharmacy: 500, lab: 15700 }
  const BILLP = { hospital: 'BL', pharmacy: 'PH', lab: 'LBL' }, RCP = { hospital: 'RC', pharmacy: 'PR', lab: 'LR' }
  const no = (pre, n, day = T) => `${pre}-${day.slice(2, 4)}${day.slice(5, 7)}-${String(n).padStart(4, '0')}`
  const tokens = {}
  const appt = (row) => {
    apN++
    const doc = s.staff.find((x) => x.id === row.doctorId)
    const key = row.doctorId + row.date
    tokens[key] = (tokens[key] || 0) + 1
    return add('appointments', { id: 'ap-' + apN, apptNo: no('AP', apN, row.date), deptId: doc.deptId, type: 'general', token: tokens[key], fee: doc.fee, status: 'booked', priority: 'normal', source: 'reception', createdAt: at(addDays(row.date, -1), '18:00'), ...row })
  }
  const billFor = (patientId, items, opts = {}) => {
    const unit = opts.unit || 'hospital'
    billNo[unit]++
    const subtotal = items.reduce((a, i) => a + i.qty * i.rate, 0)
    const discount = items.reduce((a, i) => a + (i.discount || 0), 0)
    const total = Math.round((subtotal - discount) * 100) / 100
    const day = opts.day || T
    const b = add('bills', { id: `bl-${unit}-${billNo[unit]}`, billNo: no(BILLP[unit], billNo[unit], day), unit, patientId, date: day, items, subtotal, discount, tax: 0, total, paid: 0, refunded: 0, status: 'unpaid', createdBy: opts.by || 'u-recep1', createdAt: opts.at || at(day, '11:30'), ...opts.extra })
    if (opts.pay) {
      const amt = opts.pay === true ? total : opts.pay
      rcN[unit]++
      add('payments', { id: `pm-${unit}-${rcN[unit]}`, receiptNo: no(RCP[unit], rcN[unit], day), unit, billId: b.id, patientId, amount: amt, kind: 'payment', method: opts.method || 'upi', ref: opts.method === 'cash' ? '' : 'UPI' + (rcN[unit] * 7919), by: opts.by || 'u-recep1', at: opts.at || at(day, '11:35'), createdAt: opts.at || at(day, '11:35') })
      b.paid = amt
      b.status = amt >= total ? 'paid' : 'partial'
    }
    return b
  }
  const consultBill = (a, pay = true, method) => {
    const doc = s.staff.find((x) => x.id === a.doctorId)
    const b = billFor(a.patientId, [{ type: 'consultation', refId: a.id, desc: `Consultation – ${doc.name}`, qty: 1, rate: a.fee, discount: 0, taxPct: 0 }], { day: a.date, at: a.arrivedAt || at(a.date, a.time), pay, method: method || (a.token % 3 === 0 ? 'cash' : 'upi'), extra: { apptId: a.id, doctorId: a.doctorId } })
    a.billId = b.id
    return b
  }
  const labBill = (lo, day, pay, by) => {
    const unit = lo.unit
    const b = billFor(lo.patientId, lo.tests.map((t) => ({ type: unit === 'lab' ? 'lab' : 'radiology', refId: lo.id, desc: test(t).name, qty: 1, rate: test(t).price, discount: 0, taxPct: 0 })), { unit, day, pay, method: 'cash', by: by || (unit === 'lab' ? 'u-yogita' : 'u-recep1'), extra: { labOrderId: lo.id } })
    lo.billId = b.id
    return b
  }
  const pharmBill = (r, day, pay = true) => billFor(r.patientId, r.items.filter((it) => it.medicineId).map((it) => ({ type: 'pharmacy', refId: r.id, desc: `${it.name} (${it.qty})`, qty: it.qty, rate: s.medicines.find((m) => m.id === it.medicineId).mrp, discount: 0, taxPct: 0, medicineId: it.medicineId })), { unit: 'pharmacy', day, pay, method: 'cash', by: 'u-pharm1', extra: { prescriptionId: r.id } })
  const workday = (dd) => new Date(dd + 'T00:00:00').getDay() !== 6

  // History: last 45 days of OPD
  for (let day = -45; day <= -1; day++) {
    const dd = d(day)
    if (!workday(dd)) continue
    const n = 5 + ((day * 7 + 45) % 6)
    for (let k = 0; k < n; k++) {
      const doc = docs[(k + day + 45) % docs.length]
      const p = others[(k * 5 + day + 90) % others.length]
      const time = `${String(11 + (k % 4)).padStart(2, '0')}:${String((k * 10) % 60).padStart(2, '0')}`
      const a = appt({ patientId: p.id, doctorId: doc.id, date: dd, time, status: k === 5 ? 'no_show' : 'completed', type: k % 4 === 1 ? 'followup' : 'general', source: k % 3 ? 'reception' : 'app' })
      if (a.type === 'followup') a.fee = doc.followUpFee
      if (a.status === 'completed') {
        a.arrivedAt = at(dd, time); a.startedAt = new Date(new Date(a.arrivedAt).getTime() + 14 * 60000).toISOString(); a.completedAt = new Date(new Date(a.startedAt).getTime() + (6 + (k % 5) * 2) * 60000).toISOString()
        consultBill(a)
        if (k % 2 === 0) billFor(p.id, [{ type: 'pharmacy', refId: '', desc: 'Medicines (sample sale)', qty: 1, rate: 120 + k * 35, discount: 0, taxPct: 0 }], { unit: 'pharmacy', day: dd, pay: true, method: 'cash', by: 'u-pharm1', at: at(dd, '13:00') })
        if (k % 3 === 0) {
          labN++
          const lo = add('labOrders', { id: 'lo-' + labN, orderNo: no('LB', labN, dd), unit: 'lab', patientId: p.id, doctorId: doc.id, referredBy: doc.name, tests: ['lt-rbs', 'lt-creat'], status: 'published', priority: 'routine', sampleId: 'S' + dd.replace(/-/g, '').slice(2) + '-0' + (10 + k), collectedAt: at(dd, '12:00'), collectedBy: 'u-yogita', enteredBy: 'u-yogita', enteredAt: at(dd, '12:40'), verifiedBy: 'u-bapuji', verifiedAt: at(dd, '13:00'), publishedAt: at(dd, '13:05'), results: { 'lt-rbs': { 'Random Plasma Glucose': String(95 + k * 9) }, 'lt-creat': { 'S.Creatinine Level': '1.0' } }, remarks: '', files: [], createdAt: at(dd, '11:50') })
          labBill(lo, dd, true)
        }
      }
    }
  }

  const rx = (row) => { rxN++; return add('prescriptions', { id: 'rx-' + rxN, rxNo: no('RX', rxN, row.date), status: 'final', dispenseStatus: 'dispensed', patientLang: 'mr', signedAt: at(row.date, '12:00'), ...row, createdAt: at(row.date, '12:00') }) }
  const consult = (row) => { conN++; return add('consultations', { id: 'cn-' + conN, status: 'final', ...row, finalizedAt: at(row.date, '12:00'), createdAt: at(row.date, '11:45') }) }

  // Sunil Kadam (demo patient): diabetes & BP follow-ups with Dr. Umesh Aher
  ;[[-75, 'Type 2 diabetes mellitus – uncontrolled; Essential hypertension', 238, '152/94'], [-28, 'Type 2 diabetes mellitus; Essential hypertension – improving', 158, '136/86']].forEach(([off, dx, sugar, bp], i) => {
    const dd = workday(d(off)) ? d(off) : d(off - 1)
    const a = appt({ patientId: 'p-sunil', doctorId: 'st-umesh', date: dd, time: '11:30', status: 'completed', type: i ? 'followup' : 'general', source: 'app' })
    a.arrivedAt = at(dd, '11:20'); a.startedAt = at(dd, '11:40'); a.completedAt = at(dd, '11:55')
    consultBill(a)
    const [sys, dia] = bp.split('/').map(Number)
    const c = consult({ apptId: a.id, patientId: 'p-sunil', doctorId: 'st-umesh', date: dd, vitals: { bpSys: sys, bpDia: dia, pulse: 84, temp: 98.4, spo2: 98, height: 168, weight: 82 - i * 2, glucose: sugar },
      complaints: i ? 'Routine diabetes & BP follow-up' : 'Excess thirst, frequent urination, tiredness', symptoms: i ? 'Feels better; occasional tingling in feet' : 'Polyuria, polydipsia, fatigue', duration: i ? '1 month' : '3 weeks',
      exam: 'Chest clear, CVS – S1 S2 normal, no pedal oedema', diagnosis: dx, plan: i ? 'Continue medicines, add statin. Diet and 30 min daily walk.' : 'Start oral hypoglycaemics; HbA1c, lipid profile, creatinine.', followUpDate: d(off + 30) })
    const r = rx({ patientId: 'p-sunil', doctorId: 'st-umesh', consultationId: c.id, date: dd, diagnosis: dx, advice: 'Walk 30 minutes daily. Check sugar at home twice a week.', diet: 'Avoid sweets, sugarcane juice and excess rice. Eat more salad, dal, jowar and bajra bhakri.', followUpDate: d(off + 30),
      items: [
        { medicineId: med('Glycomet GP 1').id, name: 'Glycomet GP 1', generic: 'Metformin + Glimepiride', strength: '500 mg / 1 mg', form: 'Tablet', dose: '1 tablet', frequency: '1-0-1', duration: '30 days', timing: 'after_food', instructions: '', qty: 60 },
        { medicineId: med('Telma 40').id, name: 'Telma 40', generic: 'Telmisartan', strength: '40 mg', form: 'Tablet', dose: '1 tablet', frequency: '1-0-0', duration: '30 days', timing: 'before_food', instructions: 'Take in the morning', qty: 30 },
        ...(i ? [{ medicineId: med('Atorva 40').id, name: 'Atorva 40', generic: 'Atorvastatin', strength: '40 mg', form: 'Tablet', dose: '1 tablet', frequency: '0-0-1', duration: '30 days', timing: 'after_food', instructions: 'At bedtime', qty: 30 }] : [])
      ] })
    c.prescriptionId = r.id
    pharmBill(r, dd)
    if (!i) {
      labN++
      const lo = add('labOrders', { id: 'lo-' + labN, orderNo: no('LB', labN, dd), unit: 'lab', patientId: 'p-sunil', doctorId: 'st-umesh', referredBy: 'Dr. Umesh Aher', consultationId: c.id, tests: ['lt-hba1c', 'lt-lipid', 'lt-creat'], status: 'published', priority: 'routine', sampleId: 'S' + dd.replace(/-/g, '').slice(2) + '-031',
        collectedAt: at(dd, '12:05'), collectedBy: 'u-yogita', enteredBy: 'u-yogita', enteredAt: at(dd, '15:00'), verifiedBy: 'u-bapuji', verifiedAt: at(dd, '16:30'), publishedAt: at(dd, '16:35'), createdAt: at(dd, '11:56'),
        results: { 'lt-hba1c': { HbA1c: '8.6' }, 'lt-lipid': { 'Total cholesterol': '236', Triglycerides: '204', 'HDL cholesterol': '37', 'LDL cholesterol': '158' }, 'lt-creat': { 'S.Creatinine Level': '1.0' } }, remarks: 'Sample adequate.', files: [] })
      c.labOrderIds = [lo.id]
      labBill(lo, dd, true)
      labN++
      const ecg = add('labOrders', { id: 'lo-' + labN, orderNo: no('LB', labN, dd), unit: 'hospital', patientId: 'p-sunil', doctorId: 'st-umesh', referredBy: 'Dr. Umesh Aher', consultationId: c.id, tests: ['lt-ecg'], status: 'published', priority: 'routine',
        collectedAt: at(dd, '11:50'), collectedBy: 'u-umesh', enteredBy: 'u-umesh', enteredAt: at(dd, '11:52'), verifiedBy: 'u-umesh', verifiedAt: at(dd, '11:53'), publishedAt: at(dd, '11:54'), createdAt: at(dd, '11:45'), results: { 'lt-ecg': { Impression: 'Normal sinus rhythm. No acute ST-T changes.' } }, remarks: '', files: [] })
      c.labOrderIds.push(ecg.id)
      labBill(ecg, dd, true)
    }
  })
  // Manisha Kadam – gynaecology visit; lab bill part-paid (try "Pay bills" in the patient app)
  {
    const dd = workday(d(-4)) ? d(-4) : d(-5)
    const a = appt({ patientId: 'p-manisha', doctorId: 'st-kavita', date: dd, time: '12:15', status: 'completed', type: 'general', source: 'app' })
    a.arrivedAt = at(dd, '12:05'); a.startedAt = at(dd, '12:20'); a.completedAt = at(dd, '12:35')
    consultBill(a, true, 'upi')
    const c = consult({ apptId: a.id, patientId: 'p-manisha', doctorId: 'st-kavita', date: dd, vitals: { bpSys: 118, bpDia: 76, pulse: 80, weight: 61 }, complaints: 'Irregular periods, weakness', symptoms: 'Tiredness for 2 months', duration: '2 months', exam: 'Pallor +', diagnosis: 'Anaemia – under evaluation', plan: 'CBC, TSH. Iron supplements. Review with reports.', followUpDate: d(3) })
    const r = rx({ patientId: 'p-manisha', doctorId: 'st-kavita', consultationId: c.id, date: dd, diagnosis: c.diagnosis, advice: 'Eat green leafy vegetables, jaggery, dates.', diet: '', followUpDate: d(3),
      items: [{ medicineId: med('Ferium XT').id, name: 'Ferium XT', generic: 'Ferrous ascorbate + Folic acid', strength: '100 mg', form: 'Tablet', dose: '1 tablet', frequency: '0-1-0', duration: '30 days', timing: 'after_food', instructions: '', qty: 30 }] })
    c.prescriptionId = r.id
    pharmBill(r, dd)
    labN++
    const lo = add('labOrders', { id: 'lo-' + labN, orderNo: no('LB', labN, dd), unit: 'lab', patientId: 'p-manisha', doctorId: 'st-kavita', referredBy: 'Dr. Kavita Umesh Aher', consultationId: c.id, tests: ['lt-cbc', 'lt-tsh'], status: 'published', priority: 'routine', sampleId: 'S' + dd.replace(/-/g, '').slice(2) + '-019',
      collectedAt: at(dd, '12:45'), collectedBy: 'u-yogita', enteredBy: 'u-yogita', enteredAt: at(dd, '16:00'), verifiedBy: 'u-bapuji', verifiedAt: at(dd, '17:00'), publishedAt: at(dd, '17:05'), createdAt: at(dd, '12:36'),
      results: { 'lt-cbc': { Haemoglobin: '9.8', 'Total WBC count': '7400', 'Platelet count': '2.4', 'RBC count': '3.8' }, 'lt-tsh': { TSH: '3.2' } }, remarks: '', files: [] })
    c.labOrderIds = [lo.id]
    labBill(lo, dd, 200)
  }
  // Om Kadam – fever
  {
    const dd = workday(d(-9)) ? d(-9) : d(-10)
    const a = appt({ patientId: 'p-om', doctorId: 'st-umesh', date: dd, time: '18:10', status: 'completed', type: 'general', source: 'app' })
    a.arrivedAt = at(dd, '18:00'); a.startedAt = at(dd, '18:15'); a.completedAt = at(dd, '18:25')
    consultBill(a)
    const c = consult({ apptId: a.id, patientId: 'p-om', doctorId: 'st-umesh', date: dd, vitals: { temp: 101.4, pulse: 104, spo2: 98, weight: 32 }, complaints: 'Fever and cough', symptoms: 'Fever since 2 days, dry cough', duration: '2 days', exam: 'Throat congested, chest clear', diagnosis: 'Acute viral upper respiratory infection', plan: 'Symptomatic treatment, fluids. CBC & Dengue NS1.', followUpDate: d(-6) })
    const r = rx({ patientId: 'p-om', doctorId: 'st-umesh', consultationId: c.id, date: dd, diagnosis: c.diagnosis, advice: 'Plenty of fluids. Sponge with lukewarm water if fever is high. Come back if fever persists beyond 3 days.', diet: 'Light home food, soups.', followUpDate: d(-6),
      items: [{ medicineId: med('Calpol Syrup').id, name: 'Calpol Syrup', generic: 'Paracetamol', strength: '250 mg/5 ml', form: 'Syrup', dose: '10 ml', frequency: 'SOS', duration: '3 days', timing: 'after_food', instructions: 'Only if temperature is above 100°F, at least 6 hours apart', qty: 1 }] })
    c.prescriptionId = r.id
    pharmBill(r, dd)
    labN++
    const lo = add('labOrders', { id: 'lo-' + labN, orderNo: no('LB', labN, dd), unit: 'lab', patientId: 'p-om', doctorId: 'st-umesh', referredBy: 'Dr. Umesh Aher', consultationId: c.id, tests: ['lt-cbc', 'lt-dengue'], status: 'published', priority: 'routine', sampleId: 'S' + dd.replace(/-/g, '').slice(2) + '-012',
      collectedAt: at(dd, '18:30'), collectedBy: 'u-yogita', enteredBy: 'u-yogita', enteredAt: at(dd, '20:00'), verifiedBy: 'u-bapuji', verifiedAt: at(dd, '20:30'), publishedAt: at(dd, '20:35'), createdAt: at(dd, '18:25'),
      results: { 'lt-cbc': { Haemoglobin: '12.4', 'Total WBC count': '5600', 'Platelet count': '2.2', 'RBC count': '4.5' }, 'lt-dengue': { 'NS1 antigen': 'Negative' } }, remarks: '', files: [] })
    c.labOrderIds = [lo.id]
    labBill(lo, dd, true)
  }

  // A referral letter (fictional patient & specialist) – as written on the hospital letterhead
  {
    const p = others[0]
    const dd = workday(d(-12)) ? d(-12) : d(-13)
    const a = appt({ patientId: p.id, doctorId: 'st-umesh', date: dd, time: '12:40', status: 'completed', type: 'general' })
    a.arrivedAt = at(dd, '12:30'); a.startedAt = at(dd, '12:45'); a.completedAt = at(dd, '13:05')
    consultBill(a)
    const c = consult({ apptId: a.id, patientId: p.id, doctorId: 'st-umesh', date: dd, vitals: { bpSys: 120, bpDia: 80, pulse: 82, spo2: 98 }, complaints: 'Chest pain on exertion', symptoms: 'Chest heaviness while walking, relieved by rest', duration: '1 week', exam: 'CVS – S1 S2 normal', diagnosis: 'Unstable angina', plan: 'Stress test positive for inducible ischaemia. Refer for coronary angiography.' })
    labN++
    const tmt = add('labOrders', { id: 'lo-' + labN, orderNo: no('LB', labN, dd), unit: 'hospital', patientId: p.id, doctorId: 'st-umesh', referredBy: 'Dr. Umesh Aher', consultationId: c.id, tests: ['lt-tmt'], status: 'published', priority: 'urgent',
      collectedAt: at(dd, '12:50'), collectedBy: 'u-umesh', enteredBy: 'u-umesh', enteredAt: at(dd, '13:00'), verifiedBy: 'u-umesh', verifiedAt: at(dd, '13:01'), publishedAt: at(dd, '13:02'), createdAt: at(dd, '12:46'), results: { 'lt-tmt': { Result: 'Positive for inducible ischaemia', Impression: 'Refer for CAG' } }, remarks: '', files: [] })
    c.labOrderIds = [tmt.id]
    labBill(tmt, dd, true)
    add('referrals', { id: 'rf-1', refNo: no('RF', 1001, dd), patientId: p.id, consultationId: c.id, doctorId: 'st-umesh', toDoctor: 'Consultant Cardiologist (sample name)', specialty: 'Cardiology', place: 'Nashik',
      reason: 'Respected Sir, referring this patient, a case of unstable angina. Stress test positive for inducible ischaemia. For coronary angiography (CAG).', vitals: { bpSys: 120, bpDia: 80, pulse: 82, spo2: 98 }, notes: '', date: dd, createdAt: at(dd, '13:05') })
  }

  // TODAY's OPD (on Saturday – OPD closed – the demo shows the next working day)
  const TD = workday(T) ? T : d(1)
  const now = new Date()
  const nowMin = TD === T ? now.getHours() * 60 + now.getMinutes() : 11 * 60 + 30
  const mm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  const visits = [
    ['st-umesh', 1, 'completed', -150], ['st-umesh', 2, 'completed', -130], ['st-umesh', 3, 'completed', -110], ['st-umesh', 4, 'in_consultation', -40],
    ['st-umesh', 5, 'arrived', -20], ['st-umesh', 6, 'arrived', -10], ['st-umesh', 7, 'arrived', 0], ['st-umesh', 8, 'booked', 20], ['st-umesh', 9, 'booked', 40],
    ['st-kavita', 10, 'completed', -90], ['st-kavita', 11, 'in_consultation', -25], ['st-kavita', 13, 'arrived', -5], ['st-kavita', 17, 'booked', 30], ['st-kavita', 21, 'booked', 60, 'online'],
    ['st-kavita', 15, 'cancelled', 45]
  ]
  visits.forEach(([doctorId, pi, status, off, type]) => {
    const p = others[pi]
    const slot = Math.max(11 * 60, Math.min(20 * 60, Math.round((nowMin + off) / 5) * 5))
    const a = appt({ patientId: p.id, doctorId, date: TD, time: mm(slot), status, type: type || (pi % 5 === 2 ? 'followup' : 'general'), source: pi % 3 === 0 ? 'app' : pi % 3 === 1 ? 'reception' : 'whatsapp', createdAt: hoursAgo(20 - pi * 0.4) })
    if (a.type === 'online') a.meetLink = 'https://meet.jit.si/jeevo-' + Math.random().toString(36).slice(2, 12)
    if (['arrived', 'in_consultation', 'completed'].includes(status)) { a.arrivedAt = minsAgo(Math.max(5, -off + 15)); consultBill(a, pi % 4 !== 1) }
    if (['in_consultation', 'completed'].includes(status)) a.startedAt = minsAgo(Math.max(2, -off))
    if (status === 'completed') a.completedAt = minsAgo(Math.max(1, -off - 10))
    if (status === 'cancelled') a.cancelReason = 'Patient requested'
    if (status === 'completed' || status === 'in_consultation') {
      const c = consult({ apptId: a.id, patientId: p.id, doctorId, date: TD, status: status === 'completed' ? 'final' : 'draft', vitals: { bpSys: 120 + pi, bpDia: 80, pulse: 76 + pi, temp: 98.6, spo2: 98, weight: 58 + pi },
        complaints: ['Fever with body ache', 'Sugar check-up', 'Cough and cold', 'Acidity, burning in chest', 'Pregnancy check-up', 'BP check-up'][pi % 6], symptoms: '', duration: `${2 + (pi % 4)} days`, exam: '',
        diagnosis: status === 'completed' ? ['Viral fever', 'Type 2 diabetes – follow-up', 'Acute bronchitis', 'Gastritis', 'Normal pregnancy – 20 weeks', 'Hypertension'][pi % 6] : '', plan: '' })
      if (status === 'completed') {
        const r = rx({ patientId: p.id, doctorId, consultationId: c.id, date: TD, diagnosis: c.diagnosis, advice: 'Rest and drink plenty of water.', diet: '', followUpDate: d(7), dispenseStatus: pi === 1 ? 'pending' : 'dispensed', patientLang: p.lang, signedAt: minsAgo(Math.max(1, -off - 10)),
          items: [{ medicineId: med('Dolo 650').id, name: 'Dolo 650', generic: 'Paracetamol', strength: '650 mg', form: 'Tablet', dose: '1 tablet', frequency: '1-1-1', duration: '3 days', timing: 'after_food', instructions: '', qty: 9 }, { medicineId: med('Pan 40').id, name: 'Pan 40', generic: 'Pantoprazole', strength: '40 mg', form: 'Tablet', dose: '1 tablet', frequency: '1-0-0', duration: '5 days', timing: 'before_food', instructions: '', qty: 5 }] })
        c.prescriptionId = r.id
        if (pi !== 1) pharmBill(r, TD)
      }
    }
  })
  {
    const p = others[22]
    const a = appt({ patientId: p.id, doctorId: 'st-umesh', date: TD, time: mm(Math.max(11 * 60, nowMin - 8)), status: 'arrived', type: 'emergency', priority: 'emergency', source: 'walk-in', fee: 600, reason: 'Chest pain, sweating' })
    a.arrivedAt = minsAgo(8)
  }
  const sunilNext = appt({ patientId: 'p-sunil', doctorId: 'st-umesh', date: TD, time: mm(Math.min(19 * 60 + 30, nowMin + 55)), status: 'booked', type: 'followup', source: 'app', createdAt: hoursAgo(30) })
  sunilNext.fee = 200
  { let dd = d(2); if (!workday(dd)) dd = d(3); appt({ patientId: 'p-shanta', doctorId: 'st-umesh', date: dd, time: '11:30', status: 'booked', type: 'followup', source: 'app' }) }
  for (let k = 0; k < 12; k++) { let dd = d(1 + (k % 5)); if (!workday(dd)) dd = addDays(dd, 1); appt({ patientId: others[(k * 3) % others.length].id, doctorId: docs[k % docs.length].id, date: dd, time: `${String(11 + (k % 4)).padStart(2, '0')}:${String((k * 15) % 60).padStart(2, '0')}`, source: k % 2 ? 'app' : 'whatsapp' }) }

  // Laboratory worklist today (incl. a walk-in referred by an outside doctor)
  const labToday = [
    [others[2].id, 'st-umesh', ['lt-cbc', 'lt-rbs'], 'ordered', 'Dr. Umesh Aher'],
    [others[1].id, 'st-umesh', ['lt-fbs', 'lt-ppbs', 'lt-hba1c'], 'sample_collected', 'Dr. Umesh Aher'],
    [others[10].id, 'st-kavita', ['lt-cbc', 'lt-tsh', 'lt-upt'], 'result_entered', 'Dr. Kavita Umesh Aher'],
    [others[9].id, null, ['lt-widal', 'lt-mp'], 'ordered', 'Outside doctor (walk-in)'],
    [others[5].id, 'st-umesh', ['lt-rbs', 'lt-creat'], 'processing', 'Dr. Umesh Aher']
  ]
  labToday.forEach(([patientId, doctorId, tests, status, referredBy], i) => {
    labN++
    const lo = add('labOrders', { id: 'lo-' + labN, orderNo: no('LB', labN), unit: 'lab', patientId, doctorId, referredBy, tests, status, priority: i === 3 ? 'urgent' : 'routine', results: {}, remarks: '', files: [], createdAt: minsAgo(140 - i * 20) })
    if (status !== 'ordered') { lo.sampleId = 'S' + T.replace(/-/g, '').slice(2) + '-' + String(40 + i).padStart(3, '0'); lo.collectedAt = minsAgo(100 - i * 10); lo.collectedBy = 'u-yogita' }
    if (status === 'result_entered') {
      lo.results = { 'lt-cbc': { Haemoglobin: '10.9', 'Total WBC count': '7800', 'Platelet count': '2.6', 'RBC count': '3.9' }, 'lt-tsh': { TSH: '2.1' }, 'lt-upt': { UPT: 'Positive' } }
      lo.enteredBy = 'u-yogita'; lo.enteredAt = minsAgo(30)
    }
    labBill(lo, T, i === 2 ? 300 : true)
  })
  labN++
  add('labOrders', { id: 'lo-' + labN, orderNo: no('LB', labN), unit: 'hospital', patientId: others[22].id, doctorId: 'st-umesh', referredBy: 'Dr. Umesh Aher', tests: ['lt-ecg'], status: 'ordered', priority: 'urgent', results: {}, remarks: '', files: [], createdAt: minsAgo(6) })
  labN++
  const echo = add('labOrders', { id: 'lo-' + labN, orderNo: no('LB', labN), unit: 'hospital', patientId: others[14].id, doctorId: 'st-umesh', referredBy: 'Dr. Umesh Aher', tests: ['lt-echo'], status: 'ordered', priority: 'routine', results: {}, remarks: '', files: [], createdAt: minsAgo(50) })
  labBill(echo, T, true)
  ;[[others[18].id, 'Cetzine 10 (10), ORS (4)', 107], [others[24].id, 'Volini Gel (1)', 145], [others[6].id, 'Shelcal 500 (30)', 213]].forEach(([pid, desc, amt], i) =>
    billFor(pid, [{ type: 'pharmacy', refId: '', desc, qty: 1, rate: amt, discount: 0, taxPct: 0 }], { unit: 'pharmacy', day: T, pay: true, method: i % 2 ? 'upi' : 'cash', by: 'u-pharm2', at: minsAgo(200 - i * 50) }))

  /* ---------- Inpatients ---------- */
  let admN = 60
  const admit = (row) => {
    admN++
    const b = bed(row.bedId); b.status = 'occupied'
    const a = add('admissions', { id: 'ad-' + admN, admNo: 'IP-' + T.slice(2, 4) + '-' + String(admN).padStart(4, '0'), status: 'admitted', notes: [], ...row, createdAt: row.admittedAt })
    b.admissionId = a.id
    return a
  }
  const ad1 = admit({ patientId: others[6].id, doctorId: 'st-umesh', deptId: 'dep-med', bedId: 'bed-gw1A', admittedAt: hoursAgo(50), expectedDischarge: d(1), reason: 'High fever with vomiting, dehydration', diagnosis: 'Acute gastroenteritis with dehydration',
    notes: [{ at: hoursAgo(49), by: 'u-umesh', kind: 'doctor_visit', text: 'Admitted. IV fluids RL 1 L over 6 hours. Inj. Ondansetron 4 mg IV SOS. Monitor intake–output.' }, { at: hoursAgo(26), by: 'u-umesh', kind: 'doctor_visit', text: 'Improving. Vomiting stopped. Start soft diet.' }, { at: hoursAgo(5), by: 'u-nurse1', kind: 'nursing', text: 'Patient comfortable, took soft diet.' }] })
  const ad2 = admit({ patientId: others[13].id, doctorId: 'st-kavita', deptId: 'dep-obgy', bedId: 'bed-sp1', admittedAt: hoursAgo(20), expectedDischarge: d(2), reason: 'Full-term pregnancy – labour pains', diagnosis: 'Normal delivery – mother and baby stable',
    notes: [{ at: hoursAgo(14), by: 'u-kavita', kind: 'doctor_visit', text: 'Normal vaginal delivery, female baby 2.9 kg. Mother stable.' }],
    insurance: { insurer: INSURERS[11], policyNo: 'SAMPLE-POL-3101', preauthStatus: 'approved', preauthAmount: 25000, preauthRef: 'PA-SAMPLE-778', claimStatus: 'none' } })
  const ad3 = admit({ patientId: others[16].id, doctorId: 'st-umesh', deptId: 'dep-icu', bedId: 'bed-icu-1', admittedAt: hoursAgo(30), expectedDischarge: d(4), reason: 'Breathlessness, high blood sugar', diagnosis: 'Diabetic ketoacidosis', emergency: true,
    notes: [{ at: hoursAgo(29), by: 'u-umesh', kind: 'doctor_visit', text: 'Insulin infusion as per protocol. Hourly sugar monitoring. Strict I/O charting.' }],
    insurance: { insurer: INSURERS[0], policyNo: 'SAMPLE-POL-3102', preauthStatus: 'requested', preauthAmount: 60000, claimStatus: 'none' } })
  const ad4 = admit({ patientId: others[20].id, doctorId: 'st-umesh', deptId: 'dep-icu', bedId: 'bed-icu-2', admittedAt: hoursAgo(70), expectedDischarge: d(0), reason: 'Chest pain', diagnosis: 'Acute coronary syndrome – stabilised', notes: [{ at: hoursAgo(44), by: 'u-umesh', kind: 'doctor_visit', text: 'Pain free. ECG stable. Shift to ward tomorrow.' }] })
  admit({ patientId: others[23].id, doctorId: 'st-umesh', deptId: 'dep-med', bedId: 'bed-ss3A', admittedAt: hoursAgo(14), expectedDischarge: d(1), reason: 'High fever, low platelets', diagnosis: 'Dengue fever – under observation', notes: [] })
  admit({ patientId: others[11].id, doctorId: 'st-kavita', deptId: 'dep-obgy', bedId: 'bed-ss5A', admittedAt: hoursAgo(8), expectedDischarge: d(2), reason: 'Planned hysterectomy', diagnosis: 'Fibroid uterus', notes: [] })
  admit({ patientId: others[25].id, doctorId: 'st-umesh', deptId: 'dep-med', bedId: 'bed-sp4', admittedAt: hoursAgo(36), expectedDischarge: d(1), reason: 'Uncontrolled sugar, foot infection', diagnosis: 'Type 2 diabetes with cellulitis (left foot)', notes: [] })
  add('admissions', { id: 'ad-50', admNo: 'IP-' + T.slice(2, 4) + '-0050', patientId: 'p-shanta', doctorId: 'st-umesh', deptId: 'dep-med', bedId: 'bed-ss1A', status: 'discharged', admittedAt: at(d(-120), '12:00'), dischargedAt: at(d(-116), '11:00'), expectedDischarge: d(-116),
    reason: 'Severe knee pain, unable to walk', diagnosis: 'Bilateral osteoarthritis knee – acute flare', notes: [],
    dischargeSummary: { diagnosis: 'Bilateral osteoarthritis knee – acute flare', course: 'Managed with analgesics and physiotherapy. Pain improved, walking with support.', procedures: '', condition: 'Stable', medications: 'Tab. Zerodol SP 1-0-1 × 7 days; Tab. Shelcal 500 1-0-0 × 3 months; Volini gel local application', advice: 'Knee strengthening exercises daily. Avoid squatting. Use walking stick.', followUp: d(-102), preparedBy: 'u-umesh', preparedAt: at(d(-116), '10:00'), final: true }, createdAt: at(d(-120), '12:00') })
  ;[ad1, ad2, ad3, ad4].forEach((a, i) => billFor(a.patientId, [{ type: 'room', refId: a.id, desc: 'Advance deposit – ' + a.admNo, qty: 1, rate: [5000, 10000, 25000, 30000][i], discount: 0, taxPct: 0 }], { day: isoDay(a.admittedAt), at: a.admittedAt, pay: [5000, 10000, 15000, 30000][i], method: i % 2 ? 'card' : 'cash', extra: { admissionId: a.id, deposit: true } }))

  ;[[ad1, [98.8, 84, '118/76', 98]], [ad2, [98.6, 88, '110/70', 99]], [ad3, [98.4, 102, '104/66', 95]], [ad4, [98.6, 78, '130/84', 97]]].forEach(([a, [temp, pulse, bp, spo2]], i) => {
    const [bpSys, bpDia] = bp.split('/').map(Number)
    add('vitals', { id: 'vt-' + i + 'a', patientId: a.patientId, admissionId: a.id, at: hoursAgo(8), by: 'u-nurse1', values: { temp: temp + 0.6, pulse: pulse + 6, bpSys: bpSys + 6, bpDia, spo2: spo2 - 1 }, note: '' })
    add('vitals', { id: 'vt-' + i + 'b', patientId: a.patientId, admissionId: a.id, at: hoursAgo(2), by: 'u-nurse1', values: { temp, pulse, bpSys, bpDia, spo2 }, note: i === 2 ? 'RBS 212 mg% – informed Dr. Umesh Aher' : '' })
  })
  const task = (a, title, due, status = 'pending', assignedTo = 'st-nurse1', fromDoctor = true) => add('nursingTasks', { id: 'nt-' + s.nursingTasks.length, patientId: a.patientId, admissionId: a.id, title, due, status, assignedTo, fromDoctor, createdAt: hoursAgo(10) })
  task(ad1, 'IV fluids RL 500 ml – 12 hourly', minsAgo(-60))
  task(ad1, 'Record intake / output chart', minsAgo(-120), 'pending', 'st-nurse1', false)
  task(ad3, 'Blood sugar check (hourly)', minsAgo(-15))
  task(ad3, 'Inj. Insulin as per sliding scale', minsAgo(-15))
  task(ad2, 'Check mother’s BP & bleeding; baby feeding', minsAgo(30), 'pending', 'st-nurse2')
  task(ad4, 'ECG at 6 pm', minsAgo(-180))
  add('medAdmin', { id: 'ma-1', patientId: ad1.patientId, admissionId: ad1.id, medicine: 'Inj. Ondansetron', dose: '4 mg', route: 'IV', at: hoursAgo(9), by: 'u-nurse1', note: '' })
  add('medAdmin', { id: 'ma-2', patientId: ad3.patientId, admissionId: ad3.id, medicine: 'Inj. Insulin (regular)', dose: '6 IU', route: 'SC', at: hoursAgo(3), by: 'u-nurse1', note: 'RBS 248' })

  /* ---------- Communication ---------- */
  const ann = (row) => add('announcements', { id: 'an-' + s.announcements.length, by: 'u-sanjay', pinned: false, ...row })
  ann({ title: 'Free diabetes & BP check-up camp', body: 'Free blood sugar, BP and ECG screening on Sunday, 11 am – 3 pm at Radhakrishna Hospital, Pimpalgaon Baswant. Diet advice by Dr. Umesh Aher. No appointment needed.', audience: 'patients', kind: 'camp', pinned: true, expiresAt: daysFromNow(6), createdAt: hoursAgo(20) })
  ann({ title: 'OPD timings', body: 'OPD: 11 am – 4 pm and 6 – 8 pm. OPD is closed on Saturday. Emergency, ICU, ambulance, pathology lab and medical store are open 24 hours.', audience: 'patients', kind: 'timing', createdAt: hoursAgo(50) })
  ann({ title: 'Cashless insurance available', body: 'Cashless facility with 23 insurance companies and TPAs (Star Health, ICICI Lombard, HDFC ERGO, TATA AIG, Care and more). Help is also available for the Chief Minister’s medical relief fund. Ask at the reception.', audience: 'patients', kind: 'notice', createdAt: hoursAgo(80) })
  ann({ title: 'Maternity & infertility care', body: 'Dr. Kavita Umesh Aher (M.B.B.S., D.G.O.) – pregnancy care, normal & caesarean delivery, infertility treatment, family planning advice and uterus disorders.', audience: 'all', kind: 'doctor', createdAt: hoursAgo(24 * 9) })
  ann({ title: 'Fire safety drill', body: 'All staff (hospital, medical store and laboratory) to assemble near the parking at 4 pm on Friday for the fire drill.', audience: 'staff', kind: 'notice', expiresAt: daysFromNow(4), createdAt: hoursAgo(10) })

  const TIPS = [
    ['diabetes', '🩸', ['Know your sugar numbers', 'शुगर के आंकड़े जानें', 'साखरेचे आकडे जाणून घ्या'],
      ['Fasting sugar should usually be below 110 mg%. Get HbA1c checked every 3 months if you have diabetes. Walk 30 minutes daily, eat on time, and never stop medicines without asking your doctor.',
        'खाली पेट शुगर आम तौर पर 110 mg% से कम होनी चाहिए. डायबिटीज़ हो तो हर 3 महीने में HbA1c जाँच कराएँ. रोज़ 30 मिनट टहलें, समय पर खाएँ और डॉक्टर से पूछे बिना दवा बंद न करें.',
        'उपाशीपोटी साखर साधारणपणे 110 mg% पेक्षा कमी असावी. मधुमेह असल्यास दर 3 महिन्यांनी HbA1c तपासा. रोज 30 मिनिटे चाला, वेळेवर जेवा आणि डॉक्टरांना विचारल्याशिवाय औषध बंद करू नका.']],
    ['bp', '❤️', ['Chest pain? Don’t wait', 'सीने में दर्द? देर न करें', 'छातीत दुखते? उशीर करू नका'],
      ['Chest pain, sweating or breathlessness can be a heart attack. Come to the hospital immediately – every minute matters. Keep BP and sugar under control and get an ECG after age 40.',
        'सीने में दर्द, पसीना या साँस फूलना हार्ट अटैक हो सकता है. तुरंत अस्पताल आएँ – हर मिनट कीमती है. बीपी और शुगर नियंत्रित रखें और 40 के बाद ईसीजी कराएँ.',
        'छातीत दुखणे, घाम येणे किंवा धाप लागणे हा हृदयविकाराचा झटका असू शकतो. लगेच रुग्णालयात या – प्रत्येक मिनिट महत्त्वाचे आहे. BP व साखर नियंत्रणात ठेवा आणि 40 नंतर ECG करा.']],
    ['seasonal', '🦟', ['Monsoon: prevent dengue & malaria', 'बरसात में डेंगू-मलेरिया से बचाव', 'पावसाळ्यात डेंग्यू-मलेरियापासून बचाव'],
      ['Do not let water collect in coolers, pots or tyres. Use mosquito nets and full sleeves. See a doctor if fever lasts more than 2 days.',
        'कूलर, गमलों या टायरों में पानी जमा न होने दें. मच्छरदानी और पूरी बाँह के कपड़े पहनें. 2 दिन से ज़्यादा बुखार रहे तो डॉक्टर को दिखाएँ.',
        'कूलर, कुंड्या किंवा टायरमध्ये पाणी साचू देऊ नका. मच्छरदाणी आणि पूर्ण बाह्यांचे कपडे वापरा. 2 दिवसांपेक्षा जास्त ताप असल्यास डॉक्टरांना दाखवा.']],
    ['nutrition', '🥗', ['A balanced plate', 'संतुलित थाली', 'संतुलित ताट'],
      ['Fill half the plate with vegetables and salad, a quarter with dal, eggs or paneer, and a quarter with bhakri or rice. Prefer jowar, bajra and nachni.',
        'आधी थाली में सब्ज़ी और सलाद, एक चौथाई में दाल, अंडा या पनीर, और एक चौथाई में भाकरी या चावल रखें. ज्वार, बाजरा और रागी को प्राथमिकता दें.',
        'अर्ध्या ताटात भाज्या व कोशिंबीर, एक चतुर्थांश डाळ, अंडी किंवा पनीर आणि एक चतुर्थांश भाकरी किंवा भात ठेवा. ज्वारी, बाजरी आणि नाचणीला प्राधान्य द्या.']],
    ['women', '🤰', ['Pregnancy: regular check-ups', 'गर्भावस्था: नियमित जाँच', 'गर्भावस्था: नियमित तपासणी'],
      ['Register your pregnancy early. Take iron and folic acid tablets as advised, get BP, Hb and sugar checked at every visit, and plan the delivery in a hospital.',
        'गर्भावस्था का पंजीकरण जल्दी कराएँ. सलाह अनुसार आयरन और फोलिक एसिड की गोलियाँ लें, हर विज़िट पर बीपी, Hb और शुगर जाँचें, और प्रसव अस्पताल में कराएँ.',
        'गर्भधारणेची नोंदणी लवकर करा. सल्ल्यानुसार लोह व फॉलिक अ‍ॅसिडच्या गोळ्या घ्या, प्रत्येक भेटीत BP, Hb व साखर तपासा आणि प्रसूती रुग्णालयातच करा.']],
    ['children', '🧒', ['Complete your child’s vaccinations', 'बच्चे का टीकाकरण पूरा कराएँ', 'मुलांचे लसीकरण पूर्ण करा'],
      ['Follow the vaccination schedule on the card. For diarrhoea give ORS and zinc and continue feeding. Visit a doctor quickly if the child is drowsy or not drinking.',
        'कार्ड पर दिए टीकाकरण कार्यक्रम का पालन करें. दस्त में ORS और ज़िंक दें और खाना जारी रखें. बच्चा सुस्त हो या पानी न पी रहा हो तो तुरंत डॉक्टर को दिखाएँ.',
        'कार्डवरील लसीकरण वेळापत्रक पाळा. जुलाब झाल्यास ORS व झिंक द्या आणि खाणे चालू ठेवा. मूल सुस्त असल्यास किंवा पाणी पीत नसल्यास लगेच डॉक्टरांकडे जा.']]
  ]
  TIPS.forEach(([topic, emoji, [en, hi, mr], [ben, bhi, bmr]], i) => add('healthTips', { id: 'tip-' + topic, topic, emoji, title: { en, hi, mr }, body: { en: ben, hi: bhi, mr: bmr }, status: 'published', reviewedBy: topic === 'women' ? 'st-kavita' : 'st-umesh', reviewedAt: hoursAgo(24 * (10 + i)), createdAt: hoursAgo(24 * (12 + i)) }))
  add('healthTips', { id: 'tip-heat', topic: 'seasonal', emoji: '☀️', title: { en: 'Beat the summer heat', hi: '', mr: '' }, body: { en: 'Drink water every hour, avoid going out between 12 and 4 pm, wear a cap.', hi: '', mr: '' }, status: 'draft', createdAt: hoursAgo(30) })

  const notif = (userId, title, body, link, h = 2, read = false, kind = 'info') => add('notifications', { id: 'nt' + s.notifications.length, userId, title, body, link, read, kind, createdAt: hoursAgo(h) })
  notif('u-patient', 'Appointment confirmed', `Dr. Umesh Aher · Token ${sunilNext.token}`, '/p/appointments', 30, true, 'appointment')
  notif('u-patient', 'Lab report ready', 'Manisha’s CBC and TSH report is ready to view.', '/p/records/reports', 24 * 4, false, 'lab')
  notif('u-umesh', 'Emergency patient waiting', `${others[22].name} – chest pain. Marked as emergency at reception.`, '/s/queue', 0.15, false, 'emergency')
  notif('u-bapuji', 'Report waiting for verification', `${others[10].name} – CBC, TSH, UPT`, '/s/lab?tab=verify', 0.5, false, 'lab')
  notif('u-avinash', 'Low stock: Sorbitrate 5', 'Only 12 left (minimum 50).', '/s/pharmacy/stock', 3, false, 'stock')
  notif('u-sanjay', 'Insurance pre-auth pending', `${others[16].name} – ICU – Star Health`, '/s/ipd', 5, false, 'insurance')

  const msg = (patientId, template, text, h, channel = 'whatsapp', status = 'sent') => add('messages', { id: 'msg' + s.messages.length, patientId, phone: s.patients.find((p) => p.id === patientId).phone, channel, template, lang: s.patients.find((p) => p.id === patientId).lang, text, status, provider: 'demo', createdAt: hoursAgo(h) })
  msg('p-sunil', 'appointment_confirmed', `नमस्कार Sunil Kadam, Dr. Umesh Aher यांच्यासोबत तुमची भेट निश्चित झाली आहे. टोकन ${sunilNext.token}. – Radhakrishna`, 30)
  msg('p-manisha', 'report_ready', 'नमस्कार Manisha Kadam, तुमचा लॅब रिपोर्ट (CBC, TSH) तयार आहे. JeevO ॲपमध्ये पहा किंवा लॅबमधून घ्या. – Radhakrishna', 24 * 4)
  msg(others[3].id, 'appointment_reminder', 'आठवण: उद्या सकाळी 11:30 वाजता Dr. Umesh Aher यांच्यासोबत तुमची भेट आहे. – Radhakrishna', 18, 'sms')

  const fb = (row) => add('feedback', { id: 'fb' + s.feedback.length, status: 'new', ...row })
  fb({ patientId: others[0].id, doctorId: 'st-umesh', ratings: { doctor: 5, reception: 4, waiting: 3, cleanliness: 5, overall: 5 }, comment: 'Doctor explained everything patiently. Thank you!', private: false, kind: 'feedback', status: 'resolved', createdAt: hoursAgo(26) })
  fb({ patientId: others[4].id, doctorId: 'st-umesh', ratings: { doctor: 5, reception: 2, waiting: 2, cleanliness: 4, overall: 3 }, comment: 'Had to wait long in the evening OPD.', private: true, kind: 'complaint', createdAt: hoursAgo(5) })
  fb({ patientId: others[10].id, doctorId: 'st-kavita', ratings: { doctor: 5, reception: 5, waiting: 4, cleanliness: 5, overall: 5 }, comment: 'Very caring during my pregnancy.', private: false, kind: 'feedback', status: 'resolved', response: 'Thank you for your kind words!', respondedBy: 'u-sanjay', createdAt: hoursAgo(70) })

  /* ---------- HR ---------- */
  add('leaves', { id: 'lv1', staffId: 'st-nurse2', from: d(3), to: d(3), type: 'Sick leave', reason: 'Fever', status: 'pending', createdAt: hoursAgo(6) })
  add('leaves', { id: 'lv2', staffId: 'st-pharm2', from: d(8), to: d(9), type: 'Casual leave', reason: 'Family function', status: 'pending', createdAt: hoursAgo(20) })
  add('leaves', { id: 'lv3', staffId: 'st-labtech3', from: d(12), to: d(12), type: 'Casual leave', reason: 'Personal work', status: 'pending', createdAt: hoursAgo(9) })
  s.staff.filter((x) => x.hospitalId === H1).forEach((x, i) => {
    for (let day = -6; day <= 0; day++) {
      const dd = d(day)
      const absent = (i + day) % 11 === 0
      add('attendance', { id: `at-${x.id}-${dd}`, staffId: x.id, date: dd, status: absent ? 'absent' : 'present', in: absent ? '' : `${String(9 + (i % 2)).padStart(2, '0')}:${String(45 + (i % 3) * 5).padStart(2, '0')}`, out: absent || day === 0 ? '' : `${18 + (i % 3)}:${String((i * 7) % 60).padStart(2, '0')}` })
    }
    for (let day = 0; day < 7; day++) add('shifts', { id: `sh-${x.id}-${day}`, staffId: x.id, day: d(day), shift: ['nurse', 'pharmacist', 'lab_tech'].includes(x.role) ? ['morning', 'evening', 'night'][(i + day) % 3] : x.shift || 'morning' })
  })

  /* ---------- Settings & audit ---------- */
  add('settings', { id: 'messaging', value: { whatsappProvider: 'click_to_chat', smsProvider: 'demo', senderId: 'RKHOSP', autoReminders: true, reminderHours: 2, tokenAlertAhead: 3 } })
  add('settings', { id: 'billing', value: { gstEnabled: false, receiptFooter: 'Please bring this file on every visit. Get well soon!', allowPartial: true } })
  add('settings', { id: 'opd', value: { avgConsultMins: 10, allowOnlineBooking: true, bookingDaysAhead: 14, registrationFee: 50, showWaitTime: true } })
  add('settings', { id: 'insurers', value: INSURERS })
  add('settings', { id: 'unit.hospital', value: { name: 'Radhakrishna Hospital', owner: 'Sanjay Aher', footer: 'OPD: 11 am – 4 pm and 6 – 8 pm · Saturday closed' } })
  add('settings', { id: 'unit.pharmacy', value: { name: 'Radhakrishna Medical (24×7)', owner: 'Avinash Aher', drugLicence: 'DL No. (placeholder)', gstin: 'GSTIN (placeholder)', phone: '(02550) 252020', footer: 'Medicines once sold are taken back only as per store policy.' } })
  add('settings', { id: 'unit.lab', value: { name: 'Radhakrushna Clinical Laboratory', owner: 'Bapuji Dhomse', address: 'Radhakrushna Hospital, Chinchkhed Chaufuli, Pimpalgaon (B), Tal. Niphad, Dist. Nashik', phone: '(02550) 252020 · 9423092573', email: 'labradhakrushna@gmail.com',
    signatories: [{ name: 'Mr. Bapuji Dhomse', qual: 'B.Sc. (Micro) C.M.L.T., D.M.L.T.', reg: 'Reg. No. MCVC/MLT/0039/2024' }, { name: 'Mrs. Yogita Dhomse', qual: 'B.Sc. (Micro) D.M.L.T.', reg: 'Reg. No. D/MLT/0351/2021' }],
    footer: 'Identity given by patient. Results relate only to the sample tested; please correlate clinically.' } })
  add('settings', { id: 'seedDay', value: T })
  add('settings', { id: 'messaging', value: { whatsappProvider: 'click_to_chat', smsProvider: 'demo', autoReminders: true, reminderHours: 2, tokenAlertAhead: 3 } }, H2)
  const audit = (userId, unit, action, entity, entityId, summary, h) => add('audit', { id: 'au' + s.audit.length, userId, userName: s.users.find((u) => u.id === userId)?.name, unit, action, entity, entityId, summary, at: hoursAgo(h), createdAt: hoursAgo(h) })
  audit('u-umesh', 'hospital', 'finalise', 'prescriptions', 'rx-201', 'Prescription finalised', 24 * 28)
  audit('u-bapuji', 'lab', 'verify', 'labOrders', 'lo-151', 'Lab report verified', 24 * 4)
  audit('u-recep1', 'hospital', 'create', 'patients', others[29].id, 'Quick registration (details pending)', 26)
  audit('u-sanjay', 'hospital', 'update', 'services', 'svc-ot', 'Price changed ₹4,500 → ₹5,000', 50)
  audit('u-avinash', 'pharmacy', 'stock_in', 'medicines', 'med-1', '+300 (batch DL2502, exp 2027-11)', 30)

  return s
}
