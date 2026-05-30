// src/Subscription.jsx
// ── Subscription / Pricing System ─────────────────────────────────────────────
import { useState } from "react";
// Stripe loaded lazily — app works without it
import { createSubscription, isSubscriptionActive, getPlanLabel, getPlanColor } from "./supabase";

// ── Stripe config ─────────────────────────────────────────────────────────────
// Replace with your own Stripe publishable key from https://dashboard.stripe.com/apikeys
const STRIPE_PK = import.meta.env.VITE_STRIPE_PK || "pk_live_YOUR_STRIPE_PUBLISHABLE_KEY";

// Replace with your Stripe Price IDs from https://dashboard.stripe.com/products
// Create 3 products in Stripe: Monthly $1, Yearly $10, Lifetime $50
const STRIPE_PRICES = {
  monthly:  import.meta.env.VITE_STRIPE_MONTHLY  || "price_MONTHLY_PRICE_ID",
  yearly:   import.meta.env.VITE_STRIPE_YEARLY   || "price_YEARLY_PRICE_ID",
  lifetime: import.meta.env.VITE_STRIPE_LIFETIME || "price_LIFETIME_PRICE_ID",
};

// ── Plans ─────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    key: "monthly",
    name: "Monthly",
    price: "$1",
    period: "/month",
    yearlyEquiv: "$12/year",
    color: "#3b82f6",
    bg: "#eff6ff",
    icon: "📅",
    badge: null,
    features: [
      "All lead finder tools (LinkedIn, Apollo, Hunter)",
      "AI email writer + Gmail send",
      "CRM pipeline with kanban board",
      "Portfolio & case study generator",
      "Upwork/Fiverr proposal generator",
      "Project manager + invoicing",
      "Google Sheets sync",
      "Cancel anytime",
    ],
  },
  {
    key: "yearly",
    name: "Yearly",
    price: "$10",
    period: "/year",
    yearlyEquiv: "Save $2 vs monthly",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    icon: "🗓️",
    badge: "BEST VALUE",
    features: [
      "Everything in Monthly",
      "Priority email support",
      "Early access to new features",
      "Save 17% vs monthly billing",
      "Annual billing — pay once",
    ],
  },
  {
    key: "lifetime",
    name: "Lifetime",
    price: "$50",
    period: " one-time",
    yearlyEquiv: "Pay once, use forever",
    color: "#f59e0b",
    bg: "#fffbeb",
    icon: "♾️",
    badge: "BEST DEAL",
    features: [
      "Everything in Yearly",
      "Lifetime access — no renewals",
      "All future updates included",
      "Dedicated support channel",
      "Commercial use license",
      "White-label option (coming soon)",
    ],
  },
];

// ── Stripe Checkout ────────────────────────────────────────────────────────────
async function startCheckout(planKey, userId, userEmail) {
  let loadStripe;
  try {
    const stripeModule = await import("@stripe/stripe-js");
    loadStripe = stripeModule.loadStripe;
  } catch {
    throw new Error("Stripe not installed. Run: npm install @stripe/stripe-js");
  }
  const stripe = await loadStripe(STRIPE_PK);
  if (!stripe) throw new Error("Stripe failed to load. Check your VITE_STRIPE_PK key.");

  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: STRIPE_PRICES[planKey], quantity: 1 }],
    mode: planKey === "lifetime" ? "payment" : "subscription",
    successUrl: `${window.location.origin}?payment=success&plan=${planKey}&user=${userId}`,
    cancelUrl:  `${window.location.origin}?payment=cancelled`,
    customerEmail: userEmail,
    clientReferenceId: userId,
  });
  if (error) throw new Error(error.message);
}

