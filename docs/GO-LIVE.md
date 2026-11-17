# Going live with your hospital or clinic

Out of the box JeevO runs as an **offline demo** (sample hospital, data kept on
each device). To use it for real, connect it to a **Supabase** project
(PostgreSQL in Mumbai). Then patients and staff share the same data, everyone
logs in with their own mobile number, and the **database itself** enforces which
hospital, role and patient each person may see.

Plan for about an hour. Everything can be done from a laptop or phone browser.

---

## 1. Create the Supabase project (10 min)

1. **supabase.com** → sign up with the hospital's email (not a personal one).
2. **New project** → name it (e.g. `sanjeevani-hospital`) → strong database
   password (save it) → **Region: South Asia (Mumbai)** → Create.
   For health data, choose a paid plan with **daily backups / point-in-time recovery**.

## 2. Create the database (2 min)

**SQL Editor → New query** → paste all of [`supabase/setup.sql`](../supabase/setup.sql) → **Run**.

This creates the tables, the tenant-isolation and role rules, the private
document bucket and the live-update feed. It is safe to run again after updates.

## 3. Turn on login (10–30 min)

**Authentication → Sign In / Providers**

- **Phone (SMS OTP)** — what patients expect. Enable Phone, choose an SMS provider
  (Twilio, MessageBird, Vonage, Textlocal). SMS to Indian numbers needs **DLT
  registration** of the sender ID and template (your provider guides you).
- **Email OTP** works immediately as a fallback. Make sure the *Magic Link* email
  template contains `{{ .Token }}`. Add your own SMTP sender for real use.
- **URL Configuration → Site URL**: your app address, e.g.
  `https://<github-name>.github.io/jeevo/`.

## 4. Connect the app (5 min)

1. Supabase → **Project Settings → API** → copy **Project URL** and **anon public**
   key (the anon key is meant to be public — the database rules protect the data;
   never share the *service_role* key).
2. GitHub → this repository → **Settings → Secrets and variables → Actions →
   Variables**:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_ANON_KEY` | anon public key |
   | `HOSPITAL_NAME` | *(optional)* shown on the login screen |
   | `HOSPITAL_CODE` | *(optional)* pre-fills the code for patient self-registration |

3. **Actions → Test & deploy to GitHub Pages → Run workflow**. In ~2 minutes the
   app is in cloud mode (demo accounts disappear).

## 5. Set up the hospital in the app (20 min)

1. Open the app → log in with **your** mobile number.
2. Choose **Set up a hospital** → name and short code (e.g. `sanjeevani`).
   You become its **Hospital Administrator**.
3. **Settings**: hospital profile (address, emergency & ambulance numbers, timings,
   map link), departments, **Services & pricing**, **Lab tests**, **Wards** (beds are
   created automatically) and **WhatsApp & SMS**.
4. **Staff & HR → Add staff**: each doctor, nurse, receptionist, pharmacist and lab
   technician with their **mobile number** — they simply log in with it. Set each
   doctor's fee, registration number and OPD hours; tick *Authorised to verify lab
   reports* for your pathologist.
5. **Pharmacy → Stock & expiry**: add medicines and opening stock batch-wise.

### Separately owned medical store and laboratory

If the medical store and the laboratory have their own owners (as at
Radhakrishna Hospital), add each owner once from the platform login (see
section 8). This is deliberately not something the hospital administrator can
do, so that each owner alone controls their own staff and income:

```sql
-- run as the platform admin, or in the SQL editor
select public.platform_add_unit_owner('radhakrishna', 'pharmacy', '{"name": "Avinash Aher", "phone": "9XXXXXXXXX"}');
select public.platform_add_unit_owner('radhakrishna', 'lab',      '{"name": "Bapuji Dhomse", "phone": "9XXXXXXXXX"}');
```

Each owner then logs in with that mobile number and:
- adds their own staff (pharmacists, or lab technicians with *Authorised to
  verify lab reports* where appropriate);
- fills in **Settings → My unit** (store: drug licence and GSTIN; lab: address,
  signatories, footer);
- the lab owner sets pathology **test prices**. The hospital administrator sets
  ECG / echo / X-ray prices.

To give the main doctor administrator rights, the hospital administrator opens
*Staff & HR*, edits the doctor and ticks **Also administrator**.

Patients registered at the reception are **linked automatically** the first time
they log in to the patient app with the same mobile number. New patients can
also self-register with the hospital code.

## 6. WhatsApp & SMS

- **Free, no setup:** *Settings → WhatsApp & SMS → From the hospital phone
  (click-to-chat)*. Messages are prepared in each patient's language; staff tap
  **Send** in *WhatsApp & SMS* and WhatsApp opens with the text ready.
- **Automatic:** get a WhatsApp Business API number (Meta Cloud API, Gupshup,
  Interakt, AiSensy) and/or an SMS gateway (MSG91). Deploy the edge function and
  store the keys as **server secrets** (never in the app):

  ```bash
  supabase functions deploy send-messages
  supabase secrets set WA_TOKEN=... WA_PHONE_ID=... MSG91_AUTH_KEY=... MSG91_TEMPLATE_ID=...
  ```

  Then schedule it every minute (Dashboard → Integrations → Cron). WhatsApp
  messages to patients outside a 24-hour chat window must use templates approved
  by WhatsApp. Messages are only ever queued for patients who gave consent.

## 7. Online payments

The demo uses a simulated UPI / card gateway. For real payments connect a
gateway (Razorpay, Cashfree, PayU) and mark bills as paid **from the gateway's
webhook** on the server, not from the browser.

## 8. Platform owner (Super Admin, optional)

To manage many hospitals, add your login to the platform admin list
(SQL editor):

```sql
insert into public.platform_admins select id from auth.users where phone = '919XXXXXXXXX';
```

Give the same login the `super_admin` role in your own hospital's *Staff & HR* to
see **Hospitals & plans** (usage counts only — never patient data). Suspending a
hospital blocks its logins immediately.

## 9. Before go-live checklist

- [ ] Backups / point-in-time recovery enabled in Supabase.
- [ ] Privacy notice and consent wording reviewed by your legal adviser
      (DPDP Act 2023, IT Act, state clinical-establishment rules).
- [ ] Health-awareness articles reviewed and approved by your doctors.
- [ ] Staff trained: reception (registration, queue, billing), doctors
      (consultation & e-prescription), nurses, pharmacy, lab.
- [ ] A test day run in parallel with your paper registers.
