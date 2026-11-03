// Role-based access control. Every permission check in the UI and in the
// data API goes through `can(user, permission)`. The same groups are enforced
// again on the server in supabase/setup.sql (role_in) – keep them in sync.
export const ROLES = {
  super_admin: 'Super Admin',
  admin: 'Hospital Administrator',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
  nurse: 'Nurse',
  pharmacist: 'Pharmacist',
  lab_tech: 'Lab Technician',
  patient: 'Patient'
}
export const STAFF_ROLES = ['admin', 'doctor', 'receptionist', 'nurse', 'pharmacist', 'lab_tech']

const ADM = ['super_admin', 'admin']
const P = {
  'staff.app': [...ADM, ...STAFF_ROLES],
  'dashboard.admin': ADM,
  'platform.manage': ['super_admin'],
  'patients.view': [...ADM, 'doctor', 'receptionist', 'nurse', 'pharmacist', 'lab_tech'],
  'patients.register': [...ADM, 'receptionist', 'doctor', 'nurse'],
  'patients.clinical': [...ADM, 'doctor', 'nurse'], // full history, allergies, notes
  'appointments.manage': [...ADM, 'receptionist'],
  'appointments.view': [...ADM, 'receptionist', 'doctor', 'nurse'],
  'queue.manage': [...ADM, 'receptionist', 'doctor'],
  'emergency.register': [...ADM, 'receptionist', 'doctor', 'nurse'],
  'emergency.view': [...ADM, 'receptionist', 'doctor', 'nurse'],
  'consult': ['doctor'],
  'prescribe': ['doctor'],
  'lab.order': ['doctor'],
  'lab.work': ['lab_tech', ...ADM],
  'lab.verify': ['lab_tech', 'doctor', ...ADM], // only staff marked as verifier (see canVerify)
  'pharmacy.dispense': ['pharmacist', ...ADM],
  'pharmacy.inventory': ['pharmacist', ...ADM],
  'billing.create': [...ADM, 'receptionist', 'pharmacist'],
  'billing.refund': ADM,
  'billing.discount': [...ADM, 'receptionist'],
  'ipd.view': [...ADM, 'doctor', 'nurse', 'receptionist'],
  'ipd.admit': [...ADM, 'doctor', 'receptionist'],
  'ipd.discharge': ['doctor', ...ADM],
  'nursing': ['nurse', 'doctor', ...ADM],
  'vitals.record': ['nurse', 'doctor', 'receptionist', ...ADM],
  'staff.manage': ADM,
  'leave.approve': ADM,
  'config.manage': ADM,
  'announcements.publish': ADM,
  'healthtips.publish': [...ADM, 'doctor'],
  'feedback.manage': ADM,
  'reports.view': ADM,
  'audit.view': ADM,
  'availability.self': ['doctor']
}

export const can = (user, perm) => !!user && (P[perm] || []).includes(user.role)
export const isStaff = (user) => can(user, 'staff.app')
export const roleLabel = (r) => ROLES[r] || r
