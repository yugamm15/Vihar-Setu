# Phase J.1 Security Verification & Pre-Deployment Review

Date: 2026-11-16

## 1. Executive summary

Phase J was reviewed statically against the Phase J.1 requirements. One residual
authentication issue was identified: OTP verification and persisted-session
restoration accepted `PENDING` Sevak profiles. A related database issue was also
identified: the historical emergency `INSERT` policy checked ownership but not
active profile status.

The application checks were corrected to require `ACTIVE` status for every
role. The database correction was added through the additive migration
`20260912_phase_j1_active_emergency_guard.sql`.

No PostgreSQL, Supabase, Docker, hosted database, remote SQL, or production
environment was accessed. Phase J is **not production-ready or database
verified** until the migrations and test matrix are executed against an
isolated disposable database.

## 2. Files inspected

### Phase J files

- `supabase/migrations/20260911_phase_j_security_governance.sql`
- `supabase/tests/test_phase_j_security_governance.sql`
- `docs/PHASE_J_SECURITY_AUDIT.md`
- `src/features/auth/services/authService.js`
- `src/features/auth/hooks/useAuthStore.js`
- `src/features/vihar/services/viharService.js`

### Relevant prior implementation

- `supabase/migrations/20260901_init_schema.sql`
- `supabase/migrations/20260904_sub_vihar_handover_holds_and_areas.sql`
- `supabase/migrations/20260905_routes_notifications_device_status_and_permissions.sql`
- `supabase/migrations/20260906_master_v3_state_machines_and_guards.sql`
- `supabase/migrations/20260909_security_foundation.sql`
- `supabase/migrations/20260910_handover_rls_hardening.sql`
- `supabase/tests/test_phase_b1_security.sql`
- Relevant authentication and Vihar service call sites

## 3. Security findings

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | HIGH | OTP and persisted-session restoration accepted `PENDING` Sevak profiles. | CORRECTED STATICALLY |
| 2 | HIGH | The historical emergency `INSERT` policy did not require an active profile. | CORRECTED THROUGH ADDITIVE MIGRATION |
| 3 | MEDIUM | The SOS audit RPC failure is swallowed after emergency creation, so an emergency can exist without a corresponding audit row. | PARTIALLY VERIFIED; REMAINS |
| 4 | MEDIUM | The Phase J SQL test file documents scenarios but does not execute assertions or configure JWT fixtures. | NOT VERIFIED |
| 5 | MEDIUM | RLS behavior, deployed grants, and policy replacement cannot be proven without PostgreSQL execution. | BLOCKED |

No service-role credential exposure was found in the reviewed application
paths. No direct client audit insert remains in the Phase J path.

## 4. Phase J fix-by-fix verification

| Requirement | Status | Evidence and limitation |
|---|---|---|
| Disabled or rejected Sevaks cannot authenticate through OTP or password | PARTIALLY VERIFIED | Password login rejects every non-`ACTIVE` profile. OTP now also rejects every non-`ACTIVE` profile. Actual Supabase Auth behavior and RLS remain unexecuted. |
| Profile authorization fields are protected | VERIFIED STATICALLY | The Phase J trigger protects `id`, `status`, `rejection_reason`, and `created_at`; it also protects Administrator `area` changes outside protected workflows. |
| Users cannot escalate roles or privileges | VERIFIED STATICALLY | User-role management is limited to active Super Administrators by the replacement policy. Runtime RLS behavior is unverified. |
| Administrators cannot modify protected fields or escape their area | PARTIALLY VERIFIED | The trigger and policy provide the intended checks statically. Existing backend workflows and deployed policy combinations were not executed. |
| Disabled Administrators lose privileged access | VERIFIED STATICALLY | Replaced privileged policies call active-aware `has_role()`. Session revocation and every historical policy path require database tests. |
| Clients cannot forge SOS audit records | VERIFIED STATICALLY | The direct audit insert policy is removed and the SOS RPC derives trusted fields from the emergency row. |
| SOS RPC validates caller, ownership, status, actor, and details | VERIFIED STATICALLY | The function requires an authenticated active profile, owner-matched `auth.uid()`, `TRIGGERED` status, fixed action/entity values, and database-derived details. |
| Direct audit insert, update, and delete are restricted | PARTIALLY VERIFIED | Direct insert policy removal is present. No update/delete policies were found in the reviewed migrations, but deployed table privileges were not queried. |
| Privileged functions enforce active profiles | PARTIALLY VERIFIED | Phase J replacements use `has_role()`. Historical functions and all policy combinations require isolated database execution to prove. |
| Hard-delete remains compatible | PARTIALLY VERIFIED | The update trigger does not target deletes and the hard-delete function was not rewritten. Runtime execution was not available. |
| Handover remains compatible | PARTIALLY VERIFIED | Phase J does not replace the handover RPC. Existing state, area, and permission guards were not executed. |
| Grants and revokes are correct | VERIFIED STATICALLY | The SOS RPC is executable by `authenticated` and revoked from `PUBLIC`; `audit_sevak_profile_view` is revoked from `PUBLIC`. Catalog verification remains blocked. |
| No workflow relies on unintentionally removed permissions | NOT VERIFIED | Static call-site review found no direct audit insert after Phase J. Full dependency verification requires database privileges and workflow execution. |

## 5. SQL and RLS review

### Phase J migration

The Phase J migration is additive. It uses `CREATE OR REPLACE FUNCTION`,
`DROP POLICY IF EXISTS` followed by justified replacement policies, and
`DROP TRIGGER IF EXISTS` followed by a replacement trigger. It does not drop
tables or data.

The new Phase J `SECURITY DEFINER` functions use:

