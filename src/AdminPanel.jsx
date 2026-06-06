// src/AdminPanel.jsx — Complete Super Admin Dashboard
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────
const PLAN_COLOR  = { monthly:"#6366f1", yearly:"#8b5cf6", lifetime:"#f59e0b", free:"#64748b" };
const PLAN_PRICE  = { monthly:1, yearly:10/12, lifetime:0, free:0 };
const STATUS_COLOR= { active:"#22c55e", cancelled:"#ef4444", expired:"#94a3b8", past_due:"#f59e0b" };

function fmt(n)   { return "$"+Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtInt(n){ return Number(n||0).toLocaleString(); }
function fmtDate(d){ return d ? new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"; }

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, trend, trendLabel, color="#6366f1", sub }) {
  return (
    <div className="asc">
      <div className="asc__icon" style={{background:color+"18",color}}>{icon}</div>
      <div className="asc__body">
        <div className="asc__val">{value}</div>
        <div className="asc__label">{label}</div>
        {(trend||sub) && (
          <div className={`asc__trend ${trend>0?"up":trend<0?"down":"neutral"}`}>
            {trend!=null && <span>{trend>0?"↑":"↓"} {Math.abs(trend)}%</span>}
            {trendLabel && <span className="asc__trend-label">{trendLabel}</span>}
            {sub && <span className="asc__sub">{sub}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mini Bar Chart ────────────────────────────────────────────────────────────
function MiniBar({ data, color="#6366f1", height=48 }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d=>d.value), 1);
  return (
    <div className="mini-bar" style={{height}}>
      {data.map((d,i) => (
        <div key={i} className="mini-bar__col" title={`${d.label}: ${d.value}`}>
          <div className="mini-bar__bar" style={{height:`${(d.value/max)*100}%`,background:color}}/>
          <div className="mini-bar__label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────
function Donut({ segments, size=120 }) {
  const total = segments.reduce((s,x)=>s+x.value,0)||1;
  let offset = 0;
  const r=42, cx=60, cy=60, circumference=2*Math.PI*r;
  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="16"/>
        {segments.filter(s=>s.value>0).map((s,i) => {
          const len = (s.value/total)*circumference;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={s.color} strokeWidth="16"
              strokeDasharray={`${len} ${circumference-len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{transition:"stroke-dasharray .4s"}}/>
          );
          offset += len;
          return el;
        })}
        <text x={cx} y={cy-4} textAnchor="middle" fontSize="13" fontWeight="800" fill="#0f172a">{fmtInt(total)}</text>
        <text x={cx} y={cy+12} textAnchor="middle" fontSize="9" fill="#94a3b8">total</text>
      </svg>
      <div className="donut-legend">
        {segments.map((s,i) => (
          <div key={i} className="donut-legend__item">
            <span className="donut-legend__dot" style={{background:s.color}}/>
            <span className="donut-legend__label">{s.label}</span>
            <span className="donut-legend__val">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type="success") => {
    const id = Date.now();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), 3200);
  }, []);
  const Toasts = () => (
    <div className="admin-toasts">
      {toasts.map(t=>(
        <div key={t.id} className={`admin-toast-item admin-toast-item--${t.type}`}>
          {t.type==="success"?"✅":t.type==="error"?"❌":"ℹ️"} {t.msg}
        </div>
      ))}
    </div>
  );
  return { add, Toasts };
}

// ── Confirmation Modal ────────────────────────────────────────────────────────
function ConfirmModal({ msg, onConfirm, onCancel, danger=false }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{maxWidth:380}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>{danger?"⚠️ Confirm Action":"Confirm"}</h3>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{fontSize:14,color:"#374151",marginBottom:20,lineHeight:1.6}}>{msg}</p>
          <div style={{display:"flex",gap:10}}>
            <button className="btn-ghost" style={{flex:1}} onClick={onCancel}>Cancel</button>
            <button
              style={{flex:1,background:danger?"#ef4444":"#6366f1",color:"#fff",border:"none",borderRadius:8,padding:"10px",fontWeight:700,cursor:"pointer"}}
              onClick={onConfirm}>
              {danger?"Yes, Delete":"Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN PANEL
// ════════════════════════════════════════════════════════════════════════════
export default function AdminPanel({ currentUser }) {
  const { add: toast, Toasts } = useToast();
  const [view, setView]         = useState("dashboard");
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [stats, setStats]       = useState(null);
  const [users, setUsers]       = useState([]);
  const [subs, setSubs]         = useState([]);
  const [usage, setUsage]       = useState([]);
  const [settings, setSettings] = useState({ appName:"ClientFlow AI", maintenanceMode:false, freeTrialDays:7, maxLeadsPerUser:100 });

  // UI state
  const [userSearch, setUserSearch]     = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userPlanFilter, setUserPlanFilter] = useState("all");
  const [userSort, setUserSort]         = useState("newest");
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirm, setConfirm]           = useState(null);
  const [grantLoading, setGrantLoading] = useState(null);
  const [editSettings, setEditSettings] = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [weeklyData, setWeeklyData]     = useState([]);
  const [planFilter, setPlanFilter]     = useState("all");

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadData = useCallback(async (silent=false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      // Profiles
      const { data: profileData, error: pe } = await supabase
        .from("profiles").select("*").order("created_at", { ascending: false });
      if (!pe) setUsers(profileData || []);

      // Subscriptions with profile join
      const { data: subData, error: se } = await supabase
        .from("subscriptions")
        .select("*, profiles(full_name, email, role)")
        .order("created_at", { ascending: false });
      if (!se) setSubs(subData || []);

      // Usage events (last 100)
      const { data: usageData } = await supabase
        .from("usage_events").select("event, created_at, user_id")
        .order("created_at", { ascending: false }).limit(100);
      setUsage(usageData || []);

      // Build stats
      const profiles = profileData || [];
      const subscriptions = subData || [];
      const now = new Date();
      const activeSubs = subscriptions.filter(s => s.status==="active" && (!s.expires_at||new Date(s.expires_at)>now));
      const monthly = activeSubs.filter(s=>s.plan==="monthly");
      const yearly  = activeSubs.filter(s=>s.plan==="yearly");
      const lifetime= activeSubs.filter(s=>s.plan==="lifetime");
      const mrr = monthly.length*1 + yearly.length*(10/12);
      const arr = mrr*12;
      const today = new Date(); today.setHours(0,0,0,0);
      const weekAgo = new Date(today.getTime()-7*86400000);
      const monthAgo = new Date(today.getTime()-30*86400000);

      setStats({
        totalUsers:    profiles.length,
        activeSubsCount: activeSubs.length,
        monthlyCount:  monthly.length,
        yearlyCount:   yearly.length,
        lifetimeCount: lifetime.length,
        freeCount:     profiles.length - activeSubs.length,
        mrr, arr,
        totalRevenue:  monthly.length*1 + yearly.length*10 + lifetime.length*50,
        newToday:      profiles.filter(p=>new Date(p.created_at)>=today).length,
        newThisWeek:   profiles.filter(p=>new Date(p.created_at)>=weekAgo).length,
        newThisMonth:  profiles.filter(p=>new Date(p.created_at)>=monthAgo).length,
        conversionRate: profiles.length ? Math.round((activeSubs.length/profiles.length)*100) : 0,
        churnedSubs:   subscriptions.filter(s=>s.status==="cancelled").length,
      });

      // Weekly signups chart data (last 7 days)
      const days = Array.from({length:7}, (_,i)=>{
        const d = new Date(today.getTime()-(6-i)*86400000);
        return { label: d.toLocaleDateString("en-US",{weekday:"short"}), date: d, value: 0 };
      });
      profiles.forEach(p=>{
        const d = new Date(p.created_at); d.setHours(0,0,0,0);
        const slot = days.find(s=>s.date.getTime()===d.getTime());
        if (slot) slot.value++;
      });
      setWeeklyData(days.map(d=>({label:d.label, value:d.value})));

    } catch (e) { toast("Error loading data: "+e.message, "error"); }
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function updateRole(userId, role) {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
    if (error) { toast("Failed: "+error.message, "error"); return; }
    setUsers(u=>u.map(x=>x.id===userId?{...x,role}:x));
    toast(`✅ Role updated to ${role}`);
  }

  async function grantSub(userId, plan) {
    setGrantLoading(userId+"_"+plan);
    const now = new Date();
    let expires = null;
    if (plan==="monthly") expires = new Date(now.getTime()+30*86400000).toISOString();
    if (plan==="yearly")  expires = new Date(now.getTime()+365*86400000).toISOString();
    const { error } = await supabase.from("subscriptions").upsert({
      user_id:userId, plan, status:"active",
      started_at:now.toISOString(), expires_at:expires, updated_at:now.toISOString()
    });
    if (error) { toast("Failed: "+error.message,"error"); }
    else toast(`✅ ${plan} plan granted`);
    setGrantLoading(null);
    loadData(true);
  }

  async function revokeSub(subId) {
    const { error } = await supabase.from("subscriptions")
      .update({ status:"cancelled", updated_at:new Date().toISOString() }).eq("id", subId);
    if (error) { toast("Failed: "+error.message,"error"); return; }
    toast("✅ Subscription cancelled");
    loadData(true);
  }

  async function deleteUser(userId) {
    setConfirm({
      msg: "Permanently delete this user and ALL their data? This cannot be undone.",
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        const { error } = await supabase.from("profiles").delete().eq("id", userId);
        if (error) { toast("Failed: "+error.message,"error"); return; }
        setUsers(u=>u.filter(x=>x.id!==userId));
        setSelectedUser(null);
        toast("✅ User deleted");
        loadData(true);
      }
    });
  }

  async function exportCSV() {
    setExporting(true);
    const rows = [
      ["ID","Name","Email","Role","Plan","Status","Joined","Last Updated"],
      ...users.map(u => {
        const sub = subs.find(s=>s.user_id===u.id&&s.status==="active");
        return [u.id,u.full_name||"",u.email||"",u.role||"user",sub?.plan||"free",sub?.status||"free",fmtDate(u.created_at),fmtDate(u.updated_at)];
      })
    ];
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `clientflow-users-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    setExporting(false); toast("✅ CSV exported");
  }

  // ── Filter users ────────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u => {
    const sub = subs.find(s=>s.user_id===u.id&&s.status==="active");
    const plan = sub?.plan||"free";
    const matchSearch = !userSearch || (u.full_name+u.email).toLowerCase().includes(userSearch.toLowerCase());
    const matchRole  = userRoleFilter==="all" || u.role===userRoleFilter;
    const matchPlan  = userPlanFilter==="all" || plan===userPlanFilter;
    return matchSearch && matchRole && matchPlan;
  }).sort((a,b) => {
    if (userSort==="newest") return new Date(b.created_at)-new Date(a.created_at);
    if (userSort==="oldest") return new Date(a.created_at)-new Date(b.created_at);
    if (userSort==="name")   return (a.full_name||"").localeCompare(b.full_name||"");
    return 0;
  });

  const filteredSubs = subs.filter(s => planFilter==="all" || s.plan===planFilter);

  if (loading) return (
    <div className="admin-loading">
      <div className="admin-spinner">⚡</div>
      <p>Loading admin data…</p>
    </div>
  );

  const donutData = [
    { label:"Monthly",  value:stats?.monthlyCount||0,  color:"#6366f1" },
    { label:"Yearly",   value:stats?.yearlyCount||0,   color:"#8b5cf6" },
    { label:"Lifetime", value:stats?.lifetimeCount||0, color:"#f59e0b" },
    { label:"Free",     value:stats?.freeCount||0,     color:"#e2e8f0" },
  ];

  const usageBreakdown = usage.reduce((acc,e)=>{
    acc[e.event]=(acc[e.event]||0)+1; return acc;
  }, {});

  return (
    <div className="admin-wrap">
      <Toasts/>
      {confirm && <ConfirmModal {...confirm} onCancel={()=>setConfirm(null)}/>}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          subs={subs.filter(s=>s.user_id===selectedUser.id)}
          onClose={()=>setSelectedUser(null)}
          onGrant={grantSub}
          onRevoke={revokeSub}
          onRoleChange={updateRole}
          onDelete={deleteUser}
          grantLoading={grantLoading}
          toast={toast}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="admin-hdr">
        <div>
          <h1 className="admin-hdr__title">
            <span className="admin-hdr__crown">👑</span> Super Admin
          </h1>
          <p className="admin-hdr__sub">ClientFlow AI — Internal Control Panel</p>
        </div>
        <div className="admin-hdr__right">
          <div className="admin-who">
            <div className="admin-who__avatar">{currentUser?.email?.[0]?.toUpperCase()||"A"}</div>
            <div>
              <div className="admin-who__email">{currentUser?.email}</div>
              <div className="admin-who__role">Superadmin</div>
            </div>
          </div>
          <button className={`btn-secondary ${refreshing?"loading":""}`} onClick={()=>loadData(true)}>
            {refreshing?"⏳":"🔄"} Refresh
          </button>
          <button className="btn-primary" onClick={exportCSV} disabled={exporting}>
            {exporting?"⏳ Exporting…":"📥 Export CSV"}
          </button>
        </div>
      </div>

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <div className="admin-nav">
        {[["dashboard","📊","Dashboard"],["users","👥","Users"],["subscriptions","💳","Subscriptions"],
          ["revenue","💰","Revenue"],["analytics","📈","Analytics"],["settings","⚙️","Settings"]
        ].map(([v,ic,lb])=>(
          <button key={v} className={`admin-nav__btn ${view===v?"active":""}`} onClick={()=>setView(v)}>
            <span className="admin-nav__icon">{ic}</span>
            <span className="admin-nav__label">{lb}</span>
            {v==="users"&&stats&&<span className="admin-nav__badge">{stats.totalUsers}</span>}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DASHBOARD
      ══════════════════════════════════════════════════════════════════════ */}
      {view==="dashboard" && (
        <div className="admin-dashboard">
          {/* KPI row */}
          <div className="admin-kpi-grid">
            <StatCard icon="👥" label="Total Users"   value={fmtInt(stats?.totalUsers)} color="#6366f1"
              sub={`+${stats?.newToday||0} today · +${stats?.newThisWeek||0} this week`}/>
            <StatCard icon="✅" label="Active Subs"   value={fmtInt(stats?.activeSubsCount)} color="#22c55e"
              sub={`${stats?.conversionRate||0}% conversion rate`}/>
            <StatCard icon="💵" label="MRR"           value={fmt(stats?.mrr)} color="#f59e0b"
              sub={`${fmt(stats?.arr)} ARR`}/>
            <StatCard icon="💰" label="Total Revenue" value={fmt(stats?.totalRevenue)} color="#ec4899"
              sub={`${stats?.lifetimeCount||0} lifetime users`}/>
          </div>

          {/* Charts row */}
          <div className="admin-charts-row">
            <div className="card admin-chart-card">
              <div className="admin-chart-header">
                <h3>New Signups — Last 7 Days</h3>
                <span className="admin-chart-badge">+{stats?.newThisWeek||0} this week</span>
              </div>
              <MiniBar data={weeklyData} color="#6366f1" height={100}/>
            </div>
            <div className="card admin-chart-card">
              <div className="admin-chart-header">
                <h3>Subscription Distribution</h3>
                <span className="admin-chart-badge">{stats?.activeSubsCount||0} active</span>
              </div>
              <Donut segments={donutData} size={140}/>
            </div>
            <div className="card admin-chart-card">
              <div className="admin-chart-header">
                <h3>Revenue Breakdown</h3>
                <span className="admin-chart-badge">{fmt(stats?.mrr||0)}/mo</span>
              </div>
              <div className="rev-breakdown">
                {[
                  {plan:"Monthly",  count:stats?.monthlyCount||0,  unit:"$1/mo",   color:"#6366f1"},
                  {plan:"Yearly",   count:stats?.yearlyCount||0,   unit:"$10/yr",  color:"#8b5cf6"},
                  {plan:"Lifetime", count:stats?.lifetimeCount||0, unit:"$50 once",color:"#f59e0b"},
                ].map(r=>(
                  <div key={r.plan} className="rev-row">
                    <div className="rev-row__left">
                      <span className="rev-dot" style={{background:r.color}}/>
                      <span className="rev-name">{r.plan}</span>
                      <span className="rev-unit">{r.unit}</span>
                    </div>
                    <div className="rev-row__right">
                      <span className="rev-count">{r.count} users</span>
                      <span className="rev-amount" style={{color:r.color}}>
                        {r.plan==="Monthly"?fmt(r.count*1):r.plan==="Yearly"?fmt(r.count*(10/12)):fmt(0)}{r.plan!=="Lifetime"?"/mo":""}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="rev-total">
                  <span>Total MRR</span>
                  <span>{fmt(stats?.mrr||0)}/month</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent users */}
          <div className="card">
            <div className="admin-table-hdr-row">
              <h3>🆕 Recent Signups</h3>
              <button className="btn-ghost" style={{fontSize:12}} onClick={()=>setView("users")}>View all →</button>
            </div>
            <div className="admin-table">
              <div className="admin-table__head">
                <span>User</span><span>Role</span><span>Plan</span><span>Joined</span><span>Action</span>
              </div>
              {users.slice(0,6).map(u=>{
                const sub=subs.find(s=>s.user_id===u.id&&s.status==="active");
                return(
                  <div key={u.id} className="admin-table__row">
                    <div className="admin-user-cell">
                      <div className="admin-user-avatar">{(u.full_name||u.email||"?")[0].toUpperCase()}</div>
                      <div>
                        <div className="admin-user-name">{u.full_name||"No name"}</div>
                        <div className="admin-user-email">{u.email}</div>
                      </div>
                    </div>
                    <span className={`admin-role-chip admin-role-chip--${u.role||"user"}`}>{u.role||"user"}</span>
                    <span className="admin-plan-chip" style={{background:(PLAN_COLOR[sub?.plan||"free"])+"18",color:PLAN_COLOR[sub?.plan||"free"]}}>{sub?.plan||"free"}</span>
                    <span className="admin-date">{fmtDate(u.created_at)}</span>
                    <button className="admin-view-btn" onClick={()=>setSelectedUser(u)}>View →</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          USERS
      ══════════════════════════════════════════════════════════════════════ */}
      {view==="users" && (
        <div className="admin-section">
          <div className="admin-toolbar">
            <input className="admin-search" placeholder="🔍 Search by name or email…"
              value={userSearch} onChange={e=>setUserSearch(e.target.value)}/>
            <select className="admin-filter-select" value={userRoleFilter} onChange={e=>setUserRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
            <select className="admin-filter-select" value={userPlanFilter} onChange={e=>setUserPlanFilter(e.target.value)}>
              <option value="all">All Plans</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="lifetime">Lifetime</option>
              <option value="free">Free</option>
            </select>
            <select className="admin-filter-select" value={userSort} onChange={e=>setUserSort(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A-Z</option>
            </select>
            <span className="admin-count">{filteredUsers.length}/{users.length} users</span>
          </div>

          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div className="admin-table admin-table--users">
              <div className="admin-table__head">
                <span>User</span><span>Role</span><span>Plan</span><span>Joined</span><span>Actions</span>
              </div>
              {filteredUsers.length===0 && (
                <div className="admin-empty">No users match your filters</div>
              )}
              {filteredUsers.map(u=>{
                const sub=subs.find(s=>s.user_id===u.id&&s.status==="active");
                return(
                  <div key={u.id} className="admin-table__row">
                    <div className="admin-user-cell">
                      <div className="admin-user-avatar">{(u.full_name||u.email||"?")[0].toUpperCase()}</div>
                      <div>
                        <div className="admin-user-name">{u.full_name||"No name"}</div>
                        <div className="admin-user-email">{u.email}</div>
                      </div>
                    </div>
                    <div>
                      <select className="admin-role-select"
                        value={u.role||"user"}
                        onChange={e=>updateRole(u.id,e.target.value)}>
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                        <option value="superadmin">superadmin</option>
                      </select>
                    </div>
                    <div>
                      {sub
                        ?<span className="admin-plan-chip" style={{background:PLAN_COLOR[sub.plan]+"18",color:PLAN_COLOR[sub.plan]}}>{sub.plan}</span>
                        :<span className="admin-plan-chip" style={{background:"#f1f5f9",color:"#94a3b8"}}>free</span>
                      }
                    </div>
                    <span className="admin-date">{fmtDate(u.created_at)}</span>
                    <div className="admin-row-actions">
                      <button className="admin-view-btn" onClick={()=>setSelectedUser(u)}>View →</button>
                      <select className="admin-grant-select" defaultValue=""
                        onChange={e=>{if(e.target.value){grantSub(u.id,e.target.value);e.target.value="";}}}
                        disabled={grantLoading?.startsWith(u.id)}>
                        <option value="" disabled>Grant…</option>
                        <option value="monthly">Monthly ($1)</option>
                        <option value="yearly">Yearly ($10)</option>
                        <option value="lifetime">Lifetime ($50)</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUBSCRIPTIONS
      ══════════════════════════════════════════════════════════════════════ */}
      {view==="subscriptions" && (
        <div className="admin-section">
          <div className="admin-toolbar">
            <div className="admin-plan-filters">
              {["all","monthly","yearly","lifetime","free","cancelled"].map(p=>(
                <button key={p} className={`admin-plan-filter-btn ${planFilter===p?"active":""}`}
                  style={planFilter===p&&p!=="all"?{background:PLAN_COLOR[p]+"18",color:PLAN_COLOR[p],borderColor:PLAN_COLOR[p]+"44"}:{}}
                  onClick={()=>setPlanFilter(p)}>
                  {p==="all"?"All":p.charAt(0).toUpperCase()+p.slice(1)}
                  <span className="admin-plan-filter-count">
                    {p==="all"?subs.length:subs.filter(s=>s.plan===p||(p==="cancelled"&&s.status==="cancelled")).length}
                  </span>
                </button>
              ))}
            </div>
            <span className="admin-count">{filteredSubs.length} subscriptions</span>
          </div>
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div className="admin-table admin-table--subs">
              <div className="admin-table__head">
                <span>User</span><span>Plan</span><span>Status</span><span>Started</span><span>Expires</span><span>Action</span>
              </div>
              {filteredSubs.map(s=>(
                <div key={s.id} className="admin-table__row">
                  <div className="admin-user-cell">
                    <div className="admin-user-avatar" style={{background:PLAN_COLOR[s.plan]||"#6366f1"}}>{(s.profiles?.full_name||s.profiles?.email||"?")[0]?.toUpperCase()}</div>
                    <div>
                      <div className="admin-user-name">{s.profiles?.full_name||"—"}</div>
                      <div className="admin-user-email">{s.profiles?.email}</div>
                    </div>
                  </div>
                  <span className="admin-plan-chip" style={{background:PLAN_COLOR[s.plan]+"18",color:PLAN_COLOR[s.plan]}}>{s.plan}</span>
                  <span className="admin-status-chip" style={{background:STATUS_COLOR[s.status]+"18",color:STATUS_COLOR[s.status]}}>{s.status}</span>
                  <span className="admin-date">{fmtDate(s.started_at)}</span>
                  <span className="admin-date">{s.expires_at?fmtDate(s.expires_at):"Never"}</span>
                  {s.status==="active"&&(
                    <button className="btn-ghost" style={{fontSize:11,color:"#ef4444",padding:"4px 10px"}}
                      onClick={()=>setConfirm({msg:`Cancel subscription for ${s.profiles?.email}?`,danger:true,onConfirm:()=>{setConfirm(null);revokeSub(s.id);}})}>
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          REVENUE
      ══════════════════════════════════════════════════════════════════════ */}
      {view==="revenue" && (
        <div className="admin-section">
          <div className="admin-kpi-grid">
            <StatCard icon="💵" label="Monthly MRR"   value={fmt(stats?.mrr)}           color="#22c55e" sub={`${fmt((stats?.mrr||0)*12)} ARR`}/>
            <StatCard icon="📈" label="Total Revenue" value={fmt(stats?.totalRevenue)}   color="#6366f1" sub="All time estimated"/>
            <StatCard icon="📅" label="Monthly Users" value={`${stats?.monthlyCount||0} users`} color="#6366f1" sub={fmt((stats?.monthlyCount||0)*1)+" MRR from monthly"}/>
            <StatCard icon="🗓️" label="Yearly Users"  value={`${stats?.yearlyCount||0} users`} color="#8b5cf6" sub={fmt((stats?.yearlyCount||0)*(10/12))+" MRR from yearly"}/>
            <StatCard icon="♾️" label="Lifetime Users" value={`${stats?.lifetimeCount||0} users`} color="#f59e0b" sub={fmt((stats?.lifetimeCount||0)*50)+" one-time"}/>
            <StatCard icon="❌" label="Churned Subs"  value={fmtInt(stats?.churnedSubs)} color="#ef4444" sub="Total cancelled"/>
          </div>

          <div className="admin-charts-row">
            <div className="card" style={{flex:2}}>
              <div className="admin-chart-header"><h3>Weekly Signups</h3></div>
              <MiniBar data={weeklyData} color="#6366f1" height={120}/>
            </div>
            <div className="card" style={{flex:1}}>
              <div className="admin-chart-header"><h3>Plan Distribution</h3></div>
              <Donut segments={donutData} size={160}/>
            </div>
          </div>

          <div className="card">
            <h3 style={{marginBottom:16}}>💰 Revenue Growth Targets</h3>
            <div className="rev-targets">
              {[
                {target:"$100 MRR", need:"100 monthly OR 10 yearly users"},
                {target:"$500 MRR", need:"500 monthly OR 50 yearly users"},
                {target:"$1,000 MRR", need:"1,000 monthly OR 100 yearly users"},
                {target:"$5,000 MRR", need:"5,000 monthly OR 500 yearly users"},
              ].map((t,i)=>{
                const pct = Math.min(100, Math.round(((stats?.mrr||0)/parseFloat(t.target.replace(/[^0-9.]/g,"")))*100));
                return(
                  <div key={i} className="rev-target-row">
                    <div className="rev-target-info">
                      <span className="rev-target-val">{t.target}</span>
                      <span className="rev-target-need">{t.need}</span>
                    </div>
                    <div className="rev-target-bar-wrap">
                      <div className="rev-target-bar">
                        <div style={{width:`${pct}%`,background:pct>=100?"#22c55e":"#6366f1"}}/>
                      </div>
                      <span className="rev-target-pct" style={{color:pct>=100?"#22c55e":"#6366f1"}}>{pct}%{pct>=100?" ✅":""}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ANALYTICS
      ══════════════════════════════════════════════════════════════════════ */}
      {view==="analytics" && (
        <div className="admin-section">
          <div className="admin-kpi-grid">
            <StatCard icon="📊" label="Events (last 100)" value={fmtInt(usage.length)} color="#6366f1"/>
            <StatCard icon="👤" label="Unique Users" value={fmtInt(new Set(usage.map(e=>e.user_id)).size)} color="#8b5cf6"/>
            <StatCard icon="🔥" label="Most Used Feature" value={Object.entries(usageBreakdown).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—"} color="#f59e0b"/>
            <StatCard icon="📅" label="Events Today" value={fmtInt(usage.filter(e=>new Date(e.created_at)>new Date(Date.now()-86400000)).length)} color="#22c55e"/>
          </div>
          <div className="card">
            <h3 style={{marginBottom:16}}>📊 Feature Usage Breakdown</h3>
            {Object.keys(usageBreakdown).length===0 && (
              <div className="admin-empty">No usage events yet. Events are logged when users use features.</div>
            )}
            <div className="admin-usage-list">
              {Object.entries(usageBreakdown).sort((a,b)=>b[1]-a[1]).map(([event,count])=>{
                const max = Math.max(...Object.values(usageBreakdown));
                return(
                  <div key={event} className="admin-usage-row">
                    <span className="admin-usage-event">{event}</span>
                    <div className="admin-usage-bar-wrap">
                      <div className="admin-usage-bar">
                        <div style={{width:`${(count/max)*100}%`,background:"#6366f1"}}/>
                      </div>
                    </div>
                    <span className="admin-usage-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            <h3 style={{marginBottom:16}}>📋 Recent Events</h3>
            <div className="admin-table">
              <div className="admin-table__head">
                <span>Event</span><span>User ID</span><span>Time</span>
              </div>
              {usage.slice(0,20).map((e,i)=>(
                <div key={i} className="admin-table__row">
                  <span className="admin-event-chip">{e.event}</span>
                  <span className="admin-user-email" style={{fontFamily:"monospace",fontSize:11}}>{e.user_id?.slice(0,8)}…</span>
                  <span className="admin-date">{new Date(e.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SETTINGS
      ══════════════════════════════════════════════════════════════════════ */}
      {view==="settings" && (
        <div className="admin-section">
          <div className="card">
            <div className="admin-settings-header">
              <h3>⚙️ App Settings</h3>
              <button className="btn-primary" onClick={()=>setEditSettings(!editSettings)}>
                {editSettings?"💾 Save Changes":"✏️ Edit Settings"}
              </button>
            </div>
            <div className="admin-settings-grid">
              {[
                {key:"appName",label:"App Name",type:"text"},
                {key:"freeTrialDays",label:"Free Trial Days",type:"number"},
                {key:"maxLeadsPerUser",label:"Max Leads Per User (free)",type:"number"},
              ].map(({key,label,type})=>(
                <div key={key} className="field">
                  <label>{label}</label>
                  <input type={type} value={settings[key]} disabled={!editSettings}
                    onChange={e=>setSettings(s=>({...s,[key]:e.target.value}))}
                    style={{opacity:editSettings?1:.7}}/>
                </div>
              ))}
              <div className="field">
                <label>Maintenance Mode</label>
                <label className="toggle-wrap">
                  <input type="checkbox" checked={settings.maintenanceMode} disabled={!editSettings}
                    onChange={e=>setSettings(s=>({...s,maintenanceMode:e.target.checked}))}/>
                  <span className="toggle-slider"/>
                  <span className="toggle-label">{settings.maintenanceMode?"ON":"OFF"}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{marginBottom:16}}>🔑 Quick Setup Guide</h3>
            <div className="admin-setup-steps">
              {[
                {done:true,  title:"Supabase connected",       desc:"Database schema is running"},
                {done:false, title:"Enable email confirmation", desc:"Supabase → Auth → Settings → Disable email confirm for testing"},
                {done:false, title:"Set superadmin role",      desc:`Run: UPDATE profiles SET role='superadmin' WHERE email='${currentUser?.email}'`},
                {done:false, title:"Add Stripe keys",          desc:"Add VITE_STRIPE_PK + price IDs to .env.local"},
                {done:false, title:"Deploy to Vercel",         desc:"Push to GitHub → Vercel auto-deploys"},
              ].map((s,i)=>(
                <div key={i} className="admin-setup-step">
                  <span className={`admin-setup-check ${s.done?"done":""}`}>{s.done?"✅":"⬜"}</span>
                  <div>
                    <div className="admin-setup-title">{s.title}</div>
                    <div className="admin-setup-desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{border:"1.5px solid #fecaca",background:"#fef2f2"}}>
            <h3 style={{color:"#dc2626",marginBottom:12}}>⚠️ Danger Zone</h3>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <button className="btn-ghost" style={{color:"#ef4444",borderColor:"#fecaca"}}
                onClick={()=>setConfirm({msg:"Clear ALL usage analytics events? This cannot be undone.",danger:true,onConfirm:async()=>{
                  await supabase.from("usage_events").delete().neq("id","00000000-0000-0000-0000-000000000000");
                  setUsage([]); setConfirm(null); toast("✅ Analytics cleared");
                }})}>
                🗑 Clear All Analytics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── User Detail Modal ─────────────────────────────────────────────────────────
function UserDetailModal({ user, subs, onClose, onGrant, onRevoke, onRoleChange, onDelete, grantLoading, toast }) {
  const activeSub = subs.find(s=>s.status==="active");
  const [role, setRole] = useState(user.role||"user");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>👤 User Details</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Profile */}
          <div className="udetail-profile">
            <div className="udetail-avatar">{(user.full_name||user.email||"?")[0].toUpperCase()}</div>
            <div>
              <div className="udetail-name">{user.full_name||"No name"}</div>
              <div className="udetail-email">{user.email}</div>
              <div className="udetail-meta">Joined {new Date(user.created_at).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>
            </div>
          </div>

          {/* Info grid */}
          <div className="udetail-grid">
            <div className="udetail-item"><span>Company</span><strong>{user.company_name||"—"}</strong></div>
            <div className="udetail-item"><span>Country</span><strong>{user.country||"—"}</strong></div>
            <div className="udetail-item"><span>Niche</span><strong>{user.niche||"—"}</strong></div>
            <div className="udetail-item"><span>User ID</span><strong style={{fontSize:11,fontFamily:"monospace"}}>{user.id?.slice(0,16)}…</strong></div>
          </div>

          {/* Role */}
          <div className="udetail-section">
            <div className="udetail-section-title">Role Management</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <select className="admin-role-select" value={role} onChange={e=>setRole(e.target.value)}>
                <option value="user">user</option>
                <option value="admin">admin</option>
                <option value="superadmin">superadmin</option>
              </select>
              <button className="btn-primary" style={{fontSize:12}} onClick={()=>{onRoleChange(user.id,role);toast("✅ Role updated");}}>Save Role</button>
            </div>
          </div>

          {/* Subscription */}
          <div className="udetail-section">
            <div className="udetail-section-title">Subscription</div>
            {activeSub ? (
              <div className="udetail-sub-card" style={{borderColor:PLAN_COLOR[activeSub.plan]+"44"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span className="admin-plan-chip" style={{background:PLAN_COLOR[activeSub.plan]+"18",color:PLAN_COLOR[activeSub.plan]}}>{activeSub.plan}</span>
                  <span className="admin-status-chip" style={{background:"#f0fdf4",color:"#22c55e"}}>✅ Active</span>
                </div>
                <div style={{fontSize:12,color:"#64748b",marginTop:8}}>
                  Started: {new Date(activeSub.started_at).toLocaleDateString()} · Expires: {activeSub.expires_at?new Date(activeSub.expires_at).toLocaleDateString():"Never"}
                </div>
                <button className="btn-ghost" style={{fontSize:11,color:"#ef4444",marginTop:8}} onClick={()=>onRevoke(activeSub.id)}>Cancel Subscription</button>
              </div>
            ) : <div style={{color:"#94a3b8",fontSize:13}}>No active subscription</div>}

            <div style={{marginTop:12}}>
              <div style={{fontSize:12,fontWeight:600,color:"#64748b",marginBottom:8}}>Grant Subscription:</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["monthly","yearly","lifetime"].map(p=>(
                  <button key={p} className="admin-grant-btn"
                    style={{background:PLAN_COLOR[p]+"18",color:PLAN_COLOR[p],borderColor:PLAN_COLOR[p]+"44"}}
                    disabled={grantLoading?.startsWith(user.id)}
                    onClick={()=>onGrant(user.id,p)}>
                    {p} ({p==="monthly"?"$1":p==="yearly"?"$10":"$50"})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Subscription history */}
          {subs.length>0 && (
            <div className="udetail-section">
              <div className="udetail-section-title">Subscription History ({subs.length})</div>
              {subs.map((s,i)=>(
                <div key={i} className="udetail-sub-history-row">
                  <span className="admin-plan-chip" style={{background:PLAN_COLOR[s.plan]+"18",color:PLAN_COLOR[s.plan]}}>{s.plan}</span>
                  <span className="admin-status-chip" style={{background:STATUS_COLOR[s.status]+"18",color:STATUS_COLOR[s.status]}}>{s.status}</span>
                  <span style={{fontSize:11,color:"#94a3b8"}}>{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Danger */}
          <div className="udetail-danger">
            <button className="btn-ghost" style={{color:"#ef4444",fontSize:12}}
              onClick={()=>onDelete(user.id)}>
              🗑 Delete This User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
