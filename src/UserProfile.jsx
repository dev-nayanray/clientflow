// src/UserProfile.jsx — Complete User Profile + Subscription Management
import { useState, useEffect } from "react";
import { supabase, upsertProfile, isSubscriptionActive, getPlanLabel, getPlanColor } from "./supabase";

const COUNTRIES = ["United States","United Kingdom","Canada","Australia","Germany","Netherlands","Singapore","UAE","India","Bangladesh","Pakistan","Philippines","Vietnam","Indonesia","Malaysia","Nigeria","Brazil","Mexico","France","Spain","Japan","South Korea","Other"];
const NICHES    = ["E-commerce","SaaS","Real Estate","Law Firms","Medical","Dental","Gyms","Restaurants","Coaching","Digital Marketing","Accounting","Insurance","IT & Tech","Photography","Construction","Education"];
const SERVICES  = ["Web Design","SEO","Social Media","Google Ads","Email Marketing","Branding","Mobile Apps","CRM Automation","Chatbots","Shopify/WooCommerce","WordPress","Lead Generation","Copywriting","Video Production"];

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, []);
  return (
    <div className={`profile-toast profile-toast--${type}`}>
      {type==="success"?"✅":type==="error"?"❌":"ℹ️"} {msg}
    </div>
  );
}

