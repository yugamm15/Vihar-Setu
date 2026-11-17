# Phase J Security Audit

## Scope

This review covers authentication and role resolution, RLS policies, administrator permissions, audit-log writers, privileged RPCs, and Super Admin client access. It was performed against repository source only.

Production Supabase, hosted databases, the untracked `env` file, and remote SQL were not accessed.

## Confirmed vulnerabilities

| Area | Finding | Status |
|---|---|---|
| OTP authentication | Disabled or rejected Sevak profiles could complete OTP verification because non-active status was enforced only for Admin and Super Admin roles. | Corrected in `authService.js`; database active-profile checks remain authoritative. |
| Profile authorization state | The broad self-update policy allowed a user to attempt changes to `status`, `rejection_reason`, and other protected profile fields. | Hardened with an additive trigger and active-aware policy in `20260911_phase_j_security_governance.sql`. |
| Audit integrity | The direct audit insert policy allowed authenticated clients to forge `EMERGENCY_SOS_TRIGGERED` records with arbitrary entity IDs/details. | Removed direct insert policy and added a validated server-side RPC. |
| Privileged policy revocation | Several area, administrator, permission, and settings policies used raw role joins without checking active profile status. | Replaced with `has_role`, which requires an active profile. |

## Potential or unverified risks

- `system_settings` previously exposed every setting to authenticated clients. Phase J restricts reads to the known public operational allowlist and Super Admins. Future secrets should not be stored in this table.
- Audit retention and immutable storage are not defined by the inspected schema.
- Audit coverage is incomplete; the audit table is not a complete record of every application activity.
- Actor identity is securely derived in protected RPCs, but historical direct writers require migration deployment before their behavior is uniformly hardened.
- Area scope depends on profile and administrator-area consistency. The new profile trigger prevents ordinary administrators from changing their own area.

## RLS findings

The base schema contained broad policies including authenticated `USING (true)`/`WITH CHECK (true)` policies for administrator-related and operational tables. Phase B.1 already narrowed several of these. Phase J further hardens:

- Profile authorization fields.
- Area management.
- Administrator management.
- Administrator permission management.
- System settings access.
- Direct audit-log inserts.

PostgreSQL permissive-policy OR behavior was considered; existing policies are explicitly dropped before replacement where necessary.

## Permission model

The repository uses `administrators.area_id`, the JSONB `administrators.permissions`, and granular `admin_permissions` rows. Phase J does not invent permission keys or add mutation controls. Privileged policy checks use active-aware role helpers, while the existing handover RPC remains the authorization path for handovers.

## Audit-log integrity and coverage

Known writers include:

- Protected hard-delete functions.
- The protected handover RPC.
- Security-event RPC logic.
- Existing state-machine functions.
- Emergency SOS, now routed through `record_emergency_sos_audit`.
- Existing Vihar activity logging.

The migration does not claim tamper-proof or immutable logging. No retention rule was found. Direct audit-log updates/deletes were not granted by the inspected policies.

## Security test matrix

Prepared in [test_phase_j_security_governance.sql](../supabase/tests/test_phase_j_security_governance.sql). It covers role escalation, profile isolation, administrator area isolation, permission changes, audit fabrication/update/delete, protected RPC calls, inactive-profile revocation, and cross-user safety-record access.

## Validation and deployment requirements

- Babel/JavaScript parsing should be run for modified JavaScript files.
- SQL was statically inspected only.
- Migration ordering and `git diff --check` should be validated before deployment.
- The SQL tests must run only against a disposable isolated database with controlled JWT fixtures.
- The migration must be reviewed and applied through the project’s controlled deployment process; it was not applied here.

## Remaining risks

No production security approval or certification is implied. Local database verification remains pending until a disposable PostgreSQL/Supabase environment is available. Existing migrations before Phase J may still require replay-order review before deployment.
