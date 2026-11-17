# Source for the JeevO user manual (English and Marathi editions).
# Run:  python3 docs/guides/manual_src.py   -> writes user-manual-en.html and user-manual-mr.html
# [[Label]] becomes a button chip, exactly as the label appears on screen.
import re, pathlib

HERE = pathlib.Path(__file__).parent

T = {
 'en': dict(title='JeevO User Manual', lang='en', h1='User manual', sub='Hospital & clinic app · for patients, doctors, reception, nurses, medical store, laboratory and administrators',
            contents='Contents', who='Who', how='How to read this manual',
            howtext='Find your role in the contents. Buttons and menu names are shown in boxes, like [[Billing]], exactly as they appear on the screen. The app works in English, हिंदी and मराठी; if you use the app in Marathi, use the Marathi edition of this manual.',
            foot='JeevO · user manual · English edition'),
 'mr': dict(title='JeevO वापरकर्ता पुस्तिका', lang='mr', h1='वापरकर्ता पुस्तिका', sub='हॉस्पिटल व क्लिनिक ॲप · रुग्ण, डॉक्टर, रिसेप्शन, नर्स, मेडिकल स्टोअर, लॅब आणि प्रशासकांसाठी',
            contents='अनुक्रमणिका', who='कोणासाठी', how='ही पुस्तिका कशी वाचावी',
            howtext='अनुक्रमणिकेत तुमची भूमिका शोधा. बटणे व मेनूची नावे चौकटीत दाखवली आहेत, जसे [[बिलिंग]] — ॲपमध्ये जशी दिसतात तशीच. ॲप English, हिंदी व मराठीत चालते; ही पुस्तिका ॲप मराठीत वापरणाऱ्यांसाठी आहे.',
            foot='JeevO · वापरकर्ता पुस्तिका · मराठी आवृत्ती'),
}

# (id, colour, {en: (title, who, body), mr: (title, who, body)})
S = []
def sec(id, colour, en, mr): S.append((id, colour, {'en': en, 'mr': mr}))

# ---------------------------------------------------------------- 1. Getting started
sec('start', 'navy',
('Getting started', 'Everyone', '''
<h3>Open and install the app</h3>
<ul>
<li>The hospital gives you a link. It opens in Chrome or Safari on any phone, tablet or computer. No app store is needed.</li>
<li><b>Install on Android:</b> in Chrome tap ⋮ → <b>Add to Home screen</b> (or <b>Install app</b>).</li>
<li><b>Install on iPhone:</b> in Safari tap Share → <b>Add to Home Screen</b>.</li>
</ul>
<h3>Choose your language</h3>
<p>Pick English, हिंदी or मराठी on the first screen. You can change it any time with the language buttons at the top of the screen.</p>
<h3>Log in</h3>
<ol>
<li>Enter the mobile number the hospital registered for you.</li>
<li>Tap [[Send OTP]] and type the 6-digit code you receive.</li>
<li>Tap [[Verify & continue]]. The app opens the screens for your role.</li>
</ol>
<p><b>New patient?</b> Fill in name, age, gender and language, then tap [[Create my Patient ID]].</p>
<div class="tip"><b>Safety:</b> staff are logged out automatically after 30 minutes without use, to protect patient data. Never share your login. On a shared computer, log out from your profile when you leave.</div>
<div class="tip"><b>Updates:</b> the app updates itself. If you still see an old screen, close the app completely and open it again.</div>
'''),
('सुरुवात', 'सर्वांसाठी', '''
<h3>ॲप उघडा व इन्स्टॉल करा</h3>
<ul>
<li>हॉस्पिटल तुम्हाला एक लिंक देते. ती कोणत्याही फोन, टॅबलेट किंवा कॉम्प्युटरवर Chrome किंवा Safari मध्ये उघडते. ॲप स्टोअरची गरज नाही.</li>
<li><b>Android वर इन्स्टॉल:</b> Chrome मध्ये ⋮ → <b>Add to Home screen</b> (किंवा <b>Install app</b>).</li>
<li><b>iPhone वर इन्स्टॉल:</b> Safari मध्ये Share → <b>Add to Home Screen</b>.</li>
</ul>
<h3>भाषा निवडा</h3>
<p>पहिल्या स्क्रीनवर English, हिंदी किंवा मराठी निवडा. स्क्रीनच्या वरच्या भाषा बटणांनी कधीही बदलू शकता.</p>
<h3>लॉग इन</h3>
<ol>
<li>हॉस्पिटलने नोंदवलेला तुमचा मोबाइल नंबर टाका.</li>
<li>[[OTP पाठवा]] दाबा आणि आलेला ६ अंकी कोड टाका.</li>
<li>[[पडताळा व पुढे चला]] दाबा. तुमच्या भूमिकेनुसार स्क्रीन उघडतात.</li>
</ol>
<p><b>नवीन रुग्ण?</b> नाव, वय, लिंग व भाषा भरा आणि [[माझा पेशंट ID तयार करा]] दाबा.</p>
<div class="tip"><b>सुरक्षा:</b> रुग्णांची माहिती सुरक्षित राहावी म्हणून ३० मिनिटे वापर न झाल्यास कर्मचारी आपोआप लॉग आउट होतात. तुमचे लॉगिन कोणालाही देऊ नका. सामायिक कॉम्प्युटरवर काम संपल्यावर प्रोफाइलमधून लॉग आउट करा.</div>
<div class="tip"><b>अपडेट:</b> ॲप आपोआप अपडेट होते. जुनी स्क्रीन दिसत असल्यास ॲप पूर्ण बंद करून पुन्हा उघडा.</div>
'''))

# ---------------------------------------------------------------- Examples
def flow(rows):
    # rows: (step title, who, what html, result html)
    out = '<div class="flow">'
    for n, (t, who, what, res) in enumerate(rows, 1):
        out += f'<div class="fs"><div class="fn">{n}</div><div class="fb"><div class="ft"><b>{t}</b><span class="fw">{who}</span></div><div class="fx">{what}</div>' + (f'<div class="fr">{res}</div>' if res else '') + '</div></div>'
    return out + '</div>'