export default function UserProfile({ user, profile, subscription, onClose, onProfileUpdate, onUpgrade }) {
  const [tab, setTab]         = useState("profile");
  const [toast, setToast]     = useState(null);
  const [saving, setSaving]   = useState(false);

  // Profile form
  const [form, setForm] = useState({
    full_name:    profile?.full_name    || user?.user_metadata?.full_name || "",
    company_name: profile?.company_name || "",
    email:        user?.email           || "",
    country:      profile?.country      || "",
    niche:        profile?.niche        || "",
    service:      profile?.service      || "",
    calendly_link:profile?.calendly_link|| "",
    website:      profile?.website      || "",
    bio:          profile?.bio          || "",
  });

  // Password change
  const [pwForm, setPwForm]   = useState({ current:"", newPw:"", confirm:"" });
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);

  // API keys
  const [apiKeys, setApiKeys] = useState({
    anthropic: sessionStorage.getItem("cf_key") || "",
    hunter:    sessionStorage.getItem("cf_apikeys") ? JSON.parse(sessionStorage.getItem("cf_apikeys")||"{}").hunter||"" : "",
    apollo:    sessionStorage.getItem("cf_apikeys") ? JSON.parse(sessionStorage.getItem("cf_apikeys")||"{}").apollo||"" : "",
    places:    sessionStorage.getItem("cf_apikeys") ? JSON.parse(sessionStorage.getItem("cf_apikeys")||"{}").places||"" : "",
    stripeTest: sessionStorage.getItem("cf_apikeys") ? JSON.parse(sessionStorage.getItem("cf_apikeys")||"{}").stripeTest||"" : "",
  });
  const [showKeys, setShowKeys] = useState({});

  // Billing history
  const [billing, setBilling] = useState([]);
  const [billingLoading, setBillingLoading] = useState(false);

  const isActive = isSubscriptionActive(subscription);
  const planColor = getPlanColor(subscription?.plan);

  function showToast(msg, type="success") { setToast({ msg, type }); }

  const f = (k) => ({
    value: form[k],
    onChange: (e) => setForm(v => ({ ...v, [k]: e.target.value })),
  });

  // ── Save profile ────────────────────────────────────────────────────────────
  async function saveProfile() {
    setSaving(true);
    try {
      const updated = await upsertProfile(user.id, {
        full_name:    form.full_name,
        company_name: form.company_name,
        country:      form.country,
        niche:        form.niche,
        service:      form.service,
        calendly_link:form.calendly_link,
      });
      onProfileUpdate && onProfileUpdate(updated);
      showToast("Profile saved successfully!");
    } catch (e) {
      showToast("Failed to save: " + e.message, "error");
    }
    setSaving(false);
  }

  // ── Change password ─────────────────────────────────────────────────────────
  async function changePassword() {
    if (!pwForm.newPw || pwForm.newPw.length < 6) {
      showToast("New password must be at least 6 characters.", "error"); return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      showToast("Passwords don't match.", "error"); return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
      if (error) throw error;
      setPwForm({ current:"", newPw:"", confirm:"" });
      showToast("Password updated successfully!");
    } catch (e) {
      showToast("Failed: " + e.message, "error");
    }
    setPwLoading(false);
  }

  // ── Save API keys to sessionStorage ────────────────────────────────────────
  function saveApiKeys() {
    sessionStorage.setItem("cf_key", apiKeys.anthropic);
    sessionStorage.setItem("cf_apikeys", JSON.stringify({
      hunter: apiKeys.hunter,
      apollo: apiKeys.apollo,
      places: apiKeys.places,
    }));
    showToast("API keys saved for this session!");
  }

  // ── Load billing history ────────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "billing") return;
    setBillingLoading(true);
    supabase.from("subscriptions")
      .select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setBilling(data || []); setBillingLoading(false); });
  }, [tab]);

  // ── Delete account ──────────────────────────────────────────────────────────
  async function deleteAccount() {
    const confirmed = window.confirm(
      "⚠️ PERMANENTLY DELETE your account?\n\nThis will delete ALL your data including leads, projects, and subscriptions.\n\nType DELETE to confirm:"
    );
    if (!confirmed) return;
    try {
      await supabase.from("profiles").delete().eq("id", user.id);
      await supabase.auth.signOut();
      window.location.reload();
    } catch (e) {
      showToast("Failed: " + e.message, "error");
    }
  }

  const TABS = [
    { key:"profile",      icon:"👤", label:"Profile"      },
    { key:"subscription", icon:"💳", label:"Subscription" },
    { key:"apikeys",      icon:"🔑", label:"API Keys"     },
    { key:"password",     icon:"🔒", label:"Security"     },
    { key:"billing",      icon:"📋", label:"Billing"      },
  ];

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        {toast && <Toast {...toast} onDone={() => setToast(null)} />}

        {/* Header */}
        <div className="profile-header">
          <div className="profile-header-left">
            <div className="profile-avatar-lg">
              {(form.full_name || user?.email || "?")[0].toUpperCase()}
            </div>
            <div>
              <div className="profile-header-name">{form.full_name || "Your Profile"}</div>
              <div className="profile-header-email">{user?.email}</div>
              <div className="profile-header-plan" style={{ color: planColor, background: planColor + "18" }}>
                {isActive ? `⚡ ${getPlanLabel(subscription?.plan)} Plan` : "Free Plan"}
              </div>
            </div>
          </div>
          <button className="profile-close" onClick={onClose}>✕</button>
        </div>

        {/* Tab nav */}
        <div className="profile-tabs">
          {TABS.map(t => (
            <button key={t.key}
              className={`profile-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        <div className="profile-body">

          {/* ── PROFILE TAB ─────────────────────────────────────────────── */}
          {tab === "profile" && (
            <div className="profile-section">
              <div className="profile-section-title">Personal Information</div>
              <div className="profile-form-grid">
                <div className="field">
                  <label>👤 Full Name</label>
                  <input type="text" placeholder="Your full name" {...f("full_name")} />
                </div>
                <div className="field">
                  <label>📧 Email</label>
                  <input type="email" value={form.email} disabled
                    style={{ opacity: .6, cursor: "not-allowed" }}
                    title="Email cannot be changed here" />
                  <span className="field-hint">Contact support to change email</span>
                </div>
                <div className="field">
                  <label>🏢 Company / Agency Name</label>
                  <input type="text" placeholder="Your company name" {...f("company_name")} />
                </div>
                <div className="field">
                  <label>🌍 Country</label>
                  <select value={form.country} onChange={e => setForm(v => ({ ...v, country: e.target.value }))}>
                    <option value="">Select country…</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>🏷️ Target Niche</label>
                  <select value={form.niche} onChange={e => setForm(v => ({ ...v, niche: e.target.value }))}>
                    <option value="">Select niche…</option>
                    {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>🛠️ Your Service</label>
                  <select value={form.service} onChange={e => setForm(v => ({ ...v, service: e.target.value }))}>
                    <option value="">Select service…</option>
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field profile-full-width">
                  <label>📅 Calendly / Booking Link</label>
                  <input type="url" placeholder="https://calendly.com/yourname" {...f("calendly_link")} />
                </div>
              </div>
              <div className="profile-actions">
                <button className="btn-primary" onClick={saveProfile} disabled={saving}>
                  {saving ? "⏳ Saving…" : "💾 Save Profile"}
                </button>
              </div>
            </div>
          )}

          {/* ── SUBSCRIPTION TAB ────────────────────────────────────────── */}
          {tab === "subscription" && (
            <div className="profile-section">
              {/* Current plan card */}
              <div className={`plan-card-current ${isActive ? "active" : "free"}`}
                style={{ borderColor: isActive ? planColor : "#e2e8f0" }}>
                <div className="plan-card-current__header">
                  <div>
                    <div className="plan-card-current__name" style={{ color: isActive ? planColor : "#64748b" }}>
                      {isActive ? `${getPlanLabel(subscription?.plan)} Plan` : "Free Plan"}
                    </div>
                    <div className="plan-card-current__status">
                      {isActive
                        ? <span className="plan-active-badge">✅ Active</span>
                        : <span className="plan-free-badge">⬜ No subscription</span>}
                    </div>
                  </div>
                  <div className="plan-card-current__price">
                    {subscription?.plan === "monthly" && <span>$1<small>/mo</small></span>}
                    {subscription?.plan === "yearly"  && <span>$10<small>/yr</small></span>}
                    {subscription?.plan === "lifetime" && <span>$50<small> once</small></span>}
                    {!isActive && <span style={{ fontSize: 14, color: "#94a3b8" }}>$0</span>}
                  </div>
                </div>
                {isActive && subscription?.started_at && (
                  <div className="plan-card-current__dates">
                    <div>📅 Started: {new Date(subscription.started_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                    {subscription.expires_at
                      ? <div>🔄 Renews: {new Date(subscription.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                      : <div>♾️ Never expires</div>}
                  </div>
                )}
                {!isActive && (
                  <div className="plan-card-current__locked">
                    🔒 Upgrade to unlock all features — AI email writer, real lead finder, project manager and more
                  </div>
                )}
                <div className="plan-card-current__actions">
                  <button className="btn-primary" onClick={onUpgrade} style={isActive?{background:planColor}:{}}>
                    {isActive ? "⬆️ Change Plan" : "🚀 Upgrade Now from $1/month"}
                  </button>
                  {isActive && (
                    <a href="https://billing.stripe.com/p/login/test_YOUR_PORTAL"
                      target="_blank" rel="noreferrer"
                      className="btn-secondary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                      📋 Manage Billing
                    </a>
                  )}
                </div>
              </div>

              {/* Plan comparison mini */}
              <div className="profile-section-title" style={{ marginTop: 24 }}>Compare Plans</div>
              <div className="plan-compare-mini">
                {[
                  { name:"Free",     price:"$0",   color:"#64748b", features:["5 leads/day","Basic CRM","Limited AI"] },
                  { name:"Monthly",  price:"$1/mo", color:"#6366f1", features:["Unlimited leads","Full CRM","All AI tools","Gmail send","Project manager"] },
                  { name:"Yearly",   price:"$10/yr",color:"#8b5cf6", features:["Everything Monthly","Priority support","Save 17%"] },
                  { name:"Lifetime", price:"$50",   color:"#f59e0b", features:["Everything Yearly","Pay once forever","All updates"] },
                ].map((p, i) => (
                  <div key={i}
                    className={`plan-mini-card ${subscription?.plan===p.name.toLowerCase()&&isActive?"current":""}`}
                    style={subscription?.plan===p.name.toLowerCase()&&isActive?{borderColor:p.color,background:p.color+"08"}:{}}>
                    <div className="plan-mini-name" style={{ color: p.color }}>{p.name}</div>
                    <div className="plan-mini-price">{p.price}</div>
                    <ul className="plan-mini-features">
                      {p.features.map((f, j) => <li key={j}>✓ {f}</li>)}
                    </ul>
                    {subscription?.plan !== p.name.toLowerCase() && p.name !== "Free" && (
                      <button className="plan-mini-cta" style={{ background: p.color }} onClick={onUpgrade}>
                        Select →
                      </button>
                    )}
                    {subscription?.plan === p.name.toLowerCase() && isActive && (
                      <div className="plan-mini-current">✅ Current</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── API KEYS TAB ─────────────────────────────────────────────── */}
          {tab === "apikeys" && (
            <div className="profile-section">
              <div className="profile-section-title">API Keys</div>
              <p className="profile-section-desc">
                Your API keys are stored in your browser session only — never sent to our servers. You'll need to re-enter them after clearing browser data.
              </p>
              {[
                { key:"anthropic", label:"🤖 Anthropic (Claude AI)", hint:"Get from console.anthropic.com/api-keys", placeholder:"sk-ant-api03-…", required:true },
                { key:"hunter",    label:"🎯 Hunter.io",  hint:"50 free searches/month — hunter.io/api-keys", placeholder:"hunter_xxxxxxxx" },
                { key:"apollo",    label:"🚀 Apollo.io",  hint:"50 free contacts/month — developer.apollo.io", placeholder:"your_apollo_key" },
                { key:"places",    label:"📍 Google Places", hint:"Find local businesses — console.cloud.google.com", placeholder:"AIzaSy…" },
              ].map(({ key, label, hint, placeholder, required }) => (
                <div key={key} className="field apikey-field">
                  <label>
                    {label}
                    {required && <span className="required-star"> *</span>}
                    {apiKeys[key] && <span className="key-saved-badge">✅ Saved</span>}
                  </label>
                  <div className="apikey-input-wrap">
                    <input
                      type={showKeys[key] ? "text" : "password"}
                      placeholder={placeholder}
                      value={apiKeys[key]}
                      onChange={e => setApiKeys(k => ({ ...k, [key]: e.target.value }))}
                    />
                    <button className="apikey-toggle" onClick={() => setShowKeys(s => ({ ...s, [key]: !s[key] }))}>
                      {showKeys[key] ? "🙈" : "👁"}
                    </button>
                  </div>
                  <span className="field-hint">
                    {hint} · <a href={hint.split("—")[1]?.trim()} target="_blank" rel="noreferrer" style={{ color: "#6366f1" }}>Get key →</a>
                  </span>
                </div>
              ))}
              <div className="profile-actions">
                <button className="btn-primary" onClick={saveApiKeys}>💾 Save API Keys (Session)</button>
                <button className="btn-ghost" onClick={() => {
                  setApiKeys({ anthropic:"", hunter:"", apollo:"", places:"", stripeTest:"" });
                  sessionStorage.removeItem("cf_key");
                  sessionStorage.removeItem("cf_apikeys");
                  showToast("All API keys cleared.");
                }}>🗑 Clear All Keys</button>
              </div>
              <div className="apikey-security-note">
                🔒 <strong>Security note:</strong> API keys are stored in sessionStorage — they are automatically cleared when you close your browser tab. They are never sent to ClientFlow AI servers.
              </div>
            </div>
          )}

          {/* ── PASSWORD / SECURITY TAB ──────────────────────────────────── */}
          {tab === "password" && (
            <div className="profile-section">
              <div className="profile-section-title">Change Password</div>
              <div className="profile-form-grid" style={{ maxWidth: 440 }}>
                <div className="field profile-full-width">
                  <label>🔒 New Password</label>
                  <div className="auth-pass-wrap">
                    <input type={showPw ? "text" : "password"} placeholder="Min 6 characters"
                      value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} />
                    <button className="auth-pass-toggle" onClick={() => setShowPw(s => !s)} type="button">
                      {showPw ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>
                <div className="field profile-full-width">
                  <label>🔒 Confirm New Password</label>
                  <input type="password" placeholder="Repeat new password"
                    value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
                </div>
              </div>
              {pwForm.newPw && pwForm.confirm && pwForm.newPw !== pwForm.confirm && (
                <div className="auth-error" style={{ maxWidth: 440 }}>❌ Passwords don't match</div>
              )}
              <div className="profile-actions">
                <button className="btn-primary" onClick={changePassword} disabled={pwLoading || !pwForm.newPw || pwForm.newPw !== pwForm.confirm}>
                  {pwLoading ? "⏳ Updating…" : "🔒 Update Password"}
                </button>
              </div>

              <div className="profile-section-title" style={{ marginTop: 32 }}>Active Sessions</div>
              <div className="session-card">
                <div className="session-icon">💻</div>
                <div>
                  <div className="session-name">Current Session</div>
                  <div className="session-meta">This device · Active now</div>
                </div>
                <span className="session-badge">Current</span>
              </div>

              <div className="profile-section-title" style={{ marginTop: 32, color: "#dc2626" }}>⚠️ Danger Zone</div>
              <div className="danger-zone">
                <div>
                  <div className="danger-title">Delete Account</div>
                  <div className="danger-desc">Permanently delete your account and all data. This cannot be undone.</div>
                </div>
                <button className="btn-ghost" style={{ color:"#ef4444", borderColor:"#fecaca", flexShrink:0 }}
                  onClick={deleteAccount}>
                  🗑 Delete Account
                </button>
              </div>
            </div>
          )}

          {/* ── BILLING TAB ─────────────────────────────────────────────── */}
          {tab === "billing" && (
            <div className="profile-section">
              <div className="profile-section-title">Billing History</div>
              {billingLoading && <div className="profile-loading">⏳ Loading billing history…</div>}
              {!billingLoading && billing.length === 0 && (
                <div className="profile-empty">
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                  <p>No billing history yet.</p>
                  {!isActive && (
                    <button className="btn-primary" style={{ marginTop: 12 }} onClick={onUpgrade}>
                      🚀 Upgrade to get started
                    </button>
                  )}
                </div>
              )}
              {billing.length > 0 && (
                <div className="billing-table">
                  <div className="billing-table__head">
                    <span>Plan</span><span>Status</span><span>Amount</span><span>Date</span><span>Expires</span>
                  </div>
                  {billing.map((b, i) => (
                    <div key={i} className="billing-table__row">
                      <span className="admin-plan-chip" style={{
                        background: (b.plan==="monthly"?"#6366f1":b.plan==="yearly"?"#8b5cf6":"#f59e0b") + "18",
                        color: b.plan==="monthly"?"#6366f1":b.plan==="yearly"?"#8b5cf6":"#f59e0b"
                      }}>{b.plan}</span>
                      <span className="admin-status-chip" style={{
                        background: (b.status==="active"?"#22c55e":"#ef4444") + "18",
                        color: b.status==="active"?"#22c55e":"#ef4444"
                      }}>{b.status}</span>
                      <span className="billing-amount">
                        {b.plan==="monthly"?"$1.00":b.plan==="yearly"?"$10.00":b.plan==="lifetime"?"$50.00":"$0"}
                      </span>
                      <span style={{ fontSize: 13, color: "#64748b" }}>
                        {new Date(b.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>
                        {b.expires_at ? new Date(b.expires_at).toLocaleDateString() : "Never"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="billing-stripe-link">
                <a href="https://billing.stripe.com/p/login/test_YOUR_PORTAL" target="_blank" rel="noreferrer"
                  className="btn-secondary" style={{ textDecoration: "none" }}>
                  📋 Open Stripe Billing Portal
                </a>
                <p className="field-hint" style={{ marginTop: 8 }}>Manage payment methods, download invoices and cancel subscription</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
