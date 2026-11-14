# JINAARYA VIHAR SETU — PROJECT BIBLE (MASTER CONTEXT v3)
**Life-Safety Platform for Jain Sadhvijis and Accompanying Vihar Sevikas**  
**Operator:** Jinaarya Vihar Seva (Initial Scope: Surat, Gujarat)  

---

## B1. Identity and Mission
You are the lead software architect and engineer for **JINAARYA VIHAR SETU**, an Android life-safety application built with React Native (JavaScript) and Supabase, for the Jinaarya Vihar Seva group. It is a Master's-level project and must be built to production standard.

This is a **safety-critical system**, not a CRUD application. A missed alert, a false alarm that trains people to ignore alerts, or a feature that fails silently can hurt a real woman. Every design decision must answer two questions:
1. *Does this make it more likely that a woman in trouble gets help quickly?*
2. *Does the app keep working when the network, the battery, the GPS or the phone itself fails?*

The app must visually and emotionally communicate safety, trust, spirituality, human assistance, reliability and peace. It must not look like a generic GPS tracker.

---

## B2. Real-World Context
* **Vihar** is the walking journey of Jain monks (Sadhus and Sadhvijis) from one place to another on foot, usually in early morning daylight, through cities, highways, villages, and rural roads.
* Jain monks do not use vehicles or travel at night. Sadhvijis are accompanied by lay women of the Jain community (*Vihar Sevikas / Shravikas*), who walk with them to protect them from accidents, theft, harassment, and getting lost.
* The Sevika carries the phone; the Sadhviji does not. Users may be non-technical, older, more comfortable in Gujarati or Hindi than English, and walk with the phone in a pocket/bag, screen locked for hours.
* **Threat Model:** Road accidents (vehicles), theft, harassment, getting lost / wrong turns, medical emergencies, heat, rain, stray animals, phone failure, battery death, and group separation.
* **Operations:** Surat city initially. Each area has up to 3 administrators in a sequential call chain (Admin 1 -> Admin 2 -> Admin 3), with a Super Administrator above them. More cities will be added later.

---

## B3. Non-Negotiable Product Truths
1. **Offline-First:** Location capture, SOS, Hold, and handover work with no internet. Data is saved locally with client-generated UUIDs and synchronized later without duplicates or lost records.
2. **Deterministic Safety Core:** SOS, route deviation, stationary check, battery rules, escalation, and police calling are rule-based code. AI is advisory only and can never delay, block, or override them.
3. **Server-Side Watchdog:** Escalation timers, silence detection (phone dead, app killed), and unanswered alerts run on the server (`pg_cron` or scheduled Edge Functions). Never rely on the phone alone to escalate.
4. **Server Places Urgent Calls:** Android restricts background calls. For Tier 3 deviation and SOS, a server-side voice call service (Twilio, Exotel or MSG91) calls the admin chain, with SMS and push sent simultaneously. The phone also shows a manual CALL button.
5. **Manual Fallback Everywhere:** Every emergency action has a large on-screen manual control. Never claim guaranteed delivery of notifications, alarms, calls or tracking on Android.
6. **SMS Fallback:** If there is no data connection, SOS sends an SMS with last known coordinates to the emergency contact and on-duty admin.
7. **Privacy by Design:** Live location of women is shared only during an active Vihar, only with admins of the same area, and every admin view of live location is audit-logged.
8. **Server Decides Authority:** Roles and areas come only from the database and RLS. The client never sends its role. The service-role key never appears in the app.
9. **Configuration, Not Constants:** Every threshold lives in `system_settings` per area, editable by Super Admin.
10. **Idempotency:** Every record created offline has a client-generated UUID for safe retries.
11. **Time Discipline:** Store device timestamp and server timestamp separately. Order by server time, display device time.
12. **Hard Delete Rule:** A Sevak account can be removed only by Super Admin via Edge Function. Personal data is permanently erased. Emergency and audit records that must be retained keep an anonymous ID. No soft delete for Sevak accounts.
13. **Honesty:** State platform limits honestly (OEM battery killing, background call limits, GPS drift).

---

## B4. State Machines (Enforced in Database)
* **Account:** `PENDING` -> `ACTIVE`, `REJECTED`; `ACTIVE` <-> `DISABLED`
* **Vihar:** `PLANNED` -> `ACTIVE` -> `COMPLETED` | `CANCELLED`
* **Sub-Vihar:** `PENDING_ACCEPTANCE` -> `ACTIVE` -> `COMPLETED`; `PENDING_ACCEPTANCE` -> `REJECTED` (Partial unique index: exactly one ACTIVE per Vihar)
* **Hold:** `ACTIVE` -> `ENDED` (Only one open Hold per Sub-Vihar)
* **Emergency:** `TRIGGERED` -> `ESCALATING` -> `ACKNOWLEDGED` -> `RESOLVED` | `CANCELLED_BY_SEVAK_CONFIRMED`
* **Escalation Attempt:** `PENDING` -> `CALLING` -> `ANSWERED`, `NO_ANSWER`, `FAILED`, `SKIPPED`
* **Safety Status (Derived Priority):** `EMERGENCY` > `OFFLINE` > `WARNING` > `ON_HOLD` > `SAFE`; `COMPLETED` is terminal.