sec('ex-opd', 'teal',
('Example 1: an OPD visit, start to finish', 'Everyone: see who does what', '<p>A patient with fever books a visit, sees the doctor, buys medicines and gets a blood test. Each step shows <b>who</b> does it and <b>what the patient gets</b>.</p>' + flow([
 ('Book the appointment', 'Patient or Receptionist', 'Patient: [[Book Appointment]] → doctor → date and time → confirm.<br>Or reception (patient phones or walks in): [[Appointments]] → [[Book appointment]] → [[Confirm booking]].', 'Patient gets: booking confirmation, token number and reminders on WhatsApp / SMS.'),
 ('Arrive at the hospital', 'Receptionist', 'Find the patient by mobile number, Patient ID or QR code. New patient: [[Patients]] → [[Register patient]] → <b>Quick (essential details)</b>.', 'Patient gets: Patient ID (card or WhatsApp).'),
 ('Check in and pay the consultation fee', 'Receptionist', '[[Queue & tokens]] → [[Mark arrived]] → [[Confirm check-in]] → take the fee (cash or UPI). No booking? Use [[Walk-in]].', 'Hospital bill (BL-) and receipt. The live token appears on the patient\'s phone and the waiting-hall TV.'),
 ('Vitals', 'Nurse or Receptionist', 'Open the patient → [[Record vitals]]: BP, pulse, temperature, weight.', ''),
 ('Consultation', 'Doctor', '[[My OPD]] → <b>Call next</b> (or reception taps [[Send in]]) → notes and diagnosis → prescription → tick blood tests → <b>Order N test(s)</b> → [[Finish & sign]].', 'Patient gets: the prescription on the phone. The lab bill (LBL-) is made automatically for the tests.'),
 ('Medicines', 'Pharmacist', '[[Pharmacy]] → <b>To dispense</b> → open the prescription → check allergies → [[Dispense & bill]] → take payment.', 'Medical store bill (PH-) and receipt; stock is reduced.'),
 ('Blood test', 'Lab technician', '[[Laboratory]] → <b>To do</b> → take payment on the lab bill → [[Register sample & generate ID]] → [[Print sample label]] → [[Mark processing]] → enter results → [[Save results]].', ''),
 ('Check and send the report', 'Lab owner or authorised technician', 'A different person checks the results → [[Verify report]] → [[Publish to patient]].', 'Patient gets: the report in the app and a WhatsApp / SMS message. The doctor sees it in the patient\'s record.'),
 ('Follow-up', 'Doctor and Patient', 'The doctor set a follow-up date while signing. The patient books again from the app or at the desk.', 'Patient gets: a follow-up reminder.'),
]) + '<div class="tip"><b>Three receipts, three owners.</b> The consultation fee goes to the hospital (BL-), medicines to the medical store (PH-) and tests to the laboratory (LBL-). ECG, echo or X-ray ordered by the doctor are hospital tests, done in [[ECG / Echo / X-ray]] and billed by the hospital.</div>'),
('उदाहरण १: OPD भेट, सुरुवातीपासून शेवटपर्यंत', 'सर्वांसाठी: कोण काय करते', '<p>तापाचा रुग्ण भेट बुक करतो, डॉक्टरांना दाखवतो, औषधे घेतो व रक्ताची तपासणी करतो. प्रत्येक टप्प्यात <b>कोण</b> काम करते व <b>रुग्णाला काय मिळते</b> ते दाखवले आहे.</p>' + flow([
 ('भेट बुक करणे', 'रुग्ण किंवा रिसेप्शन', 'रुग्ण: [[भेट बुक करा]] → डॉक्टर → तारीख व वेळ → निश्चित करा.<br>किंवा रिसेप्शन (फोनवर किंवा प्रत्यक्ष): [[भेटी]] → [[भेट बुक करा]] → [[बुकिंग निश्चित करा]].', 'रुग्णाला मिळते: बुकिंगची निश्चिती, टोकन नंबर व WhatsApp / SMS वर आठवण.'),
 ('हॉस्पिटलमध्ये आगमन', 'रिसेप्शन', 'मोबाइल नंबर, पेशंट ID किंवा QR कोडने रुग्ण शोधा. नवीन रुग्ण: [[रुग्ण]] → [[रुग्ण नोंदणी करा]] → <b>जलद (आवश्यक माहिती)</b>.', 'रुग्णाला मिळते: पेशंट ID (कार्ड किंवा WhatsApp).'),
 ('चेक-इन व तपासणी फी', 'रिसेप्शन', '[[रांग व टोकन]] → [[आले म्हणून नोंदवा]] → [[चेक इन निश्चित करा]] → फी घ्या (रोख किंवा UPI). बुकिंग नाही? [[वॉक-इन]] वापरा.', 'हॉस्पिटलचे बिल (BL-) व पावती. लाइव्ह टोकन रुग्णाच्या फोनवर व प्रतीक्षा कक्षातील TV वर दिसतो.'),
 ('व्हायटल्स', 'नर्स किंवा रिसेप्शन', 'रुग्ण उघडा → [[व्हायटल्स नोंदवा]]: BP, नाडी, तापमान, वजन.', ''),
 ('डॉक्टरांची तपासणी', 'डॉक्टर', '[[माझी OPD]] → <b>पुढील बोलवा</b> (किंवा रिसेप्शन [[आत पाठवा]] दाबते) → नोंदी व निदान → प्रिस्क्रिप्शन → रक्त तपासण्या टिक करा → <b>N तपासण्या ऑर्डर करा</b> → [[पूर्ण करा व सही करा]].', 'रुग्णाला मिळते: फोनवर प्रिस्क्रिप्शन. तपासण्यांचे लॅब बिल (LBL-) आपोआप तयार होते.'),
 ('औषधे', 'फार्मासिस्ट', '[[फार्मसी]] → <b>द्यायचे बाकी</b> → प्रिस्क्रिप्शन उघडा → ॲलर्जी तपासा → [[औषध द्या व बिल करा]] → पैसे घ्या.', 'मेडिकल स्टोअरचे बिल (PH-) व पावती; साठा कमी होतो.'),
 ('रक्त तपासणी', 'लॅब टेक्निशियन', '[[प्रयोगशाळा]] → <b>करायचे बाकी</b> → लॅब बिलाचे पैसे घ्या → [[नमुना नोंदवा व ID तयार करा]] → [[नमुना लेबल प्रिंट करा]] → [[प्रक्रियेत टाका]] → निकाल भरा → [[निकाल जतन करा]].', ''),
 ('रिपोर्ट तपासणे व पाठवणे', 'लॅब मालक किंवा अधिकृत टेक्निशियन', 'दुसरी व्यक्ती निकाल तपासते → [[रिपोर्ट पडताळा]] → [[रुग्णाला पाठवा]].', 'रुग्णाला मिळते: ॲपमध्ये रिपोर्ट व WhatsApp / SMS मेसेज. डॉक्टरांना रुग्णाच्या नोंदीत रिपोर्ट दिसतो.'),
 ('फॉलो-अप', 'डॉक्टर व रुग्ण', 'सही करताना डॉक्टरांनी फॉलो-अप तारीख दिली. रुग्ण ॲपमधून किंवा रिसेप्शनवर पुन्हा बुक करतो.', 'रुग्णाला मिळते: फॉलो-अपची आठवण.'),
]) + '<div class="tip"><b>तीन पावत्या, तीन मालक.</b> तपासणी फी हॉस्पिटलकडे (BL-), औषधे मेडिकल स्टोअरकडे (PH-) व तपासण्या लॅबकडे (LBL-). डॉक्टरांनी सांगितलेले ECG, इको किंवा एक्स-रे हॉस्पिटलच्या तपासण्या आहेत; त्या [[ECG / इको / एक्स-रे]] मध्ये होतात व हॉस्पिटल बिल करते.</div>'))

sec('ex-ipd', 'teal',
('Example 2: admission, treatment and discharge', 'Everyone: see who does what', '<p>A patient is admitted for 2 days, treated in the ward, discharged and billed. Each step shows <b>who</b> does it.</p>' + flow([
 ('Arrival and consultation', 'Receptionist, then Doctor', 'Reception checks the patient in as in Example 1 (or registers an [[Emergency]]). The doctor examines the patient and decides to admit: [[Admit]] on the consultation screen.', ''),
 ('Bed and admission', 'Receptionist (or Doctor / Administrator)', '[[Beds & admissions]] → [[Admit patient]] → choose a free bed (ICU, general, semi-special or special) → attending doctor → reason and provisional diagnosis → expected discharge → <b>advance deposit</b> and how it was paid → insurer and policy number if cashless → save.', 'Admission number (IP-), deposit receipt (BL-). The bed shows as occupied on the bed board. The family gets a message.'),
 ('Cashless approval (if insured)', 'Receptionist or Administrator', '[[Insurance & cashless]] → open the admission → record the pre-authorisation request and the approved amount.', ''),
 ('Treatment, day 1 and day 2', 'Doctor and Nurse', '<b>Doctor:</b> ward round notes in the admission (Notes), tasks for nurses (Tasks), discharge plan.<br><b>Nurse:</b> [[Nursing]] → [[Vitals]] every shift → [[Medicine]] each time a medicine is given → [[Note]] for observations → tick tasks [[Done]].', ''),
 ('Medicines and tests in the ward', 'Pharmacist and Lab technician', '<b>Medicines:</b> [[Pharmacy]] → [[Counter sale]] against the patient\'s name (medical store bill PH-).<br><b>Tests:</b> [[Laboratory]] → [[Create order]] with <b>Referred by Dr.</b> → same steps as Example 1 (lab bill LBL-).', 'The ward team sees the results in the patient\'s record.'),
 ('Discharge summary', 'Doctor', 'Admission → [[Discharge summary]]: final diagnosis, course in hospital, procedures, medicines at discharge, advice, follow-up date, condition at discharge → [[Save summary]].', ''),
 ('Final hospital bill', 'Receptionist', 'Admission → <b>Bill room charges (N days)</b>. Room and nursing charges are calculated from the ward rate, and the <b>advance deposit is deducted automatically</b>. Collect the balance (or choose <b>Insurance (cashless)</b>).', 'Final hospital bill and receipt. Any deposit not used is shown as "Advance deposit not yet adjusted".'),
 ('Discharge', 'Doctor', 'Admission → [[Discharge]]. The app shows any pending balance before confirming.', 'The bed becomes free. Patient gets the discharge summary in the app (Records → History) and a WhatsApp / SMS message.'),
 ('After discharge', 'Administrator, Pharmacist, Lab', 'Unused deposit: the administrator opens the deposit bill → [[Refund]] with reason. Cashless: update the claim status. Medicine and lab bills are settled at the medical store and the lab.', ''),
]) + '<div class="tip">Bill the room charges <b>before</b> pressing [[Discharge]]: the room-charge button is available only while the patient is admitted. You can also bill room charges during the stay (for example every 2–3 days); each bill covers only the days not billed before.</div>'),
('उदाहरण २: दाखल, उपचार व डिस्चार्ज', 'सर्वांसाठी: कोण काय करते', '<p>रुग्ण २ दिवस दाखल होतो, वॉर्डमध्ये उपचार होतात, डिस्चार्ज व बिल होते. प्रत्येक टप्प्यात <b>कोण</b> काम करते ते दाखवले आहे.</p>' + flow([
 ('आगमन व तपासणी', 'रिसेप्शन, मग डॉक्टर', 'उदाहरण १ प्रमाणे रिसेप्शन चेक-इन करते (किंवा [[आपत्कालीन]] नोंदणी). डॉक्टर तपासून दाखल करण्याचा निर्णय घेतात: तपासणी स्क्रीनवर [[दाखल करा]].', ''),
 ('बेड व दाखल', 'रिसेप्शन (किंवा डॉक्टर / प्रशासक)', '[[बेड व दाखल]] → [[रुग्ण दाखल करा]] → रिकामा बेड निवडा (ICU, जनरल, सेमी-स्पेशल किंवा स्पेशल) → जबाबदार डॉक्टर → कारण व प्राथमिक निदान → अपेक्षित डिस्चार्ज → <b>आगाऊ ठेव</b> व भरण्याची पद्धत → कॅशलेस असल्यास विमा कंपनी व पॉलिसी नंबर → जतन करा.', 'दाखल क्रमांक (IP-), ठेवीची पावती (BL-). बेड बोर्डवर बेड "व्यापलेला" दिसतो. नातेवाईकांना मेसेज जातो.'),
 ('कॅशलेस मंजुरी (विमा असल्यास)', 'रिसेप्शन किंवा प्रशासक', '[[विमा व कॅशलेस]] → दाखल उघडा → प्री-ऑथ विनंती व मंजूर रक्कम नोंदवा.', ''),
 ('उपचार, दिवस १ व दिवस २', 'डॉक्टर व नर्स', '<b>डॉक्टर:</b> दाखलमध्ये राउंडच्या नोंदी (नोंदी), नर्ससाठी कामे (कामे), डिस्चार्जची योजना.<br><b>नर्स:</b> [[नर्सिंग]] → प्रत्येक शिफ्टला [[व्हायटल्स]] → प्रत्येक वेळी औषध दिल्यावर [[औषध]] → निरीक्षणासाठी [[नोंद]] → कामे [[झाले]] टिक करा.', ''),
 ('वॉर्डमधील औषधे व तपासण्या', 'फार्मासिस्ट व लॅब टेक्निशियन', '<b>औषधे:</b> [[फार्मसी]] → रुग्णाच्या नावावर [[काउंटर विक्री]] (मेडिकल स्टोअर बिल PH-).<br><b>तपासण्या:</b> [[प्रयोगशाळा]] → <b>Referred by Dr.</b> सह [[ऑर्डर तयार करा]] → उदाहरण १ प्रमाणे पुढील टप्पे (लॅब बिल LBL-).', 'वॉर्ड टीमला रुग्णाच्या नोंदीत निकाल दिसतात.'),
 ('डिस्चार्ज सारांश', 'डॉक्टर', 'दाखल → [[डिस्चार्ज सारांश]]: अंतिम निदान, हॉस्पिटलमधील उपचार, प्रक्रिया, डिस्चार्जवेळची औषधे, सल्ला, फॉलो-अप तारीख, डिस्चार्जवेळची स्थिती → [[सारांश जतन करा]].', ''),
 ('हॉस्पिटलचे अंतिम बिल', 'रिसेप्शन', 'दाखल → <b>खोलीचे शुल्क बिल करा (N दिवस)</b>. वॉर्डच्या दराने खोली व नर्सिंग शुल्क मोजले जाते, व <b>आगाऊ ठेव आपोआप वजा होते</b>. उरलेली रक्कम घ्या (किंवा <b>विमा (कॅशलेस)</b> निवडा).', 'हॉस्पिटलचे अंतिम बिल व पावती. न वापरलेली ठेव "अजून वजा न झालेली आगाऊ ठेव" म्हणून दिसते.'),
 ('डिस्चार्ज', 'डॉक्टर', 'दाखल → [[डिस्चार्ज]]. निश्चित करण्याआधी ॲप बाकी रक्कम दाखवते.', 'बेड रिकामा होतो. रुग्णाला ॲपमध्ये (नोंदी → इतिहास) डिस्चार्ज सारांश व WhatsApp / SMS मेसेज मिळतो.'),
 ('डिस्चार्जनंतर', 'प्रशासक, फार्मासिस्ट, लॅब', 'न वापरलेली ठेव: प्रशासक ठेवीचे बिल उघडून कारणासह [[परतावा]] करतात. कॅशलेस: क्लेमची स्थिती अपडेट करा. औषधे व लॅबची बिले मेडिकल स्टोअर व लॅबमध्ये भरली जातात.', ''),
]) + '<div class="tip">[[डिस्चार्ज]] दाबण्या<b>आधी</b> खोलीचे शुल्क बिल करा: रुग्ण दाखल असेपर्यंतच हे बटण दिसते. मुक्कामादरम्यानही (उदा. दर २–३ दिवसांनी) खोलीचे शुल्क बिल करता येते; प्रत्येक बिल आधी बिल न झालेल्या दिवसांचेच असते.</div>'))

