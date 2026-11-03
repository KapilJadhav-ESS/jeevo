-- =====================================================================
--  JeevO – Supabase database setup
--  Run this ONCE in your Supabase project: SQL Editor → New query →
--  paste this whole file → Run.  It is safe to run again (idempotent).
--
--  Design
--  • Multi-tenant: every record belongs to exactly one hospital
--    (hospital_id). A login can only ever read or write the hospitals it is
--    a member of – one hospital can never see another hospital's data.
--  • Every piece of hospital data (patients, appointments, prescriptions,
--    bills…) is a JSON document in public.records, keyed by
--    (hospital_id, collection, id). This mirrors the app's data layer.
--  • Clients never touch the tables directly (RLS on, no grants). All reads
--    and writes go through the SECURITY DEFINER functions below, which check
--    membership, role and record ownership for every single record
--    (see can_write / visible_record).
--  • public.members links a Supabase login (phone OTP or email) to a staff
--    or patient user in a hospital and caches role, staff id and family.
--  • public.changes is a tiny change-log (no personal data) that devices
--    subscribe to through Supabase Realtime, then pull what changed.
--  • Medical documents live in the PRIVATE storage bucket "documents" and
--    are opened only through short-lived signed URLs.
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.records (
  hospital_id text        not null,
  collection  text        not null,
  id          text        not null,
  data        jsonb       not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  primary key (hospital_id, collection, id)
);
create index if not exists records_users_phone on public.records ((right(regexp_replace(coalesce(data ->> 'phone', ''), '\D', '', 'g'), 10))) where collection in ('users', 'patients');

create table if not exists public.members (
  auth_id     uuid        not null references auth.users(id) on delete cascade,
  hospital_id text        not null,
  user_id     text        not null,
  role        text        not null default 'patient',
  staff_id    text,
  patient_id  text,
  family_id   text,
  status      text        not null default 'active',
  created_at  timestamptz not null default now(),
  primary key (auth_id, hospital_id)
);

-- Platform owners (Super Admin): see usage across tenants, manage plans.
create table if not exists public.platform_admins (
  auth_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.changes (
  seq         bigserial   primary key,
  hospital_id text        not null,
  collection  text        not null,
  id          text        not null,
  op          text        not null,
  at          timestamptz not null default now()
);
create index if not exists changes_hospital_seq on public.changes (hospital_id, seq);
create index if not exists changes_at on public.changes (at);

alter table public.records enable row level security;
alter table public.members enable row level security;
alter table public.changes enable row level security;
alter table public.platform_admins enable row level security;
revoke all on public.records, public.members, public.platform_admins from anon, authenticated;
revoke all on public.changes from anon;
grant select on public.changes to authenticated;

-- ---------------------------------------------------------------------
--  Membership & roles
-- ---------------------------------------------------------------------
create or replace function public.member_of(p_h text) returns public.members
language sql stable security definer set search_path = public as $$
  select * from public.members
  where auth_id = auth.uid() and hospital_id = p_h and status = 'active'
  limit 1
$$;

create or replace function public.is_member(p_h text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members
                 where auth_id = auth.uid() and hospital_id = p_h and status = 'active')
$$;

create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where auth_id = auth.uid())
$$;

-- Role groups – must match src/lib/rbac.js
create or replace function public.role_in(p_role text, p_group text) returns boolean
language sql immutable as $$
  select coalesce(p_role = any (case p_group
    when 'admin'        then array['super_admin','admin']
    when 'staff'        then array['super_admin','admin','doctor','receptionist','nurse','pharmacist','lab_tech']
    when 'register'     then array['super_admin','admin','receptionist','doctor','nurse']
    when 'clinical'     then array['super_admin','admin','doctor','nurse']
    when 'appointments' then array['super_admin','admin','receptionist']
    when 'queue'        then array['super_admin','admin','receptionist','doctor']
    when 'emergency'    then array['super_admin','admin','receptionist','doctor','nurse']
    when 'lab'          then array['super_admin','admin','lab_tech']
    when 'pharmacy'     then array['super_admin','admin','pharmacist']
    when 'billing'      then array['super_admin','admin','receptionist','pharmacist']
    when 'ipd_view'     then array['super_admin','admin','doctor','nurse','receptionist']
    when 'ipd_admit'    then array['super_admin','admin','doctor','receptionist']
    when 'nursing'      then array['super_admin','admin','doctor','nurse']
    when 'vitals'       then array['super_admin','admin','doctor','nurse','receptionist']
    when 'tips'         then array['super_admin','admin','doctor']
    else array[]::text[] end), false)
$$;

drop policy if exists changes_read on public.changes;
create policy changes_read on public.changes for select to authenticated
  using (public.is_member(hospital_id));

