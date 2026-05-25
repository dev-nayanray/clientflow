# ⚡ ClientFlow AI — Automated Client Acquisition System

> **Full Workflow:** Find Lead → Research Site → Draft Email → Send → Follow Up → Book Meeting → Send Proposal

A complete AI-powered B2B client acquisition pipeline built with React + Claude AI.

---

## 🚀 Features

### 🔍 Social Media Lead Finder (NEW)
Find prospects directly on **LinkedIn**, **Instagram**, and **X (Twitter)**:
- **LinkedIn** — Decision makers, CEOs, founders (best for B2B)
- **Instagram** — Visual businesses: restaurants, fitness, fashion, real estate
- **X (Twitter)** — SaaS, tech founders, coaches (very active)

Each platform includes:
- Direct search links pre-filled with your niche + country
- AI-generated lead profiles with platform handles & activity
- Platform-specific outreach scripts (DM sequences, connection notes)
- "Use in Full Workflow" button — instantly load leads into the pipeline

### 🚀 Full Automated Workflow
5-stage pipeline that runs with one click:
1. **🔍 Lead Research** — Finds 5 qualified prospects (or uses pre-loaded social leads)
2. **✉️ Outreach Email** — Personalized cold email with subject line
3. **🔁 Follow-Up Sequence** — 3-email sequence: Day 3, Day 7, Day 14
4. **📄 Proposal** — Full professional proposal with pricing
5. **📅 Meeting** — Booking message + Google Calendar link

### 👥 Per-Lead Actions
For each individual lead, generate:
- **Cold Email** — Personalized outreach
- **Social DM** — Platform-specific direct message
- **Proposal** — Custom proposal
- **Meeting Request** — With Google Calendar integration

### 📊 Google Sheets Sync
Auto-saves all data across 3 tabs:
- **Leads** — All prospect data including source platform
- **Workflows** — Stage-by-stage results
- **Actions** — Individual emails, DMs, proposals generated

---

## 📋 Tab Structure

| Tab | Purpose |
|-----|---------|
| ⚙️ Setup | Configure niche, service, country, pricing, your info |
| 🔍 Find Leads | LinkedIn / Instagram / X lead discovery + outreach scripts |
| 🚀 Workflow | Run full 5-stage automated pipeline |
| 👥 Leads | Per-lead email/DM/proposal/meeting generator |
| 📅 Meetings | Google Calendar meeting scheduler |
| 📊 Data Store | Google Sheets sync + lead source breakdown |

---

## 🛠️ Tech Stack
- **Frontend:** React 18 + Vite
- **AI:** Claude Sonnet (claude-sonnet-4-5) via Anthropic API
- **Deployment:** Vercel
- **Data:** Google Sheets API v4
- **Calendar:** Google Calendar deep links

---

## ⚙️ Setup

```bash
npm install
npm run dev
```

Add your **Anthropic API key** in the app header (session-only, never stored).

---

## 🔄 Recommended Workflow

```
1. ⚙️ Setup → Fill niche, service, country, your info
2. 🔍 Find Leads → Choose LinkedIn/Instagram/X → Generate leads
3. Click "Use in Full Workflow" → Leads auto-loaded
4. 🚀 Workflow → Click "Run Full Workflow" (uses your social leads)
5. 👥 Leads → Generate per-lead DMs, emails, proposals
6. 📅 Meetings → Schedule discovery calls
7. 📊 Data Store → Export everything to Google Sheets
```

---

## 📦 Deploy to Vercel

```bash
npm run build
# Deploy dist/ to Vercel
```

Or connect your GitHub repo to Vercel for auto-deploy.