# ---------------------------------------------------------------- 2. Patient
sec('patient', 'teal',
('Patient', 'Patients and their families', '''
<p>The home screen shows your next appointment, your live token and quick buttons for everything below.</p>
<h3>Book an appointment</h3>
<ol>
<li>Tap [[Book Appointment]] (or [[Find a Doctor]]).</li>
<li>Choose the doctor, then the date and time. Add a reason if you like.</li>
<li>Confirm. You get a confirmation and reminders on WhatsApp or SMS.</li>
</ol>
<p><b>For a family member:</b> choose their name in the family switch at the top before booking.</p>
<h3>On the day</h3>
<ul><li>The home screen shows your token number and the expected waiting time. You get a message when your turn is near.</li>
<li>To change plans: [[Appointments]] → open the booking → [[Reschedule]] or [[Cancel]].</li></ul>
<h3>Your health records</h3>
<ul><li>[[Records]] → Prescriptions, Reports, History (visits, hospital stays, referral letters) and Vaccines.</li>
<li>Lab reports appear only after the laboratory has checked and verified them.</li>
<li>Show your Patient QR code at the reception (Profile → Show QR) for quick check-in.</li></ul>
<h3>Bills</h3>
<p>[[Bills]] → open a bill → pay by UPI, card or net banking → [[View receipt]].</p>
<h3>Family and settings</h3>
<ul><li>Profile → My family → [[Add family member]]. One login covers the whole family.</li>
<li>Profile → choose your message language and whether you agree to WhatsApp / SMS messages.</li>
<li>After a visit, tap [[Rate your visit]] to give feedback or raise a complaint.</li></ul>
'''),
('रुग्ण', 'रुग्ण व त्यांचे कुटुंब', '''
<p>होम स्क्रीनवर तुमची पुढची भेट, लाइव्ह टोकन आणि खालील सर्व गोष्टींची झटपट बटणे दिसतात.</p>
<h3>भेट (अपॉइंटमेंट) बुक करा</h3>
<ol>
<li>[[भेट बुक करा]] (किंवा [[डॉक्टर शोधा]]) दाबा.</li>
<li>डॉक्टर निवडा, मग तारीख व वेळ. हवे असल्यास कारण लिहा.</li>
<li>निश्चित करा. WhatsApp किंवा SMS वर निश्चिती व आठवण येते.</li>
</ol>
<p><b>कुटुंबातील सदस्यासाठी:</b> बुक करण्याआधी वरच्या कुटुंब निवडीत त्यांचे नाव निवडा.</p>
<h3>भेटीच्या दिवशी</h3>
<ul><li>होम स्क्रीनवर तुमचा टोकन नंबर व अंदाजे प्रतीक्षा वेळ दिसते. नंबर जवळ आला की मेसेज येतो.</li>
<li>बदल करायचा असल्यास: [[भेटी]] → बुकिंग उघडा → [[वेळ बदला]] किंवा [[रद्द करा]].</li></ul>
<h3>तुमच्या आरोग्य नोंदी</h3>
<ul><li>[[नोंदी]] → प्रिस्क्रिप्शन, रिपोर्ट, इतिहास (भेटी, दाखल, संदर्भ पत्रे) व लसीकरण.</li>
<li>लॅब रिपोर्ट लॅबने तपासून व्हेरिफाय केल्यानंतरच दिसतात.</li>
<li>झटपट चेक-इनसाठी रिसेप्शनवर तुमचा पेशंट QR कोड दाखवा (प्रोफाइल → QR दाखवा).</li></ul>
<h3>बिले</h3>
<p>[[बिले]] → बिल उघडा → UPI, कार्ड किंवा नेट बँकिंगने भरा → [[पावती पहा]].</p>
<h3>कुटुंब व सेटिंग्ज</h3>
<ul><li>प्रोफाइल → माझे कुटुंब → [[कुटुंबातील सदस्य जोडा]]. एकाच लॉगिनमध्ये संपूर्ण कुटुंब.</li>
<li>प्रोफाइल → मेसेजची भाषा निवडा आणि WhatsApp / SMS मेसेजला संमती द्या.</li>
<li>भेटीनंतर अभिप्राय किंवा तक्रारीसाठी [[तुमच्या भेटीला रेटिंग द्या]] दाबा.</li></ul>
'''))

