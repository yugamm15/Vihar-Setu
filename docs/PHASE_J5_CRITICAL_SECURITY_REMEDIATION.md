# Phase J.5 — Critical RLS Remediation & Trusted Notification Architecture

Date: 2026-11-16  
Branch: `main`

## 1. Executive summary

Phase J.5 addresses the remediable database authorization and data-integrity
findings carried forward from the Phase J.4 consolidated review. The changes
are additive and have not been applied to a database.

The new migration:

- removes the broad device-status `FOR ALL` policy;
- makes device-status writes owner-only and requires an active profile;
- scopes device, Vihar, location, and emergency reads through the existing
  `can_monitor_vihar` helper;
- scopes Vihar updates and emergency resolution through the existing
  `can_manage_vihar` helper;
- removes the client emergency INSERT policy;
- adds an idempotent, security-definer notification producer;
- moves SOS creation, required route/Vihar state changes, and audit creation
  into one idempotent security-definer transaction;
- adds database idempotency keys for notifications and SOS records.

The Super Admin password-only requirement remains **BLOCKED** at the trusted
authentication boundary. The React Native client now signs out immediately if
an OTP flow resolves to a Super Admin, but this cannot prevent a modified
client or direct Auth API caller from completing OTP authentication. Supabase
Auth configuration, an authentication hook, or a trusted backend must enforce
that policy.

**Phase status: PARTIALLY COMPLETE — READY FOR ISOLATED DATABASE VERIFICATION,
NOT PRODUCTION READY.**

## 2. Scope and findings

| Finding | Root cause | Phase J.5 result | Status |
|---|---|---|---|
| Administrator/global emergency and GPS access | Historical permissive policies used `is_admin_or_super()` globally | Replaced named historical read/update policies with existing Vihar monitor/manage helpers | PARTIALLY VERIFIED |
| Device-status overbroad access | Raw role checks in a `FOR ALL` policy allowed global reads and writes | Owner-only writes; active and scope-aware reads; no client delete path | PARTIALLY VERIFIED |
| Untrusted notification production | Client code inserted arbitrary/incompatible notification rows | Direct insert removed; server-side recipient derivation and idempotency RPC added | PARTIALLY VERIFIED |
| Super Admin OTP | Client preflight/post-verification checks were not a trusted boundary | Client rejection now signs out; trusted enforcement still requires Auth/backend change | BLOCKED |
| SOS non-atomicity | Emergency, state, route-event, and audit writes were separate client calls | Transactional RPC added and client switched to it | PARTIALLY VERIFIED |
| SOS duplicates | No request key or uniqueness constraint | Emergency request key and audit lookup added | PARTIALLY VERIFIED |
| `record_security_event` contract | General failure-event RPC accepts arbitrary target/details | Not changed because the hard-delete failure contract is not established by the schema | NOT VERIFIED |

## 3. Files and migrations changed

### Created

- `supabase/migrations/20260915_phase_j5_security_remediation.sql`
- `docs/PHASE_J5_CRITICAL_SECURITY_REMEDIATION.md`

### Modified

- `src/features/vihar/services/viharService.js`
- `src/features/vihar/services/routeDeviationEngine.js`
- `src/features/vihar/services/policeEmergencyService.js`
- `src/features/auth/services/authService.js`
- `supabase/tests/test_phase_j_security_governance.sql`

No Sevika or Administrator UI module was changed. The service changes are
security-critical integrations required to stop direct notification and SOS
writes.

## 4. Authorization and RLS changes

### Device status

`device_status` now has separate INSERT, UPDATE, and SELECT policies.

- An active device owner may insert and update their own row.
- A user cannot update another user's row.
- Active users may read their own row.
- Other reads require `can_monitor_vihar(vihar_id)`.
- The prior broad `FOR ALL` policy is dropped.
- Client-side delete is intentionally not exposed.

An Administrator's area/Vihar authorization remains the existing
`can_monitor_vihar` model from Phase B.1. No new scope contract was invented.

### Vihars, locations, and emergencies

Historical global Administrator read access is replaced for the named
policies:

- Vihars: `can_monitor_vihar`.
- Locations: owner or `can_monitor_vihar`.
- Emergencies: active owner or `can_monitor_vihar`.
- Vihar updates: owner or `can_manage_vihar`.
- Administrator emergency resolution: active emergency plus
  `can_manage_vihar`, with the resulting state restricted to `RESOLVED`.
- Emergency owners may transition their own active emergency to
  `FALSE_ALARM` or `RESOLVED`.

Because PostgreSQL policies are permissive and the migration has not been
replayed, final policy composition is **NOT VERIFIED**. Any manually-created
or differently named historical policy must be checked in `pg_policies`.

## 5. Trusted notification architecture

`emit_vihar_notification(...)` is a `SECURITY DEFINER` function with a
controlled search path and an authenticated EXECUTE grant only.

It:

1. requires an active caller;
2. requires the caller to monitor the specified Vihar;
3. validates the supported event type, severity, police target, and deviation
   payload;
4. derives recipients from the active Vihar owner, current responsible
   participant, and active area/city administrators with the existing
   monitoring permission;
5. derives notification title/body from the validated event instead of
   trusting client-provided notification text;
6. inserts a non-null recipient for every row;
7. uses a unique notification key for idempotent retries.

`routeDeviationEngine.js` and `policeEmergencyService.js` now call this RPC
instead of inserting notification rows directly. Existing notification
reading and read-state behavior is unchanged.

