-- ═══════════════════════════════════════════════════════════════
-- ClientFlow AI — Super Admin Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- STEP 1: Check your user exists (find your email)
SELECT id, email, role, full_name, created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

-- STEP 2: Set YOUR email as superadmin
-- Replace 'your@email.com' with the email you signed up with
UPDATE public.profiles
SET role = 'superadmin'
WHERE email = 'your@email.com';

-- STEP 3: Verify it worked
SELECT id, email, role, full_name
FROM public.profiles
WHERE role IN ('admin', 'superadmin');

-- STEP 4: Also grant yourself a lifetime subscription (optional)
INSERT INTO public.subscriptions (user_id, plan, status, started_at, expires_at)
SELECT id, 'lifetime', 'active', now(), null
FROM public.profiles
WHERE email = 'your@email.com'
ON CONFLICT (user_id) DO UPDATE
SET plan = 'lifetime', status = 'active', expires_at = null, updated_at = now();

-- Done! Refresh the app and you'll see 👑 Admin tab