# ---------------------------------------------------------------- 3. Receptionist
sec('reception', 'navy',
('Receptionist', 'Front desk', '''
<h3>Register a patient</h3>
<ol>
<li>[[Patients]] → [[Register patient]]. Choose <b>Quick (essential details)</b> for a fast entry or <b>Full registration</b>.</li>
<li>Enter mobile, name, age and gender. If the app finds a similar patient it asks <b>Is this an existing patient?</b> Pick the existing one if it is the same person; otherwise tap [[No – register as a new patient]].</li>
<li>The Patient ID is created. Give the [[Patient card]] or tap [[Send Patient ID on WhatsApp]]. Tick the patient's consent for WhatsApp / SMS.</li>
</ol>
<h3>Appointments</h3>
<p>[[Appointments]] → [[Book appointment]] → patient, doctor, date and time → [[Confirm booking]]. Open any booking to [[Reschedule]], [[Cancel]] or [[Send reminder]].</p>
<h3>Queue and tokens</h3>
<ol>
<li>Patient arrives: [[Queue & tokens]] → [[Mark arrived]] → [[Confirm check-in]]. The consultation fee is billed here.</li>
<li>No appointment? Tap [[Walk-in]] to give the next token.</li>
<li>When the doctor is ready: [[Send in]]. Patient did not come: [[No-show]].</li>
<li>[[TV display]] shows the token board on the waiting-hall TV.</li>
</ol>
<div class="tip">Emergency patients always appear at the top of the queue.</div>
<h3>Emergency</h3>
<p>[[Emergency]] → [[Existing patient]] or [[New / unknown patient]] → main problem → [[Register emergency now]]. Never delay treatment for paperwork; complete the details later.</p>
<h3>Admissions, vitals, billing</h3>
<ul><li><b>Admit:</b> [[Beds & admissions]] → [[Admit patient]] → bed, doctor, reason, advance deposit, insurer (if cashless). [[Transfer bed]] moves a patient; <b>Bill room charges</b> bills the stay.</li>
<li><b>Vitals:</b> open the patient → [[Record vitals]].</li>
<li><b>Billing:</b> see the Billing section and the one-page billing guide.</li>
<li><b>Insurance & cashless:</b> track pre-authorisation and claim status for insured patients.</li>
<li><b>WhatsApp & SMS:</b> messages to patients are sent only if the patient agreed.</li></ul>
'''),
('रिसेप्शन', 'रिसेप्शन / फ्रंट डेस्क', '''
<h3>रुग्ण नोंदणी</h3>
<ol>
<li>[[रुग्ण]] → [[रुग्ण नोंदणी करा]]. झटपट नोंदीसाठी <b>जलद (आवश्यक माहिती)</b> किंवा <b>संपूर्ण नोंदणी</b> निवडा.</li>
<li>मोबाइल, नाव, वय व लिंग भरा. सारखा रुग्ण आढळल्यास ॲप <b>हा जुना रुग्ण आहे का?</b> विचारते. तीच व्यक्ती असल्यास जुना रुग्ण निवडा; नाहीतर [[नाही – नवीन रुग्ण म्हणून नोंदणी करा]] दाबा.</li>
<li>पेशंट ID तयार होतो. [[रुग्ण कार्ड]] द्या किंवा [[WhatsApp वर पेशंट ID पाठवा]] दाबा. WhatsApp / SMS साठी रुग्णाची संमती टिक करा.</li>
</ol>
<h3>भेटी (अपॉइंटमेंट)</h3>
<p>[[भेटी]] → [[भेट बुक करा]] → रुग्ण, डॉक्टर, तारीख व वेळ → [[बुकिंग निश्चित करा]]. कोणतीही बुकिंग उघडून [[वेळ बदला]], [[रद्द करा]] किंवा [[आठवण पाठवा]].</p>
<h3>रांग व टोकन</h3>
<ol>
<li>रुग्ण आला: [[रांग व टोकन]] → [[आले म्हणून नोंदवा]] → [[चेक इन निश्चित करा]]. तपासणी फीचे बिल इथेच होते.</li>
<li>अपॉइंटमेंट नाही? पुढचा टोकन देण्यासाठी [[वॉक-इन]] दाबा.</li>
<li>डॉक्टर तयार असल्यावर: [[आत पाठवा]]. रुग्ण आला नाही: [[आले नाहीत]].</li>
<li>[[TV डिस्प्ले]] प्रतीक्षा कक्षातील TV वर टोकन बोर्ड दाखवतो.</li>
</ol>
<div class="tip">आपत्कालीन रुग्ण नेहमी रांगेत सर्वात वर दिसतात.</div>
<h3>आपत्कालीन</h3>
<p>[[आपत्कालीन]] → [[जुना रुग्ण]] किंवा [[नवीन / अनोळखी रुग्ण]] → मुख्य त्रास → [[आत्ता आपत्कालीन नोंदणी करा]]. कागदपत्रांसाठी उपचार थांबवू नका; माहिती नंतर पूर्ण करा.</p>
<h3>दाखल, व्हायटल्स, बिलिंग</h3>
<ul><li><b>दाखल:</b> [[बेड व दाखल]] → [[रुग्ण दाखल करा]] → बेड, डॉक्टर, कारण, आगाऊ ठेव, विमा कंपनी (कॅशलेस असल्यास). [[बेड बदला]] ने रुग्ण हलवा; <b>खोलीचे शुल्क बिल करा</b> ने मुक्कामाचे बिल होते.</li>
<li><b>व्हायटल्स:</b> रुग्ण उघडा → [[व्हायटल्स नोंदवा]].</li>
<li><b>बिलिंग:</b> बिलिंग विभाग व एक पानी बिलिंग मार्गदर्शिका पहा.</li>
<li><b>विमा व कॅशलेस:</b> विमा असलेल्या रुग्णांचे प्री-ऑथ व क्लेमची स्थिती पहा.</li>
<li><b>WhatsApp व SMS:</b> रुग्णाने संमती दिली असेल तरच मेसेज जातात.</li></ul>
'''))

# ---------------------------------------------------------------- 4. Doctor
sec('doctor', 'navy',
('Doctor', 'Doctors', '''
<h3>See patients</h3>
<ol>
<li>[[My OPD]] lists today's patients in token order. Tap <b>Call next · Token N</b>, or open a patient and tap [[Start consultation]].</li>
<li>The screen shows earlier visits, prescriptions and reports, and today's <b>Vital signs</b>.</li>
<li>Write <b>Clinical notes</b>: complaints, examination, diagnosis.</li>
<li><b>Prescription:</b> type a medicine (brand or generic), then dose, frequency, duration and quantity. The app warns about the patient's allergies. [[Repeat]] copies an earlier prescription. Choose <b>Print instructions also in</b> Marathi or Hindi.</li>
<li><b>Diagnostic tests:</b> tick the tests and tap <b>Order N test(s)</b>. Pathology goes to the laboratory; ECG, echo and X-ray stay with the hospital.</li>
<li>Set a follow-up date if needed. [[Save draft]] keeps your work; [[Finish & sign]] completes the visit. The prescription reaches the patient's phone and the medical store.</li>
</ol>
<div class="tip"><b>A signed prescription cannot be edited.</b> Tap [[Correct prescription]], make the change and sign the corrected one. The old one stays in the record, marked as replaced.</div>
<h3>Refer, admit, discharge</h3>
<ul><li>[[Refer]] → doctor, speciality, place, reason → [[Create referral letter]] → print or share.</li>
<li>[[Admit]] sends the patient to Beds & admissions. For admitted patients: notes, [[Discharge summary]] → [[Discharge]].</li>
<li>[[ECG / Echo / X-ray]]: enter and verify the hospital's own investigation reports.</li></ul>
<h3>Your timings and content</h3>
<ul><li>My account → <b>Availability</b>: working days, consultation hours, appointment length, maximum per day → [[Save availability]].</li>
<li>[[Health content]]: review and publish health articles for patients. Only a doctor can publish.</li>
<li>A doctor with administrator rights also sees the administrator menus (see Hospital administrator).</li></ul>
'''),
('डॉक्टर', 'डॉक्टर', '''
<h3>रुग्ण तपासणी</h3>
<ol>
<li>[[माझी OPD]] मध्ये आजचे रुग्ण टोकनच्या क्रमाने दिसतात. <b>पुढील बोलवा · टोकन N</b> दाबा, किंवा रुग्ण उघडून [[तपासणी सुरू करा]] दाबा.</li>
<li>स्क्रीनवर आधीच्या भेटी, प्रिस्क्रिप्शन, रिपोर्ट आणि आजचे <b>व्हायटल साइन्स</b> दिसतात.</li>
<li><b>क्लिनिकल नोंदी</b> लिहा: तक्रारी, तपासणी, निदान.</li>
<li><b>प्रिस्क्रिप्शन:</b> औषधाचे नाव टाका (ब्रँड किंवा जेनेरिक), मग डोस, वारंवारता, कालावधी व संख्या. रुग्णाच्या ॲलर्जीबद्दल ॲप इशारा देते. [[पुन्हा द्या]] ने आधीचे प्रिस्क्रिप्शन कॉपी होते. <b>सूचना यातही छापा</b> मध्ये मराठी किंवा हिंदी निवडा.</li>
<li><b>तपासण्या:</b> तपासण्या टिक करा व <b>N तपासण्या ऑर्डर करा</b> दाबा. पॅथॉलॉजी लॅबकडे जाते; ECG, इको व एक्स-रे हॉस्पिटलकडे राहतात.</li>
<li>गरज असल्यास फॉलो-अप तारीख द्या. [[मसुदा जतन करा]] ने काम जतन होते; [[पूर्ण करा व सही करा]] ने भेट पूर्ण होते. प्रिस्क्रिप्शन रुग्णाच्या फोनवर व मेडिकल स्टोअरला जाते.</li>
</ol>
<div class="tip"><b>सही केलेले प्रिस्क्रिप्शन बदलता येत नाही.</b> [[प्रिस्क्रिप्शन दुरुस्त करा]] दाबा, बदल करा व दुरुस्त प्रिस्क्रिप्शनवर सही करा. जुने प्रिस्क्रिप्शन "बदललेले" म्हणून नोंदीत राहते.</div>
<h3>संदर्भ, दाखल, डिस्चार्ज</h3>
<ul><li>[[संदर्भ द्या]] → डॉक्टर, स्पेशालिटी, ठिकाण, कारण → [[संदर्भ पत्र तयार करा]] → प्रिंट किंवा शेअर.</li>
<li>[[दाखल करा]] ने रुग्ण बेड व दाखल विभागात जातो. दाखल रुग्णांसाठी: नोंदी, [[डिस्चार्ज सारांश]] → [[डिस्चार्ज]].</li>
<li>[[ECG / इको / एक्स-रे]]: हॉस्पिटलच्या स्वतःच्या तपासण्यांचे रिपोर्ट भरा व व्हेरिफाय करा.</li></ul>
<h3>तुमच्या वेळा व माहिती</h3>
<ul><li>माझे खाते → <b>उपलब्धता</b>: कामाचे दिवस, तपासणीची वेळ, एका भेटीचा कालावधी, दिवसाला जास्तीत जास्त रुग्ण → [[उपलब्धता जतन करा]].</li>
<li>[[आरोग्य माहिती]]: रुग्णांसाठी आरोग्य लेख तपासा व प्रसिद्ध करा. फक्त डॉक्टर प्रसिद्ध करू शकतात.</li>
<li>प्रशासक अधिकार असलेल्या डॉक्टरांना प्रशासकाचे मेनूही दिसतात (हॉस्पिटल प्रशासक विभाग पहा).</li></ul>
'''))

