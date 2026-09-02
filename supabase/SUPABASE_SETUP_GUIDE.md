# JINAARYA VIHAR SETU — Supabase Setup & Configuration Guide

Follow these exact steps to link your Supabase backend to **Jinaarya Vihar Setu** with Email OTP authentication and Sevak Approval:

---

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
2. Click **"New Project"**.
3. Set:
   - **Name**: `Jinaarya Vihar Setu`
   - **Database Password**: Set a strong password (save it securely).
   - **Region**: Select `ap-south-1` (Mumbai, India) or closest region for low GPS latency.
4. Click **Create new project** and wait ~2 minutes for provisioning.

---

### Step 2: Execute Database Migrations in SQL Editor
1. In your Supabase project dashboard, click on the **SQL Editor** icon in the left navigation sidebar.
2. Click **"New Query"**.
3. First, execute the initial schema:
   - Open and copy [supabase/migrations/20260901_init_schema.sql](file:///s:/Master's/Jinaarya%20Vihar%20seva/Jinaarya%20Vihar%20seva/supabase/migrations/20260901_init_schema.sql).
   - Paste and click **"Run"**.
4. Next, execute the Email Auth & Approval migration:
   - Open and copy [supabase/migrations/20260903_email_auth_and_sevak_approval.sql](file:///s:/Master's/Jinaarya%20Vihar%20seva/Jinaarya%20Vihar%20seva/supabase/migrations/20260903_email_auth_and_sevak_approval.sql).
   - Paste and click **"Run"**.
5. Ensure the message says *"Success. No rows returned."*

---

### Step 3: Configure Email OTP Authentication
1. Go to **Authentication** -> **Providers** -> **Email**.
2. Toggle **Enable Email provider** to `ON`.
3. Toggle **Confirm email** to `ON` (or set OTP code login).
4. Under **Authentication** -> **Email Templates** -> **Magic Link / OTP**:
   - Ensure the `{{ .Token }}` code placeholder is in the template body for 6-digit OTP codes.
5. In development/testing mode:
   - Supabase allows instant testing without custom SMTP.
   - You can also add pre-configured mock users for local testing.

---

### Step 4: Enable Realtime on Profiles
1. Go to **Database** -> **Publications** -> `supabase_realtime`.
2. Ensure `profiles`, `vihars`, `vihar_locations`, `emergencies`, and `route_events` are toggled `ON`.
*(The migration script automatically runs `ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;`)*.

---

### Step 5: Get Project Keys & Update `.env`
1. Go to **Project Settings** (gear icon) -> **API**.
2. Copy:
   - **Project URL** (e.g., `https://xyzcompany.supabase.co`)
   - **Project API Keys** -> `anon` / `public` key.
3. Open [.env](file:///s:/Master's/Jinaarya%20Vihar%20seva/Jinaarya%20Vihar%20seva/.env) in this project and paste your actual values:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...
   GOOGLE_MAPS_API_KEY=AIzaSy...
   ```

---

### Step 6: Promoting an Administrator / Super Administrator
To grant an account administrator privileges:
```sql
INSERT INTO public.user_roles (user_id, role_id)
SELECT id, (SELECT id FROM public.roles WHERE name = 'SUPER_ADMIN')
FROM public.profiles
WHERE email = 'admin@viharsetu.org' -- replace with your administrator email
ON CONFLICT (user_id, role_id) DO UPDATE SET role_id = (SELECT id FROM public.roles WHERE name = 'SUPER_ADMIN');

-- Ensure status is ACTIVE
UPDATE public.profiles SET status = 'ACTIVE' WHERE email = 'admin@viharsetu.org';
```
