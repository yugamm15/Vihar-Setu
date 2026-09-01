# JINAARYA VIHAR SETU — Supabase Setup & Configuration Guide

Follow these exact steps to link your Supabase backend to **Jinaarya Vihar Setu**:

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

### Step 2: Execute the Database SQL Migration
1. In your Supabase project dashboard, click on the **SQL Editor** icon in the left navigation sidebar.
2. Click **"New Query"**.
3. Open the file [supabase/migrations/20260901_init_schema.sql](file:///s:/Master's/Jinaarya%20Vihar%20seva/Jinaarya%20Vihar%20seva/supabase/migrations/20260901_init_schema.sql).
4. Copy the entire content and paste it into the Supabase SQL Editor.
5. Click **"Run"** (or press Ctrl+Enter).
6. Ensure the message says *"Success. No rows returned."*

---

### Step 3: Configure Phone OTP Authentication
1. Go to **Authentication** -> **Providers** -> **Phone**.
2. Toggle **Enable Phone Provider** to `ON`.
3. Choose your SMS Provider (e.g. **Twilio**, **MessageBird**, or for testing, enable Supabase's built-in SMS / Test Phone numbers under **Auth > Rate Limits / SMS Testing**).
4. For instant local development/testing without an SMS gateway bill:
   - In Supabase -> **Authentication** -> **URL Configuration / Providers / Phone**, you can add Test Phone numbers:
     - Phone: `+919876543210`, OTP: `123456`
     - Phone: `+919876543211`, OTP: `123456` (Can be assigned ADMIN)
     - Phone: `+919876543212`, OTP: `123456` (Can be assigned SUPER_ADMIN)

---

### Step 4: Create Supabase Storage Bucket
1. Go to **Storage** in the Supabase sidebar.
2. Click **"New Bucket"**.
3. Name: `profile-images`
4. Set **Public Bucket** to `ON` (so avatar URLs can be loaded fast in avatar circles).
5. Click **Save bucket**.

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

### Step 6: Promoting an Initial Super Administrator
After you log in with your primary phone number for the first time, run this SQL in **SQL Editor** to grant yourself the `SUPER_ADMIN` role:

```sql
INSERT INTO public.user_roles (user_id, role_id)
SELECT id, (SELECT id FROM public.roles WHERE name = 'SUPER_ADMIN')
FROM public.profiles
WHERE phone = '+919876543212' -- replace with your actual phone number
ON CONFLICT (user_id, role_id) DO UPDATE SET role_id = (SELECT id FROM public.roles WHERE name = 'SUPER_ADMIN');
```
