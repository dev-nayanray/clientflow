# ⚡ ClientFlow AI — Complete Client Acquisition & Project Management System

> **The full workflow:** Find Real Leads → AI Email → Follow Up → Book Meeting → Send Proposal → Manage Project → Invoice Client

Built with React + Vite + Supabase + Stripe + Claude AI.

---

## 🗂 Table of Contents
1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Quick Start](#quick-start)
4. [Supabase Setup](#supabase-setup)
5. [Stripe Setup](#stripe-setup)
6. [Environment Variables](#environment-variables)
7. [Subscription Plans](#subscription-plans)
8. [Deployment](#deployment)
9. [Database Schema](#database-schema)
10. [File Structure](#file-structure)

---

## ✅ Features

### 🔍 Lead Acquisition
| Tab | Feature |
|-----|---------|
| 📥 Real Leads | Hunter.io, Apollo.io, Google Places, CSV import |
| 🔍 Social | LinkedIn, Instagram, X (Twitter) — AI outreach scripts |
| 🚀 Workflow | 5-stage auto pipeline: Lead → Email → Follow-up → Proposal → Meeting |
| 📧 Send Emails | Gmail OAuth send with approval |

### 👥 CRM & Pipeline
| Feature | Details |
|---------|---------|
| Kanban Board | 7 stages: New → Contacted → Replied → Meeting Booked → Proposal Sent → Won/Lost |
| Reminders | Set follow-up reminders per lead with overdue alerts |
| Activity Log | Every action auto-logged with timestamp |
| Notes | Per-lead notes saved locally |
| Search & Filter | Search by name/email, filter by stage, sort by date/reminder |

### 📁 Content Generation
| Tab | What's Generated |
|-----|-----------------|
| Portfolio | Case study doc, HTML portfolio page, outreach email, LinkedIn post |
| Freelance | Upwork/Fiverr proposals, gig listings, profile optimizer |

### 🗂️ Project Manager
| Feature | Details |
|---------|---------|
| Projects | Create/manage client projects with budget, deadline, status |
| Tasks | Add manually or AI-generate full task breakdown |
| Invoices | Create → Send → Mark Paid, download HTML invoice |
| Time Log | Track hours per category with breakdown chart |
| Progress Ring | Visual SVG completion percentage per project |

### 🔐 Auth & Subscriptions
| Feature | Details |
|---------|---------|
| Email/Password | Sign up, sign in, password reset |
| Google OAuth | One-click Google sign in |
| Subscription Gate | Free / Monthly / Yearly / Lifetime plans |
| Stripe Payments | Secure checkout, billing portal |
| Supabase RLS | Row-level security — users only see their own data |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Auth + DB | Supabase (PostgreSQL + Auth) |
| Payments | Stripe Checkout |
| AI | Claude Sonnet (Anthropic API) |
| Email | Gmail API (OAuth) |
| Lead APIs | Hunter.io, Apollo.io, Google Places |
| Data Sync | Google Sheets API |
| Deployment | Vercel |

---

## 🚀 Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/dev-nayanray/clientflow.git
cd clientflow

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your values (see below)

# 4. Run database migrations
# Copy supabase/schema.sql → Supabase SQL Editor → Run

# 5. Start development server
npm run dev
```

---

## 🗄️ Supabase Setup

### Step 1 — Create a project
1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name, region, and password
3. Wait ~2 minutes for project to start

### Step 2 — Run the schema
1. Open **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Paste the contents of `supabase/schema.sql`
4. Click **Run** (Ctrl+Enter)

This creates:
- `profiles` table — user data, auto-created on signup
- `subscriptions` table — plan, status, expiry
- `leads` table — optional cloud sync
- `projects` table — optional cloud sync
- Row Level Security policies on all tables
- Trigger to auto-create profile on user signup

### Step 3 — Get your API keys
1. Go to **Settings → API**
2. Copy **Project URL** → `VITE_SUPABASE_URL`
3. Copy **anon/public key** → `VITE_SUPABASE_ANON`

### Step 4 — Enable Google OAuth (optional)
1. Go to **Authentication → Providers → Google**
2. Enable it and add your Google OAuth credentials
3. Add `https://YOUR_PROJECT.supabase.co/auth/v1/callback` as an authorized redirect URI in Google Console

---

## 💳 Stripe Setup

### Step 1 — Create a Stripe account
Go to [dashboard.stripe.com](https://dashboard.stripe.com)

### Step 2 — Create 3 products

Go to **Products → Add Product**:

| Product Name | Price | Billing |
|---|---|---|
| ClientFlow Monthly | $1.00 | Recurring / Monthly |
| ClientFlow Yearly | $10.00 | Recurring / Yearly |
| ClientFlow Lifetime | $50.00 | One-time payment |

After creating each product, copy its **Price ID** (starts with `price_`)

### Step 3 — Get your publishable key
Go to **Developers → API Keys** → copy **Publishable key** (starts with `pk_live_`)

### Step 4 — Set up Billing Portal (for subscription management)
1. Go to **Settings → Customer Portal**
2. Enable it and save
3. Copy the portal URL → update `ManageSubscription` in `src/Subscription.jsx`

### Step 5 — Set up Webhook (for production)
1. Go to **Developers → Webhooks → Add Endpoint**
2. URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
3. Events to listen: `checkout.session.completed`, `customer.subscription.deleted`

---

## 🔑 Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
VITE_STRIPE_PK=pk_live_...
VITE_STRIPE_MONTHLY=price_...
VITE_STRIPE_YEARLY=price_...
VITE_STRIPE_LIFETIME=price_...
```

> ⚠️ **Never commit `.env` to git.** It's already in `.gitignore`.

---

## 💰 Subscription Plans

| Plan | Price | Billing | Features |
|------|-------|---------|---------|
| **Free** | $0 | — | Limited access |
| **Monthly** | $1/month | Monthly | Full access, cancel anytime |
| **Yearly** | $10/year | Yearly | Full access + priority support |
| **Lifetime** | $50 once | One-time | Full access forever + all future updates |

### How it works
1. User signs up → gets Free plan
2. Clicks "Upgrade" → redirected to Stripe Checkout
3. Payment succeeds → Stripe redirects back with `?payment=success&plan=monthly`
4. App writes subscription to Supabase
5. `isSubscriptionActive()` gates premium features

---

## 🚢 Deployment

### Vercel (recommended)

```bash
npm run build
# Deploy dist/ to Vercel
# OR connect GitHub repo for auto-deploy
```

Add environment variables in **Vercel Dashboard → Settings → Environment Variables** — add all `VITE_*` values.

### Required Vercel settings
- Framework: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 18+

---

## 🗃️ Database Schema

```
auth.users (Supabase managed)
    │
    ├── profiles          (1:1 — user preferences, auto-created on signup)
    ├── subscriptions     (1:many — plan history, RLS protected)
    ├── leads             (1:many — optional cloud sync)
    └── projects          (1:many — optional cloud sync)
```

---

## 📁 File Structure

```
clientflow/
├── src/
│   ├── App.jsx              # Main app — all tabs and auth wrapper
│   ├── Auth.jsx             # Login / signup / reset password UI
│   ├── Subscription.jsx     # Pricing page, feature gate, manage subscription
│   ├── supabase.js          # Supabase client + auth/profile/subscription helpers
│   ├── RealLeadFinder.jsx   # Hunter.io, Apollo.io, Google Places, CSV parser
│   ├── GmailSender.jsx      # Gmail OAuth integration
│   ├── index.css            # All styles
│   └── main.jsx             # React entry point
├── supabase/
│   └── schema.sql           # Database schema + RLS policies
├── .env.example             # Environment variable template
├── .gitignore
├── package.json
├── vite.config.js
└── README.md
```

---

## 🆘 Support

- **Email:** support@clientflow.ai
- **GitHub Issues:** [github.com/dev-nayanray/clientflow/issues](https://github.com/dev-nayanray/clientflow/issues)

---

## 📄 License

MIT License — free to use and modify. Commercial use requires an active subscription.
