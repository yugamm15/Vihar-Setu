# Phase J.4 Consolidated Security Architecture Review

Date: 2026-11-16

## 1. Executive summary

The cumulative Phase J through J.3 changes improve profile authorization,
active-account checks, emergency ownership, and Vihar-scoped emergency/location
insertion. Static review found that the security architecture is not yet
ready for database verification without further stabilization.

A migration-order false positive was resolved: the original schema's
`handle_new_user()` created `ACTIVE` profiles, but the later
`20260903_email_auth_and_sevak_approval.sql` replaces that function and trigger
with a `PENDING` profile flow. The final cumulative behavior still requires
PostgreSQL replay to prove.

One clear application/schema mismatch was corrected:
`escalationService.js` queried `administrators.status`, but the schema defines
`administrators.is_active`. The service now queries `is_active = true`.

Important remaining blockers include broad historical Administrator access,
raw-role checks in notifications/device-status policies, unrestricted
notification insertion for authenticated clients, non-atomic/non-idempotent
SOS auditing, and missing database execution. No speculative large RLS
redesign was applied.

**Final decision: SECURITY REVIEW COMPLETE — READY FOR ISOLATED DATABASE VERIFICATION.**

This is not a production-readiness decision.

## 2. Files and migrations inspected

### Security migrations

- `supabase/migrations/20260909_security_foundation.sql`
- `supabase/migrations/20260910_handover_rls_hardening.sql`
- `supabase/migrations/20260911_phase_j_security_governance.sql`
- `supabase/migrations/20260912_phase_j1_active_emergency_guard.sql`
- `supabase/migrations/20260913_phase_j2_profile_insert_guard.sql`
- `supabase/migrations/20260914_phase_j3_vihar_scope_guards.sql`

### Earlier schema and lifecycle migrations

- `supabase/migrations/20260901_init_schema.sql`
- `supabase/migrations/20260903_email_auth_and_sevak_approval.sql`
- `supabase/migrations/20260904_sub_vihar_handover_holds_and_areas.sql`
- `supabase/migrations/20260905_routes_notifications_device_status_and_permissions.sql`
- `supabase/migrations/20260906_master_v3_state_machines_and_guards.sql`

### Application paths

- `src/features/auth/services/authService.js`
- `src/features/auth/hooks/useAuthStore.js`
- Registration and profile services/screens
- `src/features/vihar/services/viharService.js`
- `src/features/vihar/services/escalationService.js`
- `src/features/vihar/services/locationTelemetryService.js`
- `src/features/vihar/services/offlineSyncService.js`

## 3. Migration dependency and security-change inventory

| Migration | Dependency / change | Cumulative security effect |
|---|---|---|
| `20260901` | Core schema, initial roles, RLS, functions, signup trigger | Initial policies; historical trigger created `ACTIVE` profiles |
| `20260903` | Replaces signup trigger and adds approval lifecycle | Final trigger creates `PENDING` profiles and assigns default `SEVAK` role |
| `20260904` | Areas, administrators, Sub-Vihars, holds, handover tables/policies | Adds operational authorization surface |
| `20260905` | Notifications, device status, permissions, route policies | Adds broad raw-role notification/device policies |
| `20260906` | State-machine functions and guards | Adds legacy function definitions later replaced by J.1/B.1 hardening |
| `20260909` | Security event and hard-delete functions | Active Super Admin hard-delete and restricted security-event RPC |
| `20260910` | Active-aware role helpers, handover function, policy replacements | Replaces selected handover/participant/hold/policy paths |
| `20260911` | Profile trigger, active-aware privileged policies, SOS audit RPC | Protects authorization fields and removes direct audit inserts |
| `20260912` | Emergency INSERT replacement | Requires active caller and self-owned user ID |
| `20260913` | Profile INSERT replacement | Client-created profiles must be `PENDING` |
| `20260914` | Emergency/location Vihar scope replacement | Requires owned/current-participant Vihar for non-null emergency/location scope |

Migration replay order and whether every named `DROP POLICY` matched the
target database remain **NOT VERIFIED**.

## 4. Cumulative RLS security matrix

The following is a source inventory, not runtime proof. PostgreSQL policies are
permissive by default and combine with OR semantics.

