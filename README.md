# ⚡ ClientFlow AI v3.0

> Complete client acquisition & project management system — Find leads → AI outreach → CRM → Invoice clients

**Live:** https://clientflow.vercel.app

---

## 🚀 Quick Setup (15 minutes)

### Step 1 — Install & Run
```bash
git clone https://github.com/dev-nayanray/clientflow.git
cd clientflow
npm install
npm run dev
```

### Step 2 — Supabase Setup
1. Create project at [supabase.com](https://supabase.com)
2. **SQL Editor** → paste `supabase/schema.sql` → **Run**
3. **Authentication → Settings → Disable** "Enable email confirmations" *(for easier testing)*
4. **Settings → API** → copy URL + anon/publishable key

### Step 3 — Environment Variables
Create `.env.local`:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON=your_publishable_key

# Stripe (optional — app works without it)
VITE_STRIPE_PK=pk_live_...
VITE_STRIPE_MONTHLY=price_...
VITE_STRIPE_YEARLY=price_...
VITE_STRIPE_LIFETIME=price_...
```

### Step 4 — Set yourself as Super Admin
After first signup, run in Supabase SQL Editor:
```sql
UPDATE public.profiles SET role = 'superadmin' WHERE email = 'your@email.com';
```

### Step 5 — Deploy to Vercel
1. Connect GitHub repo to Vercel
2. Add env vars in **Vercel → Settings → Environment Variables**
3. Deploy — auto-deploys on every push to main

---

## 📋 Features

| Module | Features |
|--------|---------|
| 🌐 **Landing Page** | Marketing page, pricing, testimonials, app preview |
| 🔐 **Auth** | Email/password, Google OAuth, password reset, demo mode |
| 📥 **Real Leads** | Hunter.io, Apollo.io, Google Places, CSV import |
| 🔍 **Social** | LinkedIn, Instagram, X outreach scripts |
| 🚀 **Workflow** | 5-stage auto pipeline (lead→email→followup→proposal→meeting) |
| 📧 **Send Emails** | Gmail OAuth send with approval |
| 👥 **CRM Pipeline** | Kanban, reminders, activity log, notes |
| 📁 **Portfolio** | Case study, HTML page, LinkedIn post, outreach email |
| 🎯 **Freelance** | Upwork/Fiverr proposals, gig creator, profile optimizer |
| 🗂️ **Projects** | Tasks, AI task gen, invoices, time tracking |
| 💰 **Subscriptions** | $1/mo · $10/yr · $50 lifetime via Stripe |
| 👑 **Super Admin** | Users, subscriptions, revenue dashboard, role management |

---

## 💰 Subscription Plans

| Plan | Price | Billing |
|------|-------|---------|
| Monthly | $1/month | Recurring |
| Yearly | $10/year | Recurring |
| Lifetime | $50 | One-time |

**To activate Stripe payments:**
1. Create 3 products in [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Copy Price IDs → add to `.env.local`
3. Without Stripe: clicking "Buy" shows a test activation dialog

---

## 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User data + role (user/admin/superadmin) |
| `subscriptions` | Plan, status, expiry, Stripe IDs |
| `leads` | Cloud-synced lead data |
| `projects` | Cloud-synced project data |
| `usage_events` | Feature analytics |

---

## 📁 File Structure

```
src/
├── App.jsx           # Main app (3000+ lines — all tabs)
├── Auth.jsx          # Landing page + login/signup
├── AdminPanel.jsx    # Super admin dashboard
├── Subscription.jsx  # Pricing page + Stripe
├── supabase.js       # Supabase client + helpers
├── RealLeadFinder.jsx # Hunter/Apollo/Places/CSV
├── GmailSender.jsx   # Gmail OAuth
└── index.css         # All styles (120KB)

supabase/
├── schema.sql        # DB schema + RLS + admin functions
└── functions/
    └── stripe-webhook/index.ts  # Stripe webhook handler
```

---

## 🔑 Supabase Note
This project uses the new `sb_publishable_` key format — it works identically to the old `eyJ...` anon key. Both work with `@supabase/supabase-js`. Do NOT use `@supabase/ssr` — that's for Next.js only.
