# JeevO 🏥 – Hospital & Clinic Management

A modern, multilingual (**English · हिंदी · मराठी**) hospital and clinic platform
for small and medium hospitals, clinics, nursing homes, diagnostic centres and
labs in Tier 2–4 towns. Built on the same proven architecture as the Smart
Society app: one installable web app (PWA), an offline demo out of the box, and
an optional Supabase backend with database-enforced security.

**Three ways to use it**

| Access | Who | How |
|---|---|---|
| 📱 **Patient app (PWA)** | Patients & families | Open the link on a phone → *Add to Home screen*. Book, see live token, prescriptions, reports, bills. |
| 💬 **WhatsApp / SMS** | Every patient, even without a smartphone | Confirmations, reminders, "your turn is near", report-ready and payment receipts – in the patient's language, only with consent. |
| 🖥️ **Hospital web app** | Doctors, reception, nurses, pharmacy, lab, admin | Same link on a desktop / tablet. Role-based dashboards, keyboard-friendly (press <kbd>/</kbd> to find a patient). |

---

## Try the demo

Run it (`npm install && npm run dev`) or deploy to GitHub Pages (below). On the
login screen pick a language, then tap a demo account – or log in with any demo
mobile number (the OTP is shown on screen).

The demo is set up for **Radhakrishna Hospital, Pimpalgaon (B), Nashik**. Its
hospital, medical store and pathology laboratory are **separately owned**, so the
app has three owners. Each owner sees only their own unit's staff, bills, income,
reports and audit trail. Patients are shared, so one patient file covers all three.

| Demo account | What to try |
|---|---|
| **Patient** – Sunil Kadam (family of 4) | Book with Dr. Umesh or Dr. Kavita, live token, prescriptions in Marathi/Hindi, lab reports, referral letter, pay a pending bill (simulated UPI) |
| **Hospital owner** – Sanjay Aher | Hospital dashboard and income (consultation, IPD, ECG/echo/X-ray), hospital staff and HR, beds, insurance and cashless desk, reports, settings |
| **Main doctor + administrator** – Dr. Umesh Aher | My OPD → consult → e-prescription, order tests, **Refer**, plus the hospital administrator's overview |
| **Medical store owner** – Avinash Aher | Medical store income and bills only, own 2 pharmacists, stock, store letterhead (DL / GSTIN) |
| **Laboratory owner** – Bapuji Dhomse | Laboratory income and bills only, own 2 technicians, verify reports, test prices, lab letterhead |
| **Doctor** – Dr. Kavita Aher (Gynaecology) | Own OPD and patients |
| **Receptionist / Nurse** | Registration, walk-in tokens, queue, TV display, admissions with insurer, vitals, nursing notes |
| **Pharmacist** / **Lab technician** (Yogita Dhomse) | Dispense prescriptions, counter sale / sample, results (a different authorised person verifies) |
| **Other clinic** | A second tenant – completely separate data |
| **Super Admin** | All hospitals, plans, usage, suspend a tenant |

Beds: ICU 10 · General ward 2 rooms × 4 · Semi-special 10 rooms × 2 · Special 10
single rooms (48 beds).

**What is real and what is sample data.** The hospital's name, logo, address,
phone numbers, registration and Rohini numbers, timings, facilities, the two
doctors and the laboratory's details are from the hospital's own brochure,
letterheads and sign boards. **All patients are fictional.** No real patient
data is used, even where a real document was used as a format sample. Still
placeholders, to be filled in before go-live: medical store drug licence and
GSTIN, names and numbers of the reception, nursing, pharmacy and third lab
staff, prices, and all demo login mobile numbers (`90000…`). The semi-special
ward is assumed to be 10 rooms × 2 beds.

*Profile → Reset demo data* starts fresh. The demo keeps "today" current: when
you open it on another day, the sample appointments and admissions move forward.

## Features (Phase 1 + Phase 2)

- **Patients** – quick or full registration, unique Patient ID, QR card, search by
  mobile / ID / name / QR, duplicate detection, families with dependants,
  consent for WhatsApp & SMS, vaccination records, records completed later.
- **Appointments** – doctors' working days, sessions & breaks, slot length, daily
  maximum, leave; book / reschedule / cancel from app or reception; general,
  specialist, follow-up, online (secure video link) and emergency visits.