| Table | RLS defined | SELECT | INSERT | UPDATE | DELETE | Inactive/anonymous result |
|---|---|---|---|---|---|---|
| `profiles` | Enabled in `20260901` | Own/admin-style historical access | J.2 own `PENDING` row | Own/Super Admin plus authorization trigger | Pending/rejected self-delete | Anonymous denied by intended policies; inactive self-read and final grants NOT VERIFIED |
| `roles` | Enabled | Authenticated read-all | No client insert found | No client update found | No client delete found | Inactive authenticated users may read roles under historical policy; NOT VERIFIED |
| `user_roles` | Enabled | Own roles or historical admin access | Active Super Admin management | Active Super Admin management | Active Super Admin management | Historical own-role read may remain; catalog verification BLOCKED |
| `administrators` | Enabled | Historical/admin/Super Admin policies | Super Admin replacement plus historical policies | Same | Same | Effective OR composition NOT VERIFIED |
| `admin_permissions` | Enabled | Phase J active-aware read policy, but older broad policies must be checked | Active Super Admin | Active Super Admin | Active Super Admin | Final OR composition NOT VERIFIED |
| `areas` | Enabled | Earlier area policies plus active Super Admin | Active Super Admin plus any historical policy | Same | Same | Final OR composition NOT VERIFIED |
| `emergencies` | Enabled | Own or `is_admin_or_super()` all-area access | J.3 active caller, own user, null/owned/current-participant Vihar | Historical admin-wide resolution path | No ordinary client delete identified | Anonymous denied by intended policy; area-wide Admin access remains a concern |
| `emergency_attempts` | Enabled | Earlier policies | Earlier policies | Earlier policies | Earlier policies | NOT VERIFIED |
| `audit_logs` | Enabled | Read policies used by Super Admin views | Direct insert removed in J | No client update found | No client delete found | Actual grants and historical policies BLOCKED |
| `notifications` | Defined in `20260905` | Own or raw-role Admin/Super Admin all rows | `TO authenticated WITH CHECK (true)` | Own notification read state | No broad delete identified | Authenticated clients can forge notification rows; inactive role-row access remains |
| `vihars` | Enabled | Owner/admin historical policies | Existing creation policy | Existing owner/admin policies | Existing policies | Final role/status scope NOT VERIFIED |
| `vihar_participants` | Enabled | J.1 guarded policies | Guarded workflow | Guarded workflow | Guarded workflow | Final OR composition NOT VERIFIED |
| `vihar_handover` | Defined in handover migrations | Guarded read/RPC path | Protected handover RPC | Protected handover RPC | No ordinary client delete identified | Runtime authorization BLOCKED |
| `vihar_holds` | Defined in handover migrations | Guarded policies | Guarded policies | Guarded policies | Guarded policies | Runtime authorization BLOCKED |
| `vihar_locations` | Enabled | Own/admin historical access | J.3 active caller plus owned/current-participant Vihar | No ordinary update identified | No ordinary delete identified | Runtime scope BLOCKED |
| `route_events` | Enabled | Existing owner/admin policies | Existing route/workflow policies | Existing policies | Existing policies | Final scope NOT VERIFIED |
| `system_settings` | Enabled | Public allowlist or active Super Admin | Active Super Admin | Active Super Admin | Active Super Admin | Anonymous denied by intended policy; catalog verification required |

### Combined-policy findings

The J.1, J.2, and J.3 migrations replace named policies, but static source
review cannot prove that a manually-created policy, differently named policy,
table grant, or migration failure does not widen access.

Confirmed broad historical concerns:

- Emergency and location SELECT policies grant administrators global access
  through `is_admin_or_super()`, without area/Vihar scope.
- Emergency UPDATE permits administrator-wide resolution through the same
  broad branch.
- Notifications use raw role-row checks and a `WITH CHECK (true)` INSERT
  policy.
- Device-status policies use raw role-row checks and `FOR ALL`, rather than
  separate active-aware operations.

These are documented blockers for isolated database verification and future
scope-hardening work. No speculative policy rewrite was made because the
existing notification/device workflows and schema need a confirmed authorization
contract.

## 5. Authentication and account lifecycle

### Registration

The later `20260903` trigger supersedes the original `20260901` trigger and
creates `PENDING` profiles. J.2 also requires client INSERT rows to be
`PENDING`. The default role is `SEVAK`; no client role assignment is provided.

**Status: VERIFIED STATICALLY; final replay NOT VERIFIED.**

### Approval and status changes

The Phase J profile trigger protects `status`, `rejection_reason`, `id`, and
`created_at` from unauthorized updates. Approval/rejection remains dependent on
Administrator policies and database execution.