// ── Pricing Page ──────────────────────────────────────────────────────────────
export function PricingPage({ user, subscription, onSubscribed, onSkip }) {
  const [loading, setLoading] = useState(null);
  const [error, setError]     = useState("");

  const active = isSubscriptionActive(subscription);

  async function handlePlan(planKey) {
    if (!user) return;
    setLoading(planKey); setError("");
    try {
      await startCheckout(planKey, user.id, user.email);
      // After redirect back with ?payment=success, App.jsx handles confirmation
    } catch (e) {
      setError(e.message);
      setLoading(null);
    }
  }

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <div className="pricing-logo">
          <span style={{fontSize:28}}>⚡</span>
          <span className="auth-logo-name">ClientFlow AI</span>
        </div>
        <h1 className="pricing-title">Simple, honest pricing</h1>
        <p className="pricing-sub">Start for $1/month. Upgrade or cancel anytime. No hidden fees.</p>
        {active && (
          <div className="pricing-active-badge">
            ✅ You have an active <strong>{getPlanLabel(subscription.plan)}</strong> subscription
            {subscription.expires_at && ` · Renews ${new Date(subscription.expires_at).toLocaleDateString()}`}
          </div>
        )}
      </div>

      {error && <div className="auth-error" style={{maxWidth:500,margin:"0 auto 16px"}}> ❌ {error}</div>}

      <div className="pricing-grid">
        {PLANS.map(plan => (
          <div key={plan.key}
            className={`pricing-card ${plan.badge ? "featured" : ""} ${subscription?.plan === plan.key && active ? "current" : ""}`}
            style={plan.badge ? { borderColor: plan.color } : {}}>

            {plan.badge && <div className="pricing-badge" style={{background:plan.color}}>{plan.badge}</div>}
            {subscription?.plan === plan.key && active && <div className="pricing-badge" style={{background:"#22c55e"}}>YOUR PLAN</div>}

            <div className="pricing-plan-icon">{plan.icon}</div>
            <div className="pricing-plan-name">{plan.name}</div>
            <div className="pricing-plan-price" style={{color:plan.color}}>
              {plan.price}<span className="pricing-period">{plan.period}</span>
            </div>
            <div className="pricing-equiv">{plan.yearlyEquiv}</div>

            <ul className="pricing-features">
              {plan.features.map((f,i) => <li key={i}><span>✓</span>{f}</li>)}
            </ul>

            <button
              className="pricing-cta-btn"
              style={{background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`}}
              disabled={loading === plan.key || (subscription?.plan === plan.key && active)}
              onClick={() => handlePlan(plan.key)}>
              {loading === plan.key ? "⏳ Redirecting to payment…"
                : subscription?.plan === plan.key && active ? "✅ Current Plan"
                : plan.key === "lifetime" ? "Get Lifetime Access →"
                : `Start ${plan.name} →`}
            </button>
          </div>
        ))}
      </div>

      <div className="pricing-footer">
        <div className="pricing-guarantee">🔒 Secure payment via Stripe · 30-day money-back guarantee · Cancel anytime</div>
        {onSkip && (
          <button className="auth-link" onClick={onSkip} style={{marginTop:12}}>
            Continue with limited free access →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Subscription Status Banner (shown inside app) ──────────────────────────────
export function SubBanner({ subscription, onUpgrade }) {
  const active = isSubscriptionActive(subscription);
  if (active) return null; // don't show if subscribed

  return (
    <div className="sub-banner" onClick={onUpgrade}>
      <span>⚡ <strong>Free plan</strong> — Upgrade from $1/month to unlock all features</span>
      <button className="sub-banner-btn">Upgrade Now →</button>
    </div>
  );
}

// ── Feature Gate ───────────────────────────────────────────────────────────────
// Wrap any premium feature with this — shows upgrade prompt if not subscribed
export function FeatureGate({ subscription, children, featureName, onUpgrade }) {
  const active = isSubscriptionActive(subscription);
  if (active) return children;

  return (
    <div className="feature-gate">
      <div className="feature-gate-icon">🔒</div>
      <h3>Premium Feature</h3>
      <p><strong>{featureName}</strong> requires an active subscription.</p>
      <p style={{fontSize:13,color:"#64748b",marginTop:4}}>Start from just $1/month — cancel anytime.</p>
      <button className="btn-primary" onClick={onUpgrade} style={{marginTop:14}}>
        🚀 Upgrade to Unlock
      </button>
    </div>
  );
}

// ── Manage Subscription ────────────────────────────────────────────────────────
export function ManageSubscription({ user, subscription, onClose }) {
  const active = isSubscriptionActive(subscription);
  const plan   = subscription?.plan;
  const color  = getPlanColor(plan);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:440}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>💳 Subscription</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="sub-manage-card" style={{borderColor:color}}>
            <div className="sub-manage-plan" style={{color}}>
              {getPlanLabel(plan)} Plan
            </div>
            <div className={`sub-manage-status ${active?"active":"inactive"}`}>
              {active ? "✅ Active" : "❌ Inactive"}
            </div>
            {subscription?.started_at && (
              <div className="sub-manage-dates">
                <div>Started: {new Date(subscription.started_at).toLocaleDateString()}</div>
                {subscription.expires_at && <div>Renews: {new Date(subscription.expires_at).toLocaleDateString()}</div>}
                {!subscription.expires_at && plan === "lifetime" && <div>♾️ Never expires</div>}
              </div>
            )}
          </div>

          <div className="sub-manage-actions">
            <a href="https://billing.stripe.com/p/login/YOUR_BILLING_PORTAL" target="_blank" rel="noreferrer"
              className="btn-secondary" style={{display:"block",textAlign:"center",textDecoration:"none",marginBottom:8}}>
              📋 Manage Billing (Stripe Portal)
            </a>
            <a href="mailto:support@clientflow.ai?subject=Subscription%20Help"
              className="btn-ghost" style={{display:"block",textAlign:"center",textDecoration:"none",fontSize:12}}>
              💬 Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
