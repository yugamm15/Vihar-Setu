# Phase J.3 Registration Security & RLS Policy Consistency Review

Date: 2026-11-16

## Executive summary

The cumulative Phase J through J.2 changes were independently reviewed with
focus on registration, approval, profile lifecycle, and combined RLS policy
behavior. Static review found three actionable issues:

1. OTP verification still allowed an active Super Administrator to use the OTP
   path despite the password-only requirement.
2. Emergency creation did not bind a supplied `vihar_id` to the caller's
   Vihar ownership or current participation.
3. GPS location insertion checked only the caller's `user_id`, not the caller's
   relationship to the supplied Vihar.

The first issue was corrected in the authentication service. The second and
third were corrected through the additive migration
`20260914_phase_j3_vihar_scope_guards.sql`.

The review did not execute PostgreSQL, Supabase, Docker, remote SQL, or any
deployment. RLS correctness and final policy composition remain unverified.

## Registration and approval security

### New registration state

The auth-triggered profile creation path in
`20260903_email_auth_and_sevak_approval.sql` creates profiles with
`status = 'PENDING'` and assigns the default `SEVAK` role. The J.2 client
INSERT policy additionally requires `status = 'PENDING'` and
`auth.uid() = id`.

**Status: VERIFIED STATICALLY.**

### Client-created privileged profiles

The J.2 policy prevents a client from inserting `ACTIVE`, `REJECTED`, or
`DISABLED` profiles. It also does not grant `ADMIN` or `SUPER_ADMIN` roles;
role management is restricted by the Phase J active Super Administrator
policy.

**Status: VERIFIED STATICALLY; PostgreSQL execution BLOCKED.**

### Delete and recreate

Pending or rejected users retain a workflow for deleting their own profile.
However, the J.2 replacement INSERT policy permits only `PENDING` client rows,
so deleting and recreating a profile cannot directly create an active profile.
The auth trigger and database foreign-key behavior still require isolated
database testing.

**Status: PARTIALLY VERIFIED.**

### Approval and rejection

Approval and rejection are performed by the existing Administrator service
through database updates. The Phase J profile trigger prevents ordinary users
from changing `status` or `rejection_reason`; active-aware role policies
prevent inactive administrators from retaining privileged access.

The exact final policy combination and deployed grants were not executable in
this environment.

**Status: PARTIALLY VERIFIED.**

### Registration workflow compatibility

The registration UI submits `PENDING` profile data. Password authentication
requires an `ACTIVE` profile, and OTP verification now requires `ACTIVE` for
all roles. Therefore a pending user cannot gain active application access
through either login path.

**Status: VERIFIED STATICALLY; hosted-auth behavior NOT VERIFIED.**

## Profile deletion/recreation protection

The relevant protections are:

- UPDATE trigger protecting `status`, `rejection_reason`, `id`, and
  `created_at`.
- J.2 INSERT policy requiring `PENDING`.
- Active-profile checks in `has_role()`.
- Password, OTP, and session-restoration checks requiring `ACTIVE`.

The remaining permitted pending/rejected self-delete is a registration
withdrawal operation, not an authorization reset to active. Whether a deleted
profile can be recreated by the auth trigger with a conflicting existing Auth
identity, and how all cascades behave, must be tested in PostgreSQL.

## Complete RLS policy inventory

This is a static inventory of repository-defined policies after the additive
Phase J migrations. PostgreSQL policies are permissive by default and combine
with OR semantics; the named `DROP POLICY` statements must be confirmed
against the deployed catalog.

