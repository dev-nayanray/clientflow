# ClientFlow AI — Developer Reference

## Project Overview

ClientFlow AI is a single-page React application for freelancers and agencies to find leads, run outreach workflows, manage a CRM pipeline, and generate proposals. It uses Supabase for auth/data and the Anthropic Claude API for AI features.

**Stack**: React 18 + Vite 5, Supabase JS v2, Stripe JS v4, vanilla CSS (no Tailwind/component library)

## Architecture

```
src/
  main.jsx          # React root mount + ErrorBoundary
  App.jsx           # Main SPA shell (3200+ lines) — all business logic, all tab components inline
  Auth.jsx          # Landing page + login/signup/OAuth card
  supabase.js       # Supabase client + auth helpers (signIn, signOut, getProfile, getSubscription)
  Subscription.jsx  # PricingPage, SubBanner, ManageSubscription components
  GmailSender.jsx   # Gmail OAuth + send/list/read helpers
  RealLeadFinder.jsx# Hunter.io / Apollo.io / Google Places / CSV lead discovery
  AdminPanel.jsx    # Superadmin dashboard (role-gated)
  UserProfile.jsx   # Profile edit modal
  SetupWizard.jsx   # Onboarding (imported but unused — safe to ignore)
  index.css         # All styles (~1800 lines, single file)
supabase/
  schema.sql        # Postgres DDL (profiles, subscriptions, leads tables)
  setup_superadmin.sql
  functions/stripe-webhook/index.ts  # Stripe webhook Deno function
```

## Navigation Model

No React Router — the app uses a tab index (`tab` state, 0-11) and conditional rendering:

```jsx
const TABS = ["⚙️ Setup","📥 Real Leads","🔍 Social","🚀 Workflow","📧 Send Emails",
              "👥 Pipeline","📅 Meetings","📁 Portfolio","🎯 Freelance","🗂️ Projects",
              "📊 Data Store","👑 Admin"];
```

Tab 11 (Admin) is only shown to users with `profile.role === "superadmin" | "admin"`.

## Auth Flow

1. `App.jsx` checks `supabase.auth.getSession()` on mount
2. If no session → renders `<AuthPage onAuth={handleAuth}/>`
3. After login → `loadUserData(user)` fetches `profiles` + `subscriptions`
4. Demo mode: email `demo@clientflow.ai` → skips Supabase, gets a fake lifetime subscription
5. Subscription gate: if `isSubscriptionActive(subscription)` is false, an upgrade prompt is shown

## Supabase Config

- **URL**: `https://ifdqoizimmoirkotbjmd.supabase.co`
- **Anon key**: stored in `supabase.js` (public — intentional for browser SDK)
- Tables: `profiles` (id, full_name, role), `subscriptions` (user_id, plan, status, expires_at), `leads`

## AI Integration

All Claude calls go through `callClaude(apiKey, systemPrompt, userPrompt)` in `App.jsx`. The API key is stored in `sessionStorage` (cleared on tab close). Model: `claude-sonnet-4-5`.

## Key State (in App component)

| State | Purpose |
|-------|---------|
| `session`, `user` | Supabase auth session |
| `profile`, `subscription` | User profile + plan |
| `tab` | Active tab index |
| `config` | Niche/service/country/name settings (persisted to localStorage) |
| `stages` | Workflow stage results (leads, email, followup, proposal, meeting) |
| `apiKey` | Claude API key (sessionStorage) |
| `apiKeys` | Third-party API keys: Hunter, Apollo, Places (sessionStorage) |
| `sheetsConfig` | Google Sheets credentials + enabled flag (localStorage) |
| `gmailState` | Gmail OAuth token + profile |
| `darkMode` | Dark mode toggle (localStorage `cf_dark`) |

## Common Patterns

### Adding a new tab
1. Add to the `TABS` array constant
2. Create a component function `function MyTab({config, apiKey, ...})`  
3. Add `{tab === N && <MyTab .../>}` in `<main>`
4. Add CSS in `index.css`

### Calling Claude
```js
const result = await callClaude(apiKey, "You are...", "User prompt here");
```

### Saving to Google Sheets
```js
await appendSheet(sheetsConfig, [["col1", "col2"]], "SheetName");
```

## Build & Dev

```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # Production build → dist/
npm run preview  # Preview built dist/
```

Deployed on Vercel. `vercel.json` handles SPA routing rewrites and asset caching.

## Known Issues (pre-fix)

- `<ToastContainer/>` was referenced but not defined → crash on login
- `<MobileNav>` was referenced but not defined → crash on login  
- `showProfile` state was declared twice (lines 2905 and 3000) → React hooks violation
- `index.css` has duplicate sections (lines 298-593 repeat lines 1-297) — harmless but wasteful
- `.user-signout-link` class used in JSX but CSS defines `.user-signout` — sign-out link unstyled
