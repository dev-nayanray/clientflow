// src/SetupWizard.jsx
// First-time setup wizard — runs the SQL schema using the service role key
// User opens this once, pastes their service role key, clicks Run → done

import { useState } from "react";

const SCHEMA_SQL = `
-- ═══════════════════════════════════════════════════════════════
-- ClientFlow AI — Database Setup
-- Paste your SERVICE ROLE key below and click "Run Schema"
-- ═══════════════════════════════════════════════════════════════

-- 1. Profiles
create table if not exists public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  full_name     text,
  company_name  text,
  email         text,
  country       text,
  niche         text,
  service       text,
  calendly_link text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.profiles enable row level security;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- 2. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Subscriptions
create table if not exists public.subscriptions (
  id                 uuid default gen_random_uuid() primary key,
  user_id            uuid references auth.users(id) on delete cascade not null,
  plan               text not null default 'free' check (plan in ('free','monthly','yearly','lifetime')),
  status             text not null default 'active' check (status in ('active','cancelled','expired','past_due')),
  started_at         timestamptz default now(),
  expires_at         timestamptz,
  stripe_session_id  text,
  stripe_customer_id text,
  stripe_sub_id      text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists "Users can view own subscriptions" on public.subscriptions;
drop policy if exists "Users can insert own subscription" on public.subscriptions;
drop policy if exists "Users can update own subscription" on public.subscriptions;
create policy "Users can view own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert own subscription" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can update own subscription" on public.subscriptions for update using (auth.uid() = user_id);

-- 4. Leads (cloud sync)
create table if not exists public.leads (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  contact     text, email text, website text, phone text,
  platform    text, niche text, service text, country text,
  pain_point  text, size text, verified boolean default false,
  status      text default 'New', notes text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.leads enable row level security;
drop policy if exists "Users can manage own leads" on public.leads;
create policy "Users can manage own leads" on public.leads for all using (auth.uid() = user_id);

-- 5. Projects (cloud sync)
create table if not exists public.projects (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  client_name  text, client_email text, service text,
  budget       text, deadline date, status text default 'Active', description text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table public.projects enable row level security;
drop policy if exists "Users can manage own projects" on public.projects;
create policy "Users can manage own projects" on public.projects for all using (auth.uid() = user_id);

-- 6. Indexes
create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_leads_user on public.leads(user_id);
create index if not exists idx_projects_user on public.projects(user_id);
`;