**Status: PARTIALLY VERIFIED.**

### Login and session restoration

Password login, OTP verification, and persisted-session restoration require an
active profile and valid database role. OTP verification rejects
`SUPER_ADMIN`; Super Administrators are intended to use password login.

The OTP request preflight remains client-side and its lookup errors are not a
trusted server-side authentication boundary. A server-side Supabase Auth
policy or protected authentication gateway is still required to prove
password-only enforcement.

**Status: PARTIALLY VERIFIED.**

### Disablement and reactivation

Active-aware role helpers and refreshed profile checks remove privileged access
when status is no longer active. Existing sessions are not trusted without a
fresh profile/role lookup.

Reactivation and rejection authorization depend on final RLS and grants.

**Status: PARTIALLY VERIFIED.**

## 6. Emergency and GPS security

J.3 now enforces:

- Active profile.
- `auth.uid() = user_id`.
- Null emergency Vihar or owned/current-participant Vihar.
- Owned/current-participant Vihar for GPS locations.

This prevents cross-user identity and unrelated-Vihar association at INSERT
policy level, subject to runtime RLS verification.

Remaining concerns:

1. Emergency and location SELECT policies remain broadly administrator-scoped.
2. Emergency UPDATE resolution remains broadly administrator-scoped.
3. Offline synchronization depends on the same policies and may fail for stale
   or no-longer-active sessions; this needs execution testing.
4. Emergency escalation service had a schema mismatch (`status` versus
   `is_active`), corrected in `escalationService.js`.
5. The escalation service still requires runtime validation of notification
   and attempt policies.

**Status: PARTIALLY VERIFIED.**

## 7. SOS audit architecture

`record_emergency_sos_audit(UUID)` validates active caller, owner, emergency
existence, and `TRIGGERED` status. It derives actor/action/entity/details from
trusted values and direct client audit INSERT was removed.

It is not atomic with emergency creation. It is not proven idempotent. Offline
retries can result in missing or duplicate audit records.

### Future design comparison

| Design | Security | Reliability | Complexity | Assessment |
|---|---|---|---|---|
| Single transactional PostgreSQL RPC | Strongest: one trusted authorization boundary | Atomic emergency, related updates, and audit | Medium | Preferred if schema supports the full workflow |
| Trusted server-side backend operation | Strong if service boundary is protected | Can coordinate retries and idempotency | High operational complexity | Viable where backend infrastructure already exists |
| Durable outbox with idempotency key | Strong audit delivery and retry semantics | Best for offline/eventual delivery | High schema and worker complexity | Appropriate for mature offline architecture |

No redesign was implemented because the actual deployment/runtime schema and
worker infrastructure were not verified.

## 8. Privileged database function review

| Function | Static result |
|---|---|
| `has_role` | Active-profile-aware in J.1/B.1 replacement; `SECURITY DEFINER` and controlled search path; runtime grants NOT VERIFIED |
| `get_user_primary_role` | Replaced in handover hardening; active-role behavior statically present; runtime NOT VERIFIED |
| `is_admin_or_super` | Active-aware helper in handover hardening; broad scope by design; caller/grants NOT VERIFIED |
| `record_security_event` | `SECURITY DEFINER`, controlled search path, authenticated active admin check, fixed action/entity restrictions |
| `record_emergency_sos_audit` | `SECURITY DEFINER`, `public, pg_temp` search path, active caller/ownership/status checks, trusted field derivation; not idempotent |
| `hard_delete_sevak` | `SECURITY DEFINER`, controlled search path, active Super Admin and target-role checks; does not delete `auth.users`; runtime/cascade behavior NOT VERIFIED |
| `execute_subvihar_handover` | Corrected function is defined in J.1/B.1 after legacy definition; active role, area, responsibility, state, and receiver checks are statically present |

No function can be declared runtime-safe without checking routine privileges,
ownership, effective search path, and execution against the replayed schema.

## 9. Security regression assessment

| Workflow | Assessment |
|---|---|
| Sevak registration | Pending trigger and client guard preserved; runtime NOT VERIFIED |
| Administrator approval | Existing workflow preserved; RLS and status transition NOT VERIFIED |
| Super Admin access | OTP path now rejects Super Admin; trusted server-side password-only enforcement remains unresolved |
| Vihar creation/management | Existing behavior preserved; cumulative RLS NOT VERIFIED |
| Handover/holds | Corrected RPC remains after legacy definition; execution NOT VERIFIED |
| Emergency creation | J.3 adds active and Vihar scope guards; transaction/audit gap remains |
| GPS tracking/offline sync | J.3 scope guard may reject unrelated/stale writes as intended; offline replay NOT VERIFIED |
| Emergency escalation | `is_active` schema mismatch corrected; notification/attempt policies require testing |
| Audit logging | Direct client insertion removed; completeness/idempotency NOT VERIFIED |
| Hard deletion | Protected RPC preserved; cascade/Auth-user behavior NOT VERIFIED |