| Table | SELECT | INSERT | UPDATE | DELETE | Anonymous / inactive profile |
|---|---|---|---|---|---|
| `profiles` | Own profile or admin-style access from the original policy | Own `PENDING` row only after J.2 | Own row or active Super Admin, with trigger protection | Own pending/rejected row from the approval migration | Anonymous denied by policy; inactive users may still see their own row unless table grants or later policy differ |
| `roles` | Authenticated users can read roles | No client policy found | No client policy found | No client policy found | Anonymous denied; inactive authenticated users may read because the roles policy is `TO authenticated` without active check |
| `user_roles` | Own roles or admin access; management restricted to active Super Admin | Active Super Admin only for management | Active Super Admin only | Active Super Admin only | Anonymous denied; inactive users may still read their own role under the original SELECT policy |
| `administrators` | Original administrator policies plus Super Admin replacement; effective result requires catalog verification | Active Super Admin management path; historical policies require catalog verification | Same | Same | Anonymous denied by intended policies; inactive privileged access depends on every remaining policy |
| `admin_permissions` | Active Super Admin or active Administrator's own active admin row | Active Super Admin management | Active Super Admin management | Active Super Admin management | Anonymous denied; inactive Admin should fail active-aware checks, pending catalog verification |
| `areas` | Existing area policies plus active Super Admin management | Active Super Admin management and any historical area policy | Active Super Admin management and any historical area policy | Active Super Admin management and any historical area policy | Anonymous denied by intended policies; inactive access requires catalog verification |
| `emergencies` | Own emergencies or admin-style access | Active authenticated user, own `user_id`, and null/owned/current-participant Vihar after J.1/J.3 | Own cancellation or admin resolution from original policy | No normal client delete policy found | Anonymous denied; inactive users fail the new INSERT guard but existing SELECT/UPDATE combinations require PostgreSQL verification |
| `emergency_attempts` | Existing migration policies | Existing migration policies | Existing migration policies | Existing migration policies | Requires catalog review; no blanket claim is made statically |
| `audit_logs` | Existing authorized read policies used by Super Admin UI | Direct client insert removed by J | No client update policy found | No client delete policy found | Anonymous denied by intended RLS; privileges and historical policies require catalog verification |
| `notifications` | Existing migration policies | Existing migration policies | Existing migration policies | Existing migration policies | Requires catalog review |
| `vihars` | Original owner/admin policies and later workflow policies | Existing Vihar creation policy | Existing owner/admin policies and guarded workflows | Existing owner/admin policies | Inactive access requires catalog verification |
| `vihar_participants` | Phase B.1 guarded policies | Guarded handover/workflow policy | Guarded handover/workflow policy | Guarded workflow policy | Active role and scope checks are present statically; final OR composition unverified |
| `vihar_handover` | Guarded read policy | Protected handover RPC path | Protected handover RPC path | No ordinary client delete path identified | Inactive users should fail active-aware guards; database execution required |
| `vihar_holds` | Guarded policies from handover hardening | Guarded policies/workflow | Guarded policies/workflow | Guarded policies/workflow | Inactive and cross-area behavior requires execution |
| `vihar_locations` | Own location or admin-style read | Active caller, own `user_id`, and owned/current-participant Vihar after J.3 | No ordinary client update policy identified | No ordinary client delete policy identified | Anonymous denied by intended policy; final grants/policies unverified |
| `route_events` | Existing owner/admin policies and trusted workflow writes | Existing workflow policies | Existing workflow policies | Existing workflow policies | Requires catalog review |
| `system_settings` | Public allowlist or active Super Admin | Active Super Admin only | Active Super Admin only | Active Super Admin only | Anonymous denied; inactive users fail active-aware Super Admin checks, but final policy set requires PostgreSQL |

This inventory is not a substitute for querying `pg_policies` and table
privileges.

## Effective combined access analysis

The review specifically considered permissive-policy OR behavior. Phase J
replaces several broad policy names, including profile update, system settings,
administrator management, permissions, audit insertion, and the J.1 emergency
INSERT policy. J.2 replaces profile INSERT. J.3 replaces emergency INSERT
again and replaces location INSERT.

Static repository review found no additional repository-defined emergency
INSERT policy after the replacement. It also found no direct client
`audit_logs` INSERT. Nonetheless, policy names and migration replay state are
database facts; stale or manually-created policies could still widen access.

## Account lifecycle