# ---------------------------------------------------------------- 5. Nurse
sec('nurse', 'navy',
('Nurse', 'Nursing staff', '''
<h3>Ward work</h3>
<ol>
<li>[[Nursing]] shows admitted patients and the task list, by ward.</li>
<li>For each patient: [[Vitals]] to record readings, [[Medicine]] to record a medicine given (dose and route), [[Note]] for a nursing note or observation.</li>
<li>Tick a task [[Done]] when it is finished. Overdue tasks are highlighted.</li>
</ol>
<h3>Also</h3>
<ul><li>Record vitals for OPD patients: open the patient → [[Record vitals]].</li>
<li>Register an emergency from [[Emergency]].</li>
<li>Work on ECG, echo and X-ray orders in [[ECG / Echo / X-ray]].</li></ul>
<div class="tip">Saved vitals, medicines and notes cannot be changed or deleted. If something was wrong, add a new note that explains the correction.</div>
'''),
('नर्स', 'नर्सिंग कर्मचारी', '''
<h3>वॉर्डमधील काम</h3>
<ol>
<li>[[नर्सिंग]] मध्ये वॉर्डनुसार दाखल रुग्ण व कामांची यादी दिसते.</li>
<li>प्रत्येक रुग्णासाठी: रीडिंग नोंदवण्यासाठी [[व्हायटल्स]], दिलेले औषध (डोस व मार्ग) नोंदवण्यासाठी [[औषध]], नर्सिंग नोंद किंवा निरीक्षणासाठी [[नोंद]].</li>
<li>काम झाल्यावर [[झाले]] टिक करा. उशीर झालेली कामे ठळक दिसतात.</li>
</ol>
<h3>याशिवाय</h3>
<ul><li>OPD रुग्णांचे व्हायटल्स: रुग्ण उघडा → [[व्हायटल्स नोंदवा]].</li>
<li>[[आपत्कालीन]] मधून आपत्कालीन नोंदणी.</li>
<li>[[ECG / इको / एक्स-रे]] मध्ये ECG, इको व एक्स-रेची कामे.</li></ul>
<div class="tip">जतन केलेले व्हायटल्स, औषधे व नोंदी बदलता किंवा काढता येत नाहीत. चूक झाल्यास दुरुस्ती सांगणारी नवीन नोंद लिहा.</div>
'''))

# ---------------------------------------------------------------- 6. Pharmacist
sec('pharmacist', 'green',
('Pharmacist', 'Medical store staff', '''
<h3>Dispense a prescription</h3>
<ol>
<li>[[Pharmacy]] → <b>To dispense</b> lists prescriptions signed by doctors.</li>
<li>Open one, check the patient's allergies shown on screen, then tap [[Dispense & bill]].</li>
<li>The app picks the batch with the earliest expiry, reduces stock and makes the medical store bill.</li>
</ol>
<h3>Counter sale (without prescription)</h3>
<p>[[Counter sale]] → search the medicine or [[Scan]] the barcode → quantity → [[Complete sale]].</p>
<h3>Stock and expiry</h3>
<ul><li>[[Add medicine]]: brand, generic name, strength, form, MRP and minimum stock level.</li>
<li>[[Stock in]]: batch number, expiry month, quantity and purchase price for new stock.</li>
<li>[[Write off]] expired or damaged stock; [[Record return]] when a patient returns medicine.</li>
<li>The dashboard shows low-stock and expiring batches. [[Export]] gives the stock list for Excel.</li></ul>
<div class="tip">You see only the medical store's bills. Refunds and cancellations are done by the store owner.</div>
'''),
('फार्मासिस्ट', 'मेडिकल स्टोअर कर्मचारी', '''
<h3>प्रिस्क्रिप्शनप्रमाणे औषध देणे</h3>
<ol>
<li>[[फार्मसी]] → <b>द्यायचे बाकी</b> मध्ये डॉक्टरांनी सही केलेली प्रिस्क्रिप्शन दिसतात.</li>
<li>एक उघडा, स्क्रीनवरील रुग्णाची ॲलर्जी तपासा, मग [[औषध द्या व बिल करा]] दाबा.</li>
<li>ॲप सर्वात लवकर एक्सपायरी असलेली बॅच निवडते, साठा कमी करते व मेडिकल स्टोअरचे बिल करते.</li>
</ol>
<h3>काउंटर विक्री (प्रिस्क्रिप्शनशिवाय)</h3>
<p>[[काउंटर विक्री]] → औषध शोधा किंवा बारकोड [[स्कॅन]] करा → संख्या → [[विक्री पूर्ण करा]].</p>
<h3>साठा व मुदत</h3>
<ul><li>[[औषध जोडा]]: ब्रँड, जेनेरिक नाव, स्ट्रेंथ, प्रकार, MRP व किमान साठा.</li>
<li>[[साठा जमा]]: नवीन मालासाठी बॅच नंबर, एक्सपायरी महिना, संख्या व खरेदी किंमत.</li>
<li>मुदत संपलेला किंवा खराब माल [[निर्लेखित करा]]; रुग्णाने औषध परत केल्यास [[परत नोंदवा]].</li>
<li>डॅशबोर्डवर कमी साठा व मुदत संपणाऱ्या बॅच दिसतात. [[निर्यात करा]] ने साठ्याची यादी Excel साठी मिळते.</li></ul>
<div class="tip">तुम्हाला फक्त मेडिकल स्टोअरची बिले दिसतात. परतावा व बिल रद्द करणे स्टोअरचे मालक करतात.</div>
'''))

# ---------------------------------------------------------------- 7. Lab technician
sec('labtech', 'maroon',
('Lab technician', 'Laboratory staff', '''
<h3>From order to report</h3>
<ol>
<li>[[Laboratory]] → <b>To do</b>. Doctors' test orders arrive automatically. For an outside patient, tap [[Create order]] and fill <b>Referred by Dr.</b></li>
<li>[[Register sample & generate ID]] → [[Print sample label]] and stick it on the sample.</li>
<li>[[Mark processing]] when the test is running.</li>
<li>Enter results. Normal ranges are shown and abnormal values are flagged. Add remarks or attach a file ([[Add file]]), then [[Save results]].</li>
<li>A <b>different</b> authorised person checks and taps [[Verify report]]. You cannot verify results you entered yourself.</li>
<li>[[Publish to patient]]. The patient sees the report in the app and gets a message.</li>
</ol>
<div class="tip"><b>Mistake after verification?</b> An authorised person taps [[Reopen for correction]] and gives a reason. Correct the result, then it is verified again. Every change is kept in the audit log.</div>
<p>You see only laboratory bills. Refunds and cancellations are done by the lab owner.</p>
'''),
('लॅब टेक्निशियन', 'लॅब कर्मचारी', '''
<h3>ऑर्डरपासून रिपोर्टपर्यंत</h3>
<ol>
<li>[[प्रयोगशाळा]] → <b>करायचे बाकी</b>. डॉक्टरांच्या तपासणी ऑर्डर आपोआप येतात. बाहेरच्या रुग्णासाठी [[ऑर्डर तयार करा]] दाबा व <b>Referred by Dr.</b> भरा.</li>
<li>[[नमुना नोंदवा व ID तयार करा]] → [[नमुना लेबल प्रिंट करा]] व लेबल नमुन्यावर लावा.</li>
<li>तपासणी सुरू झाल्यावर [[प्रक्रियेत टाका]].</li>
<li>निकाल भरा. नॉर्मल रेंज दिसते व असामान्य मूल्ये ठळक होतात. शेरा लिहा किंवा फाईल जोडा ([[फाईल जोडा]]), मग [[निकाल जतन करा]].</li>
<li><b>दुसरी</b> अधिकृत व्यक्ती तपासून [[रिपोर्ट पडताळा]] दाबते. तुम्ही भरलेले निकाल तुम्ही स्वतः व्हेरिफाय करू शकत नाही.</li>
<li>[[रुग्णाला पाठवा]]. रुग्णाला ॲपमध्ये रिपोर्ट दिसतो व मेसेज जातो.</li>
</ol>
<div class="tip"><b>व्हेरिफाय झाल्यावर चूक दिसली?</b> अधिकृत व्यक्ती कारण लिहून [[दुरुस्तीसाठी पुन्हा उघडा]] दाबते. निकाल दुरुस्त करा, मग पुन्हा व्हेरिफाय होतो. प्रत्येक बदल ऑडिट नोंदीत राहतो.</div>
<p>तुम्हाला फक्त लॅबची बिले दिसतात. परतावा व बिल रद्द करणे लॅबचे मालक करतात.</p>
'''))