-- ---------------------------------------------------------------------
--  Helpers
-- ---------------------------------------------------------------------
-- true when only the listed top-level fields differ between o and n
create or replace function public.only_changed(o jsonb, n jsonb, allowed text[]) returns boolean
language sql immutable as $$
  select not exists (
    select 1 from (select key from jsonb_object_keys(coalesce(o, '{}')) key
                   union select key from jsonb_object_keys(coalesce(n, '{}')) key) k
    where not (k.key = any (allowed || array['updatedAt']))
      and (o -> k.key) is distinct from (n -> k.key))
$$;

-- the family a patient record belongs to
create or replace function public.family_of(p_h text, p_patient text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(data ->> 'familyId', id) from records
  where hospital_id = p_h and collection = 'patients' and id = p_patient
$$;
create or replace function public.in_my_family(m public.members, p_patient text) returns boolean
language sql stable security definer set search_path = public as $$
  select m.family_id is not null and public.family_of(m.hospital_id, p_patient) = m.family_id
$$;

-- may this member verify lab reports? (admin, or staff marked canVerifyLab)
create or replace function public.can_verify(m public.members) returns boolean
language sql stable security definer set search_path = public as $$
  select role_in(m.role, 'admin') or coalesce((select (data ->> 'canVerifyLab')::boolean from records
    where hospital_id = m.hospital_id and collection = 'staff' and id = m.staff_id), false)
$$;

-- ---------------------------------------------------------------------
--  Write permissions – one place, per collection.  n is null for delete.
-- ---------------------------------------------------------------------
create or replace function public.can_write(m public.members, p_col text, p_id text, o jsonb, n jsonb)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  r text := m.role;
  me text := m.user_id;
  pat text := coalesce(n ->> 'patientId', o ->> 'patientId');
  is_new boolean := o is null;
begin
  -- nothing clinical or financial is ever deleted; only a few admin lists
  if n is null then
    return (p_col in ('announcements', 'departments', 'services', 'shifts', 'healthTips') and role_in(r, 'admin'))
        or (p_col = 'notifications' and o ->> 'userId' = me);
  end if;

  case p_col
  when 'hospitals' then
    -- admins edit their profile; plan/status/code are platform-only
    return not is_new and role_in(r, 'admin') and p_id = m.hospital_id
       and (o -> 'plan') is not distinct from (n -> 'plan') and (o -> 'status') is not distinct from (n -> 'status')
       and (o -> 'code') is not distinct from (n -> 'code');
  when 'settings', 'departments', 'services', 'labTests', 'wards' then
    return role_in(r, 'admin');
  when 'beds' then
    return role_in(r, 'admin') or (not is_new and role_in(r, 'ipd_admit') and only_changed(o, n, array['status', 'admissionId', 'reservedFor']));
  when 'users' then
    -- staff accounts are managed by admins; nobody can raise their own role
    if role_in(r, 'admin') then return n ->> 'role' <> 'super_admin' or r = 'super_admin'; end if;
    return false;
  when 'staff' then
    if role_in(r, 'admin') then return true; end if;
    return not is_new and p_id = m.staff_id and only_changed(o, n, array['availability']);
  when 'patients' then
    if role_in(r, 'register') then return true; end if;
    if r = 'patient' then
      if is_new then return coalesce(n ->> 'familyId', '') = m.family_id; end if;
      return in_my_family(m, p_id) and coalesce(n ->> 'familyId', p_id) = coalesce(o ->> 'familyId', p_id)
         and (o -> 'pid') is not distinct from (n -> 'pid') and (o -> 'vaccinations') is not distinct from (n -> 'vaccinations');
    end if;
    return false;
  when 'appointments' then
    if role_in(r, 'appointments') then return true; end if;
    if r = 'doctor' then return (n ->> 'doctorId') = m.staff_id or (role_in(r, 'emergency') and n ->> 'priority' = 'emergency'); end if;
    if r = 'nurse' then return is_new and n ->> 'priority' = 'emergency'; end if;
    if r = 'patient' then
      if not in_my_family(m, pat) then return false; end if;
      if is_new then return n ->> 'status' = 'booked' and n ->> 'source' = 'app' and coalesce(n ->> 'priority', 'normal') = 'normal'; end if;
      return o ->> 'status' = 'booked' and n ->> 'status' in ('booked', 'cancelled')
         and only_changed(o, n, array['status', 'cancelReason', 'cancelledBy', 'cancelledAt', 'date', 'time', 'token', 'rescheduledFrom', 'reminded', 'tokenAlerted', 'paid']);
    end if;
    return false;
  when 'consultations' then
    if r <> 'doctor' or n ->> 'doctorId' <> m.staff_id then return false; end if;
    if not is_new and o ->> 'status' = 'final' then
      return only_changed(o, n, array['addenda', 'prescriptionId', 'followUpReminded'])
         and jsonb_array_length(coalesce(n -> 'addenda', '[]')) >= jsonb_array_length(coalesce(o -> 'addenda', '[]'));
    end if;
    return true;
  when 'prescriptions' then
    if r = 'doctor' and n ->> 'doctorId' = m.staff_id then
      if is_new or o ->> 'status' = 'draft' then return true; end if;
      -- a signed prescription is never edited: it may only be superseded
      return o ->> 'status' = 'final' and n ->> 'status' = 'superseded' and only_changed(o, n, array['status', 'supersededReason']);
    end if;
    if role_in(r, 'pharmacy') and not is_new then
      return only_changed(o, n, array['dispensed', 'dispenseStatus', 'dispensedAt', 'dispensedBy', 'billIds']);
    end if;
    return false;
  when 'labOrders' then
    if is_new then return (r = 'doctor' and n ->> 'doctorId' = m.staff_id) or role_in(r, 'lab'); end if;
    if r = 'doctor' and only_changed(o, n, array['billId']) then return true; end if;
    -- verification fields can only be set by an authorised verifier, never by the person who entered results
    if (o ->> 'verifiedBy') is distinct from (n ->> 'verifiedBy') and n ->> 'verifiedBy' is not null then
      return can_verify(m) and n ->> 'verifiedBy' = me and (o ->> 'enteredBy' <> me or r <> 'lab_tech') and n ->> 'status' = 'verified';
    end if;
    if n ->> 'status' = 'result_entered' and o ->> 'status' in ('verified', 'published') then return can_verify(m); end if;
    if n ->> 'status' = 'published' and o ->> 'status' <> 'published' then return role_in(r, 'lab') and o ->> 'status' = 'verified'; end if;
    if o ->> 'status' in ('verified', 'published') and not only_changed(o, n, array['billId']) then return false; end if;
    return role_in(r, 'lab') or (role_in(r, 'billing') and only_changed(o, n, array['billId']));
  when 'medicines' then
    return role_in(r, 'pharmacy');
  when 'bills' then
    -- bills raised automatically by other workflows (tests, check-in fee, deposit)
    if is_new and role_in(r, 'staff') then return true; end if;
    if role_in(r, 'billing') then
      -- refunds and cancellations need an administrator
      if not is_new and ((o -> 'refunded') is distinct from (n -> 'refunded') or n ->> 'status' = 'cancelled') then return role_in(r, 'admin'); end if;
      return true;
    end if;
    -- patient online payment (demo gateway) may only mark payment progress
    return r = 'patient' and not is_new and in_my_family(m, pat) and only_changed(o, n, array['paid', 'status'])
       and (n ->> 'paid')::numeric > (o ->> 'paid')::numeric and (n ->> 'paid')::numeric <= (o ->> 'total')::numeric;
  when 'payments' then
    if not is_new then return false; end if;
    if n ->> 'kind' = 'refund' then return role_in(r, 'admin') and (n ->> 'authorizedBy') = me; end if;
    if role_in(r, 'billing') or (role_in(r, 'queue') or role_in(r, 'ipd_admit')) then return (n ->> 'amount')::numeric > 0; end if;
    return r = 'patient' and in_my_family(m, pat) and n ->> 'method' in ('upi', 'card', 'netbanking') and (n ->> 'amount')::numeric > 0;
  when 'admissions' then
    if is_new then return role_in(r, 'ipd_admit'); end if;
    if o ->> 'status' = 'discharged' then return false; end if;
    if n ->> 'status' = 'discharged' or (o -> 'dischargeSummary') is distinct from (n -> 'dischargeSummary') then return r = 'doctor' or role_in(r, 'admin'); end if;
    if (o -> 'notes') is distinct from (n -> 'notes') then
      return role_in(r, 'nursing') and jsonb_array_length(coalesce(n -> 'notes', '[]')) >= jsonb_array_length(coalesce(o -> 'notes', '[]'));
    end if;
    return role_in(r, 'ipd_admit') or role_in(r, 'billing');
  when 'vitals' then
    return is_new and role_in(r, 'vitals') and n ->> 'by' = me;
  when 'medAdmin' then
    return is_new and role_in(r, 'nursing') and n ->> 'by' = me;
  when 'nursingTasks' then
    return role_in(r, 'nursing');
  when 'announcements' then
    return role_in(r, 'admin');
  when 'healthTips' then
    -- only a doctor may publish (review) patient education content
    if n ->> 'status' = 'published' and (is_new or o ->> 'status' <> 'published') then return r = 'doctor' and n ->> 'reviewedBy' = m.staff_id; end if;
    return role_in(r, 'tips');
  when 'notifications' then
    if is_new then return true; end if;   -- system messages created by any member of this hospital
    return o ->> 'userId' = me and only_changed(o, n, array['read']);
  when 'messages' then
    if is_new then return role_in(r, 'staff') or (r = 'patient' and in_my_family(m, pat)); end if;
    return role_in(r, 'staff') and only_changed(o, n, array['status', 'sentAt']);
  when 'feedback' then
    if is_new then return r = 'patient' and in_my_family(m, pat); end if;
    return role_in(r, 'admin') and only_changed(o, n, array['response', 'status', 'respondedBy', 'respondedAt']);
  when 'leaves' then
    if is_new then return n ->> 'staffId' = m.staff_id or role_in(r, 'admin'); end if;
    return role_in(r, 'admin');
  when 'attendance' then
    return role_in(r, 'admin') or (n ->> 'staffId' = m.staff_id and (is_new or o ->> 'date' = n ->> 'date'));
  when 'shifts' then
    return role_in(r, 'admin');
  when 'audit' then
    return is_new and n ->> 'userId' = me;   -- append-only trail
  else
    return false;
  end case;
end $$;

-- ---------------------------------------------------------------------
--  Read filter – what a member may see of each record (null = hidden)
-- ---------------------------------------------------------------------
create or replace function public.visible_record(m public.members, p_col text, p_id text, d jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r text := m.role; pat text := d ->> 'patientId';
begin
  if r = 'patient' then
    case p_col
    when 'hospitals', 'departments', 'services', 'labTests' then return d;
    when 'staff' then
      if d ->> 'role' <> 'doctor' then return null; end if;
      return jsonb_build_object('id', d -> 'id', 'name', d -> 'name', 'role', d -> 'role', 'designation', d -> 'designation', 'deptId', d -> 'deptId',
        'qualification', d -> 'qualification', 'regNo', d -> 'regNo', 'fee', d -> 'fee', 'followUpFee', d -> 'followUpFee', 'availability', d -> 'availability',
        'languages', d -> 'languages', 'experience', d -> 'experience', 'color', d -> 'color', 'active', d -> 'active', 'noOpd', d -> 'noOpd', 'room', d -> 'room', 'hospitalId', d -> 'hospitalId');
    when 'users' then return case when p_id = m.user_id then d else null end;
    when 'patients' then return case when coalesce(d ->> 'familyId', p_id) = m.family_id then d else null end;
    when 'appointments', 'bills', 'payments', 'feedback', 'messages' then return case when in_my_family(m, pat) then d else null end;
    when 'consultations' then return case when in_my_family(m, pat) and d ->> 'status' = 'final' then d - 'addenda' else null end;
    when 'prescriptions' then return case when in_my_family(m, pat) and d ->> 'status' = 'final' then d else null end;
    when 'labOrders' then
      if not in_my_family(m, pat) then return null; end if;
      -- unverified results are never shown to patients
      return case when d ->> 'status' = 'published' then d else d - 'results' - 'remarks' - 'files' end;
    when 'admissions' then
      if not in_my_family(m, pat) then return null; end if;
      return (d - 'notes') || jsonb_build_object('dischargeSummary', case when (d -> 'dischargeSummary' ->> 'final')::boolean then d -> 'dischargeSummary' else null end);
    when 'announcements' then return case when d ->> 'audience' <> 'staff' then d else null end;
    when 'healthTips' then return case when d ->> 'status' = 'published' then d else null end;
    when 'notifications' then return case when d ->> 'userId' = m.user_id then d else null end;
    when 'settings' then return case when p_id in ('opd', 'counters') then d else null end;
    else return null;
    end case;
  end if;

  -- hospital staff
  case p_col
  when 'notifications' then return case when d ->> 'userId' = m.user_id then d else null end;
  when 'audit' then return case when role_in(r, 'admin') then d else null end;
  when 'feedback' then return case when role_in(r, 'admin') or d ->> 'doctorId' = m.staff_id then d else null end;
  when 'leaves', 'attendance' then return case when role_in(r, 'admin') or d ->> 'staffId' = m.staff_id then d else null end;
  when 'users' then return case when role_in(r, 'admin') or p_id = m.user_id then d else null end;
  -- clinical notes: doctors, nurses and admins only
  when 'consultations' then return case when role_in(r, 'clinical') then d else null end;
  when 'vitals', 'medAdmin', 'nursingTasks' then return case when role_in(r, 'clinical') or r = 'receptionist' and p_col = 'vitals' then d else null end;
  when 'prescriptions' then return case when role_in(r, 'clinical') or role_in(r, 'pharmacy') then d else null end;
  when 'labOrders' then return case when role_in(r, 'clinical') or role_in(r, 'lab') or can_verify(m) then d
                                    when role_in(r, 'billing') then d - 'results' - 'remarks' - 'files' else null end;
  when 'admissions' then return case when role_in(r, 'ipd_view') then d
                                     when role_in(r, 'billing') then d - 'notes' - 'dischargeSummary' else null end;
  when 'messages' then return case when role_in(r, 'appointments') then d else null end;
  when 'patients' then
    -- pharmacists and lab staff need allergies but not the full address book
    return case when role_in(r, 'register') or r = 'receptionist' then d else d - 'address' - 'altPhone' - 'emergencyName' - 'emergencyPhone' end;
  else return d;
  end case;
end $$;

-- ---------------------------------------------------------------------
--  Internal write (used by save_record / save_records / create_hospital)
-- ---------------------------------------------------------------------
create or replace function public._write(m public.members, p_h text, p_col text, p_id text, p_patch jsonb, p_replace boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  old jsonb;
  newd jsonb;
  numfield text := case p_col when 'appointments' then 'apptNo' when 'prescriptions' then 'rxNo' when 'labOrders' then 'orderNo'
                    when 'bills' then 'billNo' when 'payments' then 'receiptNo' when 'admissions' then 'admNo' when 'patients' then 'pid' else null end;
begin
  if p_col !~ '^[A-Za-z]{2,30}$' or p_id is null or length(p_id) > 120 then
    raise exception 'invalid_record' using errcode = '22023';
  end if;
  if p_col = 'appointments' then   -- serialise tokens per doctor per day
    perform pg_advisory_xact_lock(hashtext(p_h || ':ap:' || coalesce(p_patch ->> 'doctorId', '') || coalesce(p_patch ->> 'date', '')));
  elsif numfield is not null then
    perform pg_advisory_xact_lock(hashtext(p_h || ':' || p_col));
  end if;
  select data into old from records where hospital_id = p_h and collection = p_col and id = p_id for update;
  newd := case when old is null or p_replace then p_patch else old || p_patch end;
  newd := newd || jsonb_build_object('id', p_id, 'hospitalId', p_h);
  if old is null and not newd ? 'createdAt' then newd := newd || jsonb_build_object('createdAt', now()); end if;

  if not coalesce(can_write(m, p_col, p_id, old, newd), false) then   -- NULL (unknown) is a denial
    raise exception 'permission_denied:%', p_col using errcode = '42501';
  end if;

  -- numbers and tokens are made unique on the server (several devices may create them offline)
  if old is null and numfield is not null and exists (select 1 from records where hospital_id = p_h and collection = p_col and data ->> numfield = newd ->> numfield) then
    newd := newd || jsonb_build_object(numfield, (newd ->> numfield) || '-' || upper(substr(md5(p_id), 1, 3)));
  end if;
  if p_col = 'appointments' and newd ->> 'status' <> 'cancelled' and exists (
      select 1 from records a where a.hospital_id = p_h and a.collection = 'appointments' and a.id <> p_id
        and a.data ->> 'doctorId' = newd ->> 'doctorId' and a.data ->> 'date' = newd ->> 'date' and a.data ->> 'token' = newd ->> 'token') then
    newd := newd || jsonb_build_object('token', (select coalesce(max((a.data ->> 'token')::int), 0) + 1 from records a
      where a.hospital_id = p_h and a.collection = 'appointments' and a.data ->> 'doctorId' = newd ->> 'doctorId' and a.data ->> 'date' = newd ->> 'date'));
  end if;

  insert into records (hospital_id, collection, id, data, updated_by)
  values (p_h, p_col, p_id, newd, auth.uid())
  on conflict (hospital_id, collection, id)
  do update set data = excluded.data, updated_at = now(), updated_by = auth.uid();

  insert into changes (hospital_id, collection, id, op) values (p_h, p_col, p_id, 'upsert');

  if p_col = 'users' then   -- keep login memberships in step with the user record
    update members set role = coalesce(newd ->> 'role', 'patient'), staff_id = newd ->> 'staffId',
                       status = coalesce(newd ->> 'status', 'active')
    where hospital_id = p_h and user_id = p_id;
  end if;
end $$;
revoke all on function public._write(public.members, text, text, text, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.can_write(public.members, text, text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.visible_record(public.members, text, text, jsonb) from public, anon, authenticated;

create or replace function public._require_member(p_h text) returns public.members
language plpgsql stable security definer set search_path = public as $$
declare m public.members;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  m := member_of(p_h);
  if m.auth_id is null then raise exception 'not_member' using errcode = '42501'; end if;
  if exists (select 1 from records where hospital_id = p_h and collection = 'hospitals' and id = p_h and data ->> 'status' = 'suspended') then
    raise exception 'hospital_suspended' using errcode = '42501';
  end if;
  return m;
end $$;

-- ---------------------------------------------------------------------
--  Public API (called from the app with supabase.rpc)
-- ---------------------------------------------------------------------
create or replace function public.save_record(p_hospital text, p_collection text, p_id text, p_data jsonb, p_replace boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform _write(_require_member(p_hospital), p_hospital, p_collection, p_id, p_data, p_replace);
end $$;

create or replace function public.save_records(p_hospital text, p_rows jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare m public.members := _require_member(p_hospital); r jsonb; n int := 0;
begin
  for r in select * from jsonb_array_elements(p_rows) loop
    perform _write(m, p_hospital, r ->> 'c', r ->> 'id', r -> 'd', coalesce((r ->> 'replace')::boolean, false));
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.delete_record(p_hospital text, p_collection text, p_id text)
returns void language plpgsql security definer set search_path = public as $$
declare m public.members := _require_member(p_hospital); old jsonb;
begin
  select data into old from records where hospital_id = p_hospital and collection = p_collection and id = p_id;
  if old is null then return; end if;
  if not coalesce(can_write(m, p_collection, p_id, old, null), false) then
    raise exception 'permission_denied:%', p_collection using errcode = '42501';
  end if;
  delete from records where hospital_id = p_hospital and collection = p_collection and id = p_id;
  insert into changes (hospital_id, collection, id, op) values (p_hospital, p_collection, p_id, 'delete');
end $$;

-- Everything this member may see, plus the change-log position to sync from.
create or replace function public.fetch_hospital(p_hospital text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare m public.members := _require_member(p_hospital); rows jsonb; last bigint;
begin
  select coalesce(max(seq), 0) into last from changes where hospital_id = p_hospital;
  select coalesce(jsonb_agg(jsonb_build_object('c', r.collection, 'd', v.d)), '[]'::jsonb) into rows
  from records r
  cross join lateral (select visible_record(m, r.collection, r.id, r.data) as d) v
  where r.hospital_id = p_hospital and v.d is not null;
  return jsonb_build_object('seq', last, 'records', rows, 'member', to_jsonb(m) - 'auth_id');
end $$;

create or replace function public.fetch_changes(p_hospital text, p_since bigint)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare m public.members := _require_member(p_hospital); last bigint; recs jsonb; dels jsonb;
begin
  select coalesce(max(seq), p_since) into last from changes where hospital_id = p_hospital;
  with ch as (select distinct collection, id from changes where hospital_id = p_hospital and seq > p_since),
  j as (
    select ch.collection, ch.id, r.data, case when r.data is null then null else visible_record(m, ch.collection, ch.id, r.data) end as v
    from ch left join records r on r.hospital_id = p_hospital and r.collection = ch.collection and r.id = ch.id)
  select coalesce(jsonb_agg(jsonb_build_object('c', collection, 'd', v)) filter (where v is not null), '[]'::jsonb),
         coalesce(jsonb_agg(jsonb_build_object('c', collection, 'id', id)) filter (where data is null), '[]'::jsonb)
  into recs, dels from j;
  return jsonb_build_object('seq', last, 'records', recs, 'deleted', dels);
end $$;

-- After OTP login: link this login to staff users and to patient records
-- (registered at the reception) that carry the same mobile number / email.
create or replace function public.link_member()
returns jsonb language plpgsql security definer set search_path = public as $$
declare ph text; em text; out jsonb; p record; uid text;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10), lower(nullif(email, ''))
  into ph, em from auth.users where id = auth.uid();

  -- 1) existing app users (staff or patients)
  insert into members (auth_id, hospital_id, user_id, role, staff_id, patient_id, family_id, status)
  select distinct on (r.hospital_id) auth.uid(), r.hospital_id, r.id, coalesce(r.data ->> 'role', 'patient'), r.data ->> 'staffId',
         r.data ->> 'patientId', public.family_of(r.hospital_id, r.data ->> 'patientId'), coalesce(r.data ->> 'status', 'active')
  from records r
  where r.collection = 'users'
    and ((length(ph) = 10 and right(regexp_replace(coalesce(r.data ->> 'phone', ''), '\D', '', 'g'), 10) = ph)
      or (em is not null and lower(r.data ->> 'email') = em))
  order by r.hospital_id, (r.data ->> 'status' = 'active') desc, (r.data ->> 'role' <> 'patient') desc, r.created_at
  on conflict (auth_id, hospital_id) do update
    set user_id = excluded.user_id, role = excluded.role, staff_id = excluded.staff_id, patient_id = excluded.patient_id,
        family_id = excluded.family_id, status = excluded.status;

  -- 2) patients registered at a hospital's reception, who now log in for the first time
  if length(ph) = 10 then
    for p in select distinct on (hospital_id) hospital_id, id, data from records
             where collection = 'patients' and right(regexp_replace(coalesce(data ->> 'phone', ''), '\D', '', 'g'), 10) = ph
               and not exists (select 1 from members mm where mm.auth_id = auth.uid() and mm.hospital_id = records.hospital_id)
             order by hospital_id, (coalesce(data ->> 'familyId', id) = id) desc, created_at
    loop
      uid := 'u_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12);
      insert into records (hospital_id, collection, id, data, updated_by) values (p.hospital_id, 'users', uid,
        jsonb_build_object('id', uid, 'hospitalId', p.hospital_id, 'name', p.data ->> 'name', 'phone', ph, 'role', 'patient', 'patientId', p.id, 'status', 'active', 'createdAt', now()), auth.uid());
      insert into changes (hospital_id, collection, id, op) values (p.hospital_id, 'users', uid, 'upsert');
      insert into members (auth_id, hospital_id, user_id, role, patient_id, family_id, status)
      values (auth.uid(), p.hospital_id, uid, 'patient', p.id, coalesce(p.data ->> 'familyId', p.id), 'active');
    end loop;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('hospitalId', hospital_id, 'userId', user_id, 'role', role, 'status', status)), '[]'::jsonb)
  into out from members where auth_id = auth.uid();
  return out;
end $$;

-- Start a brand-new hospital / clinic; the caller becomes its administrator.
create or replace function public.create_hospital(p_hospital text, p_info jsonb, p_admin jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare m public.members; ph text; em text; uid text := 'u_' || substr(md5(random()::text), 1, 10); sid text := 'st_' || substr(md5(random()::text), 1, 10);
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_hospital !~ '^[a-z0-9][a-z0-9-]{2,39}$' then raise exception 'invalid_hospital_code' using errcode = '22023'; end if;
  if exists (select 1 from records where hospital_id = p_hospital) then raise exception 'hospital_exists' using errcode = '23505'; end if;
  if coalesce(trim(p_info ->> 'name'), '') = '' then raise exception 'hospital_name_required' using errcode = '22023'; end if;
  select phone, email into ph, em from auth.users where id = auth.uid();

  insert into records (hospital_id, collection, id, data, updated_by)
  values (p_hospital, 'hospitals', p_hospital, p_info || jsonb_build_object('id', p_hospital, 'code', p_hospital, 'status', 'active',
          'plan', 'starter', 'createdAt', now()), auth.uid());
  insert into changes (hospital_id, collection, id, op) values (p_hospital, 'hospitals', p_hospital, 'upsert');

  insert into members (auth_id, hospital_id, user_id, role, staff_id, status) values (auth.uid(), p_hospital, uid, 'admin', sid, 'active');
  m := member_of(p_hospital);
  perform _write(m, p_hospital, 'staff', sid, jsonb_build_object('name', coalesce(p_admin ->> 'name', 'Administrator'), 'role', 'admin',
    'designation', 'Administrator', 'phone', right(coalesce(ph, ''), 10), 'email', em, 'userId', uid, 'active', true), true);
  perform _write(m, p_hospital, 'users', uid, jsonb_build_object('name', coalesce(p_admin ->> 'name', 'Administrator'), 'role', 'admin',
    'staffId', sid, 'phone', right(coalesce(ph, ''), 10), 'email', em, 'status', 'active'), true);
  perform _write(m, p_hospital, 'settings', 'messaging', jsonb_build_object('value', jsonb_build_object('whatsappProvider', 'click_to_chat', 'smsProvider', 'demo', 'autoReminders', true, 'tokenAlertAhead', 3)), true);
  perform _write(m, p_hospital, 'departments', 'dep-gen', jsonb_build_object('name', 'General Medicine', 'icon', '🩺', 'active', true), true);
end $$;

-- Public info for the "join hospital" screen (no patient data).
create or replace function public.hospital_public(p_hospital text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('name', data ->> 'name', 'city', data ->> 'city', 'type', data ->> 'type')
  from records where hospital_id = p_hospital and collection = 'hospitals' and id = p_hospital and auth.uid() is not null
$$;

-- A signed-in person registers as a patient (self sign-up from the app).
create or replace function public.register_patient(p_hospital text, p_data jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare ph text; pid text := 'p_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12); uid text := 'u_' || substr(md5(random()::text), 1, 12); n int;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from records where hospital_id = p_hospital and collection = 'hospitals' and data ->> 'status' = 'active') then raise exception 'hospital_not_found' using errcode = 'P0002'; end if;
  if is_member(p_hospital) then raise exception 'already_member' using errcode = '23505'; end if;
  if coalesce(trim(p_data ->> 'name'), '') = '' then raise exception 'name_required' using errcode = '22023'; end if;
  select right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) into ph from auth.users where id = auth.uid();
  select count(*) + 1001 into n from records where hospital_id = p_hospital and collection = 'patients';
  insert into records (hospital_id, collection, id, data, updated_by) values (p_hospital, 'patients', pid,
    jsonb_build_object('id', pid, 'hospitalId', p_hospital, 'pid', upper(left(regexp_replace(p_hospital, '[^a-z]', '', 'g'), 3)) || '-' || lpad(n::text, 6, '0'),
      'name', trim(p_data ->> 'name'), 'dob', p_data ->> 'dob', 'ageOnly', true, 'gender', coalesce(p_data ->> 'gender', ''), 'phone', coalesce(ph, ''),
      'lang', coalesce(p_data ->> 'lang', 'en'), 'familyId', pid, 'relation', 'self', 'incomplete', true, 'vaccinations', '[]'::jsonb,
      'consent', jsonb_build_object('treatment', true, 'whatsapp', true, 'sms', true, 'at', now()), 'createdAt', now()), auth.uid());
  insert into records (hospital_id, collection, id, data, updated_by) values (p_hospital, 'users', uid,
    jsonb_build_object('id', uid, 'hospitalId', p_hospital, 'name', trim(p_data ->> 'name'), 'phone', coalesce(ph, ''), 'role', 'patient', 'patientId', pid, 'status', 'active', 'createdAt', now()), auth.uid());
  insert into changes (hospital_id, collection, id, op) values (p_hospital, 'patients', pid, 'upsert'), (p_hospital, 'users', uid, 'upsert');
  insert into members (auth_id, hospital_id, user_id, role, patient_id, family_id, status) values (auth.uid(), p_hospital, uid, 'patient', pid, pid, 'active');
  return pid;
end $$;

-- Super Admin: hospitals on the platform with usage numbers only (no patient data).
create or replace function public.platform_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'permission_denied:platform' using errcode = '42501'; end if;
  return (select coalesce(jsonb_agg(h.data || jsonb_build_object('usage', jsonb_build_object(
      'patients', (select count(*) from records x where x.hospital_id = h.hospital_id and x.collection = 'patients'),
      'staff', (select count(*) from records x where x.hospital_id = h.hospital_id and x.collection = 'staff'),
      'doctors', (select count(*) from records x where x.hospital_id = h.hospital_id and x.collection = 'staff' and x.data ->> 'role' = 'doctor'),
      'apptsToday', (select count(*) from records x where x.hospital_id = h.hospital_id and x.collection = 'appointments' and x.data ->> 'date' = to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM-DD'))
    ))), '[]'::jsonb) from records h where h.collection = 'hospitals');
end $$;

create or replace function public.platform_set_hospital(p_hospital text, p_patch jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'permission_denied:platform' using errcode = '42501'; end if;
  update records set data = data || (p_patch - 'id' - 'hospitalId' - 'code'), updated_at = now(), updated_by = auth.uid()
  where hospital_id = p_hospital and collection = 'hospitals' and id = p_hospital;
  insert into changes (hospital_id, collection, id, op) values (p_hospital, 'hospitals', p_hospital, 'upsert');
end $$;

-- Keep the change-log small (it only needs to cover devices that were offline briefly).
create or replace function public.prune_changes() returns void
language sql security definer set search_path = public as $$
  delete from changes where at < now() - interval '7 days'
$$;

-- Function permissions: signed-in users only.
revoke execute on function public.save_record(text, text, text, jsonb, boolean), public.save_records(text, jsonb),
  public.delete_record(text, text, text), public.fetch_hospital(text), public.fetch_changes(text, bigint),
  public.link_member(), public.create_hospital(text, jsonb, jsonb), public.hospital_public(text),
  public.register_patient(text, jsonb), public.platform_overview(), public.platform_set_hospital(text, jsonb), public.prune_changes() from public, anon;
grant execute on function public.save_record(text, text, text, jsonb, boolean), public.save_records(text, jsonb),
  public.delete_record(text, text, text), public.fetch_hospital(text), public.fetch_changes(text, bigint),
  public.link_member(), public.create_hospital(text, jsonb, jsonb), public.hospital_public(text),
  public.register_patient(text, jsonb), public.platform_overview(), public.platform_set_hospital(text, jsonb) to authenticated;

-- ---------------------------------------------------------------------
--  Realtime: devices listen to the change-log for their hospital
-- ---------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'changes') then
    execute 'alter publication supabase_realtime add table public.changes';
  end if;
end $$;

-- ---------------------------------------------------------------------
--  Medical documents: PRIVATE bucket "documents", files under <hospital>/…
--  (opened via short-lived signed URLs – never public links)
-- ---------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('documents', 'documents', false, 10485760)
    on conflict (id) do update set public = false;
    execute 'drop policy if exists "staff upload documents" on storage.objects';
    execute $p$create policy "staff upload documents" on storage.objects for insert to authenticated
      with check (bucket_id = 'documents' and exists (select 1 from public.members m where m.auth_id = auth.uid()
        and m.hospital_id = (storage.foldername(name))[1] and m.status = 'active' and m.role <> 'patient'))$p$;
    execute 'drop policy if exists "members read documents" on storage.objects';
    execute $p$create policy "members read documents" on storage.objects for select to authenticated
      using (bucket_id = 'documents' and public.is_member((storage.foldername(name))[1]))$p$;
  end if;
end $$;
