// src/AdminPanel.jsx — Super Admin Dashboard
import { useState, useEffect } from "react";
import { supabase } from "./supabase";

const PLAN_COLOR = { monthly:"#3b82f6", yearly:"#8b5cf6", lifetime:"#f59e0b", free:"#64748b" };

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-icon" style={{ background: (color||"#3b82f6")+"20", color: color||"#3b82f6" }}>{icon}</div>
      <div className="admin-stat-body">
        <div className="admin-stat-value" style={{ color: color||"#1e293b" }}>{value}</div>
        <div className="admin-stat-label">{label}</div>
        {sub && <div className="admin-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

export default function AdminPanel({ currentUser }) {
  const [stats, setStats]         = useState(null);
  const [users, setUsers]         = useState([]);
  const [subs, setSubs]           = useState([]);
  const [view, setView]           = useState("dashboard");
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [toast, setToast]         = useState(null);
  const [editUser, setEditUser]   = useState(null);

  function showToast(msg, type="success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load admin stats
      const { data: statsData } = await supabase.rpc("get_admin_stats");
      setStats(statsData);

      // Load all profiles
      const { data: profileData } = await supabase
        .from("profiles").select("*").order("created_at", { ascending: false });
      setUsers(profileData || []);

      // Load all subscriptions
      const { data: subData } = await supabase
        .from("subscriptions").select("*, profiles(full_name, email)")
        .order("created_at", { ascending: false });
      setSubs(subData || []);
    } catch (e) {
      showToast("Error loading data: " + e.message, "error");
    }
    setLoading(false);
  }

  async function updateUserRole(userId, role) {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
    if (error) { showToast("Failed: " + error.message, "error"); return; }
    setUsers(u => u.map(x => x.id === userId ? { ...x, role } : x));
    showToast(`✅ Role updated to ${role}`);
  }

  async function grantSubscription(userId, plan) {
    const now = new Date();
    let expires = null;
    if (plan === "monthly") expires = new Date(now.getTime() + 30*86400000).toISOString();
    if (plan === "yearly")  expires = new Date(now.getTime() + 365*86400000).toISOString();

    const { error } = await supabase.from("subscriptions").upsert({
      user_id: userId, plan, status: "active",
      started_at: now.toISOString(), expires_at: expires,
      updated_at: now.toISOString()
    });
    if (error) { showToast("Failed: " + error.message, "error"); return; }
    showToast(`✅ ${plan} subscription granted`);
    loadData();
  }

  async function cancelSubscription(subId) {
    if (!window.confirm("Cancel this subscription?")) return;
    const { error } = await supabase.from("subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", subId);
    if (error) { showToast("Failed: " + error.message, "error"); return; }
    showToast("✅ Subscription cancelled");
    loadData();
  }

  const filteredUsers = users.filter(u =>
    !search || (u.full_name + u.email).toLowerCase().includes(search.toLowerCase())
  );

  const mrr = stats ? Number(stats.mrr || 0).toFixed(2) : "0";
  const arr  = stats ? (Number(stats.mrr || 0) * 12).toFixed(2) : "0";

  if (loading) return (
    <div className="admin-loading">
      <div className="admin-loading-spinner">⚡</div>
      <p>Loading admin data…</p>
    </div>
  );

  return (
    <div className="admin-wrap">
      {/* Toast */}
      {toast && (
        <div className={`admin-toast ${toast.type}`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">⚡ Super Admin</h1>
          <p className="admin-sub">ClientFlow AI — Internal Dashboard</p>
        </div>
        <div className="admin-header-right">
          <span className="admin-badge">👑 {currentUser?.email}</span>
          <button className="btn-secondary" onClick={loadData}>🔄 Refresh</button>
        </div>
      </div>

      {/* Nav */}
      <div className="admin-nav">
        {[["dashboard","📊 Dashboard"],["users","👥 Users"],["subscriptions","💳 Subscriptions"],["revenue","💰 Revenue"]].map(([v,l]) => (
          <button key={v} className={`admin-nav-btn ${view===v?"active":""}`} onClick={()=>setView(v)}>{l}</button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {view === "dashboard" && (
        <div className="admin-dashboard">
          <div className="admin-stats-grid">
            <StatCard icon="👥" label="Total Users" value={stats?.total_users||0} sub={`+${stats?.new_users_today||0} today · +${stats?.new_users_week||0} this week`} color="#3b82f6"/>
            <StatCard icon="✅" label="Active Subs" value={stats?.active_subs||0} sub={`${Math.round((stats?.active_subs||0)/(stats?.total_users||1)*100)}% conversion`} color="#22c55e"/>
            <StatCard icon="💵" label="MRR" value={`$${mrr}`} sub="Monthly Recurring Revenue" color="#f59e0b"/>
            <StatCard icon="📈" label="ARR" value={`$${arr}`} sub="Annual Recurring Revenue" color="#8b5cf6"/>
            <StatCard icon="📅" label="Monthly" value={stats?.monthly_subs||0} sub="$1/month subscribers" color="#3b82f6"/>
            <StatCard icon="🗓️" label="Yearly" value={stats?.yearly_subs||0} sub="$10/year subscribers" color="#8b5cf6"/>
            <StatCard icon="♾️" label="Lifetime" value={stats?.lifetime_subs||0} sub="$50 one-time" color="#f59e0b"/>
            <StatCard icon="📋" label="Total Leads" value={stats?.total_leads||0} sub="Across all users" color="#ec4899"/>
          </div>

          {/* Revenue breakdown */}
          <div className="card admin-revenue-card">
            <h3>💰 Revenue Breakdown</h3>
            <div className="admin-rev-rows">
              {[
                { plan:"Monthly", count:stats?.monthly_subs||0, price:1, color:"#3b82f6" },
                { plan:"Yearly",  count:stats?.yearly_subs||0,  price:10/12, color:"#8b5cf6" },
                { plan:"Lifetime",count:stats?.lifetime_subs||0,price:0, color:"#f59e0b" },
              ].map(r => (
                <div key={r.plan} className="admin-rev-row">
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:12,height:12,borderRadius:3,background:r.color}}/>
                    <span>{r.plan} ({r.count} users)</span>
                  </div>
                  <span style={{fontWeight:700,color:r.color}}>
                    ${(r.count * r.price).toFixed(2)}/mo
                  </span>
                </div>
              ))}
              <div className="admin-rev-total">
                <span>Total MRR</span><span>${mrr}/month</span>
              </div>
            </div>
          </div>

          {/* Recent users */}
          <div className="card">
            <h3>🆕 Recent Signups</h3>
            <div className="admin-users-table">
              <div className="admin-table-header">
                <span>Name / Email</span><span>Role</span><span>Joined</span><span>Action</span>
              </div>
              {users.slice(0,8).map(u => (
                <div key={u.id} className="admin-table-row">
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>{u.full_name||"—"}</div>
                    <div style={{fontSize:11,color:"#94a3b8"}}>{u.email}</div>
                  </div>
                  <span className={`admin-role-badge ${u.role}`}>{u.role||"user"}</span>
                  <span style={{fontSize:11,color:"#94a3b8"}}>{new Date(u.created_at).toLocaleDateString()}</span>
                  <button className="btn-ghost" style={{fontSize:11}} onClick={()=>{setEditUser(u);setView("users");}}>Edit</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {view === "users" && (
        <div className="admin-section">
          <div className="admin-section-toolbar">
            <input className="admin-search" placeholder="🔍 Search users by name or email…"
              value={search} onChange={e=>setSearch(e.target.value)}/>
            <span className="admin-count">{filteredUsers.length} users</span>
          </div>
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div className="admin-users-table full">
              <div className="admin-table-header">
                <span>User</span><span>Role</span><span>Plan</span><span>Joined</span><span>Actions</span>
              </div>
              {filteredUsers.map(u => {
                const userSub = subs.find(s => s.user_id === u.id && s.status === "active");
                const isEditing = editUser?.id === u.id;
                return (
                  <div key={u.id} className={`admin-table-row ${isEditing?"editing":""}`}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{u.full_name||"No name"}</div>
                      <div style={{fontSize:11,color:"#64748b"}}>{u.email}</div>
                    </div>
                    <div>
                      <select className="admin-role-select"
                        value={u.role||"user"}
                        onChange={e=>updateUserRole(u.id,e.target.value)}>
                        {["user","admin","superadmin"].map(r=><option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      {userSub ? (
                        <span style={{background:PLAN_COLOR[userSub.plan]+"20",color:PLAN_COLOR[userSub.plan],fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:5}}>
                          {userSub.plan}
                        </span>
                      ) : <span style={{fontSize:11,color:"#94a3b8"}}>free</span>}
                    </div>
                    <span style={{fontSize:11,color:"#94a3b8"}}>{new Date(u.created_at).toLocaleDateString()}</span>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <select className="admin-grant-select"
                        defaultValue=""
                        onChange={e=>{ if(e.target.value){ grantSubscription(u.id,e.target.value); e.target.value=""; }}}>
                        <option value="" disabled>Grant plan…</option>
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

      {/* ── SUBSCRIPTIONS ── */}
      {view === "subscriptions" && (
        <div className="admin-section">
          <div className="admin-section-toolbar">
            <h3 style={{fontSize:16,fontWeight:700}}>{subs.length} total subscriptions</h3>
          </div>
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div className="admin-subs-table">
              <div className="admin-table-header">
                <span>User</span><span>Plan</span><span>Status</span><span>Started</span><span>Expires</span><span>Action</span>
              </div>
              {subs.map(s => (
                <div key={s.id} className="admin-table-row">
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{s.profiles?.full_name||"—"}</div>
                    <div style={{fontSize:11,color:"#94a3b8"}}>{s.profiles?.email}</div>
                  </div>
                  <span style={{background:PLAN_COLOR[s.plan]+"20",color:PLAN_COLOR[s.plan],fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:5}}>{s.plan}</span>
                  <span className={`admin-sub-status ${s.status}`}>{s.status}</span>
                  <span style={{fontSize:11,color:"#64748b"}}>{new Date(s.started_at).toLocaleDateString()}</span>
                  <span style={{fontSize:11,color:"#64748b"}}>{s.expires_at?new Date(s.expires_at).toLocaleDateString():"Never"}</span>
                  {s.status==="active" && (
                    <button className="btn-ghost" style={{fontSize:11,color:"#ef4444"}}
                      onClick={()=>cancelSubscription(s.id)}>Cancel</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── REVENUE ── */}
      {view === "revenue" && (
        <div className="admin-section">
          <div className="admin-stats-grid">
            <StatCard icon="💵" label="Monthly MRR"    value={`$${mrr}`}          sub="Monthly Recurring Revenue" color="#22c55e"/>
            <StatCard icon="📈" label="Annual ARR"     value={`$${arr}`}           sub="Annual Recurring Revenue"  color="#3b82f6"/>
            <StatCard icon="📅" label="Monthly Users"  value={stats?.monthly_subs||0}  sub={`$${(stats?.monthly_subs||0)*1}/mo`} color="#3b82f6"/>
            <StatCard icon="🗓️" label="Yearly Users"   value={stats?.yearly_subs||0}   sub={`$${(stats?.yearly_subs||0)*10}/yr`} color="#8b5cf6"/>
            <StatCard icon="♾️" label="Lifetime Users" value={stats?.lifetime_subs||0} sub={`$${(stats?.lifetime_subs||0)*50} total`} color="#f59e0b"/>
            <StatCard icon="💰" label="Total Revenue"  value={`$${((stats?.monthly_subs||0)*1+(stats?.yearly_subs||0)*10+(stats?.lifetime_subs||0)*50).toFixed(0)}`} sub="All time (est.)" color="#ef4444"/>
          </div>
          <div className="card admin-revenue-guide">
            <h3>📋 Revenue Growth Plan</h3>
            <div className="admin-guide-rows">
              <div className="admin-guide-row"><span>To reach $100 MRR</span><span>Need 100 monthly OR 10 yearly users</span></div>
              <div className="admin-guide-row"><span>To reach $500 MRR</span><span>Need 500 monthly OR 50 yearly users</span></div>
              <div className="admin-guide-row"><span>To reach $1,000 MRR</span><span>Need 1,000 monthly OR 100 yearly users</span></div>
              <div className="admin-guide-row"><span>Your current MRR</span><span style={{color:"#22c55e",fontWeight:700}}>${mrr}/month</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