```sql
SET search_path = public, pg_temp
```

The profile trigger requires an authenticated context and rejects protected
field changes for non-Super Administrators. The SOS RPC rejects missing
authentication, missing or inactive profiles, missing emergencies, foreign
emergencies, and non-`TRIGGERED` emergencies.

Static inspection cannot prove:

- The final permissive-policy combination after all migrations replay.
- Actual table privileges and routine privileges.
- Whether historical policies remain active under the target PostgreSQL schema.
- Trigger behavior with every legitimate server-side workflow.
- Correctness of JWT claim setup and `auth.uid()` behavior.

### Phase J.1 correction

`20260912_phase_j1_active_emergency_guard.sql` replaces the historical
`Users create emergency for self` policy. It preserves self-ownership while
requiring an existing profile with `status = 'ACTIVE'`. This closes the
database-side gap that client-side status checks cannot safely enforce.

The migration has not been applied.

## 6. Authentication and SOS application review

### Authentication

Password authentication already required `profile.status === 'ACTIVE'`.
OTP verification now applies the same condition to every role. Persisted
session restoration now removes the saved session unless the refreshed profile
is present, has a valid role, and is `ACTIVE`.

Missing profiles, missing roles, invalid roles, and non-active profiles fail
closed. No fallback assigns `SUPER_ADMIN`.

### Emergency SOS

`viharService.triggerEmergencySOS()` calls:

```js
supabase.rpc('record_emergency_sos_audit', {
  p_emergency_id: emergencyData.id,
});
```

The client does not construct the trusted actor, action, entity, or audit
details. The remaining limitation is that the audit RPC failure is handled as
non-fatal after the emergency is inserted. This preserves the existing
emergency workflow but leaves a potential audit-coverage gap that requires a
transactional backend design or a trusted database trigger in a future change.

## 7. Test coverage review

`supabase/tests/test_phase_j_security_governance.sql` is a review matrix, not
an executable fixture-driven test suite. It contains a transaction,
documentation of intended scenarios, a notice, and `ROLLBACK`. It does not:

- Create isolated users or profiles.
- Set JWT claims.
- Execute positive or negative SQL operations.
- Assert expected failures or successes.
- Inspect `pg_policies` or `routine_privileges`.

The matrix was updated to include the new requirement that pending, rejected,
and disabled profiles must fail emergency insertion.

Therefore the test file is **NOT VERIFIED** as an executable security test.
Phase B.1 tests remain similarly dependent on an isolated configured database.

## 8. Changes made

- Updated `src/features/auth/services/authService.js` so OTP authentication
  requires `ACTIVE` status for every role.
- Updated `src/features/auth/hooks/useAuthStore.js` so restored sessions
  require an active refreshed profile for every role.
- Added
  `supabase/migrations/20260912_phase_j1_active_emergency_guard.sql` to
  require an active profile for client emergency creation.
- Added the active-profile emergency insertion scenario to
  `supabase/tests/test_phase_j_security_governance.sql`.
- Created this verification report.

No existing migration was overwritten. No Administrator or Sevika module was
changed beyond the already-reviewed authentication and emergency security
dependencies.

## 9. Static checks executed

| Check | Result |
|---|---|
| JavaScript/JSX Babel parsing | PASSED — 34 JavaScript/JSX files parsed |
| Localization JSON validation | PASSED — `en.json`, `hi.json`, and `gu.json` |
| Migration filename ordering | PASSED — 12 migration filenames checked |
| SQL test rollback-marker inspection | PASSED — `BEGIN` and `ROLLBACK` present |
| `git diff --check` | PASSED |
| Configured ESLint command | BLOCKED — `eslint` is not installed or available |
| Jest/unit tests | BLOCKED — Jest is not installed or available |
| SQL execution/RLS tests | BLOCKED — database execution was explicitly deferred |

The protected untracked `env` file was not opened, read, copied, printed, or
modified.

## 10. Checks not executed

The following were intentionally not executed:

- Supabase CLI commands.
- PostgreSQL commands.
- Docker or local database setup.
- Remote or production SQL.
- Migration application.
- RLS integration tests.
- Function grant catalog queries.
- Hosted Supabase access.

These are deployment and database-verification blockers, not passing results.

## 11. Remaining risks and deployment blockers

1. The new migrations have not been replayed against a disposable database.
2. The Phase J and Phase B.1 test matrices are not executable without isolated
   users, profiles, JWT claims, and database fixtures.
3. RLS policy composition and actual grants remain unverified.
4. SOS audit creation can fail independently after emergency creation.
5. Audit retention and immutability are not established.
6. Historical functions and policies require catalog-level review after
   migration replay.
7. ESLint and Jest are unavailable in the current repository environment.

## 12. Exact next steps before Phase J is verified

1. Provision or use an already-approved disposable local/test PostgreSQL or
   Supabase environment. Do not use production.
2. Replay migrations through `20260912_phase_j1_active_emergency_guard.sql`.
3. Create isolated users for active, pending, rejected, and disabled profiles
   across Sevak, Administrator, and Super Administrator roles.
4. Execute the Phase B.1 and Phase J SQL scenarios with controlled JWT
   `sub` claims.
5. Query `pg_policies`, `information_schema.routine_privileges`, and relevant
   table grants.
6. Verify OTP/password/session behavior against those profile states.
7. Verify emergency insertion and SOS audit RPC ownership/status checks.
8. Execute hard-delete and handover compatibility tests.
9. Investigate the non-fatal SOS audit gap and choose a trusted transactional
   backend approach.
10. Re-run static checks and document the executed database results.

Until these steps are complete, Phase J should remain **PARTIALLY VERIFIED**
and must not be labeled production-ready.
