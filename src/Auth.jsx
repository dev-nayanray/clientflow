// src/Auth.jsx
// ── Authentication UI ─────────────────────────────────────────────────────────
import { useState } from "react";
import { signIn, signUp, signInWithGoogle, resetPassword } from "./supabase";

export default function AuthPage({ onAuth }) {
  const [mode, setMode]       = useState("login"); // login | signup | reset
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [name, setName]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [message, setMessage] = useState("");
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit() {
    if (!email) { setError("Email is required."); return; }
    setLoading(true); setError(""); setMessage("");
    try {
      if (mode === "login") {
        if (!password) { setError("Password is required."); setLoading(false); return; }
        const data = await signIn(email, password);
        onAuth(data.session, data.user);
      } else if (mode === "signup") {
        if (!password || password.length < 6) { setError("Password must be at least 6 characters."); setLoading(false); return; }
        await signUp(email, password, name);
        setMessage("✅ Account created! Check your email to confirm, then log in.");
        setMode("login");
      } else if (mode === "reset") {
        await resetPassword(email);
        setMessage("✅ Password reset email sent. Check your inbox.");
      }
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true); setError("");
    try { await signInWithGoogle(); }
    catch (e) { setError(e.message); setLoading(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <span className="auth-logo-icon">⚡</span>
          <div>
            <div className="auth-logo-name">ClientFlow AI</div>
            <div className="auth-logo-sub">Your complete client acquisition system</div>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="auth-tabs">
          <button className={`auth-tab ${mode==="login"?"active":""}`} onClick={()=>{setMode("login");setError("");setMessage("");}}>Sign In</button>
          <button className={`auth-tab ${mode==="signup"?"active":""}`} onClick={()=>{setMode("signup");setError("");setMessage("");}}>Sign Up</button>
        </div>

        {/* Google OAuth */}
        {mode !== "reset" && (
          <button className="auth-google-btn" onClick={handleGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.5 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.5 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.6-3.2-11.3-7.8l-6.5 5C9.6 39.5 16.3 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.9 2.4-2.5 4.5-4.5 5.9l6.2 5.2C42 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-3.9z"/></svg>
            Continue with Google
          </button>
        )}

        {mode !== "reset" && <div className="auth-divider"><span>or</span></div>}

        {/* Form */}
        <div className="auth-form">
          {mode === "signup" && (
            <div className="auth-field">
              <label>👤 Full Name</label>
              <input type="text" placeholder="Rubel Ahmed" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
            </div>
          )}
          <div className="auth-field">
            <label>📧 Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
          </div>
          {mode !== "reset" && (
            <div className="auth-field">
              <label>🔒 Password</label>
              <div className="auth-pass-wrap">
                <input type={showPass?"text":"password"} placeholder={mode==="signup"?"Min 6 characters":"Your password"} value={password} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
                <button className="auth-pass-toggle" onClick={()=>setShowPass(!showPass)}>{showPass?"🙈":"👁"}</button>
              </div>
            </div>
          )}

          {error   && <div className="auth-error">❌ {error}</div>}
          {message && <div className="auth-success">{message}</div>}

          <button className="auth-submit-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? "⏳ Please wait…" : mode==="login" ? "🚀 Sign In" : mode==="signup" ? "✅ Create Account" : "📧 Send Reset Email"}
          </button>

          {mode === "login" && (
            <button className="auth-link" onClick={()=>{setMode("reset");setError("");setMessage("");}}>
              Forgot password?
            </button>
          )}
          {mode === "reset" && (
            <button className="auth-link" onClick={()=>{setMode("login");setError("");setMessage("");}}>
              ← Back to sign in
            </button>
          )}
        </div>

        {/* Features preview */}
        <div className="auth-features">
          <div className="auth-feature">✅ Real lead finder (LinkedIn, Apollo, Hunter.io)</div>
          <div className="auth-feature">✅ AI email writer + Gmail send</div>
          <div className="auth-feature">✅ CRM pipeline with kanban</div>
          <div className="auth-feature">✅ Portfolio & proposal generator</div>
          <div className="auth-feature">✅ Full project manager + invoicing</div>
        </div>
      </div>
    </div>
  );
}