# ---------------------------------------------------------------- 8. Billing (all billing staff)
sec('billing', 'navy',
('Billing', 'Reception, medical store and lab staff; owners and administrators', '''
<h3>Create a bill</h3>
<ol>
<li>[[Billing]] → [[New bill]] → select the patient.</li>
<li>Add items from the lists (consultation, procedure / service, lab test) or a [[Custom item]]. Discounts can be given only by the administrator / owner and reception.</li>
<li>Choose the payment method and amount (leave empty for the full amount; less for part payment; or <b>Not paid now</b>) → [[Create bill]].</li>
<li>Print, PDF, Share or [[Send receipt on WhatsApp]].</li>
</ol>
<p>Many bills are made automatically: the consultation fee at check-in, medicines at the pharmacy, tests in the lab, and room charges for admitted patients.</p>
<h3>Collect a balance</h3>
<p>[[Billing]] → <b>Outstanding</b> → open the bill → <b>Collect ₹…</b> (part payment allowed).</p>
<h3>Why bills cannot be edited, and how to correct a mistake</h3>
<p>A bill is a money record: the patient may already hold the receipt and the day's cash must match it. So items and amounts are locked, and every correction is a new entry with a reason.</p>
<table>
<tr><td>Wrong bill, not paid yet</td><td>[[Cancel bill]] with reason → make a new correct bill.</td></tr>
<tr><td>Wrong bill, already paid</td><td>[[Refund]] the full amount → [[Cancel bill]] → new correct bill.</td></tr>
<tr><td>Charged too much</td><td>[[Refund]] only the extra amount.</td></tr>
<tr><td>Item left out</td><td>Make a separate new bill for that item.</td></tr>
</table>
<div class="tip">Only the administrator / owner of the unit sees [[Refund]] and [[Cancel bill]]. Staff: tell them the bill number and reason. See also the one-page billing guide.</div>
'''),
('बिलिंग', 'रिसेप्शन, मेडिकल स्टोअर व लॅब कर्मचारी; मालक व प्रशासक', '''
<h3>बिल तयार करा</h3>
<ol>
<li>[[बिलिंग]] → [[नवीन बिल]] → रुग्ण निवडा.</li>
<li>यादीतून बाबी जोडा (तपासणी, प्रक्रिया / सेवा, लॅब तपासणी) किंवा [[इतर बाब]]. सूट फक्त प्रशासक / मालक व रिसेप्शन देऊ शकतात.</li>
<li>भरण्याची पद्धत व रक्कम निवडा (पूर्ण रकमेसाठी रिकामे; अंशतः भरणा असल्यास कमी; किंवा <b>आत्ता भरलेले नाही</b>) → [[बिल तयार करा]].</li>
<li>प्रिंट, PDF, शेअर किंवा [[WhatsApp वर पावती पाठवा]].</li>
</ol>
<p>अनेक बिले आपोआप होतात: चेक-इनवेळी तपासणी फी, फार्मसीत औषधे, लॅबमध्ये तपासण्या व दाखल रुग्णांचे खोली शुल्क.</p>
<h3>उरलेली रक्कम घ्या</h3>
<p>[[बिलिंग]] → <b>थकबाकी</b> → बिल उघडा → <b>₹… घ्या</b> (अंशतः भरणा चालेल).</p>
<h3>बिल का बदलता येत नाही, व चूक कशी दुरुस्त करावी</h3>
<p>बिल ही पैशांची नोंद आहे: रुग्णाकडे पावती असते व दिवसाची रोख त्याच्याशी जुळली पाहिजे. म्हणून बाबी व रक्कम लॉक असतात, आणि प्रत्येक दुरुस्ती कारणासह नवीन नोंद म्हणून होते.</p>
<table>
<tr><td>चुकीचे बिल, अजून भरलेले नाही</td><td>कारण लिहून [[बिल रद्द करा]] → योग्य नवीन बिल करा.</td></tr>
<tr><td>चुकीचे बिल, पैसे भरलेले</td><td>पूर्ण रकमेचा [[परतावा]] → [[बिल रद्द करा]] → योग्य नवीन बिल.</td></tr>
<tr><td>जास्त रक्कम लावली</td><td>फक्त जास्तीच्या रकमेचा [[परतावा]].</td></tr>
<tr><td>बाब राहून गेली</td><td>त्या बाबीसाठी वेगळे नवीन बिल करा.</td></tr>
</table>
<div class="tip">[[परतावा]] व [[बिल रद्द करा]] फक्त त्या विभागाच्या प्रशासक / मालकांना दिसतात. कर्मचाऱ्यांनी बिल नंबर व कारण त्यांना सांगावे. एक पानी बिलिंग मार्गदर्शिकाही पहा.</div>
'''))

# ---------------------------------------------------------------- 9. Hospital administrator
sec('admin', 'navy',
('Hospital administrator', 'Hospital owner / administrator, and a doctor given administrator rights', '''
<p>The dashboard shows today's patients, hospital collection, beds and outstanding payments. You see only the <b>hospital's</b> money; the medical store and laboratory have their own owners.</p>
<h3>Staff & HR</h3>
<ul><li>[[Add staff]]: name, role, mobile number (used to log in), department, registration number and, for doctors, fees. Hospital roles: administrator, doctor, receptionist, nurse.</li>
<li>To give a doctor administrator rights, edit the doctor and tick [[Also administrator (hospital)]].</li>
<li>Shifts; leave requests [[Approve]] / [[Reject]]; attendance [[Present]] / [[Absent]]; [[Export]].</li>
<li>When someone leaves, deactivate them so they can no longer log in.</li></ul>
<h3>Settings</h3>
<ul><li><b>Hospital</b> profile (address, phones, timings, map link); <b>Departments</b>; <b>Services & pricing</b> ([[Add service]]); <b>ECG / echo / X-ray prices</b>.</li>
<li><b>Wards</b> ([[Add ward]]; beds are created automatically); <b>WhatsApp & SMS</b>; <b>Letterhead</b>; <b>Privacy & data</b>.</li></ul>
<h3>Money, reports and records</h3>
<ul><li>Refund and cancel hospital bills (see Billing).</li>
<li>[[Reports]]: financial, appointments and operational figures; [[Export]] for Excel.</li>
<li>[[Audit log]]: who changed what, and when.</li>
<li>[[Insurance & cashless]]: pre-authorisation and claims.</li>
<li>[[Announcements]] → [[New announcement]] for staff or patients; [[Feedback]] → [[Reply & resolve]].</li></ul>
'''),
('हॉस्पिटल प्रशासक', 'हॉस्पिटल मालक / प्रशासक, व प्रशासक अधिकार दिलेले डॉक्टर', '''
<p>डॅशबोर्डवर आजचे रुग्ण, हॉस्पिटलची वसुली, बेड व थकबाकी दिसते. तुम्हाला फक्त <b>हॉस्पिटलचे</b> पैसे दिसतात; मेडिकल स्टोअर व लॅबचे मालक वेगळे असतात.</p>
<h3>कर्मचारी व HR</h3>
<ul><li>[[कर्मचारी जोडा]]: नाव, भूमिका, मोबाइल नंबर (लॉगिनसाठी), विभाग, नोंदणी क्रमांक आणि डॉक्टरांसाठी फी. हॉस्पिटलच्या भूमिका: प्रशासक, डॉक्टर, रिसेप्शन, नर्स.</li>
<li>डॉक्टरांना प्रशासक अधिकार देण्यासाठी डॉक्टर एडिट करून [[प्रशासक सुद्धा (हॉस्पिटल)]] टिक करा.</li>
<li>शिफ्ट; रजा अर्ज [[मंजूर करा]] / [[नाकारा]]; हजेरी [[हजर]] / [[गैरहजर]]; [[निर्यात करा]].</li>
<li>कोणी नोकरी सोडल्यास त्यांना निष्क्रिय करा, म्हणजे ते लॉग इन करू शकणार नाहीत.</li></ul>
<h3>सेटिंग्ज</h3>
<ul><li><b>रुग्णालय</b> प्रोफाइल (पत्ता, फोन, वेळा, नकाशा लिंक); <b>विभाग</b>; <b>सेवा व दर</b> ([[सेवा जोडा]]); <b>ECG / इको / एक्स-रे दर</b>.</li>
<li><b>वॉर्ड</b> ([[वॉर्ड जोडा]]; बेड आपोआप तयार होतात); <b>WhatsApp व SMS</b>; <b>लेटरहेड</b>; <b>गोपनीयता व डेटा</b>.</li></ul>
<h3>पैसे, अहवाल व नोंदी</h3>
<ul><li>हॉस्पिटलच्या बिलांचा परतावा व रद्द करणे (बिलिंग पहा).</li>
<li>[[अहवाल]]: आर्थिक, भेटी व कामकाजाचे आकडे; Excel साठी [[निर्यात करा]].</li>
<li>[[ऑडिट नोंद]]: कोणी काय व कधी बदलले.</li>
<li>[[विमा व कॅशलेस]]: प्री-ऑथ व क्लेम.</li>
<li>कर्मचारी किंवा रुग्णांसाठी [[सूचना]] → [[नवीन सूचना]]; [[अभिप्राय]] → [[उत्तर द्या व निकाली काढा]].</li></ul>
'''))