| Transition | Static result |
|---|---|
| Registration → Pending | Auth trigger and profile setup use `PENDING`; VERIFIED STATICALLY |
| Pending → Approved | Administrator workflow exists; actor/RLS runtime NOT VERIFIED |
| Approved → Active session | Password/OTP/session restoration require `ACTIVE`; VERIFIED STATICALLY |
| Active → Disabled | Database-side status update is protected; existing session refresh rejects non-active status; PARTIALLY VERIFIED |
| Disabled → Re-enabled or rejected | Requires privileged workflow; exact authorization and audit behavior NOT VERIFIED |
| Role assignment | Active Super Admin policy; runtime NOT VERIFIED |
| Profile deletion | Pending/rejected self-withdrawal remains; cascades and Auth identity behavior BLOCKED |

No client fallback assigns `SUPER_ADMIN`.

## Emergency and audit behavior

`record_emergency_sos_audit(UUID)` validates authenticated active profile,
emergency ownership, and `TRIGGERED` status, and derives trusted audit fields
from `auth.uid()` and the emergency row.

The emergency row and audit row are still separate operations. A network or
RPC failure can create an emergency without an audit row, and repeated
successful RPC calls can create duplicate audit rows because no idempotency
constraint was confirmed.

The J.3 scope guard now prevents an active user from associating an emergency
or location row with an unrelated Vihar. The guard allows a null emergency
Vihar, the caller's owned Vihar, or a Vihar with a current participant row.

**Status: PARTIALLY VERIFIED.**

## Findings by severity

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | HIGH | OTP path could authenticate an active Super Administrator despite the password-only requirement. | CORRECTED STATICALLY |
| 2 | MEDIUM | Emergency and location writes were not scoped to the caller's Vihar relationship. | CORRECTED THROUGH ADDITIVE MIGRATION |
| 3 | MEDIUM | Emergency audit is non-transactional and can be missing after a successful emergency insert. | PARTIALLY VERIFIED; DEFERRED |
| 4 | MEDIUM | SOS audit retries are not proven idempotent. | NOT VERIFIED |
| 5 | MEDIUM | Final RLS policy composition and grants cannot be proven without PostgreSQL. | BLOCKED |
| 6 | LOW | Inactive authenticated users may retain read access to roles or their own profile under historical policies. | PARTIALLY VERIFIED; impact requires catalog review |

## Corrections made

- Updated `authService.js` to reject `SUPER_ADMIN` from OTP verification.
- Added `20260914_phase_j3_vihar_scope_guards.sql`.
- Updated the Phase J SQL matrix with cross-Vihar emergency/location scenarios.
- Created this report.

No prior migration was overwritten. No production or remote database was
accessed. No Phase K work was started.

## Static validation

| Check | Result |
|---|---|
| Babel parsing | PASSED — modified authentication and Vihar JavaScript files |
| Localization JSON | PASSED — `en.json`, `hi.json`, and `gu.json` |
| Migration ordering | PASSED — valid through `20260914` |
| SQL policy inventory | Completed statically |
| Registration workflow search | Completed statically |
| Privileged-role fallback search | Completed statically |
| Direct profile deletion search | Completed statically |
| Direct client audit insertion search | PASSED — no direct client audit INSERT found |
| J.3 SQL construct inspection | PASSED |
| `git diff --check` | PASSED |

## Database tests not executed

- PostgreSQL or Supabase SQL.
- Migration replay.
- `pg_policies`, table grants, and routine privilege queries.
- JWT fixture tests for every role and status.
- Foreign-key cascade and trigger-order tests.
- Emergency audit retry/idempotency tests.
- Hosted Supabase Auth tests.

## Remaining blockers

1. Replay migrations through `20260914` in an isolated database.
2. Verify every listed table's final policy and privilege set.
3. Execute registration, profile deletion/recreation, account lifecycle,
   emergency scope, audit integrity, hard-delete, and handover tests.
4. Confirm inactive-profile behavior for every table.
5. Design trusted transactional/idempotent SOS audit persistence.

## Recommendation for the next development phase

Do not begin feature development until the isolated database verification is
complete. The next phase should be a controlled deployment-readiness and
database-test phase, not a new product feature phase. Phase J remains
**PARTIALLY VERIFIED** and is not production-ready.