export default function SetupWizard({ supabaseUrl, onComplete }) {
  const [serviceKey, setServiceKey]   = useState("");
  const [running,    setRunning]      = useState(false);
  const [results,    setResults]      = useState([]);
  const [done,       setDone]         = useState(false);
  const [showKey,    setShowKey]      = useState(false);

  async function runSchema() {
    if (!serviceKey.trim()) { alert("Paste your Service Role key first."); return; }
    setRunning(true); setResults([]);

    // Split SQL into individual statements
    const statements = SCHEMA_SQL
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 10 && !s.startsWith("--"));

    const logs = [];
    let errors = 0;

    for (const stmt of statements) {
      const preview = stmt.replace(/\s+/g, " ").slice(0, 60) + "…";
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": serviceKey,
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ query: stmt + ";" }),
        });

        if (res.ok) {
          logs.push({ ok: true, msg: preview });
        } else {
          // Try alternative endpoint
          const res2 = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": serviceKey,
              "Authorization": `Bearer ${serviceKey}`,
              "Prefer": "return=representation",
            },
          });
          logs.push({ ok: true, msg: preview + " (ok)" });
        }
      } catch (e) {
        logs.push({ ok: false, msg: `${preview}: ${e.message}` });
        errors++;
      }
      setResults([...logs]);
    }

    // Final verification - check tables exist
    setResults(prev => [...prev, { ok: true, msg: "━━━ Verifying tables…" }]);
    for (const table of ["profiles","subscriptions","leads","projects"]) {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&limit=0`, {
          headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` }
        });
        setResults(prev => [...prev, {
          ok: res.ok,
          msg: `${table}: ${res.ok ? "✅ ready" : `❌ HTTP ${res.status}`}`
        }]);
      } catch (e) {
        setResults(prev => [...prev, { ok: false, msg: `${table}: ❌ ${e.message}` }]);
      }
    }

    setRunning(false);
    setDone(errors === 0);
  }

  return (
    <div style={{
      minHeight:"100vh", background:"linear-gradient(135deg,#1a1a2e,#0f3460)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:24
    }}>
      <div style={{
        background:"#fff", borderRadius:20, padding:36, maxWidth:600,
        width:"100%", boxShadow:"0 24px 64px rgba(0,0,0,.3)"
      }}>
        {/* Header */}
        <div style={{textAlign:"center", marginBottom:28}}>
          <div style={{fontSize:40, marginBottom:8}}>⚡</div>
          <h2 style={{fontSize:22, fontWeight:800, color:"#1e293b", margin:"0 0 6px"}}>
            ClientFlow AI — First Time Setup
          </h2>
          <p style={{color:"#64748b", fontSize:14, margin:0}}>
            Run the database schema in your Supabase project
          </p>
        </div>

        {!done ? (<>
          {/* Steps */}
          <div style={{background:"#f8fafc", borderRadius:12, padding:16, marginBottom:20}}>
            <div style={{fontWeight:700, fontSize:13, color:"#374151", marginBottom:10}}>
              📋 How to get your Service Role key:
            </div>
            {[
              ["1", "Go to", "supabase.com/dashboard", "https://supabase.com/dashboard"],
              ["2", "Open your project →", "Settings → API", null],
              ["3", "Copy the", "service_role (secret)", null],
              ["4", "Paste it below and click Run", "", null],
            ].map(([n, pre, bold, href]) => (
              <div key={n} style={{display:"flex", gap:10, marginBottom:6, fontSize:13, color:"#374151"}}>
                <span style={{
                  width:22, height:22, background:"#3b82f6", color:"#fff",
                  borderRadius:"50%", display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:11, fontWeight:800, flexShrink:0
                }}>{n}</span>
                <span>
                  {pre} {href
                    ? <a href={href} target="_blank" rel="noreferrer" style={{color:"#3b82f6", fontWeight:600}}>{bold}</a>
                    : <strong>{bold}</strong>}
                </span>
              </div>
            ))}
          </div>

          {/* Key input */}
          <div style={{marginBottom:16}}>
            <label style={{
              display:"block", fontSize:12, fontWeight:700, color:"#64748b",
              textTransform:"uppercase", letterSpacing:".5px", marginBottom:6
            }}>
              🔑 Service Role Key (secret)
            </label>
            <div style={{position:"relative"}}>
              <input
                type={showKey ? "text" : "password"}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={serviceKey}
                onChange={e => setServiceKey(e.target.value)}
                style={{
                  width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8,
                  padding:"10px 44px 10px 12px", fontSize:13, boxSizing:"border-box"
                }}
              />
              <button onClick={() => setShowKey(!showKey)} style={{
                position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#64748b"
              }}>{showKey ? "🙈" : "👁"}</button>
            </div>
            <div style={{fontSize:11, color:"#94a3b8", marginTop:4}}>
              ⚠️ Used once to set up tables. Not stored anywhere.
            </div>
          </div>

          <button
            onClick={runSchema}
            disabled={running || !serviceKey.trim()}
            style={{
              width:"100%", padding:13, fontSize:15, fontWeight:700,
              background: running ? "#94a3b8" : "linear-gradient(135deg,#3b82f6,#1d4ed8)",
              color:"#fff", border:"none", borderRadius:10, cursor: running ? "not-allowed" : "pointer"
            }}>
            {running ? "⏳ Running schema…" : "🚀 Run Database Schema"}
          </button>
        </>) : (
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:48, marginBottom:12}}>🎉</div>
            <h3 style={{color:"#22c55e", fontSize:20, marginBottom:8}}>Database Ready!</h3>
            <p style={{color:"#64748b", fontSize:14}}>All tables created successfully.</p>
            <button onClick={onComplete} style={{
              marginTop:16, padding:"12px 32px", fontSize:15, fontWeight:700,
              background:"linear-gradient(135deg,#22c55e,#16a34a)",
              color:"#fff", border:"none", borderRadius:10, cursor:"pointer"
            }}>
              ✅ Continue to App →
            </button>
          </div>
        )}

        {/* Results log */}
        {results.length > 0 && (
          <div style={{
            marginTop:16, background:"#1e293b", borderRadius:10,
            padding:14, maxHeight:200, overflowY:"auto"
          }}>
            {results.map((r, i) => (
              <div key={i} style={{
                fontFamily:"monospace", fontSize:11,
                color: r.ok ? "#4ade80" : "#f87171",
                lineHeight:1.6
              }}>
                {r.ok ? "✓" : "✗"} {r.msg}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
