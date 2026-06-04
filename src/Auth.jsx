// src/Auth.jsx — Fixed auth with email confirm handling + landing page
import { useState, useEffect } from "react";
import { signIn, signUp, signInWithGoogle, resetPassword } from "./supabase";

// ── Landing Page Component ───────────────────────────────────────────────────
function LandingPage({ onGetStarted, onSignIn, onDemo }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const features = [
    { icon: "🎯", title: "Real Lead Finder", desc: "Find verified contacts via Hunter.io, Apollo.io, Google Places, or import your own CSV. No fake AI data.", color: "#3b82f6" },
    { icon: "🤖", title: "AI-Powered Outreach", desc: "Claude AI writes personalized cold emails, LinkedIn DMs, follow-up sequences and proposals automatically.", color: "#8b5cf6" },
    { icon: "📧", title: "Gmail Send Integration", desc: "Send emails directly from the app through your Gmail account — with your approval before each send.", color: "#ec4899" },
    { icon: "👥", title: "CRM Pipeline", desc: "Track every lead from New to Won with kanban board, reminders, activity log and notes.", color: "#f59e0b" },
    { icon: "📁", title: "Portfolio Generator", desc: "Turn past projects into case studies, HTML portfolio pages, LinkedIn posts and outreach emails in one click.", color: "#22c55e" },
    { icon: "🎯", title: "Freelance Proposals", desc: "Win more Upwork and Fiverr jobs with AI-written proposals, gig listings and profile rewrites.", color: "#ef4444" },
    { icon: "🗂️", title: "Project Manager", desc: "Manage tasks, milestones, invoices and time tracking for every client you win.", color: "#0ea5e9" },
    { icon: "📊", title: "Google Sheets Sync", desc: "All leads, workflows and client data automatically synced to your Google Sheets in real time.", color: "#14b8a6" },
  ];

  const stats = [
    { value: "10+", label: "Lead Sources" },
    { value: "25+", label: "AI Automations" },
    { value: "11", label: "Power Tools" },
    { value: "5min", label: "To First Lead" },
  ];

  const testimonials = [
    { name: "Sarah K.", role: "Freelance Developer", text: "Got 3 clients in my first week using ClientFlow. The AI proposal writer alone paid for a year of subscriptions.", avatar: "S" },
    { name: "Marco R.", role: "Digital Agency Owner", text: "Replaced 4 separate tools with this one app. The CRM pipeline and invoice system are exactly what I needed.", avatar: "M" },
    { name: "Priya T.", role: "SEO Consultant", text: "The real lead finder with Hunter.io integration saves me hours every week. Worth every penny.", avatar: "P" },
  ];

  const PLANS = [
    { name: "Monthly", price: "$1", period: "/month", color: "#3b82f6", badge: null, features: ["All lead finder tools", "AI email + Gmail send", "CRM pipeline", "Portfolio generator", "Project manager", "Cancel anytime"] },
    { name: "Yearly", price: "$10", period: "/year", color: "#8b5cf6", badge: "BEST VALUE", features: ["Everything in Monthly", "Save 17% vs monthly", "Priority support", "Early access features"] },
    { name: "Lifetime", price: "$50", period: " once", color: "#f59e0b", badge: "BEST DEAL", features: ["Everything in Yearly", "Pay once, use forever", "All future updates", "Commercial license"] },
  ];

  return (
    <div className="landing">
      {/* NAV */}
      <nav className={`landing-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <span className="landing-logo-icon">⚡</span>
            <span className="landing-logo-name">ClientFlow AI</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#testimonials">Reviews</a>
          </div>
          <div className="landing-nav-cta">
            <button className="landing-nav-signin" onClick={onSignIn}>Sign In</button>
            <button className="landing-nav-start" onClick={onGetStarted}>Start Free →</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="landing-hero-badge">🚀 AI-Powered Client Acquisition System</div>
        <h1 className="landing-hero-title">
          Get More Clients.<br/>
          <span className="landing-hero-gradient">On Autopilot.</span>
        </h1>
        <p className="landing-hero-sub">
          Find real leads, write AI emails, manage your pipeline, send proposals and invoice clients — all in one tool. From $1/month.
        </p>
        <div className="landing-hero-cta">
          <button className="landing-cta-primary" onClick={onGetStarted}>
            🚀 Start Free Today
          </button>
          <button className="landing-cta-demo" onClick={onDemo}>
            👁 Watch Demo →
          </button>
        </div>
        <div className="landing-hero-stats">
          {stats.map((s, i) => (
            <div key={i} className="landing-stat">
              <div className="landing-stat-val">{s.value}</div>
              <div className="landing-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* App Preview */}
        <div className="landing-app-preview">
          <div className="preview-bar">
            <span className="preview-dot red"/><span className="preview-dot yellow"/><span className="preview-dot green"/>
            <span className="preview-url">app.clientflow.ai</span>
          </div>
          <div className="preview-content">
            <div className="preview-sidebar">
              {["⚙️ Setup","📥 Real Leads","🚀 Workflow","👥 Pipeline","📁 Portfolio","🗂️ Projects"].map((t,i) => (
                <div key={i} className={`preview-tab ${i===2?"active":""}`}>{t}</div>
              ))}
            </div>
            <div className="preview-main">
              <div className="preview-header-bar">
                <div className="preview-title">🚀 Full Workflow</div>
                <div className="preview-run-btn">▶ Run Workflow</div>
              </div>
              <div className="preview-stages">
                {["🔍 Find Lead","✉️ Email","🔁 Follow Up","📄 Proposal","📅 Meeting"].map((s,i) => (
                  <div key={i} className={`preview-stage ${i<3?"done":i===3?"active":""}`}>{s}</div>
                ))}
              </div>
              <div className="preview-log">
                <div className="preview-log-line">[10:23:01] ✅ Found 5 leads for E-commerce in United States</div>
                <div className="preview-log-line">[10:23:08] ✅ Outreach email drafted for Acme Store</div>
                <div className="preview-log-line active-log">[10:23:15] ⏳ Building 3-email follow-up sequence…</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="landing-workflow">
        <div className="landing-section-badge">How It Works</div>
        <h2 className="landing-section-title">From zero to client in 5 minutes</h2>
        <div className="landing-steps">
          {[
            { n:"01", icon:"🔍", title:"Find Real Leads", desc:"Search Hunter.io, Apollo.io, Google Places or paste your CSV. Get verified emails instantly." },
            { n:"02", icon:"🤖", title:"AI Writes Outreach", desc:"Claude AI personalizes cold emails, DMs and proposals for each lead automatically." },
            { n:"03", icon:"📧", title:"Send With Approval", desc:"Review every message before it goes out. Send directly through your Gmail account." },
            { n:"04", icon:"👥", title:"Track In Pipeline", desc:"Every lead moves through your kanban from Contacted → Replied → Meeting → Won." },
            { n:"05", icon:"💵", title:"Invoice & Deliver", desc:"Create professional invoices, track time, manage tasks and deliver projects on time." },
          ].map((s, i) => (
            <div key={i} className="landing-step">
              <div className="landing-step-num">{s.n}</div>
              <div className="landing-step-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              {i < 4 && <div className="landing-step-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="landing-features" id="features">
        <div className="landing-section-badge">Features</div>
        <h2 className="landing-section-title">Everything you need to win clients</h2>
        <p className="landing-section-sub">11 powerful tools in one app — replacing tools that cost $200+/month</p>
        <div className="landing-features-grid">
          {features.map((f, i) => (
            <div key={i} className="landing-feature-card">
              <div className="landing-feature-icon" style={{ background: f.color + "20", color: f.color }}>{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARISON */}
      <section className="landing-compare">
        <div className="landing-section-badge">vs The Alternatives</div>
        <h2 className="landing-section-title">Replace $200+/month of tools</h2>
        <div className="landing-compare-table">
          <div className="compare-header">
            <div>Tool</div><div>Their Price</div><div>ClientFlow</div>
          </div>
          {[
            ["Hunter.io (email finder)", "$49/mo", "✅ Included"],
            ["Apollo.io (lead search)", "$49/mo", "✅ Included"],
            ["Close CRM (pipeline)", "$29/mo", "✅ Included"],
            ["Calendly (meetings)", "$10/mo", "✅ Included"],
            ["Bonsai (invoicing)", "$24/mo", "✅ Included"],
            ["Copy.ai (email writing)", "$49/mo", "✅ Included"],
          ].map(([tool, price, cf], i) => (
            <div key={i} className="compare-row">
              <div>{tool}</div>
              <div className="compare-price">{price}</div>
              <div className="compare-cf">{cf}</div>
            </div>
          ))}
          <div className="compare-total">
            <div><strong>Total if bought separately</strong></div>
            <div className="compare-price-total">$210/mo</div>
            <div className="compare-cf-total">$1/mo ⚡</div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="landing-testimonials" id="testimonials">
        <div className="landing-section-badge">Reviews</div>
        <h2 className="landing-section-title">Loved by freelancers & agencies</h2>
        <div className="landing-testimonials-grid">
          {testimonials.map((t, i) => (
            <div key={i} className="landing-testimonial">
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">{t.avatar}</div>
                <div><div className="testimonial-name">{t.name}</div><div className="testimonial-role">{t.role}</div></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="landing-pricing" id="pricing">
        <div className="landing-section-badge">Pricing</div>
        <h2 className="landing-section-title">Simple, honest pricing</h2>
        <p className="landing-section-sub">Start for $1/month. No hidden fees. Cancel anytime.</p>
        <div className="landing-pricing-grid">
          {PLANS.map((p, i) => (
            <div key={i} className={`landing-plan-card ${p.badge ? "featured-plan" : ""}`} style={p.badge ? { borderColor: p.color } : {}}>
              {p.badge && <div className="plan-badge" style={{ background: p.color }}>{p.badge}</div>}
              <div className="plan-name">{p.name}</div>
              <div className="plan-price" style={{ color: p.color }}>{p.price}<span className="plan-period">{p.period}</span></div>
              <ul className="plan-features">
                {p.features.map((f, j) => <li key={j}><span>✓</span>{f}</li>)}
              </ul>
              <button className="plan-cta" style={{ background: p.color }} onClick={onGetStarted}>
                Get Started →
              </button>
            </div>
          ))}
        </div>
        <div className="landing-guarantee">🔒 30-day money-back guarantee · Secure payment · Cancel anytime</div>
      </section>

      {/* FINAL CTA */}
      <section className="landing-final-cta">
        <h2>Ready to get your next client today?</h2>
        <p>Join freelancers and agencies already using ClientFlow AI</p>
        <button className="landing-cta-primary large" onClick={onGetStarted}>
          🚀 Start Free — From $1/month
        </button>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-logo">
            <span>⚡</span><span className="landing-logo-name">ClientFlow AI</span>
          </div>
          <div className="landing-footer-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="mailto:support@clientflow.ai">Support</a>
          </div>
          <div className="landing-footer-copy">© 2025 ClientFlow AI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

// ── Auth Page Component ───────────────────────────────────────────────────────
function AuthCard({ onAuth, defaultMode = "login", onBack }) {
  const [mode, setMode]     = useState(defaultMode);
  const [email, setEmail]   = useState("");
  const [password, setPass] = useState("");
  const [name, setName]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [message, setMessage] = useState("");
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) { setError("Email is required."); return; }
    setLoading(true); setError(""); setMessage("");
    try {
      if (mode === "login") {
        if (!password) { setError("Password is required."); setLoading(false); return; }
        const data = await signIn(email.trim(), password);
        if (data?.session) {
          onAuth(data.session, data.user);
        } else {
          setError("Login failed. Please check your credentials.");
        }
      } else if (mode === "signup") {
        if (!password || password.length < 6) { setError("Password must be at least 6 characters."); setLoading(false); return; }
        const data = await signUp(email.trim(), password, name);
        // Check if email confirmation needed
        if (data?.user && !data?.session) {
          setMessage("✅ Account created! Check your email and click the confirmation link, then sign in.");
          setMode("login");
        } else if (data?.session) {
          // Auto-confirmed (email confirm disabled in Supabase)
          onAuth(data.session, data.user);
        } else {
          setMessage("✅ Check your email to confirm your account, then sign in here.");
          setMode("login");
        }
      } else if (mode === "reset") {
        await resetPassword(email.trim());
        setMessage("✅ Password reset email sent! Check your inbox.");
      }
    } catch (e) {
      const msg = e.message || "";
      // User-friendly error messages
      if (msg.includes("Email not confirmed"))
        setError("Please confirm your email first. Check your inbox for the confirmation link.");
      else if (msg.includes("Invalid login credentials"))
        setError("Wrong email or password. Try again or reset your password.");
      else if (msg.includes("User already registered"))
        setError("This email is already registered. Sign in instead.");
      else if (msg.includes("Password should be"))
        setError("Password must be at least 6 characters.");
      else if (msg.includes("Unable to validate"))
        setError("Connection error. Check your internet and try again.");
      else
        setError(msg || "Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true); setError("");
    try { await signInWithGoogle(); }
    catch (e) {
      setError("Google sign-in failed. Make sure Google OAuth is enabled in your Supabase project.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {onBack && (
          <button className="auth-back-btn" onClick={onBack}>← Back to home</button>
        )}
        <div className="auth-logo">
          <span className="auth-logo-icon">⚡</span>
          <div>
            <div className="auth-logo-name">ClientFlow AI</div>
            <div className="auth-logo-sub">Complete client acquisition system</div>
          </div>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${mode==="login"?"active":""}`} onClick={()=>{setMode("login");setError("");setMessage("");}}>Sign In</button>
          <button className={`auth-tab ${mode==="signup"?"active":""}`} onClick={()=>{setMode("signup");setError("");setMessage("");}}>Sign Up</button>
        </div>

        {mode !== "reset" && (
          <>
            <button className="auth-google-btn" onClick={handleGoogle} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.5 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.5 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.6-3.2-11.3-7.8l-6.5 5C9.6 39.5 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.9 2.4-2.5 4.5-4.5 5.9l6.2 5.2C42 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-3.9z"/>
              </svg>
              Continue with Google
            </button>
            <div className="auth-divider"><span>or continue with email</span></div>
          </>
        )}

        <div className="auth-form">
          {mode === "signup" && (
            <div className="auth-field">
              <label>👤 Full Name</label>
              <input type="text" placeholder="Your full name" value={name}
                onChange={e=>setName(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
            </div>
          )}
          <div className="auth-field">
            <label>📧 Email Address</label>
            <input type="email" placeholder="you@example.com" value={email}
              onChange={e=>setEmail(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
          </div>
          {mode !== "reset" && (
            <div className="auth-field">
              <label>🔒 Password</label>
              <div className="auth-pass-wrap">
                <input type={showPass?"text":"password"}
                  placeholder={mode==="signup"?"At least 6 characters":"Your password"}
                  value={password}
                  onChange={e=>setPass(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
                <button className="auth-pass-toggle" onClick={()=>setShowPass(s=>!s)} type="button">
                  {showPass?"🙈":"👁"}
                </button>
              </div>
            </div>
          )}

          {error   && <div className="auth-error">❌ {error}</div>}
          {message && <div className="auth-success">{message}</div>}

          <button className="auth-submit-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "⏳ Please wait…"
              : mode==="login" ? "🚀 Sign In"
              : mode==="signup" ? "✅ Create Free Account"
              : "📧 Send Reset Link"}
          </button>

          <div className="auth-bottom-links">
            {mode==="login" && (
              <button className="auth-link" onClick={()=>{setMode("reset");setError("");setMessage("");}}>
                Forgot password?
              </button>
            )}
            {mode==="signup" && (
              <p className="auth-terms">By signing up you agree to our Terms of Service</p>
            )}
            {mode==="reset" && (
              <button className="auth-link" onClick={()=>{setMode("login");setError("");setMessage("");}}>
                ← Back to sign in
              </button>
            )}
          </div>
        </div>

        <div className="auth-features">
          <div className="auth-features-title">What you get:</div>
          {["Real lead finder (Hunter.io, Apollo, Places)","AI email writer + Gmail send","CRM pipeline + reminders","Portfolio & proposal generator","Project manager + invoicing"].map((f,i) => (
            <div key={i} className="auth-feature">✅ {f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Export — handles landing/auth routing ───────────────────────────────
export default function AuthPage({ onAuth }) {
  const [view, setView] = useState("landing"); // landing | login | signup

  if (view === "landing") {
    return (
      <LandingPage
        onGetStarted={() => setView("signup")}
        onSignIn={() => setView("login")}
        onDemo={() => {
          // Demo mode: sign in with demo account
          onAuth({ access_token: "demo", user: { id: "demo", email: "demo@clientflow.ai", user_metadata: { full_name: "Demo User" } } },
            { id: "demo", email: "demo@clientflow.ai", user_metadata: { full_name: "Demo User" } });
        }}
      />
    );
  }

  return (
    <AuthCard
      onAuth={onAuth}
      defaultMode={view}
      onBack={() => setView("landing")}
    />
  );
}