This is a trusted database producer, not a deployed Edge Function. No service
role credential is present in the mobile application, and no Edge Function was
deployed. Push delivery, retry queues, and external provider delivery remain
outside this phase.

## 6. Transactional and idempotent SOS design

`create_emergency_sos(...)`:

- derives the actor from `auth.uid()`;
- requires an active profile;
- validates owned/current-responsible Vihar scope;
- requires a caller-supplied idempotency key;
- inserts the emergency, Vihar safety update, route event, and audit row in
  one PostgreSQL transaction;
- returns the existing emergency and audit ID for a repeated key;
- never accepts a client actor ID or arbitrary audit details.

The client now calls this RPC and starts escalation only after the transaction
returns a valid emergency and audit ID. Escalation remains outside the
transaction because it uses client timers and can be retried independently.

The legacy `record_emergency_sos_audit(UUID)` function remains for compatibility
with older isolated environments. New SOS creation does not use it.

## 7. Super Admin password-only authentication boundary

The current Supabase Auth architecture is not proven to enforce
password-only authentication by role. A profile lookup in the React Native
client is not authoritative, and the post-OTP role check occurs after Auth has
issued a session.

The client now signs out immediately when `verifyOtp` resolves to
`SUPER_ADMIN`. This is defense in depth only.

Required trusted implementation decision:

- disable OTP factors for Super Admin identities in the approved Auth
  configuration; or
- enforce the rule in a trusted Supabase Auth hook/backend gateway.

This decision cannot be completed or verified without an approved hosted or
isolated Auth environment.

## 8. Test cases created

The existing Phase J SQL test matrix was extended with J.5 scenarios for:

- active/inactive device access;
- owner-only device writes;
- scoped Administrator monitoring;
- scoped emergency resolution and valid state transitions;
- direct notification denial;
- trusted notification producer validation and idempotency;
- SOS transaction, ownership, and duplicate-key behavior;
- trusted-boundary Super Admin OTP enforcement.

The file remains a fixture-driven test matrix and is not claimed to be an
executable test suite.

## 9. Validation performed

| Check | Result | Status |
|---|---|---|
| Worktree and branch inspection | `main`; existing changes preserved | VERIFIED STATICALLY |
| Protected `env` access | Not opened or read | VERIFIED STATICALLY |
| Migration ordering | `20260915` follows existing Phase J migrations | VERIFIED STATICALLY |
| SQL policy/function inspection | Additive migration and explicit grants/revokes inspected | VERIFIED STATICALLY |
| Direct notification insert search | Updated producers use `emit_vihar_notification`; no new direct notification inserts | VERIFIED STATICALLY |
| Device-status policy search | Old broad policy is dropped by the additive migration; final runtime inventory pending | PARTIALLY VERIFIED |
| Client service-role search | No service-role credential or client service-role usage added | VERIFIED STATICALLY |
| Babel parsing | Run against modified JavaScript files | VERIFIED BY EXECUTED TEST |
| Localization JSON | No locale changes | NOT APPLICABLE |
| `git diff --check` | Run after edits | VERIFIED BY EXECUTED TEST |
| PostgreSQL migration replay | Not executed | BLOCKED |
| RLS/JWT integration tests | Not executed | BLOCKED |
| Supabase Auth trusted OTP enforcement | Not executed | BLOCKED |

## 10. Tests not executed and blockers

No SQL was executed. No production or hosted Supabase was accessed. Docker,
Supabase CLI, PostgreSQL CLI, deployment, and creation of another Supabase
project were not used.

The following must be verified in an approved disposable environment:

1. Replay all migrations through `20260915`.
2. Inspect `pg_policies`, table grants, function owners, function grants,
   search paths, triggers, and indexes.
3. Execute JWT-fixture tests for active, pending, rejected, disabled Sevak,
   Administrator, and Super Administrator accounts.
4. Verify that no overlapping policy restores global Administrator access.
5. Verify the notification producer's recipient set and duplicate behavior.
6. Verify SOS rollback when the route event or audit insert fails.
7. Verify concurrent requests with the same SOS idempotency key.
8. Verify Auth-level Super Admin OTP rejection.

## 11. Remaining risks

- The migration has not been replayed, so SQL syntax, object names, policy
  composition, and grants remain runtime-unverified.
- The Super Admin password-only requirement is not complete at a trusted
  boundary.
- `record_security_event` still needs a narrower operation contract.
- Notification delivery outside the database is not addressed.
- The existing client-generated SOS key is stable only when callers preserve
  and resend the optional `idempotencyKey`; callers that omit it receive a new
  key per invocation.
- Existing offline queue replay for device/location records still requires
  isolated policy testing.
- The migration intentionally does not broaden Administrator access to
  Vihars with null/ambiguous area metadata.

## 12. Rollback considerations

The migration does not drop data or overwrite historical migrations. A rollback
plan for an isolated database would be to remove the new policies/functions and
columns/indexes only after confirming no dependent client version remains.
Because rollback could restore insecure policies, it must not be used as a
production security procedure without an approved replacement.

## 13. Production-readiness assessment

**Not production ready.**

The code and additive migration are prepared for isolated database
verification, but the trusted Auth boundary, migration replay, RLS composition,
concurrency behavior, and integration tests remain unresolved.

**Final decision: PHASE J.5 PARTIALLY COMPLETE — READY FOR ISOLATED DATABASE
VERIFICATION.**

Phase K is not started.
