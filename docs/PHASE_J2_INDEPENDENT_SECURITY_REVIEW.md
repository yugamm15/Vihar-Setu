# Phase J.2 Independent Security Review & Correction

Date: 2026-11-16

## 1. Executive summary

An independent static review of the Phase J and Phase J.1 changes identified
one high-severity privilege-escalation path and one medium-severity audit
reliability issue.

The high-severity issue was a profile delete/recreate path: a pending or
rejected authenticated user could delete their own profile and then use the
original profile INSERT policy to recreate it with `status = 'ACTIVE'`. The
new additive migration
`20260913_phase_j2_profile_insert_guard.sql` requires client-created profiles
to belong to the authenticated user and to start as `PENDING`.

The emergency workflow also previously ignored the normal Supabase RPC error
return value. The client now explicitly logs an audit-recording failure. This
does not claim transactional audit guarantees; emergency creation and audit
creation remain separate operations and require a future trusted backend
transaction or database-trigger design.

No database, Docker environment, remote Supabase project, production system,
or protected `env` file was accessed. No migration was applied.

## 2. Files inspected

- `supabase/migrations/20260911_phase_j_security_governance.sql`
- `supabase/migrations/20260912_phase_j1_active_emergency_guard.sql`
- `supabase/migrations/20260913_phase_j2_profile_insert_guard.sql`
- `supabase/tests/test_phase_j_security_governance.sql`
- `docs/PHASE_J1_VERIFICATION_REPORT.md`
- `docs/PHASE_J_SECURITY_AUDIT.md`
- `src/features/auth/services/authService.js`
- `src/features/auth/hooks/useAuthStore.js`
- `src/features/vihar/services/viharService.js`
- `supabase/migrations/20260901_init_schema.sql`
- `supabase/migrations/20260903_email_auth_and_sevak_approval.sql`
- `supabase/migrations/20260904_sub_vihar_handover_holds_and_areas.sql`
- `supabase/migrations/20260906_master_v3_state_machines_and_guards.sql`
- `supabase/migrations/20260909_security_foundation.sql`
- `supabase/migrations/20260910_handover_rls_hardening.sql`
- Relevant profile and Vihar call sites

## 3. Phase J.1 migration review

### Emergency INSERT policy

`20260912_phase_j1_active_emergency_guard.sql` correctly replaces the
historical self-owned emergency INSERT policy on `public.emergencies`. It
requires:

- `TO authenticated`.
- `auth.uid() = user_id`.
- A matching `public.profiles` row with `status = 'ACTIVE'`.

The historical policy is dropped by name before replacement. Static inspection
found no second emergency INSERT policy in the repository migrations. However,
PostgreSQL's final permissive policy set and deployed grants remain unverified
without catalog queries and execution.

### Compatibility

The policy preserves legitimate active-user emergency creation and does not
alter emergency state transitions, update policies, escalation functions, or
trusted server-side operations. Runtime compatibility remains unverified.

## 4. Profile INSERT vulnerability and correction

### Finding

**Severity: HIGH — profile authorization-state recreation**

The Phase J trigger protects profile authorization fields only on UPDATE.
The historical profile INSERT policy checked only `auth.uid() = id`, while
the historical DELETE policy allowed users to delete their own `PENDING` or
`REJECTED` profile. A user could therefore:

1. Authenticate with a pending or rejected account.
2. Delete their own profile.
3. Insert a profile with the same UUID and `status = 'ACTIVE'`.
4. Pass active-profile checks used by application and database security paths.

### Correction

`20260913_phase_j2_profile_insert_guard.sql` replaces the client profile
creation policy with an authenticated policy requiring both matching identity
and `status = 'PENDING'`. This preserves profile setup and the approval workflow
while preventing client-created active profiles.

The correction is additive and does not overwrite prior migrations or delete
data. Auth-triggered profile creation is a protected database function and is
not dependent on this client RLS policy.

The final behavior still requires isolated PostgreSQL testing, particularly
around trigger-created profiles, `SECURITY DEFINER` execution, and policy
composition.

## 5. Authentication and session restoration

### Status enforcement

Password authentication requires an `ACTIVE` profile. OTP verification now
requires `ACTIVE` for every role. Persisted-session restoration fetches the
profile and role again and rejects missing profiles, missing roles, invalid
roles, and every non-active status.

No fallback assigns `SUPER_ADMIN`, and stale locally persisted role/profile
values are not trusted for authorization.

**Status: VERIFIED STATICALLY; database and hosted-auth behavior NOT VERIFIED.**

### Registration compatibility

Profile setup uses an upsert against the profile created by the auth trigger.
The new INSERT policy permits only `PENDING` client-created rows, matching the
registration approval model. Protected status changes remain backend-managed.

## 6. SOS audit reliability review

The emergency workflow inserts the emergency first and calls
`record_emergency_sos_audit(UUID)` afterward. The RPC derives actor, action,
entity, entity ID, and selected details from authenticated/database values and
validates active profile, ownership, and `TRIGGERED` status.

The client now checks the RPC's returned `error` and emits an explicit warning.
This avoids silently treating an RPC failure as success internally, but the
public service result still returns the created emergency because safety
emergency creation must not be reported as absent merely because governance
logging failed.

Remaining limitations:

- Emergency and audit writes are not atomic.
- Offline or transient failures can leave an emergency without an audit row.
- The RPC has no idempotency key or unique-event constraint.
- Retrying a successful RPC can create duplicate audit records.

**Status: PARTIALLY VERIFIED.** A trusted transactional RPC, database trigger,
or durable outbox/idempotency design is required before claiming complete audit
reliability. No speculative redesign was implemented.

## 7. Database function security review