# ---------------------------------------------------------------- 10. Store owner
sec('storeowner', 'green',
('Medical store owner', 'Owner of the medical store', '''
<p>You can do everything a pharmacist can, plus the following. You see only the medical store's bills, income, staff, reports and audit log.</p>
<ul><li><b>Dashboard:</b> today's and this month's store income, low stock and expiring batches.</li>
<li><b>Staff & HR:</b> add your pharmacists, approve their leave, mark attendance.</li>
<li><b>Settings → Medical Store profile:</b> store name, drug licence number, GSTIN, phone and the footer printed on bills.</li>
<li><b>Refunds and cancellations</b> of medical store bills (see Billing).</li>
<li>[[Reports]] and [[Audit log]] for the medical store.</li></ul>
<div class="tip">The store owner account is set up once by the platform team, not by the hospital administrator. This keeps each owner in control of their own staff and income.</div>
'''),
('मेडिकल स्टोअर मालक', 'मेडिकल स्टोअरचे मालक', '''
<p>फार्मासिस्ट करू शकणारी सर्व कामे तुम्ही करू शकता, व याशिवाय खालील. तुम्हाला फक्त मेडिकल स्टोअरची बिले, उत्पन्न, कर्मचारी, अहवाल व ऑडिट नोंद दिसते.</p>
<ul><li><b>डॅशबोर्ड:</b> स्टोअरचे आजचे व या महिन्याचे उत्पन्न, कमी साठा व मुदत संपणाऱ्या बॅच.</li>
<li><b>कर्मचारी व HR:</b> तुमचे फार्मासिस्ट जोडा, रजा मंजूर करा, हजेरी नोंदवा.</li>
<li><b>सेटिंग्ज → मेडिकल स्टोअर प्रोफाइल:</b> स्टोअरचे नाव, ड्रग लायसन्स नंबर, GSTIN, फोन व बिलावर छापायचा तळटीप मजकूर.</li>
<li>मेडिकल स्टोअरच्या बिलांचा <b>परतावा व रद्द करणे</b> (बिलिंग पहा).</li>
<li>मेडिकल स्टोअरसाठी [[अहवाल]] व [[ऑडिट नोंद]].</li></ul>
<div class="tip">स्टोअर मालकाचे खाते प्लॅटफॉर्म टीम एकदाच तयार करते, हॉस्पिटल प्रशासक नाही. त्यामुळे प्रत्येक मालकाचे स्वतःचे कर्मचारी व उत्पन्न त्यांच्याच हातात राहते.</div>
'''))

# ---------------------------------------------------------------- 11. Lab owner
sec('labowner', 'maroon',
('Laboratory owner', 'Owner of the laboratory', '''
<p>You can do everything a lab technician can, plus the following. You see only the laboratory's bills, income, staff, reports and audit log.</p>
<ul><li><b>Verify reports</b> entered by your technicians ([[Verify report]]); reopen a verified report for correction when needed.</li>
<li><b>Staff & HR:</b> add technicians; tick [[Authorised to verify lab reports]] for those allowed to verify.</li>
<li><b>Settings → Lab tests & prices:</b> [[Add test]] with price, result fields and normal ranges.</li>
<li><b>Settings → Laboratory profile:</b> lab name, address, phone, email, signatories and report footer.</li>
<li><b>Refunds and cancellations</b> of laboratory bills; [[Reports]] and [[Audit log]] for the laboratory.</li></ul>
'''),
('लॅब मालक', 'लॅबचे मालक', '''
<p>लॅब टेक्निशियन करू शकणारी सर्व कामे तुम्ही करू शकता, व याशिवाय खालील. तुम्हाला फक्त लॅबची बिले, उत्पन्न, कर्मचारी, अहवाल व ऑडिट नोंद दिसते.</p>
<ul><li>तुमच्या टेक्निशियननी भरलेले <b>रिपोर्ट व्हेरिफाय करा</b> ([[रिपोर्ट पडताळा]]); गरज पडल्यास व्हेरिफाय झालेला रिपोर्ट दुरुस्तीसाठी पुन्हा उघडा.</li>
<li><b>कर्मचारी व HR:</b> टेक्निशियन जोडा; व्हेरिफाय करण्याची परवानगी असलेल्यांसाठी [[लॅब रिपोर्ट पडताळण्यास अधिकृत]] टिक करा.</li>
<li><b>सेटिंग्ज → लॅब तपासण्या व दर:</b> दर, निकालाचे रकाने व नॉर्मल रेंजसह [[तपासणी जोडा]].</li>
<li><b>सेटिंग्ज → लॅब प्रोफाइल:</b> लॅबचे नाव, पत्ता, फोन, ईमेल, सही करणारे व रिपोर्टचा तळटीप मजकूर.</li>
<li>लॅबच्या बिलांचा <b>परतावा व रद्द करणे</b>; लॅबसाठी [[अहवाल]] व [[ऑडिट नोंद]].</li></ul>
'''))

# ---------------------------------------------------------------- 12. All staff
sec('allstaff', 'navy',
('For all staff', 'Every staff member', '''
<ul><li><b>My account</b> (tap your name): notifications, profile, leave and attendance.</li>
<li><b>Attendance:</b> [[Check in]] when you start and [[Check out]] when you leave.</li>
<li><b>Leave:</b> choose type, dates and reason → [[Send request]]. Your unit's owner or administrator approves it.</li>
<li>[[Announcements]] shows notices from the management.</li>
<li>You see only the menus your role needs. If something is missing, ask your administrator or owner.</li></ul>
<h3>Privacy and good practice</h3>
<ul><li>Open a patient's record only when you are treating or serving that patient.</li>
<li>Messages go to patients only when they have agreed; respect their choice.</li>
<li>Nothing medical or financial is ever deleted. Corrections are added with a reason, so the record stays complete.</li></ul>
'''),
('सर्व कर्मचाऱ्यांसाठी', 'प्रत्येक कर्मचारी', '''
<ul><li><b>माझे खाते</b> (तुमच्या नावावर टॅप करा): सूचना, प्रोफाइल, रजा व हजेरी.</li>
<li><b>हजेरी:</b> काम सुरू करताना [[चेक इन]] व जाताना [[चेक आउट]].</li>
<li><b>रजा:</b> प्रकार, तारखा व कारण निवडा → [[विनंती पाठवा]]. तुमच्या विभागाचे मालक किंवा प्रशासक मंजूर करतात.</li>
<li>[[सूचना]] मध्ये व्यवस्थापनाच्या सूचना दिसतात.</li>
<li>तुमच्या भूमिकेला लागणारे मेनूच तुम्हाला दिसतात. काही दिसत नसल्यास प्रशासक किंवा मालकांना विचारा.</li></ul>
<h3>गोपनीयता व चांगल्या सवयी</h3>
<ul><li>ज्या रुग्णाचे उपचार किंवा सेवा तुम्ही करत आहात, त्याचीच नोंद उघडा.</li>
<li>रुग्णांनी संमती दिली असेल तरच त्यांना मेसेज जातात; त्यांच्या निवडीचा आदर करा.</li>
<li>वैद्यकीय किंवा आर्थिक नोंद कधीही काढली जात नाही. दुरुस्ती कारणासह जोडली जाते, त्यामुळे नोंद पूर्ण राहते.</li></ul>
'''))

