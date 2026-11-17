// Role-based access control. Every permission check in the UI and in the
// data API goes through `can(user, permission)`. The same groups are enforced
// again on the server in supabase/setup.sql (role_in) – keep them in sync.
//
// One hospital account can contain separately owned business UNITS
// (e.g. hospital, medical store, laboratory). Each unit has its own owner
// (administrator), staff, bills, income and reports. Patients are shared.
export const ROLES = {
  super_admin: 'Super Admin',
  admin: 'Hospital Administrator',
  pharmacy_admin: 'Medical Store Owner',
  lab_admin: 'Laboratory Owner',
  doctor: 'Doctor',
  receptionist: 'Receptionist',
  nurse: 'Nurse',
  pharmacist: 'Pharmacist',
  lab_tech: 'Lab Technician',
  patient: 'Patient'
}
export const UNITS = { hospital: 'Hospital', pharmacy: 'Medical Store', lab: 'Laboratory' }
// Roles that can be given to staff of each unit
export const UNIT_ROLES = {
  hospital: ['admin', 'doctor', 'receptionist', 'nurse'],
  pharmacy: ['pharmacy_admin', 'pharmacist'],
  lab: ['lab_admin', 'lab_tech']
}
export const STAFF_ROLES = Object.values(UNIT_ROLES).flat()
export const UNIT_ADMIN = { hospital: 'admin', pharmacy: 'pharmacy_admin', lab: 'lab_admin' }

const ADM = ['super_admin', 'admin']
const OWNERS = ['super_admin', 'admin', 'pharmacy_admin', 'lab_admin']
const PHARM = ['pharmacist', 'pharmacy_admin']
const LAB = ['lab_tech', 'lab_admin']
const P = {
  'staff.app': ['super_admin', ...STAFF_ROLES],
  'dashboard.admin': OWNERS,
  'platform.manage': ['super_admin'],
  'patients.view': ['super_admin', ...STAFF_ROLES],
  'patients.register': [...ADM, 'receptionist', 'doctor', 'nurse', ...PHARM, ...LAB],
  'patients.clinical': [...ADM, 'doctor', 'nurse'], // full history, allergies, notes
  'appointments.manage': [...ADM, 'receptionist'],
  'appointments.view': [...ADM, 'receptionist', 'doctor', 'nurse'],
  'queue.manage': [...ADM, 'receptionist', 'doctor'],
  'emergency.register': [...ADM, 'receptionist', 'doctor', 'nurse'],
  'emergency.view': [...ADM, 'receptionist', 'doctor', 'nurse'],
  'consult': ['doctor'],
  'prescribe': ['doctor'],
  'refer': ['doctor'],
  'lab.order': ['doctor'],
  'lab.work': [...LAB, 'super_admin'], // pathology lab (separate unit)
  'investigations': [...ADM, 'doctor', 'nurse'], // hospital's own ECG / echo / X-ray
  'pharmacy.dispense': [...PHARM, 'super_admin'],
  'pharmacy.inventory': [...PHARM, 'super_admin'],
  'billing.create': [...ADM, 'receptionist', ...PHARM, ...LAB],
  'billing.refund': OWNERS, // only for the owner's own unit
  'billing.discount': [...OWNERS, 'receptionist'],
  'ipd.view': [...ADM, 'doctor', 'nurse', 'receptionist'],
  'ipd.admit': [...ADM, 'doctor', 'receptionist'],
  'ipd.discharge': ['doctor', ...ADM],
  'insurance.manage': [...ADM, 'receptionist'],
  'nursing': ['nurse', 'doctor', ...ADM],
  'vitals.record': ['nurse', 'doctor', 'receptionist', ...ADM],
  'staff.manage': OWNERS, // own unit's staff only
  'leave.approve': OWNERS,
  'config.manage': ADM, // hospital settings, departments, services, wards
  'config.unit': OWNERS, // own unit's profile / letterhead
  'config.labtests': ['super_admin', 'admin', 'lab_admin'],
  'announcements.publish': ADM,
  'healthtips.publish': [...ADM, 'doctor'],
  'feedback.manage': ADM,
  'reports.view': OWNERS,
  'audit.view': OWNERS,
  'availability.self': ['doctor']
}

// A user has one main role and may hold extra roles (e.g. a doctor who is also an administrator)
export const rolesOf = (user) => (user ? [user.role, ...(user.extraRoles || [])] : [])
export const can = (user, perm) => !!user && rolesOf(user).some((r) => (P[perm] || []).includes(r))
export const isStaff = (user) => can(user, 'staff.app')
export const roleLabel = (r) => ROLES[r] || r
export const userRoleLabel = (u) => rolesOf(u).map(roleLabel).join(' · ')

// Which unit a staff member belongs to (patients and super admin: none)
export const unitOf = (user) => {
  if (!user) return null
  if (user.unit) return user.unit
  if (PHARM.includes(user.role)) return 'pharmacy'
  if (LAB.includes(user.role)) return 'lab'
  if (user.role === 'patient') return null
  return 'hospital'
}
export const isUnitOwner = (user) => rolesOf(user).some((r) => ['super_admin', 'admin', 'pharmacy_admin', 'lab_admin'].includes(r))
// Money of a unit is visible only to that unit's billing staff and owner
export const seesUnitMoney = (user, unit) => !!user && (user.role === 'super_admin' || (unitOf(user) === unit && can(user, 'billing.create')))