- **Token & queue** – tokens per doctor per day, walk-ins, check-in with fee,
  emergency priority, *now serving*, people ahead and approximate wait (learns
  each doctor's real consultation time), "your turn is coming" alerts,
  full-screen **TV display** showing only token numbers (no patient names).
- **Doctor** – today's dashboard; consultation screen with allergies always
  visible, vitals with out-of-range highlighting, BMI, chief complaints,
  symptoms, examination, diagnosis, plan, follow-up; complete history (visits,
  prescriptions, reports, admissions). Notes are locked once final – corrections
  are dated addenda.
- **Digital prescriptions** – medicine catalogue (brand + generic), dose,
  frequency (1-0-1…), duration, before/after food, instructions, auto quantity,
  advice, diet, follow-up date; signed by the doctor with registration number;
  PDF (A4/A5), print and share; patient instructions also in Hindi/Marathi.
  **No AI suggestions – the doctor decides everything.** Signed prescriptions are
  never edited; corrections create a new version.
- **Laboratory** – test catalogue with prices & normal ranges, sample IDs and
  labels, result entry with High/Low flags, PDF/image upload, verification by an
  authorised person (not the one who entered it), publish to patient, reopen
  with reason.
- **Pharmacy** – batch-wise stock with expiry, FEFO dispensing, part dispensing,
  counter sales, barcode (USB scanner or camera), returns, low/out-of-stock and
  expiry alerts, write-off of expired stock, CSV export.
- **Billing** – itemised bills (consultation, lab, scans, medicines, procedures,
  room), discounts, GST, part payments, UPI/cash/card/net-banking, receipts,
  refunds and cancellations by admin only with reason, all audited; simulated
  online payment for patients.
- **Inpatients** – visual bed board (available / occupied / reserved /
  maintenance), admission with deposit, bed transfer, doctor & nursing notes,
  vitals, tasks, medication records, room-charge billing, discharge summary (PDF).
- **Nursing** – ward view with last vitals and doctor's instructions, task list
  with overdue alerts, medication administration record.
- **Staff & HR** – staff directory with registration details, roles (login by
  mobile), weekly shift roster, leave requests & approval (doctor leave blocks
  booking and flags appointments to reschedule), attendance check-in/out.
- **Communication** – announcements (patients / staff / all), health-awareness
  articles in 3 languages that a **doctor must review** before publishing,
  WhatsApp/SMS outbox with consent checks and templates in the patient's language.
- **Feedback** – ratings for doctor, reception, waiting, cleanliness, overall;
  private complaints; admin replies.
- **Admin dashboard & reports** – patients, today's appointments and
  consultations, collection, outstanding, pending lab, beds, low stock; revenue by
  day, service, department, doctor and payment method; waiting & consultation
  times, utilisation, no-shows, doctor performance; 8 CSV exports.
- **Emergency** – one-tap call & ambulance for patients; reception registers an
  unknown patient in seconds; emergency cases always first in the queue.
- **Super Admin** – tenants, subscription plans, usage, suspend / activate.
- **Languages** – everything switchable any time; chosen on first launch; Indian
  date formats, ₹, +91 numbers. Dictionaries are plain text files
  (`src/i18n/t1–t4.txt`, one line per phrase) so translators can edit them.

## Security & privacy

- **Tenant isolation** in the database: every record carries its hospital; a
  login can only read/write hospitals it belongs to.
- **Role- and record-level rules** (`supabase/setup.sql`): e.g. patients only see
  their own family; receptionists and pharmacists cannot read clinical notes;
  only the treating doctor edits a consultation; unverified lab results are hidden
  from patients; refunds need the unit's owner; the audit log is append-only.
- **Separately owned units** (hospital, medical store, laboratory) are enforced in
  the database too: an owner cannot read or refund another unit's bills, manage
  its staff, change its letterhead or read its audit trail. The hospital
  administrator cannot create medical store or lab staff, or give themself those
  roles. Pathology reports are verified only by the lab (never by the person who
  entered the results); ECG / echo / X-ray reports are verified by a hospital doctor.
  **132 automated security tests** (`npm run test:db`) run in CI before every deploy.
- Medical documents in a **private bucket**, opened via short-lived signed links.
- Audit trail of changes to patients, prescriptions, clinical notes and billing.
- Consent records, 30-minute idle logout for staff, data minimisation per role.
- Designed for DPDP Act 2023 / IT Act; ABHA/ABDM-ready (Patient ID ↔ ABHA field).
- AI is **not** used for clinical decisions; the architecture leaves room for
  optional, doctor-approved assistants later (voice registration, speech-to-text
  notes, summaries, OCR) – any AI output must be approved by a clinician before
  it becomes part of the record.

## Put it online (GitHub Pages)

1. Repository **Settings → Pages → Source: GitHub Actions**.
2. **Actions → Test & deploy to GitHub Pages → Run workflow** (or push to the
   default branch).
3. The app is live at `https://<your-github-name>.github.io/jeevo/`.

Without settings it runs as the offline demo. To go live for a real hospital
see **[docs/GO-LIVE.md](docs/GO-LIVE.md)** (Supabase, SMS login, WhatsApp, payments).

## Development

```bash
npm install
npm run dev          # http://localhost:5173
npm run build
# database security tests (needs PostgreSQL):
psql -f supabase/test/supabase-stub.sql -f supabase/setup.sql && npm run test:db
```

Stack: React 18 + Vite + Tailwind CSS (PWA), Supabase (PostgreSQL, Auth, Storage,
Realtime, Edge Functions). Data layer `src/lib/db.js` works offline-first with an
outbox that syncs when online; business rules live in `src/lib/actions/`.

| Folder | What |
|---|---|
| `src/pages/patient` | Patient app |
| `src/pages/staff` | Hospital app: dashboard, patients, appointments, queue, TV, emergency, consultation, lab, pharmacy, billing, IPD, nursing |
| `src/pages/admin` | Staff & HR, communications, reports, settings, platform |
| `src/lib/actions` | All business rules (permissions checked again on the server) |
| `src/i18n` | Translation engine + Hindi/Marathi dictionaries |
| `supabase/` | Database schema & rules, security tests, WhatsApp/SMS sender |

> Medical content in the demo (health tips, sample prescriptions) is illustrative
> sample data. All educational content must be reviewed by qualified healthcare
> professionals before real use.