## 10. Findings ranked by severity

| # | Severity | Finding | Status |
|---|---|---|---|
| 1 | HIGH | Historical emergency/location reads and emergency resolution are globally Administrator-scoped rather than Vihar/area-scoped. | VERIFIED STATICALLY; correction requires confirmed authorization contract |
| 2 | HIGH | Notifications permit authenticated clients to insert arbitrary rows through `WITH CHECK (true)`. | VERIFIED STATICALLY; correction requires workflow-specific backend path |
| 3 | HIGH | Device-status raw role policies may allow inactive Administrators to read/modify all device rows. | VERIFIED STATICALLY; runtime and scope correction BLOCKED |
| 4 | MEDIUM | SOS emergency and audit operations are non-atomic. | VERIFIED STATICALLY |
| 5 | MEDIUM | SOS audit retries are not idempotent. | PARTIALLY VERIFIED |
| 6 | MEDIUM | Super Admin password-only authentication is not enforced at a demonstrated trusted server boundary. | VERIFIED STATICALLY as an architectural gap |
| 7 | MEDIUM | Final RLS composition, grants, trigger order, and FK cascades are unverified. | BLOCKED |
| 8 | MEDIUM | Escalation service used a nonexistent `administrators.status` column. | CORRECTED STATICALLY |

## 11. Corrections made

- Updated `src/features/vihar/services/escalationService.js` to query
  `administrators.is_active`.
- Preserved all additive security migrations through `20260914`.
- Created this consolidated review.

No existing migration was overwritten. No production or remote database was
accessed. No Phase K work was started.

## 12. Static validation results

| Check | Result |
|---|---|
| Babel parsing | PASSED for modified JavaScript files |
| Localization JSON validation | PASSED |
| Migration filename ordering | PASSED through `20260914` |
| Migration/policy inventory | COMPLETED STATICALLY |
| Function security inspection | COMPLETED STATICALLY |
| Authentication workflow inspection | COMPLETED STATICALLY |
| Direct client audit insertion search | PASSED — none found |
| Direct profile deletion search | COMPLETED; existing withdrawal/admin paths documented |
| Privileged-role fallback search | PASSED — no client Super Admin fallback |
| `git diff --check` | PASSED |
| `git status --short --branch` | PASSED — `main` preserved |

## 13. Database tests not executed

- PostgreSQL or Supabase SQL.
- Migration replay.
- `pg_policies`, table grants, and routine privilege queries.
- JWT role/status fixture tests.
- Foreign-key cascade and trigger-order tests.
- Offline synchronization and retry tests.
- SOS duplicate/idempotency tests.
- Hosted Supabase Auth tests.
- Production or remote database access.

## 14. Deployment blockers

1. Final cumulative migrations have not been replayed in an isolated database.
2. Broad historical Administrator access needs an explicit area/Vihar
   authorization contract before safe policy replacement.
3. Notification insertion needs a trusted producer design; simply tightening
   the policy would break existing client-side alert producers.
4. Device-status access needs active-profile and operational-scope rules.
5. SOS audit requires transactional and idempotent architecture.
6. Function privileges, RLS composition, and FK cascades remain unverified.
7. Password-only Super Admin enforcement requires a trusted server-side Auth
   boundary, not only client checks.

## 15. Recommended next steps

1. Replay migrations through `20260914` in an approved disposable database.
2. Query every final policy and privilege for the matrix tables.
3. Execute registration, lifecycle, inactive-profile, emergency-scope,
   location-scope, escalation, hard-delete, handover, and audit tests.
4. Define and implement area/Vihar scope for Administrator monitoring.
5. Move notification production behind an authorized RPC/worker or introduce
   narrowly scoped producer policies.
6. Harden device-status access using active profiles and explicit ownership or
   monitoring scope.
7. Implement one trusted transactional/idempotent SOS audit path.
8. Verify Super Admin password-only authentication at the authentication
   boundary.

Until these steps are complete, the system is not production-ready.
