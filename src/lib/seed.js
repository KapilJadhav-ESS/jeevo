// Sample data for the offline demo: one multispecialty hospital in Nashik with
// a full day of activity, plus a small clinic in Satara (to show that every
// hospital's data is kept separate). Dates are generated relative to today.
import { isoDay, addDays, minsAgo, hoursAgo, daysFromNow } from './utils'

const H1 = 'h-sanjeevani'
const H2 = 'h-arogya'
const COLORS = ['#0E7C74', '#2563EB', '#9333EA', '#DB2777', '#EA580C', '#0891B2', '#4F46E5', '#16A34A', '#B45309']

export function buildSeed() {
  const T = isoDay(new Date())
  const d = (n) => addDays(T, n)
  const at = (day, time) => new Date(`${day}T${time}:00`).toISOString()
  const s = {
    hospitals: [], departments: [], users: [], staff: [], patients: [], appointments: [], consultations: [],
    prescriptions: [], medicines: [], labTests: [], labOrders: [], services: [], bills: [], payments: [],
    wards: [], beds: [], admissions: [], vitals: [], nursingTasks: [], medAdmin: [], announcements: [],
    healthTips: [], notifications: [], messages: [], feedback: [], leaves: [], attendance: [], shifts: [],
    audit: [], settings: []
  }
  const add = (col, row, h = H1) => { const r = { hospitalId: h, createdAt: row.createdAt || hoursAgo(24 * 30), ...row }; s[col].push(r); return r }

  /* ---------- Hospitals (tenants) ---------- */
  s.hospitals.push(
    {
      id: H1, code: 'sanjeevani', pidPrefix: 'SJV', name: 'Sanjeevani Multispeciality Hospital', shortName: 'Sanjeevani', type: 'Multispecialty hospital',
      tagline: 'Care close to home', address: 'Plot 12, Gangapur Road, near CBS', city: 'Nashik', state: 'Maharashtra', pin: '422002',
      phone: '0253 2571234', whatsapp: '9822012345', emergencyPhone: '0253 2575555', ambulancePhone: '108', email: 'care@sanjeevani.example',
      regNo: 'MH/NSK/HOSP/2014/118', gstin: '27AAACS1234F1Z5', mapUrl: 'https://maps.google.com/?q=Gangapur+Road+Nashik',
      timings: 'OPD: Mon–Sat 9:30 am – 1:30 pm, 5:00 – 8:30 pm · Emergency 24×7', plan: 'growth', status: 'active', color: '#0E7C74', createdAt: hoursAgo(24 * 400)
    },
    {
      id: H2, code: 'arogya', pidPrefix: 'ARG', name: 'Arogya Family Clinic', shortName: 'Arogya', type: 'General physician clinic', tagline: 'Your family doctor',
      address: 'Shop 4, Rajwada Chowk', city: 'Satara', state: 'Maharashtra', pin: '415002', phone: '02162 230456', whatsapp: '9890011122',
      emergencyPhone: '9890011122', ambulancePhone: '108', email: 'arogya@clinic.example', regNo: 'MH/STR/CLN/2019/44', mapUrl: 'https://maps.google.com/?q=Rajwada+Satara',
      timings: 'Mon–Sat 10 am – 2 pm, 6 – 9 pm', plan: 'starter', status: 'active', color: '#2563EB', createdAt: hoursAgo(24 * 120)
    }
  )

  /* ---------- Departments ---------- */
  const DEPTS = [
    ['dep-gen', 'General Medicine', '🩺'], ['dep-ped', 'Paediatrics', '🧸'], ['dep-ortho', 'Orthopaedics', '🦴'],
    ['dep-gyn', 'Obstetrics & Gynaecology', '🤰'], ['dep-dental', 'Dental', '🦷'], ['dep-path', 'Pathology', '🧪'],
    ['dep-rad', 'Radiology', '🩻'], ['dep-emer', 'Emergency', '🚑']
  ]
  DEPTS.forEach(([id, name, icon]) => add('departments', { id, name, icon, active: true }))
  add('departments', { id: 'dep-a-gen', name: 'General Medicine', icon: '🩺', active: true }, H2)

  /* ---------- Staff & logins ---------- */
  const morningEvening = { days: [1, 2, 3, 4, 5, 6], sessions: [{ start: '09:30', end: '13:30' }, { start: '17:00', end: '20:30' }], slotMins: 10, maxPerDay: 50, online: true }
  const morningOnly = { days: [1, 2, 3, 4, 5, 6], sessions: [{ start: '10:00', end: '14:00' }], slotMins: 15, maxPerDay: 20, online: false }
  const STAFF = [
    // id, name, role, designation, dept, phone, qualification, regNo, fee, availability, extra
    ['st-anjali', 'Dr. Anjali Deshmukh', 'doctor', 'Consultant Physician', 'dep-gen', '9822000001', 'MBBS, MD (Medicine)', 'MMC 2009/04/1123', 400, morningEvening, { room: '101', experience: 15, languages: ['English', 'Hindi', 'Marathi'] }],
    ['st-vikram', 'Dr. Vikram Kulkarni', 'doctor', 'Paediatrician', 'dep-ped', '9822000002', 'MBBS, DCH, DNB (Paed)', 'MMC 2011/06/2210', 400, { ...morningEvening, slotMins: 12 }, { room: '102', experience: 12, languages: ['English', 'Marathi'] }],
    ['st-sameer', 'Dr. Sameer Joshi', 'doctor', 'Orthopaedic Surgeon', 'dep-ortho', '9822000003', 'MBBS, MS (Ortho)', 'MMC 2013/02/3301', 500, { days: [1, 2, 3, 4, 5, 6], sessions: [{ start: '11:00', end: '14:00' }, { start: '18:00', end: '20:00' }], slotMins: 15, maxPerDay: 25, online: true }, { room: '104', experience: 10, languages: ['English', 'Hindi', 'Marathi'] }],
    ['st-neha', 'Dr. Neha Bhosale', 'doctor', 'Obstetrician & Gynaecologist', 'dep-gyn', '9822000004', 'MBBS, MS (OBGY)', 'MMC 2012/08/2876', 500, { days: [1, 2, 3, 4, 5, 6], sessions: [{ start: '10:00', end: '13:00' }], slotMins: 15, maxPerDay: 15, online: true }, { room: '201', experience: 11, languages: ['English', 'Hindi', 'Marathi'] }],
    ['st-imran', 'Dr. Imran Shaikh', 'doctor', 'Dental Surgeon', 'dep-dental', '9822000005', 'BDS, MDS (Endodontics)', 'MSDC A-11872', 300, { days: [1, 2, 3, 4, 5, 6], sessions: [{ start: '17:00', end: '21:00' }], slotMins: 20, maxPerDay: 12, online: false }, { room: '105', experience: 8, languages: ['English', 'Hindi'] }],
    ['st-pooja', 'Dr. Pooja Agarwal', 'doctor', 'Consultant Pathologist', 'dep-path', '9822000006', 'MBBS, MD (Pathology)', 'MMC 2010/11/1980', 0, { days: [1, 2, 3, 4, 5, 6], sessions: [{ start: '09:00', end: '17:00' }], slotMins: 15, maxPerDay: 0, online: false }, { experience: 14, canVerifyLab: true, noOpd: true }],
    ['st-suresh', 'Dr. Suresh Kale', 'admin', 'Medical Director', 'dep-gen', '9822000010', 'MBBS, MHA', 'MMC 1998/03/0456', 0, null, {}],
    ['st-kavita', 'Kavita More', 'receptionist', 'Front Desk Executive', null, '9822000011', 'B.Com', '', 0, null, { shift: 'morning' }],
    ['st-mary', 'Mary Fernandes', 'nurse', 'Staff Nurse (In-charge)', 'dep-gen', '9822000012', 'GNM, B.Sc Nursing', 'MNC 54321', 0, null, { shift: 'morning' }],
    ['st-rekha', 'Rekha Gaikwad', 'nurse', 'Staff Nurse', 'dep-ped', '9822000016', 'GNM', 'MNC 61200', 0, null, { shift: 'evening' }],
    ['st-rahul', 'Rahul Jain', 'pharmacist', 'Pharmacist', null, '9822000013', 'B.Pharm', 'MSPC 77812', 0, null, { shift: 'morning' }],
    ['st-sachin', 'Sachin Pawar', 'lab_tech', 'Lab Technician', 'dep-path', '9822000014', 'DMLT', '', 0, null, { shift: 'morning', canVerifyLab: false }],
    ['st-ganesh', 'Ganesh Shinde', 'receptionist', 'Billing Executive', null, '9822000015', 'B.A.', '', 0, null, { shift: 'evening' }]
  ]
  STAFF.forEach(([id, name, role, designation, deptId, phone, qualification, regNo, fee, availability, extra], i) => {
    const uidv = 'u-' + id.slice(3)
    add('staff', { id, userId: uidv, name, role, designation, deptId, phone, email: id.slice(3) + '@sanjeevani.example', qualification, regNo, regCouncil: regNo ? regNo.split(' ')[0] : '', fee, followUpFee: Math.round(fee / 2), availability, active: true, joinedOn: d(-400 + i * 20), shift: 'morning', color: COLORS[i % COLORS.length], ...extra, createdAt: hoursAgo(24 * 380) })
    add('users', { id: uidv, name, phone, role, staffId: id, status: 'active', color: COLORS[i % COLORS.length], createdAt: hoursAgo(24 * 380) })
  })
  // Clinic in Satara (separate tenant)
  add('staff', { id: 'st-a-milind', userId: 'u-a-milind', name: 'Dr. Milind Jadhav', role: 'doctor', designation: 'Family Physician', deptId: 'dep-a-gen', phone: '9890011122', qualification: 'MBBS', regNo: 'MMC 2005/01/0099', fee: 250, followUpFee: 150, availability: { days: [1, 2, 3, 4, 5, 6], sessions: [{ start: '10:00', end: '14:00' }, { start: '18:00', end: '21:00' }], slotMins: 10, maxPerDay: 40, online: false }, active: true, color: '#2563EB' }, H2)
  add('users', { id: 'u-a-milind', name: 'Dr. Milind Jadhav', phone: '9890011122', role: 'admin', staffId: 'st-a-milind', status: 'active', color: '#2563EB' }, H2)
  // Platform owner (not tied to one hospital)
  s.users.push({ id: 'u-super', hospitalId: null, name: 'JeevO Platform Admin', phone: '9000000000', role: 'super_admin', status: 'active', color: '#0F172A', createdAt: hoursAgo(24 * 500) })

  /* ---------- Patients ---------- */
  const P = []
  let pidN = 1040
  const pat = (row, h = H1) => {
    pidN++
    const r = add('patients', {
      id: 'p-' + pidN, pid: (h === H1 ? 'SJV-' : 'ARG-') + String(pidN).padStart(6, '0'), gender: 'male', lang: 'mr', city: h === H1 ? 'Nashik' : 'Satara', pin: h === H1 ? '422002' : '415002',
      consent: { treatment: true, whatsapp: true, sms: true, at: hoursAgo(24 * 200) }, vaccinations: [], allergies: '', conditions: '', bloodGroup: '', relation: 'self', createdAt: hoursAgo(24 * (30 + pidN % 200)), ...row
    }, h)
    P.push(r)
    return r
  }
  // The demo patient family
  const ramesh = pat({ id: 'p-ramesh', name: 'Ramesh Patil', dob: '1978-04-12', phone: '9876543210', altPhone: '9423012345', address: 'Flat 6, Shivneri Apartments, College Road', bloodGroup: 'B+', allergies: 'Penicillin', conditions: 'Type 2 diabetes, Hypertension', emergencyName: 'Sunita Patil (wife)', emergencyPhone: '9876543211', userId: 'u-patient', familyId: 'p-ramesh', lang: 'mr' })
  pat({ id: 'p-sunita', name: 'Sunita Patil', dob: '1982-09-03', gender: 'female', phone: '9876543211', address: ramesh.address, bloodGroup: 'O+', familyId: 'p-ramesh', relation: 'spouse', emergencyName: 'Ramesh Patil', emergencyPhone: '9876543210' })
  pat({ id: 'p-aarav', name: 'Aarav Patil', dob: '2018-01-22', phone: '9876543210', address: ramesh.address, bloodGroup: 'B+', familyId: 'p-ramesh', relation: 'child', emergencyName: 'Ramesh Patil', emergencyPhone: '9876543210', vaccinations: [
    { name: 'BCG', date: '2018-01-23' }, { name: 'OPV 0', date: '2018-01-23' }, { name: 'Hepatitis B – 1', date: '2018-01-23' }, { name: 'Pentavalent – 1', date: '2018-03-05' },
    { name: 'MMR – 1', date: '2018-10-25' }, { name: 'Typhoid conjugate', date: '2019-01-28' }, { name: 'DPT booster – 2', date: '2023-02-02' }
  ] })
  pat({ id: 'p-shalini', name: 'Shalini Patil', dob: '1951-06-15', gender: 'female', phone: '9876543210', address: ramesh.address, conditions: 'Osteoarthritis (knees)', familyId: 'p-ramesh', relation: 'parent', emergencyName: 'Ramesh Patil', emergencyPhone: '9876543210' })

  const NAMES = [
    ['Sanjay Wagh', 'male', 1969], ['Meena Kshirsagar', 'female', 1985], ['Arjun Thakur', 'male', 1995], ['Fatima Sayyed', 'female', 1990], ['Ganesh Jadhav', 'male', 1958],
    ['Priya Nair', 'female', 1993], ['Vitthal Shinde', 'male', 1947], ['Kiran Bagul', 'female', 1988], ['Rohit Sonawane', 'male', 2001], ['Lata Gholap', 'female', 1966],
    ['Mohammed Pathan', 'male', 1975], ['Anita Chavan', 'female', 1979], ['Yash Ahire', 'male', 2016], ['Savita Pagar', 'female', 1972], ['Prakash Deore', 'male', 1963],
    ['Neelam Gupta', 'female', 1997], ['Dattatray Kale', 'male', 1955], ['Swati Nikam', 'female', 1991], ['Ishaan Borse', 'male', 2020], ['Rukhsana Khan', 'female', 1984],
    ['Balasaheb Pawar', 'male', 1950], ['Komal Bhamre', 'female', 1999], ['Tushar Mahajan', 'male', 1987], ['Sakshi Dhage', 'female', 2012], ['Harish Tiwari', 'male', 1971],
    ['Jyoti Salunke', 'female', 1983], ['Aniket More', 'male', 1998], ['Pallavi Kadam', 'female', 1994], ['Raju Gaikwad', 'male', 1968], ['Ashwini Pingle', 'female', 1989]
  ]
  const CITY = ['College Road', 'Panchavati', 'Indira Nagar', 'Cidco', 'Satpur', 'Nashik Road', 'Gangapur Road', 'Dwarka', 'Mhasrul', 'Adgaon']
  const BG = ['A+', 'B+', 'O+', 'AB+', 'O-', 'B-', '', '']
  NAMES.forEach(([name, gender, y], i) => pat({
    name, gender, dob: `${y}-${String((i % 12) + 1).padStart(2, '0')}-${String((i * 3) % 27 + 1).padStart(2, '0')}`,
    phone: '98' + String(22100000 + i * 7919).slice(0, 8), address: `${10 + i}, ${CITY[i % CITY.length]}`, bloodGroup: BG[i % BG.length],
    lang: ['mr', 'hi', 'en', 'hi', 'mr'][i % 5], conditions: i % 6 === 0 ? 'Hypertension' : i % 7 === 0 ? 'Asthma' : '', allergies: i % 9 === 0 ? 'Sulfa drugs' : '',
    consent: { treatment: true, whatsapp: i % 4 !== 3, sms: true, at: hoursAgo(24 * 100) }, incomplete: i === 28
  }))
  const others = P.slice(4)
  // Satara clinic patients
  pat({ name: 'Shankar Mane', gender: 'male', dob: '1960-02-02', phone: '9890123456', address: 'Shahupuri' }, H2)
  pat({ name: 'Vaishali Yadav', gender: 'female', dob: '1986-07-19', phone: '9890123457', address: 'Sadar Bazar' }, H2)
  add('users', { id: 'u-patient', name: 'Ramesh Patil', phone: '9876543210', role: 'patient', patientId: 'p-ramesh', status: 'active', color: '#0E7C74', createdAt: hoursAgo(24 * 200) })

  /* ---------- Catalogues ---------- */
  const MEDS = [
    // name, generic, strength, form, manufacturer, category, mrp per unit, min, batches [batch, expiry YYYY-MM, qty]
    ['Dolo 650', 'Paracetamol', '650 mg', 'Tablet', 'Micro Labs', 'Analgesic', 2.1, 100, [['DL2411', '2027-06', 420], ['DL2502', '2027-11', 300]]],
    ['Crocin Advance', 'Paracetamol', '500 mg', 'Tablet', 'GSK', 'Analgesic', 1.8, 50, [['CR2408', '2026-12', 60]]],
    ['Augmentin 625 Duo', 'Amoxicillin + Clavulanic acid', '625 mg', 'Tablet', 'GSK', 'Antibiotic', 20.5, 40, [['AG2409', '2027-02', 90]]],
    ['Azee 500', 'Azithromycin', '500 mg', 'Tablet', 'Cipla', 'Antibiotic', 23.8, 30, [['AZ2410', '2027-04', 45]]],
    ['Glycomet GP 1', 'Metformin + Glimepiride', '500 mg / 1 mg', 'Tablet', 'USV', 'Antidiabetic', 6.2, 100, [['GG2405', '2026-11', 25], ['GG2501', '2027-09', 300]]],
    ['Glycomet 500 SR', 'Metformin', '500 mg', 'Tablet', 'USV', 'Antidiabetic', 2.4, 100, [['GM2412', '2027-08', 350]]],
    ['Telma 40', 'Telmisartan', '40 mg', 'Tablet', 'Glenmark', 'Antihypertensive', 8.9, 60, [['TL2407', '2027-01', 180]]],
    ['Amlong 5', 'Amlodipine', '5 mg', 'Tablet', 'Micro Labs', 'Antihypertensive', 3.1, 60, [['AM2403', '2026-10', 40], ['AM2502', '2028-01', 200]]],
    ['Pan 40', 'Pantoprazole', '40 mg', 'Tablet', 'Alkem', 'Antacid', 7.6, 80, [['PN2411', '2027-07', 260]]],
    ['Rantac 150', 'Ranitidine', '150 mg', 'Tablet', 'J B Chemicals', 'Antacid', 1.2, 50, [['RT2309', '2026-11', 30]]],
    ['Cetzine 10', 'Cetirizine', '10 mg', 'Tablet', 'Dr. Reddy’s', 'Antihistamine', 1.9, 60, [['CZ2408', '2027-05', 140]]],
    ['Montair LC', 'Montelukast + Levocetirizine', '10 mg / 5 mg', 'Tablet', 'Cipla', 'Antiallergic', 18.2, 30, [['MT2410', '2027-03', 12]]],
    ['Asthalin Inhaler', 'Salbutamol', '100 mcg', 'Inhaler', 'Cipla', 'Bronchodilator', 155, 5, [['AS2406', '2027-06', 9]]],
    ['Calpol Syrup', 'Paracetamol', '250 mg/5 ml', 'Syrup', 'GSK', 'Paediatric', 48, 10, [['CP2407', '2026-12', 18]]],
    ['Ondem 4', 'Ondansetron', '4 mg', 'Tablet', 'Alkem', 'Antiemetic', 5.5, 30, [['ON2405', '2026-12', 0]]],
    ['ORS (Electral)', 'Oral rehydration salts', '21.8 g', 'Sachet', 'FDC', 'Rehydration', 22, 40, [['EL2410', '2027-10', 120]]],
    ['Shelcal 500', 'Calcium + Vitamin D3', '500 mg', 'Tablet', 'Torrent', 'Supplement', 7.1, 60, [['SC2411', '2028-02', 240]]],
    ['Becosules', 'Vitamin B-complex', '—', 'Capsule', 'Pfizer', 'Supplement', 3.6, 60, [['BC2412', '2027-12', 300]]],
    ['Zerodol SP', 'Aceclofenac + Paracetamol + Serratiopeptidase', '100/325/15 mg', 'Tablet', 'Ipca', 'Analgesic', 10.8, 50, [['ZS2408', '2027-02', 160]]],
    ['Volini Gel', 'Diclofenac', '30 g', 'Gel', 'Sun Pharma', 'Topical', 145, 5, [['VG2409', '2027-09', 14]]],
    ['Folvite 5', 'Folic acid', '5 mg', 'Tablet', 'Pfizer', 'Supplement', 1.4, 60, [['FV2410', '2028-03', 400]]],
    ['Ferium XT', 'Ferrous ascorbate + Folic acid', '100 mg', 'Tablet', 'Emcure', 'Haematinic', 15.9, 40, [['FX2407', '2027-04', 110]]],
    ['Metrogyl 400', 'Metronidazole', '400 mg', 'Tablet', 'J B Chemicals', 'Antibiotic', 1.7, 40, [['MG2401', '2025-12', 35], ['MG2502', '2027-11', 80]]],
    ['Betadine Gargle', 'Povidone iodine', '2% w/v', 'Solution', 'Win-Medicare', 'Antiseptic', 120, 5, [['BG2405', '2027-05', 11]]],
    ['Ibugesic Plus Suspension', 'Ibuprofen + Paracetamol', '100/162.5 mg per 5 ml', 'Syrup', 'Cipla', 'Paediatric', 42, 10, [['IB2410', '2027-03', 6]]],
    ['Insulin Mixtard 30/70', 'Human insulin (biphasic)', '40 IU/ml', 'Injection', 'Novo Nordisk', 'Antidiabetic', 165, 5, [['IN2411', '2026-12', 8]]],
    ['Ecosprin 75', 'Aspirin', '75 mg', 'Tablet', 'USV', 'Antiplatelet', 0.6, 100, [['EC2412', '2028-01', 500]]],
    ['Atorva 10', 'Atorvastatin', '10 mg', 'Tablet', 'Zydus', 'Lipid lowering', 6.4, 60, [['AT2409', '2027-08', 210]]],
    ['Clohex Mouthwash', 'Chlorhexidine', '0.2%', 'Solution', 'Dr. Reddy’s', 'Dental', 98, 5, [['CH2404', '2026-11', 4]]],
    ['Ciplox Eye Drops', 'Ciprofloxacin', '0.3%', 'Drops', 'Cipla', 'Ophthalmic', 18, 10, [['CE2408', '2027-02', 25]]]
  ]
  MEDS.forEach(([name, generic, strength, form, manufacturer, category, mrp, minStock, batches], i) => add('medicines', {
    id: 'med-' + (i + 1), name, generic, strength, form, manufacturer, category, mrp, gst: 12, minStock, barcode: '890' + String(1000000000 + i * 7331).slice(0, 10), active: true,
    batches: batches.map(([batch, expiry, qty]) => ({ batch, expiry, qty, purchase: Math.round(mrp * 0.72 * 100) / 100, mrp }))
  }))
  add('medicines', { id: 'med-a1', name: 'Dolo 650', generic: 'Paracetamol', strength: '650 mg', form: 'Tablet', manufacturer: 'Micro Labs', category: 'Analgesic', mrp: 2.1, gst: 12, minStock: 50, active: true, batches: [{ batch: 'DL2499', expiry: '2027-03', qty: 150, purchase: 1.5, mrp: 2.1 }] }, H2)

  const TESTS = [
    ['CBC', 'Complete Blood Count (CBC)', 'Blood', 'EDTA blood', 300, 6, [['Haemoglobin', 'g/dL', 12, 16], ['Total WBC count', '/µL', 4000, 11000], ['Platelet count', 'lakh/µL', 1.5, 4.5], ['RBC count', 'million/µL', 4.0, 5.5], ['PCV', '%', 36, 46]]],
    ['FBS', 'Blood Sugar – Fasting', 'Blood', 'Fluoride plasma', 80, 2, [['Glucose (fasting)', 'mg/dL', 70, 100]]],
    ['PPBS', 'Blood Sugar – Post Prandial', 'Blood', 'Fluoride plasma', 80, 2, [['Glucose (PP)', 'mg/dL', 70, 140]]],
    ['HBA1C', 'HbA1c (Glycated Haemoglobin)', 'Blood', 'EDTA blood', 450, 24, [['HbA1c', '%', 4, 5.6]]],
    ['LIPID', 'Lipid Profile', 'Blood', 'Serum', 600, 12, [['Total cholesterol', 'mg/dL', 0, 200], ['Triglycerides', 'mg/dL', 0, 150], ['HDL cholesterol', 'mg/dL', 40, 60], ['LDL cholesterol', 'mg/dL', 0, 100]]],
    ['LFT', 'Liver Function Test (LFT)', 'Blood', 'Serum', 700, 12, [['Total bilirubin', 'mg/dL', 0.2, 1.2], ['SGOT (AST)', 'U/L', 0, 40], ['SGPT (ALT)', 'U/L', 0, 41], ['Alkaline phosphatase', 'U/L', 44, 147]]],
    ['KFT', 'Kidney Function Test (KFT)', 'Blood', 'Serum', 650, 12, [['Urea', 'mg/dL', 15, 40], ['Creatinine', 'mg/dL', 0.6, 1.2], ['Uric acid', 'mg/dL', 3.5, 7.2]]],
    ['TSH', 'Thyroid Stimulating Hormone (TSH)', 'Blood', 'Serum', 350, 24, [['TSH', 'µIU/mL', 0.4, 4.5]]],
    ['DENGUE', 'Dengue NS1 Antigen', 'Blood', 'Serum', 600, 6, [['NS1 antigen', '', null, null, 'Negative']]],
    ['WIDAL', 'Widal Test', 'Blood', 'Serum', 250, 6, [['S. typhi O', 'titre', null, null, '< 1:80'], ['S. typhi H', 'titre', null, null, '< 1:160']]],
    ['MP', 'Malaria Parasite (Rapid)', 'Blood', 'EDTA blood', 300, 2, [['P. vivax / P. falciparum', '', null, null, 'Not detected']]],
    ['URINE', 'Urine Routine & Microscopy', 'Urine', 'Urine', 150, 4, [['Colour', '', null, null, 'Pale yellow'], ['Protein', '', null, null, 'Nil'], ['Sugar', '', null, null, 'Nil'], ['Pus cells', '/hpf', 0, 5]]],
    ['XRCHEST', 'X-Ray Chest PA View', 'X-Ray', 'Patient', 400, 4, [['Impression', '', null, null, '']]],
    ['XRKNEE', 'X-Ray Knee AP/Lateral', 'X-Ray', 'Patient', 500, 4, [['Impression', '', null, null, '']]],
    ['ECG', 'ECG (12-lead)', 'ECG', 'Patient', 250, 1, [['Impression', '', null, null, 'Normal sinus rhythm']]],
    ['USGABD', 'Ultrasound – Abdomen & Pelvis', 'Ultrasound', 'Patient', 1200, 6, [['Impression', '', null, null, '']]],
    ['USGOBS', 'Ultrasound – Obstetric', 'Ultrasound', 'Patient', 1400, 6, [['Impression', '', null, null, '']]],
    ['VITD', 'Vitamin D (25-OH)', 'Blood', 'Serum', 1200, 48, [['25-OH Vitamin D', 'ng/mL', 30, 100]]],
    ['VITB12', 'Vitamin B12', 'Blood', 'Serum', 900, 48, [['Vitamin B12', 'pg/mL', 200, 900]]],
    ['CRP', 'C-Reactive Protein (CRP)', 'Blood', 'Serum', 450, 6, [['CRP', 'mg/L', 0, 6]]]
  ]
  TESTS.forEach(([code, name, category, sample, price, tat, params]) => add('labTests', {
    id: 'lt-' + code.toLowerCase(), code, name, category, sample, price, tat, active: true,
    params: params.map(([pname, unit, low, high, normal]) => ({ name: pname, unit, low, high, normal: normal || '' }))
  }))

  const SERVICES = [
    ['svc-reg', 'Registration / file charges', 'Registration', 50], ['svc-dress', 'Dressing (small)', 'Procedure', 150], ['svc-inj', 'Injection charges', 'Procedure', 50],
    ['svc-neb', 'Nebulisation', 'Procedure', 150], ['svc-suture', 'Suturing (minor)', 'Procedure', 600], ['svc-plaster', 'Plaster application', 'Procedure', 1500],
    ['svc-scaling', 'Dental scaling & polishing', 'Dental', 800], ['svc-rct', 'Root canal treatment (per tooth)', 'Dental', 3500], ['svc-ext', 'Tooth extraction', 'Dental', 600],
    ['svc-iv', 'IV fluid administration', 'Procedure', 300], ['svc-er', 'Emergency consultation', 'Consultation', 600], ['svc-amb', 'Ambulance (within city)', 'Other', 800],
    ['svc-nursing', 'Nursing charges (per day)', 'Room', 400], ['svc-visit', 'Doctor visit (inpatient)', 'Consultation', 500]
  ]
  SERVICES.forEach(([id, name, category, price]) => add('services', { id, name, category, price, gst: 0, active: true }))

  /* ---------- Wards & beds ---------- */
  const WARDS = [['w-gen-m', 'General Ward (Male)', 'General', 1, 800, 8, 'GM'], ['w-gen-f', 'General Ward (Female)', 'General', 1, 800, 8, 'GF'], ['w-semi', 'Semi-Private', 'Semi-private', 2, 1500, 4, 'SP'], ['w-pvt', 'Private Rooms', 'Private', 2, 2500, 4, 'PR'], ['w-icu', 'ICU', 'ICU', 2, 5000, 4, 'ICU'], ['w-er', 'Emergency / Observation', 'Emergency', 0, 1000, 3, 'ER']]
  WARDS.forEach(([id, name, type, floor, dailyRate, n, pre]) => {
    add('wards', { id, name, type, floor, dailyRate })
    for (let i = 1; i <= n; i++) add('beds', { id: `bed-${pre}-${i}`, wardId: id, label: `${pre}-${String(i).padStart(2, '0')}`, status: 'available' })
  })
  const bed = (id) => s.beds.find((b) => b.id === id)
  bed('bed-GM-3').status = 'maintenance'
  bed('bed-PR-4').status = 'reserved'
  bed('bed-ICU-4').status = 'maintenance'

  /* ---------- Appointments (past, today, upcoming) ---------- */
  const docs = s.staff.filter((x) => x.role === 'doctor' && !x.noOpd && x.hospitalId === H1)
  let apN = 300, rxN = 200, labN = 150, billN = 900, rcN = 700, conN = 400
  const no = (pre, n, day = T) => `${pre}-${day.slice(2, 4)}${day.slice(5, 7)}-${String(n).padStart(4, '0')}`
  const tokens = {}
  const appt = (row) => {
    apN++
    const doc = s.staff.find((x) => x.id === row.doctorId)
    const key = row.doctorId + row.date
    tokens[key] = (tokens[key] || 0) + 1
    return add('appointments', {
      id: 'ap-' + apN, apptNo: no('AP', apN, row.date), deptId: doc.deptId, type: 'general', token: tokens[key], fee: doc.fee, status: 'booked', priority: 'normal', source: 'reception',
      createdAt: at(addDays(row.date, -1), '18:00'), ...row
    })
  }
  const billFor = (patientId, items, opts = {}) => {
    billN++
    const subtotal = items.reduce((a, i) => a + i.qty * i.rate, 0)
    const discount = items.reduce((a, i) => a + (i.discount || 0), 0)
    const tax = items.reduce((a, i) => a + Math.round(((i.qty * i.rate - (i.discount || 0)) * (i.taxPct || 0)) / 100 * 100) / 100, 0)
    const total = Math.round((subtotal - discount + tax) * 100) / 100
    const b = add('bills', { id: 'bl-' + billN, billNo: no('BL', billN, opts.day || T), patientId, date: opts.day || T, items, subtotal, discount, tax, total, paid: 0, refunded: 0, status: 'unpaid', createdBy: opts.by || 'u-kavita', createdAt: opts.at || at(opts.day || T, '10:00'), ...opts.extra })
    if (opts.pay) {
      const amt = opts.pay === true ? total : opts.pay
      rcN++
      add('payments', { id: 'pm-' + rcN, receiptNo: no('RC', rcN, opts.day || T), billId: b.id, patientId, amount: amt, kind: 'payment', method: opts.method || 'upi', ref: opts.method === 'cash' ? '' : 'UPI' + (rcN * 7919), by: opts.by || 'u-kavita', at: opts.at || at(opts.day || T, '10:05'), createdAt: opts.at || at(opts.day || T, '10:05') })
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

  // History: last 45 days of completed OPD visits (for reports & charts)
  for (let day = -45; day <= -1; day++) {
    const dd = d(day)
    const wd = new Date(dd + 'T00:00:00').getDay()
    if (wd === 0) continue
    const n = 4 + ((day * 7 + 45) % 6)
    for (let k = 0; k < n; k++) {
      const doc = docs[(k + day + 45) % docs.length]
      if (!doc.availability.days.includes(wd)) continue
      const p = others[(k * 5 + day + 90) % others.length]
      const time = `${String(10 + (k % 3)).padStart(2, '0')}:${String((k * 10) % 60).padStart(2, '0')}`
      const a = appt({ patientId: p.id, doctorId: doc.id, date: dd, time, status: k === 5 ? 'no_show' : 'completed', type: k % 4 === 1 ? 'followup' : 'general', source: k % 3 ? 'reception' : 'app' })
      if (a.type === 'followup') a.fee = doc.followUpFee
      if (a.status === 'completed') {
        a.arrivedAt = at(dd, time); a.startedAt = new Date(new Date(a.arrivedAt).getTime() + 14 * 60000).toISOString(); a.completedAt = new Date(new Date(a.startedAt).getTime() + (6 + (k % 5) * 2) * 60000).toISOString()
        consultBill(a)
      }
    }
  }

  // Ramesh's history: diabetes follow-ups with Dr. Anjali
  const rx = (row) => { rxN++; return add('prescriptions', { id: 'rx-' + rxN, rxNo: no('RX', rxN, row.date), status: 'final', dispenseStatus: 'dispensed', patientLang: 'mr', ...row, createdAt: at(row.date, '11:00') }) }
  const consult = (row) => { conN++; return add('consultations', { id: 'cn-' + conN, status: 'final', ...row, finalizedAt: at(row.date, '11:00'), createdAt: at(row.date, '10:45') }) }
  ;[[-90, 'Type 2 diabetes mellitus – uncontrolled', 182, '148/94'], [-30, 'Type 2 diabetes mellitus; Essential hypertension', 146, '138/88']].forEach(([off, dx, sugar, bp], i) => {
    const dd = d(off)
    const a = appt({ patientId: 'p-ramesh', doctorId: 'st-anjali', date: dd, time: '10:30', status: 'completed', type: i ? 'followup' : 'general', source: 'app' })
    a.arrivedAt = at(dd, '10:20'); a.startedAt = at(dd, '10:40'); a.completedAt = at(dd, '10:52')
    consultBill(a)
    const [sys, dia] = bp.split('/').map(Number)
    const c = consult({ apptId: a.id, patientId: 'p-ramesh', doctorId: 'st-anjali', date: dd, vitals: { bpSys: sys, bpDia: dia, pulse: 82, temp: 98.4, spo2: 98, height: 170, weight: 84 - i * 2, glucose: sugar },
      complaints: i ? 'Routine diabetes follow-up' : 'Increased thirst, frequent urination, tiredness', symptoms: i ? 'Feels better, occasional tingling in feet' : 'Polyuria, polydipsia, fatigue', duration: i ? '1 month' : '3 weeks',
      exam: 'Chest clear, CVS – S1 S2 normal, no pedal oedema', diagnosis: dx, plan: i ? 'Continue medicines, add statin. Diet and 30 min daily walk.' : 'Start oral hypoglycaemics; HbA1c and lipid profile.', followUpDate: d(off + 30) })
    const r = rx({ patientId: 'p-ramesh', doctorId: 'st-anjali', consultationId: c.id, date: dd, diagnosis: dx, advice: 'Walk 30 minutes daily. Check sugar at home twice a week.', diet: 'Avoid sweets, sugarcane juice and white rice in excess. Eat more salad, dal and whole grains.', followUpDate: d(off + 30),
      items: [
        { medicineId: 'med-5', name: 'Glycomet GP 1', generic: 'Metformin + Glimepiride', strength: '500 mg / 1 mg', form: 'Tablet', dose: '1 tablet', frequency: '1-0-1', duration: '30 days', timing: 'after_food', instructions: '', qty: 60 },
        { medicineId: 'med-7', name: 'Telma 40', generic: 'Telmisartan', strength: '40 mg', form: 'Tablet', dose: '1 tablet', frequency: '1-0-0', duration: '30 days', timing: 'before_food', instructions: 'Take in the morning', qty: 30 },
        ...(i ? [{ medicineId: 'med-28', name: 'Atorva 10', generic: 'Atorvastatin', strength: '10 mg', form: 'Tablet', dose: '1 tablet', frequency: '0-0-1', duration: '30 days', timing: 'after_food', instructions: 'At bedtime', qty: 30 }] : [])
      ] })
    c.prescriptionId = r.id
    if (!i) {
      labN++
      const lo = add('labOrders', { id: 'lo-' + labN, orderNo: no('LB', labN, dd), patientId: 'p-ramesh', doctorId: 'st-anjali', consultationId: c.id, tests: ['lt-hba1c', 'lt-lipid', 'lt-fbs'], status: 'published', priority: 'routine', sampleId: 'S' + dd.replace(/-/g, '').slice(2) + '-031',
        collectedAt: at(dd, '11:10'), collectedBy: 'u-sachin', enteredBy: 'u-sachin', enteredAt: at(dd, '16:00'), verifiedBy: 'u-pooja', verifiedAt: at(dd, '17:30'), publishedAt: at(dd, '17:35'), createdAt: at(dd, '10:55'),
        results: { 'lt-hba1c': { HbA1c: '8.4' }, 'lt-lipid': { 'Total cholesterol': '232', Triglycerides: '198', 'HDL cholesterol': '38', 'LDL cholesterol': '154' }, 'lt-fbs': { 'Glucose (fasting)': '176' } }, remarks: 'Sample adequate.', files: [] })
      c.labOrderIds = [lo.id]
      billFor('p-ramesh', ['lt-hba1c', 'lt-lipid', 'lt-fbs'].map((t) => { const x = s.labTests.find((y) => y.id === t); return { type: 'lab', refId: lo.id, desc: x.name, qty: 1, rate: x.price, discount: 0, taxPct: 0 } }), { day: dd, pay: true, method: 'upi', extra: { labOrderId: lo.id } })
    }
  })
  // Aarav – paediatric fever visit, with lab tests
  {
    const dd = d(-6)
    const a = appt({ patientId: 'p-aarav', doctorId: 'st-vikram', date: dd, time: '18:10', status: 'completed', type: 'general', source: 'app' })
    a.arrivedAt = at(dd, '18:00'); a.startedAt = at(dd, '18:15'); a.completedAt = at(dd, '18:25')
    consultBill(a)
    const c = consult({ apptId: a.id, patientId: 'p-aarav', doctorId: 'st-vikram', date: dd, vitals: { temp: 101.2, pulse: 108, spo2: 98, weight: 24, height: 124 }, complaints: 'Fever and cough', symptoms: 'Fever since 2 days, dry cough, reduced appetite', duration: '2 days', exam: 'Throat congested, chest clear', diagnosis: 'Acute viral upper respiratory infection', plan: 'Symptomatic treatment, fluids, CBC to rule out dengue.', followUpDate: d(-1) })
    const r = rx({ patientId: 'p-aarav', doctorId: 'st-vikram', consultationId: c.id, date: dd, diagnosis: c.diagnosis, advice: 'Plenty of fluids. Sponge with lukewarm water if fever is high. Come back if fever persists beyond 3 days or child is drowsy.', diet: 'Light home food, soups, coconut water.', followUpDate: d(-1), patientLang: 'mr',
      items: [
        { medicineId: 'med-14', name: 'Calpol Syrup', generic: 'Paracetamol', strength: '250 mg/5 ml', form: 'Syrup', dose: '7.5 ml', frequency: 'SOS', duration: '3 days', timing: 'after_food', instructions: 'Only if temperature is above 100°F, minimum 6 hours apart', qty: 1 },
        { medicineId: 'med-11', name: 'Cetzine 10', generic: 'Cetirizine', strength: '10 mg', form: 'Tablet', dose: '½ tablet', frequency: '0-0-1', duration: '5 days', timing: 'after_food', instructions: '', qty: 3 }
      ] })
    c.prescriptionId = r.id
    labN++
    const lo = add('labOrders', { id: 'lo-' + labN, orderNo: no('LB', labN, dd), patientId: 'p-aarav', doctorId: 'st-vikram', consultationId: c.id, tests: ['lt-cbc', 'lt-dengue'], status: 'published', priority: 'routine', sampleId: 'S' + dd.replace(/-/g, '').slice(2) + '-012',
      collectedAt: at(dd, '18:35'), collectedBy: 'u-sachin', enteredBy: 'u-sachin', enteredAt: at(d(-5), '10:00'), verifiedBy: 'u-pooja', verifiedAt: at(d(-5), '11:00'), publishedAt: at(d(-5), '11:05'), createdAt: at(dd, '18:25'),
      results: { 'lt-cbc': { Haemoglobin: '11.8', 'Total WBC count': '5200', 'Platelet count': '2.1', 'RBC count': '4.4', PCV: '35' }, 'lt-dengue': { 'NS1 antigen': 'Negative' } }, remarks: '', files: [] })
    c.labOrderIds = [lo.id]
    billFor('p-aarav', [{ type: 'lab', refId: lo.id, desc: 'Complete Blood Count (CBC)', qty: 1, rate: 300, discount: 0, taxPct: 0 }, { type: 'lab', refId: lo.id, desc: 'Dengue NS1 Antigen', qty: 1, rate: 600, discount: 0, taxPct: 0 }], { day: dd, pay: true, extra: { labOrderId: lo.id } })
  }

  // Sunita: ultrasound last week, bill not yet paid (try "Pay bills" in the patient app)
  {
    const dd = d(-4)
    const a = appt({ patientId: 'p-sunita', doctorId: 'st-neha', date: dd, time: '11:15', status: 'completed', type: 'general', source: 'app' })
    a.arrivedAt = at(dd, '11:05'); a.startedAt = at(dd, '11:20'); a.completedAt = at(dd, '11:35')
    consultBill(a, true, 'upi')
    const c = consult({ apptId: a.id, patientId: 'p-sunita', doctorId: 'st-neha', date: dd, vitals: { bpSys: 118, bpDia: 76, pulse: 80, weight: 61 }, complaints: 'Lower abdominal pain, irregular periods', symptoms: '', duration: '2 months', exam: 'Mild tenderness in lower abdomen', diagnosis: 'Under evaluation – pelvic ultrasound advised', plan: 'USG abdomen & pelvis, CBC, TSH. Review with reports.', followUpDate: d(3) })
    labN++
    const lo = add('labOrders', { id: 'lo-' + labN, orderNo: no('LB', labN, dd), patientId: 'p-sunita', doctorId: 'st-neha', consultationId: c.id, tests: ['lt-usgabd', 'lt-cbc', 'lt-tsh'], status: 'sample_collected', priority: 'routine', sampleId: 'S' + dd.replace(/-/g, '').slice(2) + '-019', collectedAt: at(dd, '11:50'), collectedBy: 'u-sachin', results: {}, remarks: '', files: [], createdAt: at(dd, '11:36') })
    c.labOrderIds = [lo.id]
    const b = billFor('p-sunita', [{ type: 'radiology', refId: lo.id, desc: 'Ultrasound – Abdomen & Pelvis', qty: 1, rate: 1200, discount: 0, taxPct: 0 }, { type: 'lab', refId: lo.id, desc: 'Complete Blood Count (CBC)', qty: 1, rate: 300, discount: 0, taxPct: 0 }, { type: 'lab', refId: lo.id, desc: 'Thyroid Stimulating Hormone (TSH)', qty: 1, rate: 350, discount: 0, taxPct: 0 }], { day: dd, pay: 500, method: 'cash', extra: { labOrderId: lo.id } })
    lo.billId = b.id
  }

  // TODAY's OPD
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const mm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  const todayDocs = docs.filter((x) => x.availability.days.includes(new Date(T + 'T00:00:00').getDay()) || true)
  const visits = [
    // doctor, patient index, status, minutes-from-now offset for slot, type, extra
    ['st-anjali', 0, 'completed', -150], ['st-anjali', 1, 'completed', -130], ['st-anjali', 2, 'completed', -110], ['st-anjali', 3, 'in_consultation', -40],
    ['st-anjali', 4, 'arrived', -20], ['st-anjali', 5, 'arrived', -10], ['st-anjali', 6, 'arrived', 0], ['st-anjali', 7, 'booked', 20], ['st-anjali', 8, 'booked', 40],
    ['st-vikram', 9, 'completed', -90], ['st-vikram', 10, 'in_consultation', -25], ['st-vikram', 11, 'arrived', -5], ['st-vikram', 12, 'booked', 30],
    ['st-sameer', 13, 'completed', -60], ['st-sameer', 14, 'arrived', -15], ['st-sameer', 15, 'booked', 25], ['st-sameer', 16, 'cancelled', 45],
    ['st-neha', 17, 'completed', -70], ['st-neha', 18, 'arrived', -10], ['st-neha', 19, 'booked', 60, 'online'],
    ['st-imran', 20, 'booked', 120], ['st-imran', 21, 'booked', 140]
  ]
  visits.forEach(([doctorId, pi, status, off, type]) => {
    const p = others[pi]
    const slot = Math.max(9 * 60, Math.min(21 * 60, Math.round((nowMin + off) / 5) * 5))
    const a = appt({ patientId: p.id, doctorId, date: T, time: mm(slot), status, type: type || (pi % 5 === 2 ? 'followup' : 'general'), source: pi % 3 === 0 ? 'app' : pi % 3 === 1 ? 'reception' : 'whatsapp', createdAt: hoursAgo(20 - pi * 0.4) })
    if (a.type === 'online') a.meetLink = 'https://meet.jit.si/jeevo-' + Math.random().toString(36).slice(2, 12)
    if (['arrived', 'in_consultation', 'completed'].includes(status)) { a.arrivedAt = minsAgo(Math.max(5, -off + 15)); consultBill(a, pi % 4 !== 1) }
    if (['in_consultation', 'completed'].includes(status)) a.startedAt = minsAgo(Math.max(2, -off))
    if (status === 'completed') a.completedAt = minsAgo(Math.max(1, -off - 10))
    if (status === 'cancelled') a.cancelReason = 'Patient requested'
    if (status === 'completed' || status === 'in_consultation') {
      const c = consult({ apptId: a.id, patientId: p.id, doctorId, date: T, status: status === 'completed' ? 'final' : 'draft', vitals: { bpSys: 120 + pi, bpDia: 80, pulse: 76 + pi, temp: 98.6, spo2: 98, weight: 60 + pi },
        complaints: ['Fever with body ache', 'Knee pain while climbing stairs', 'Cough and cold', 'Acidity, burning in chest', 'Headache and dizziness', 'Routine check-up'][pi % 6], symptoms: '', duration: `${2 + (pi % 4)} days`, exam: '', diagnosis: status === 'completed' ? ['Viral fever', 'Osteoarthritis knee', 'Acute bronchitis', 'Gastritis', 'Migraine', 'Healthy'][pi % 6] : '', plan: '' })
      if (status === 'completed') {
        const r = rx({ patientId: p.id, doctorId, consultationId: c.id, date: T, diagnosis: c.diagnosis, advice: 'Rest and drink plenty of water.', diet: '', followUpDate: d(7), dispenseStatus: pi === 0 ? 'pending' : 'dispensed', patientLang: p.lang,
          items: [{ medicineId: 'med-1', name: 'Dolo 650', generic: 'Paracetamol', strength: '650 mg', form: 'Tablet', dose: '1 tablet', frequency: '1-1-1', duration: '3 days', timing: 'after_food', instructions: '', qty: 9 }, { medicineId: 'med-9', name: 'Pan 40', generic: 'Pantoprazole', strength: '40 mg', form: 'Tablet', dose: '1 tablet', frequency: '1-0-0', duration: '5 days', timing: 'before_food', instructions: '', qty: 5 }] })
        c.prescriptionId = r.id
        if (pi !== 0) billFor(p.id, r.items.map((it) => ({ type: 'pharmacy', refId: r.id, desc: `${it.name} (${it.qty})`, qty: it.qty, rate: s.medicines.find((m) => m.id === it.medicineId).mrp, discount: 0, taxPct: 0, medicineId: it.medicineId })), { day: T, pay: true, method: 'cash', by: 'u-rahul', extra: { prescriptionId: r.id } })
      }
    }
  })
  // Emergency case today
  {
    const p = others[22]
    const a = appt({ patientId: p.id, doctorId: 'st-anjali', date: T, time: mm(Math.max(9 * 60, nowMin - 8)), status: 'arrived', type: 'emergency', priority: 'emergency', source: 'walk-in', fee: 600, reason: 'Chest pain, sweating' })
    a.arrivedAt = minsAgo(8)
  }
  // Ramesh's upcoming follow-up + Sunita booked today
  const rameshNext = appt({ patientId: 'p-ramesh', doctorId: 'st-anjali', date: T, time: mm(Math.min(20 * 60, nowMin + 55)), status: 'booked', type: 'followup', source: 'app', createdAt: hoursAgo(30) })
  rameshNext.fee = 200
  appt({ patientId: 'p-shalini', doctorId: 'st-sameer', date: d(2), time: '11:30', status: 'booked', type: 'specialist', source: 'app' })
  // future bookings for other patients
  for (let k = 0; k < 14; k++) appt({ patientId: others[(k * 3) % others.length].id, doctorId: docs[k % docs.length].id, date: d(1 + (k % 5)), time: `${String(10 + (k % 3)).padStart(2, '0')}:${String((k * 15) % 60).padStart(2, '0')}`, source: k % 2 ? 'app' : 'whatsapp' })

  // Lab worklist today
  const labToday = [
    [others[2].id, 'st-anjali', ['lt-cbc', 'lt-crp'], 'ordered'],
    [others[0].id, 'st-anjali', ['lt-fbs', 'lt-ppbs', 'lt-hba1c'], 'sample_collected'],
    [others[13].id, 'st-sameer', ['lt-xrknee'], 'processing'],
    [others[17].id, 'st-neha', ['lt-cbc', 'lt-tsh', 'lt-urine'], 'result_entered'],
    [others[9].id, 'st-vikram', ['lt-widal', 'lt-mp'], 'ordered']
  ]
  labToday.forEach(([patientId, doctorId, tests, status], i) => {
    labN++
    const lo = add('labOrders', { id: 'lo-' + labN, orderNo: no('LB', labN), patientId, doctorId, tests, status, priority: i === 4 ? 'urgent' : 'routine', results: {}, remarks: '', files: [], createdAt: minsAgo(140 - i * 20) })
    if (status !== 'ordered') { lo.sampleId = 'S' + T.replace(/-/g, '').slice(2) + '-' + String(40 + i).padStart(3, '0'); lo.collectedAt = minsAgo(100 - i * 10); lo.collectedBy = 'u-sachin' }
    if (status === 'result_entered') {
      lo.results = { 'lt-cbc': { Haemoglobin: '10.9', 'Total WBC count': '7800', 'Platelet count': '2.6', 'RBC count': '3.9', PCV: '34' }, 'lt-tsh': { TSH: '6.8' }, 'lt-urine': { Colour: 'Pale yellow', Protein: 'Nil', Sugar: 'Nil', 'Pus cells': '2-3' } }
      lo.enteredBy = 'u-sachin'; lo.enteredAt = minsAgo(30)
    }
    billFor(patientId, tests.map((t) => { const x = s.labTests.find((y) => y.id === t); return { type: 'lab', refId: lo.id, desc: x.name, qty: 1, rate: x.price, discount: 0, taxPct: 0 } }), { day: T, at: minsAgo(140 - i * 20), pay: i === 2 ? false : i === 3 ? 500 : true, extra: { labOrderId: lo.id } })
  })

  /* ---------- Inpatients ---------- */
  let admN = 60
  const admit = (row) => {
    admN++
    const b = bed(row.bedId); b.status = 'occupied'
    const a = add('admissions', { id: 'ad-' + admN, admNo: 'IP-' + T.slice(2, 4) + '-' + String(admN).padStart(4, '0'), status: 'admitted', notes: [], ...row, createdAt: row.admittedAt })
    b.admissionId = a.id
    return a
  }
  const ad1 = admit({ patientId: others[6].id, doctorId: 'st-anjali', deptId: 'dep-gen', bedId: 'bed-GM-1', admittedAt: hoursAgo(50), expectedDischarge: d(1), reason: 'High fever with vomiting, dehydration', diagnosis: 'Acute gastroenteritis with dehydration',
    notes: [{ at: hoursAgo(49), by: 'u-anjali', kind: 'doctor_visit', text: 'Admitted. IV fluids RL 1 L over 6 hours. Inj. Ondansetron 4 mg IV SOS. Monitor intake–output.' }, { at: hoursAgo(26), by: 'u-anjali', kind: 'doctor_visit', text: 'Improving. Vomiting stopped. Start soft diet. Continue IV fluids 12 hourly.' }, { at: hoursAgo(5), by: 'u-mary', kind: 'nursing', text: 'Patient comfortable, took soft diet, no vomiting since morning.' }] })
  const ad2 = admit({ patientId: others[1].id, doctorId: 'st-neha', deptId: 'dep-gyn', bedId: 'bed-PR-1', admittedAt: hoursAgo(20), expectedDischarge: d(2), reason: 'Elective – laparoscopic ovarian cystectomy', diagnosis: 'Right ovarian cyst', notes: [{ at: hoursAgo(18), by: 'u-neha', kind: 'doctor_visit', text: 'Post-op day 0. Vitals stable. Oral liquids after 6 hours.' }] })
  const ad3 = admit({ patientId: others[16].id, doctorId: 'st-anjali', deptId: 'dep-gen', bedId: 'bed-ICU-1', admittedAt: hoursAgo(30), expectedDischarge: d(4), reason: 'Breathlessness, high blood sugar', diagnosis: 'Diabetic ketoacidosis', emergency: true, notes: [{ at: hoursAgo(29), by: 'u-anjali', kind: 'doctor_visit', text: 'Insulin infusion as per protocol. Hourly sugar monitoring. Strict I/O charting.' }] })
  const ad4 = admit({ patientId: others[20].id, doctorId: 'st-sameer', deptId: 'dep-ortho', bedId: 'bed-SP-2', admittedAt: hoursAgo(70), expectedDischarge: d(0), reason: 'Fall at home – hip pain', diagnosis: 'Fracture neck of femur (left) – post hemiarthroplasty', notes: [{ at: hoursAgo(44), by: 'u-sameer', kind: 'doctor_visit', text: 'Post-op day 1. Wound healthy. Start physiotherapy – sitting and assisted standing.' }] })
  admit({ patientId: others[23].id, doctorId: 'st-vikram', deptId: 'dep-ped', bedId: 'bed-GF-2', admittedAt: hoursAgo(14), expectedDischarge: d(1), reason: 'High fever, low platelets', diagnosis: 'Dengue fever (NS1 positive) – under observation', notes: [] })
  admit({ patientId: others[11].id, doctorId: 'st-anjali', deptId: 'dep-gen', bedId: 'bed-GF-5', admittedAt: hoursAgo(8), expectedDischarge: d(2), reason: 'Severe asthma attack', diagnosis: 'Acute exacerbation of bronchial asthma', notes: [] })
  // discharged earlier
  const adOld = add('admissions', { id: 'ad-50', admNo: 'IP-' + T.slice(2, 4) + '-0050', patientId: 'p-shalini', doctorId: 'st-sameer', deptId: 'dep-ortho', bedId: 'bed-SP-1', status: 'discharged', admittedAt: at(d(-120), '12:00'), dischargedAt: at(d(-116), '11:00'), expectedDischarge: d(-116),
    reason: 'Severe knee pain, unable to walk', diagnosis: 'Bilateral osteoarthritis knee – acute flare', notes: [{ at: at(d(-119), '09:00'), by: 'u-sameer', kind: 'doctor_visit', text: 'Intra-articular injection given. Physiotherapy started.' }],
    dischargeSummary: { diagnosis: 'Bilateral osteoarthritis knee – acute flare', course: 'Managed conservatively with analgesics, intra-articular injection and physiotherapy. Pain improved, walking with support.', procedures: 'Intra-articular steroid injection (right knee)', condition: 'Stable', medications: 'Tab. Zerodol SP 1-0-1 × 7 days; Tab. Shelcal 500 1-0-0 × 3 months; Volini gel local application', advice: 'Knee strengthening exercises daily. Avoid squatting and climbing many stairs. Use walking stick.', followUp: d(-102), preparedBy: 'u-sameer', preparedAt: at(d(-116), '10:00') }, createdAt: at(d(-120), '12:00') })
  bed('bed-PR-4').reservedFor = 'Planned admission – Dr. Neha Bhosale'
  // inpatient bills (running)
  ;[ad1, ad2, ad3, ad4].forEach((a, i) => billFor(a.patientId, [{ type: 'room', refId: a.id, desc: 'Advance deposit – ' + a.admNo, qty: 1, rate: [5000, 20000, 25000, 30000][i], discount: 0, taxPct: 0 }], { day: isoDay(a.admittedAt), at: a.admittedAt, pay: [5000, 20000, 15000, 30000][i], method: i % 2 ? 'card' : 'cash', extra: { admissionId: a.id, deposit: true } }))

  // Nurse's vitals & tasks
  ;[[ad1, [98.8, 84, '118/76', 98]], [ad2, [99.1, 88, '110/70', 99]], [ad3, [98.4, 102, '104/66', 95]], [ad4, [98.6, 78, '130/84', 97]]].forEach(([a, [temp, pulse, bp, spo2]], i) => {
    const [bpSys, bpDia] = bp.split('/').map(Number)
    add('vitals', { id: 'vt-' + i + 'a', patientId: a.patientId, admissionId: a.id, at: hoursAgo(8), by: 'u-mary', values: { temp: temp + 0.6, pulse: pulse + 6, bpSys: bpSys + 6, bpDia, spo2: spo2 - 1 }, note: '' })
    add('vitals', { id: 'vt-' + i + 'b', patientId: a.patientId, admissionId: a.id, at: hoursAgo(2), by: 'u-mary', values: { temp, pulse, bpSys, bpDia, spo2 }, note: i === 2 ? 'RBS 212 mg/dL – informed Dr. Anjali' : '' })
  })
  const task = (a, title, due, status = 'pending', assignedTo = 'st-mary', fromDoctor = true) => add('nursingTasks', { id: 'nt-' + s.nursingTasks.length, patientId: a.patientId, admissionId: a.id, title, due, status, assignedTo, fromDoctor, createdAt: hoursAgo(10) })
  task(ad1, 'IV fluids RL 500 ml – 12 hourly', minsAgo(-60))
  task(ad1, 'Record intake / output chart', minsAgo(-120), 'pending', 'st-mary', false)
  task(ad3, 'Blood sugar check (hourly)', minsAgo(-15))
  task(ad3, 'Inj. Insulin as per sliding scale', minsAgo(-15))
  task(ad2, 'Check surgical dressing', minsAgo(30), 'done')
  task(ad4, 'Assist physiotherapy – walking with walker', minsAgo(-180))
  task(ad4, 'Prepare discharge file', minsAgo(-240), 'pending', 'st-mary', false)
  add('medAdmin', { id: 'ma-1', patientId: ad1.patientId, admissionId: ad1.id, medicine: 'Inj. Ondansetron', dose: '4 mg', route: 'IV', at: hoursAgo(9), by: 'u-mary', note: '' })
  add('medAdmin', { id: 'ma-2', patientId: ad3.patientId, admissionId: ad3.id, medicine: 'Inj. Insulin (regular)', dose: '6 IU', route: 'SC', at: hoursAgo(3), by: 'u-mary', note: 'RBS 248' })
  add('medAdmin', { id: 'ma-3', patientId: ad4.patientId, admissionId: ad4.id, medicine: 'Tab. Zerodol SP', dose: '1 tablet', route: 'Oral', at: hoursAgo(4), by: 'u-mary', note: '' })

  /* ---------- Communication ---------- */
  const ann = (row) => add('announcements', { id: 'an-' + s.announcements.length, by: 'u-suresh', pinned: false, ...row })
  ann({ title: 'Free diabetes & BP check-up camp', body: 'Free blood sugar, BP and BMI check-up on Sunday, 9 am – 1 pm at the hospital OPD. Diet counselling by our dietitian. No appointment needed.', audience: 'patients', kind: 'camp', pinned: true, expiresAt: daysFromNow(6), createdAt: hoursAgo(20) })
  ann({ title: 'Dr. Sameer Joshi – changed OPD timings', body: 'From this week, Dr. Sameer Joshi (Orthopaedics) will see patients on Mon, Wed and Fri, 11 am – 2 pm and 6 – 8 pm.', audience: 'patients', kind: 'timing', expiresAt: daysFromNow(14), createdAt: hoursAgo(50) })
  ann({ title: 'Pulse polio & flu vaccination drive', body: 'Children up to 5 years: pulse polio drops free. Influenza vaccine available for elderly and children at subsidised rates. Bring the vaccination card.', audience: 'patients', kind: 'vaccination', expiresAt: daysFromNow(10), createdAt: hoursAgo(80) })
  ann({ title: 'Welcome Dr. Neha Bhosale', body: 'We are happy to welcome Dr. Neha Bhosale, Obstetrician & Gynaecologist, to our team. OPD daily 10 am – 1 pm.', audience: 'all', kind: 'doctor', createdAt: hoursAgo(24 * 9) })
  ann({ title: 'Fire safety drill on Saturday', body: 'All staff to assemble at the parking area at 4 pm on Saturday for the quarterly fire drill. Ward in-charges please keep one nurse per ward.', audience: 'staff', kind: 'notice', expiresAt: daysFromNow(4), createdAt: hoursAgo(10) })
  ann({ title: 'Diwali holiday – OPD timings', body: 'OPD will be closed on Laxmi Pujan day. Emergency and pharmacy services will be available 24×7.', audience: 'all', kind: 'holiday', expiresAt: daysFromNow(9), createdAt: hoursAgo(30) })

  const TIPS = [
    ['diabetes', '🩸', ['Know your sugar numbers', 'शुगर के आंकड़े जानें', 'साखरेचे आकडे जाणून घ्या'],
      ['Fasting sugar should usually be below 100 mg/dL. Get HbA1c checked every 3 months if you have diabetes. Walk 30 minutes daily, eat on time, and never stop medicines without asking your doctor.',
        'खाली पेट शुगर आम तौर पर 100 mg/dL से कम होनी चाहिए. डायबिटीज़ हो तो हर 3 महीने में HbA1c जाँच कराएँ. रोज़ 30 मिनट टहलें, समय पर खाएँ और डॉक्टर से पूछे बिना दवा बंद न करें.',
        'उपाशीपोटी साखर साधारणपणे 100 mg/dL पेक्षा कमी असावी. मधुमेह असल्यास दर 3 महिन्यांनी HbA1c तपासा. रोज 30 मिनिटे चाला, वेळेवर जेवा आणि डॉक्टरांना विचारल्याशिवाय औषध बंद करू नका.']],
    ['bp', '❤️', ['Keep blood pressure in check', 'ब्लड प्रेशर नियंत्रण में रखें', 'रक्तदाब नियंत्रणात ठेवा'],
      ['Normal BP is around 120/80. Use less salt, avoid pickles and papad daily, stay active and check BP regularly after age 30.',
        'सामान्य बीपी लगभग 120/80 होता है. नमक कम खाएँ, रोज़ अचार-पापड़ से बचें, सक्रिय रहें और 30 साल के बाद नियमित बीपी जाँचें.',
        'सामान्य रक्तदाब सुमारे 120/80 असतो. मीठ कमी खा, रोज लोणचे-पापड टाळा, सक्रिय राहा आणि 30 वर्षांनंतर नियमित BP तपासा.']],
    ['seasonal', '🦟', ['Monsoon: prevent dengue & malaria', 'बरसात में डेंगू-मलेरिया से बचाव', 'पावसाळ्यात डेंग्यू-मलेरियापासून बचाव'],
      ['Do not let water collect in coolers, pots or tyres. Use mosquito nets and full sleeves. See a doctor if fever lasts more than 2 days.',
        'कूलर, गमलों या टायरों में पानी जमा न होने दें. मच्छरदानी और पूरी बाँह के कपड़े पहनें. 2 दिन से ज़्यादा बुखार रहे तो डॉक्टर को दिखाएँ.',
        'कूलर, कुंड्या किंवा टायरमध्ये पाणी साचू देऊ नका. मच्छरदाणी आणि पूर्ण बाह्यांचे कपडे वापरा. 2 दिवसांपेक्षा जास्त ताप असल्यास डॉक्टरांना दाखवा.']],
    ['nutrition', '🥗', ['A balanced Indian plate', 'संतुलित भारतीय थाली', 'संतुलित भारतीय ताट'],
      ['Fill half the plate with vegetables and salad, a quarter with dal, eggs or paneer, and a quarter with roti or rice. Prefer jowar, bajra and nachni.',
        'आधी थाली में सब्ज़ी और सलाद, एक चौथाई में दाल, अंडा या पनीर, और एक चौथाई में रोटी या चावल रखें. ज्वार, बाजरा और रागी को प्राथमिकता दें.',
        'अर्ध्या ताटात भाज्या व कोशिंबीर, एक चतुर्थांश डाळ, अंडी किंवा पनीर आणि एक चतुर्थांश पोळी किंवा भात ठेवा. ज्वारी, बाजरी आणि नाचणीला प्राधान्य द्या.']],
    ['prevention', '🛡️', ['Yearly health check-up after 40', '40 के बाद सालाना जाँच', '40 नंतर वार्षिक आरोग्य तपासणी'],
      ['After 40, get sugar, BP, cholesterol, kidney function and an ECG checked every year — even if you feel fine. Early detection saves lives and money.',
        '40 साल के बाद हर साल शुगर, बीपी, कोलेस्ट्रॉल, किडनी जाँच और ईसीजी कराएँ — भले ही आप ठीक महसूस करें. जल्दी पहचान से जान और पैसा दोनों बचते हैं.',
        '40 वर्षांनंतर दरवर्षी साखर, BP, कोलेस्टेरॉल, किडनी तपासणी आणि ECG करून घ्या — बरे वाटत असले तरी. लवकर निदान जीव आणि पैसा दोन्ही वाचवते.']],
    ['women', '👩', ['Women: iron and calcium matter', 'महिलाएँ: आयरन और कैल्शियम ज़रूरी', 'महिलांनो: लोह आणि कॅल्शियम महत्त्वाचे']
      , ['Tiredness and breathlessness can be signs of anaemia. Eat green leafy vegetables, jaggery, dates and pulses. Pregnant women should take iron-folic acid tablets as advised.',
        'थकान और साँस फूलना खून की कमी के लक्षण हो सकते हैं. हरी पत्तेदार सब्ज़ियाँ, गुड़, खजूर और दालें खाएँ. गर्भवती महिलाएँ सलाह अनुसार आयरन-फोलिक एसिड की गोलियाँ लें.',
        'थकवा आणि धाप लागणे ही रक्तक्षयाची लक्षणे असू शकतात. हिरव्या पालेभाज्या, गूळ, खजूर आणि कडधान्ये खा. गर्भवती महिलांनी सल्ल्यानुसार लोह-फॉलिक अ‍ॅसिडच्या गोळ्या घ्याव्यात.']],
    ['children', '🧒', ['Complete your child’s vaccinations', 'बच्चे का टीकाकरण पूरा कराएँ', 'मुलांचे लसीकरण पूर्ण करा'],
      ['Follow the vaccination schedule on the card. For diarrhoea give ORS and zinc and continue feeding. Visit a doctor quickly if the child is drowsy or not drinking.',
        'कार्ड पर दिए टीकाकरण कार्यक्रम का पालन करें. दस्त में ORS और ज़िंक दें और खाना जारी रखें. बच्चा सुस्त हो या पानी न पी रहा हो तो तुरंत डॉक्टर को दिखाएँ.',
        'कार्डवरील लसीकरण वेळापत्रक पाळा. जुलाब झाल्यास ORS व झिंक द्या आणि खाणे चालू ठेवा. मूल सुस्त असल्यास किंवा पाणी पीत नसल्यास लगेच डॉक्टरांकडे जा.']]
  ]
  TIPS.forEach(([topic, emoji, [en, hi, mr], [ben, bhi, bmr]], i) => add('healthTips', { id: 'tip-' + topic, topic, emoji, title: { en, hi, mr }, body: { en: ben, hi: bhi, mr: bmr }, status: 'published', reviewedBy: i % 2 ? 'st-vikram' : 'st-anjali', reviewedAt: hoursAgo(24 * (10 + i)), createdAt: hoursAgo(24 * (12 + i)) }))
  add('healthTips', { id: 'tip-heat', topic: 'seasonal', emoji: '☀️', title: { en: 'Beat the summer heat', hi: '', mr: '' }, body: { en: 'Drink water every hour, avoid going out between 12 and 4 pm, wear a cap.', hi: '', mr: '' }, status: 'draft', createdAt: hoursAgo(30) })

  const notif = (userId, title, body, link, h = 2, read = false, kind = 'info') => add('notifications', { id: 'nt' + s.notifications.length, userId, title, body, link, read, kind, createdAt: hoursAgo(h) })
  notif('u-patient', 'Appointment confirmed', `Dr. Anjali Deshmukh · Today · Token ${rameshNext.token}`, '/p/appointments', 30, true, 'appointment')
  notif('u-patient', 'Lab report ready', 'Aarav’s CBC and Dengue NS1 report is ready to view.', '/p/reports', 24 * 5, false, 'lab')
  notif('u-patient', 'Follow-up reminder', 'Your diabetes follow-up with Dr. Anjali Deshmukh is due.', '/p/appointments', 6, false, 'reminder')
  notif('u-anjali', 'Emergency patient waiting', `${others[22].name} – chest pain. Marked as emergency at reception.`, '/s/queue', 0.15, false, 'emergency')
  notif('u-pooja', 'Report waiting for verification', `${others[17].name} – CBC, TSH, Urine`, '/s/lab', 0.5, false, 'lab')
  notif('u-rahul', 'Low stock: Montair LC', 'Only 12 left (minimum 30).', '/s/pharmacy/stock', 3, false, 'stock')
  notif('u-suresh', 'New complaint from a patient', 'Waiting time at reception – rating 2/5', '/s/feedback', 5, false, 'feedback')

  const msg = (patientId, template, text, h, channel = 'whatsapp', status = 'sent') => add('messages', { id: 'msg' + s.messages.length, patientId, phone: s.patients.find((p) => p.id === patientId).phone, channel, template, lang: s.patients.find((p) => p.id === patientId).lang, text, status, provider: 'demo', createdAt: hoursAgo(h) })
  msg('p-ramesh', 'appointment_confirmed', `नमस्कार Ramesh Patil, Dr. Anjali Deshmukh यांच्यासोबत तुमची भेट निश्चित झाली आहे. टोकन ${rameshNext.token}. – Sanjeevani`, 30)
  msg('p-ramesh', 'report_ready', 'नमस्कार Ramesh Patil, Aarav Patil यांचा लॅब रिपोर्ट तयार आहे. JeevO ॲपमध्ये पहा. – Sanjeevani', 24 * 5)
  msg(others[3].id, 'appointment_reminder', 'नमस्ते, कल सुबह 10:30 बजे डॉक्टर के साथ आपकी अपॉइंटमेंट है. – Sanjeevani', 18, 'sms')
  msg(others[3 + 4].id, 'payment_receipt', 'Payment of ₹400 received. Receipt RC-1101. – Sanjeevani', 4, 'whatsapp', 'blocked_no_consent')

  const fb = (row) => add('feedback', { id: 'fb' + s.feedback.length, status: 'new', ...row })
  fb({ patientId: others[0].id, doctorId: 'st-anjali', ratings: { doctor: 5, reception: 4, waiting: 3, cleanliness: 5, overall: 5 }, comment: 'Doctor explained everything patiently. Thank you!', private: false, kind: 'feedback', status: 'resolved', createdAt: hoursAgo(26) })
  fb({ patientId: others[4].id, doctorId: 'st-sameer', ratings: { doctor: 4, reception: 2, waiting: 2, cleanliness: 4, overall: 3 }, comment: 'Had to wait 1.5 hours even with appointment. Please improve.', private: true, kind: 'complaint', createdAt: hoursAgo(5) })
  fb({ patientId: others[9].id, doctorId: 'st-vikram', ratings: { doctor: 5, reception: 5, waiting: 4, cleanliness: 4, overall: 5 }, comment: 'Very good with children.', private: false, kind: 'feedback', status: 'resolved', response: 'Thank you for your kind words!', respondedBy: 'u-suresh', createdAt: hoursAgo(70) })
  fb({ patientId: others[12].id, doctorId: 'st-imran', ratings: { doctor: 4, reception: 4, waiting: 4, cleanliness: 3, overall: 4 }, comment: 'Washroom near dental OPD needs cleaning.', private: true, kind: 'complaint', status: 'in_review', createdAt: hoursAgo(40) })

  /* ---------- HR ---------- */
  add('leaves', { id: 'lv1', staffId: 'st-vikram', from: d(8), to: d(10), type: 'Casual leave', reason: 'Family function', status: 'approved', createdAt: hoursAgo(72) })
  add('leaves', { id: 'lv2', staffId: 'st-rekha', from: d(3), to: d(3), type: 'Sick leave', reason: 'Fever', status: 'pending', createdAt: hoursAgo(6) })
  add('leaves', { id: 'lv3', staffId: 'st-imran', from: d(15), to: d(17), type: 'Conference', reason: 'Dental conference, Pune', status: 'pending', createdAt: hoursAgo(20) })
  s.staff.filter((x) => x.hospitalId === H1).forEach((x, i) => {
    for (let day = -6; day <= 0; day++) {
      const dd = d(day)
      if (new Date(dd + 'T00:00:00').getDay() === 0) continue
      const absent = (i + day) % 11 === 0
      add('attendance', { id: `at-${x.id}-${dd}`, staffId: x.id, date: dd, status: absent ? 'absent' : 'present', in: absent ? '' : `0${8 + (i % 2)}:${String(45 + (i % 3) * 5).padStart(2, '0')}`.slice(-5), out: absent || day === 0 ? '' : `${17 + (i % 3)}:${String((i * 7) % 60).padStart(2, '0')}` })
    }
    for (let day = 0; day < 7; day++) add('shifts', { id: `sh-${x.id}-${day}`, staffId: x.id, day: d(day), shift: x.role === 'nurse' ? ['morning', 'evening', 'night'][(i + day) % 3] : x.shift || 'morning' })
  })

  /* ---------- Settings & audit ---------- */
  add('settings', { id: 'messaging', value: { whatsappProvider: 'click_to_chat', smsProvider: 'demo', senderId: 'SNJVNI', autoReminders: true, reminderHours: 2, tokenAlertAhead: 3 } })
  add('settings', { id: 'billing', value: { gstEnabled: false, receiptFooter: 'Thank you. Get well soon!', allowPartial: true } })
  add('settings', { id: 'opd', value: { avgConsultMins: 10, allowOnlineBooking: true, bookingDaysAhead: 14, registrationFee: 50, showWaitTime: true } })
  add('settings', { id: 'seedDay', value: T })
  add('settings', { id: 'messaging', value: { whatsappProvider: 'click_to_chat', smsProvider: 'demo', autoReminders: true, reminderHours: 2, tokenAlertAhead: 3 } }, H2)
  const audit = (userId, action, entity, entityId, summary, h) => add('audit', { id: 'au' + s.audit.length, userId, userName: s.users.find((u) => u.id === userId)?.name, action, entity, entityId, summary, at: hoursAgo(h), createdAt: hoursAgo(h) })
  audit('u-anjali', 'finalise', 'prescriptions', 'rx-201', 'Prescription finalised', 24 * 30)
  audit('u-pooja', 'verify', 'labOrders', 'lo-151', 'Lab report verified', 24 * 5)
  audit('u-kavita', 'create', 'patients', others[29].id, 'Quick registration (details pending)', 26)
  audit('u-suresh', 'update', 'services', 'svc-plaster', 'Price changed ₹1,200 → ₹1,500', 50)
  audit('u-kavita', 'payment', 'bills', s.bills[s.bills.length - 1].id, 'Payment recorded', 3)

  return s
}