# ---------------------------------------------------------------- 13. FAQ
sec('faq', 'navy',
('Problems and answers', 'Everyone', '''
<table>
<tr><td>I see an old version of the app</td><td>Close the app completely and open it again. Still old? Clear the site data in the browser and open the link again.</td></tr>
<tr><td>The OTP did not arrive</td><td>Check the number is the one the hospital registered. Wait a minute and tap Send OTP again.</td></tr>
<tr><td>The same patient appears twice</td><td>When registering, choose the existing patient when the app asks <b>Is this an existing patient?</b></td></tr>
<tr><td>A bill is wrong</td><td>See Billing: refund and/or cancel, then make a new bill. Ask your administrator / owner.</td></tr>
<tr><td>A prescription is wrong</td><td>The doctor uses [[Correct prescription]] and signs the corrected one.</td></tr>
<tr><td>A lab report is wrong</td><td>An authorised person uses [[Reopen for correction]]; the result is corrected and verified again.</td></tr>
<tr><td>I cannot see a menu or another unit's bills</td><td>Each role sees only what it needs, and each unit sees only its own money. Ask your administrator / owner.</td></tr>
<tr><td>I was logged out</td><td>Staff are logged out after 30 minutes without use. Log in again with your mobile number.</td></tr>
</table>
'''),
('समस्या व उत्तरे', 'सर्वांसाठी', '''
<table>
<tr><td>ॲपचे जुने व्हर्जन दिसते</td><td>ॲप पूर्ण बंद करून पुन्हा उघडा. तरीही जुने? ब्राउझरमधील साइट डेटा क्लिअर करून लिंक पुन्हा उघडा.</td></tr>
<tr><td>OTP आला नाही</td><td>हॉस्पिटलने नोंदवलेलाच नंबर आहे का तपासा. एक मिनिट थांबून पुन्हा OTP पाठवा दाबा.</td></tr>
<tr><td>एकच रुग्ण दोनदा दिसतो</td><td>नोंदणी करताना ॲप <b>हा जुना रुग्ण आहे का?</b> विचारते तेव्हा जुना रुग्ण निवडा.</td></tr>
<tr><td>बिल चुकीचे आहे</td><td>बिलिंग पहा: परतावा आणि/किंवा रद्द, मग नवीन बिल. प्रशासक / मालकांना सांगा.</td></tr>
<tr><td>प्रिस्क्रिप्शन चुकीचे आहे</td><td>डॉक्टर [[प्रिस्क्रिप्शन दुरुस्त करा]] वापरून दुरुस्त प्रिस्क्रिप्शनवर सही करतात.</td></tr>
<tr><td>लॅब रिपोर्ट चुकीचा आहे</td><td>अधिकृत व्यक्ती [[दुरुस्तीसाठी पुन्हा उघडा]] वापरते; निकाल दुरुस्त होऊन पुन्हा व्हेरिफाय होतो.</td></tr>
<tr><td>एखादा मेनू किंवा दुसऱ्या विभागाची बिले दिसत नाहीत</td><td>प्रत्येक भूमिकेला गरजेपुरतेच दिसते, व प्रत्येक विभागाला फक्त स्वतःचे पैसे. प्रशासक / मालकांना विचारा.</td></tr>
<tr><td>मी लॉग आउट झालो</td><td>३० मिनिटे वापर न झाल्यास कर्मचारी लॉग आउट होतात. मोबाइल नंबरने पुन्हा लॉग इन करा.</td></tr>
</table>
'''))

CSS = '''
:root {
  --navy: #1B1E4A; --teal: #0F6A73; --green: #17664B; --maroon: #7A1E2C; --red: #D42A33;
  --paper: #FFFFFF; --ground: #E9EAF1; --ink: #1D2033; --muted: #5A5F78; --line: #DCDEE8; --tint: #EEF0F8; --tip: #FFF4E0;
  --display: "Sora", "Mukta", "Segoe UI", system-ui, sans-serif;
  --body: "Mukta", "Nirmala UI", "Segoe UI", system-ui, sans-serif;
  color-scheme: light;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--ground); color: var(--ink); font-family: var(--body); font-size: 15px; line-height: 1.5;
  padding-block: 24px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.doc { max-width: 794px; margin: 0 auto; background: var(--paper); box-shadow: 0 10px 40px rgba(27,30,74,.14); }
.cover { background: var(--navy); color: #fff; padding: 36px 40px 30px; }
.cover .brand { font-family: var(--display); font-weight: 800; font-size: 15px; letter-spacing: .08em; color: #C9CBE0; }
.cover h1 { font-family: var(--display); font-size: 40px; line-height: 1.1; margin: 6px 0 8px; text-wrap: balance; }
.cover p { margin: 0; color: #D7D9EA; max-width: 60ch; }
.intro { padding: 22px 40px 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 26px; }
.intro h2 { font-family: var(--display); font-size: 15px; margin: 0 0 8px; color: var(--navy); text-transform: uppercase; letter-spacing: .06em; }
.toc { list-style: none; margin: 0; padding: 0; display: grid; gap: 3px; counter-reset: t; }
.toc li { counter-increment: t; display: flex; gap: 10px; align-items: baseline; }
.toc li::before { content: counter(t); font: 700 12px var(--display); color: #fff; background: var(--c, var(--navy)); min-width: 22px; text-align: center; line-height: 20px; }
.toc a { color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--line); flex: 1; }
.toc a:hover, .toc a:focus-visible { color: var(--navy); border-color: var(--navy); outline: none; }
section.role { padding: 26px 40px 24px; border-top: 1px solid var(--line); }
.rh { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
.rh .n { font: 800 20px/44px var(--display); color: #fff; background: var(--c); width: 44px; text-align: center; flex: none; }
.rh h2 { font-family: var(--display); font-size: 25px; line-height: 1.15; margin: 0; color: var(--c); }
.rh .who { font-size: 13.5px; color: var(--muted); }
h3 { font-family: var(--display); font-size: 16px; color: var(--navy); margin: 16px 0 6px; }
p { margin: 0 0 8px; }
ol, ul { margin: 0 0 8px; padding: 0; list-style: none; display: grid; gap: 5px; }
ol { counter-reset: s; }
ol li { counter-increment: s; position: relative; padding-left: 30px; }
ol li::before { content: counter(s); position: absolute; left: 0; top: 2px; width: 21px; height: 21px; background: var(--c, var(--navy)); color: #fff; font: 700 12px/21px var(--display); text-align: center; }
ul li { position: relative; padding-left: 16px; }
ul li::before { content: ""; position: absolute; left: 2px; top: .62em; width: 6px; height: 6px; background: var(--c, var(--navy)); }
.k { display: inline-block; font-weight: 700; color: var(--navy); background: var(--tint); border: 1px solid #CDD1E6; padding: 0 6px; line-height: 1.45; }
.tip { background: var(--tip); padding: 9px 13px; margin: 10px 0; font-size: 14.2px; }
table { width: 100%; border-collapse: collapse; margin: 6px 0 8px; font-size: 14.5px; }
td { vertical-align: top; padding: 6px 8px; border-bottom: 1px solid var(--line); }
td:first-child { width: 38%; font-weight: 600; }
footer { padding: 14px 40px 18px; border-top: 1px solid var(--line); font-size: 12.5px; color: var(--muted); }
.flow { display: grid; gap: 0; margin: 10px 0; }
.fs { display: grid; grid-template-columns: 30px 1fr; gap: 12px; break-inside: avoid; }
.fn { font: 800 13px/28px var(--display); color: #fff; background: var(--c); width: 28px; height: 28px; text-align: center; position: relative; z-index: 1; }
.fs:not(:last-child) .fn { box-shadow: 0 0 0 0 transparent; }
.fs { position: relative; }
.fs:not(:last-child)::before { content: ""; position: absolute; left: 13px; top: 28px; bottom: 0; width: 2px; background: var(--line); }
.fb { padding: 2px 0 14px; min-width: 0; }
.ft { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; margin-bottom: 3px; }
.ft b { font-family: var(--display); font-size: 15px; color: var(--ink); }
.fw { font-size: 12.5px; font-weight: 700; color: #fff; background: var(--navy); padding: 1px 8px; }
.fx { font-size: 14.2px; }
.fr { font-size: 13.6px; color: var(--teal); margin-top: 3px; padding-left: 10px; border-left: 3px solid var(--teal); }
.navy { --c: var(--navy); } .teal { --c: var(--teal); } .green { --c: var(--green); } .maroon { --c: var(--maroon); }
@media (max-width: 640px) {
  .cover, .intro, section.role, footer { padding-left: 18px; padding-right: 18px; }
  .intro { grid-template-columns: 1fr; }
  .cover h1 { font-size: 30px; }
  td:first-child { width: 42%; }
}
@page { size: A4 portrait; margin: 14mm 0 14mm; }
@page :first { margin-top: 0; }
@media print {
  body { background: #fff; padding: 0; font-size: 13.4px; }
  .doc { box-shadow: none; max-width: none; }
  section.role { break-before: page; border-top: 0; padding-top: 0; }
  .tip, tr, ol li, ul li { break-inside: avoid; }
  h3 { break-after: avoid; }
  .fb { padding-bottom: 8px; } .fx { font-size: 12.6px; line-height: 1.38; } .fr { font-size: 12.2px; } .ft b { font-size: 13.6px; }
  .flow + .tip, .flow ~ .tip { font-size: 12.4px; }
}
'''

def chips(html):
    return re.sub(r'\[\[(.+?)\]\]', r'<span class="k">\1</span>', html)

def build(lang):
    t = T[lang]
    toc = ''.join(f'<li class="{c}"><a href="#{i}">{d[lang][0]}</a></li>' for i, c, d in S)
    secs = ''
    for n, (i, c, d) in enumerate(S, 1):
        title, who, body = d[lang]
        secs += f'''
<section class="role {c}" id="{i}">
  <div class="rh"><span class="n">{n}</span><div><h2>{title}</h2><div class="who">{t['who']}: {who}</div></div></div>
  {chips(body).strip()}
</section>'''
    return f'''<title>{t['title']}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Mukta:wght@400;500;600;700&display=swap">
<style>{CSS}</style>
<div class="doc" lang="{t['lang']}">
  <header class="cover"><div class="brand">JEEVO</div><h1>{t['h1']}</h1><p>{t['sub']}</p></header>
  <div class="intro">
    <div><h2>{t['contents']}</h2><ol class="toc">{toc}</ol></div>
    <div><h2>{t['how']}</h2><p>{chips(t['howtext'])}</p></div>
  </div>{secs}
  <footer>{t['foot']}</footer>
</div>
'''

if __name__ == '__main__':
    for lang in ('en', 'mr'):
        (HERE / f'user-manual-{lang}.html').write_text(build(lang), encoding='utf-8')
    print('written')