Static inspection confirmed the following for the Phase J-added functions:

- `protect_profile_authorization_fields()` uses
  `SET search_path = public, pg_temp`.
- `record_emergency_sos_audit(UUID)` uses
  `SET search_path = public, pg_temp`.
- Both functions validate authenticated context.
- The SOS RPC validates active profile, ownership, emergency existence, and
  status.
- `record_security_event()` and `hard_delete_sevak()` use a controlled public
  search path and active administrative checks.
- Protected RPC execution is revoked from `PUBLIC` and granted to
  `authenticated` where intended.
- Handover guards and role helpers from Phase B.1 were not replaced by Phase
  J.1/J.2.

Static review cannot prove:

- Final policy composition after every migration is replayed.
- Actual routine/table grants.
- Runtime `auth.uid()` behavior under all JWT contexts.
- Hard-delete and handover execution against deployed foreign keys, triggers,
  and RLS.
- Whether historical functions have complete active-profile enforcement in all
  branches.

**Status: PARTIALLY VERIFIED.**

## 8. Test quality assessment

`test_phase_j_security_governance.sql` remains a documentation-only matrix,
not a complete executable PostgreSQL security suite. It contains a transaction
marker, comments, a notice, and rollback, but no fixtures, JWT claim setup,
operations, or assertions.

The matrix was updated to document:

- Delete-then-reinsert profile escalation.
- Active, pending, rejected, and disabled emergency insertion cases.
- Duplicate SOS audit behavior.

Required executable test scenarios remain:

- Active profile emergency insertion.
- Pending, rejected, and disabled emergency insertion denial.
- Cross-user and anonymous emergency insertion denial.
- Authorized and unauthorized SOS audit calls.
- Duplicate SOS audit behavior.
- Role escalation.
- Administrator area isolation.
- Hard-delete authorization.
- Handover authorization.
- Direct audit-log INSERT, UPDATE, and DELETE denial.

**Status: NOT VERIFIED.**

## 9. Findings and statuses

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | HIGH | Pending/rejected profile could be deleted and recreated with ACTIVE status. | CORRECTED STATICALLY |
| 2 | MEDIUM | Emergency and audit operations are separate; audit failures can leave an unaudited emergency. | PARTIALLY VERIFIED; DEFERRED ARCHITECTURE |
| 3 | MEDIUM | SOS audit RPC is not idempotent; retries may duplicate events. | PARTIALLY VERIFIED; DATABASE TEST REQUIRED |
| 4 | MEDIUM | RLS policy composition and actual grants cannot be proven statically. | BLOCKED |
| 5 | MEDIUM | Phase J SQL test file does not execute assertions or configure fixtures. | NOT VERIFIED |

No critical finding was identified in the static review.

## 10. Corrections made

- Added `20260913_phase_j2_profile_insert_guard.sql`.
- Updated the Phase J SQL test matrix with profile recreation, emergency
  status, and duplicate-audit scenarios.
- Updated `viharService.js` to inspect and explicitly report the Supabase RPC
  error result instead of relying on an exception.
- Created this review report.

No prior migration was overwritten. No production or remote database was
accessed. No Phase K work was started.

## 11. Static validation

The following checks were executed:

| Check | Result |
|---|---|
| Babel parsing for modified JavaScript files | PASSED — `authService.js`, `useAuthStore.js`, and `viharService.js` |
| Localization JSON parsing | PASSED — `en.json`, `hi.json`, and `gu.json` |
| Migration filename ordering | PASSED — valid through `20260913` |
| Phase J SQL test structure | PASSED — `BEGIN`, `ROLLBACK`, emergency, and duplicate-audit markers found |
| Phase J.2 SQL construct inspection | PASSED — policy replacement and `PENDING` guard found |
| Search for direct client audit insertion | PASSED — no client `.insert()` against `audit_logs` found |
| Search for privileged-role fallback | PASSED — no fallback assignment to `SUPER_ADMIN` found |
| Search for direct deletion paths | REVIEWED — existing pending-profile withdrawal and Administrator rejected-user deletion paths remain; their authorization is database-policy dependent |
| `git diff --check` | PASSED |
| `git status --short --branch` | PASSED — remains on `main`; existing changes preserved |

These checks do not prove RLS correctness.

## 12. Database tests not executed

- PostgreSQL or Supabase SQL execution.
- Migration replay.
- RLS integration tests.
- Policy and routine privilege catalog queries.
- Docker or local database setup.
- Remote or production database access.
- Hosted Supabase Auth behavior.

These operations were explicitly prohibited or deferred.

## 13. Remaining deployment blockers

1. Migrations through `20260913` have not been applied to an isolated database.
2. The Phase J SQL matrix has no executable fixtures or assertions.
3. RLS permissive-policy composition and grants remain unverified.
4. SOS audit creation remains non-transactional and non-idempotent.
5. Hard-delete and handover runtime compatibility remains unverified.
6. Audit retention and immutability remain unproven.

## 14. Recommended next steps

1. In an approved disposable PostgreSQL/Supabase environment, replay all
   migrations through `20260913`.
2. Inspect `pg_policies`, table privileges, and
   `information_schema.routine_privileges`.
3. Create isolated users and JWT contexts for every profile status and role.
4. Execute the profile delete/reinsert, emergency INSERT, SOS audit,
   hard-delete, handover, role-escalation, and audit-manipulation scenarios.
5. Confirm auth-triggered profile creation and client profile setup remain
   functional.
6. Design a trusted transactional or outbox-based SOS audit mechanism with
   idempotency before claiming complete governance coverage.
7. Re-run static checks and document actual database results.

Phase J remains **PARTIALLY VERIFIED** and is not production-ready.
