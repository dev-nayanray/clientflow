// src/Subscription.jsx
import { useState } from "react";
import { createSubscription, isSubscriptionActive, getPlanLabel, getPlanColor } from "./supabase";

const STRIPE_PK       = import.meta.env.VITE_STRIPE_PK       || "";
const STRIPE_MONTHLY  = import.meta.env.VITE_STRIPE_MONTHLY  || "";
const STRIPE_YEARLY   = import.meta.env.VITE_STRIPE_YEARLY   || "";
const STRIPE_LIFETIME = import.meta.env.VITE_STRIPE_LIFETIME || "";

const PLANS = [
  {
    key:"monthly", name:"Monthly", price:"$1", period:"/month",
    color:"#3b82f6", bg:"#eff6ff", icon:"📅", badge:null,
    save:"Cancel anytime",
    features:["All lead finder tools","AI email writer + Gmail send","CRM pipeline & kanban","Portfolio generator","Project manager + invoicing","Upwork/Fiverr proposals","Google Sheets sync"],
  },
  {
    key:"yearly", name:"Yearly", price:"$10", period:"/year",
    color:"#8b5cf6", bg:"#f5f3ff", icon:"🗓️", badge:"BEST VALUE",
    save:"Save 17% vs monthly",
    features:["Everything in Monthly","Priority support","Early access features","Save $2 vs monthly"],
  },
  {
    key:"lifetime", name:"Lifetime", price:"$50", period:" once",
    color:"#f59e0b", bg:"#fffbeb", icon:"♾️", badge:"BEST DEAL",
    save:"Pay once, use forever",
    features:["Everything in Yearly","All future updates free","Commercial license","Never pay again"],
  },
];

async function startStripeCheckout(planKey, userId, userEmail) {
  // Check if Stripe keys are configured
  if (!STRIPE_PK || STRIPE_PK.includes("YOUR_")) {
    throw new Error("Stripe not configured yet. Add VITE_STRIPE_PK to your .env file.");
  }
  const priceId = { monthly:STRIPE_MONTHLY, yearly:STRIPE_YEARLY, lifetime:STRIPE_LIFETIME }[planKey];
  if (!priceId || priceId.includes("price_YOUR")) {
    throw new Error("Stripe Price ID not set. Add VITE_STRIPE_" + planKey.toUpperCase() + " to .env");
  }
  const { loadStripe } = await import("@stripe/stripe-js");
  const stripe = await loadStripe(STRIPE_PK);
  if (!stripe) throw new Error("Stripe failed to load.");
  const { error } = await stripe.redirectToCheckout({
    lineItems: [{ price: priceId, quantity: 1 }],
    mode: planKey === "lifetime" ? "payment" : "subscription",
    successUrl: `${window.location.origin}?payment=success&plan=${planKey}&user=${userId}`,
    cancelUrl:  `${window.location.origin}?payment=cancelled`,
    customerEmail: userEmail,
    clientReferenceId: userId,
  });
  if (error) throw new Error(error.message);
}

export function PricingPage({ user, subscription, onSubscribed, onSkip }) {
  const [loading, setLoading] = useState(null);
  const [error, setError]     = useState("");
  const active = isSubscriptionActive(subscription);
  const stripeReady = STRIPE_PK && !STRIPE_PK.includes("YOUR_");

  async function handlePlan(planKey) {
    if (!user || user.id === "demo") {
      setError("Create a real account to subscribe."); return;
    }
    setLoading(planKey); setError("");
    try {
      await startStripeCheckout(planKey, user.id, user.email);
    } catch (e) {
      // If Stripe not configured, simulate for testing
      if (e.message.includes("not configured") || e.message.includes("not set")) {
        const confirmed = window.confirm(
          `⚠️ Stripe is not configured yet.\n\nFor testing, activate "${planKey}" plan now?\n(In production, connect your Stripe account)`
        );
        if (confirmed) {
          try {
            const sub = await createSubscription(user.id, planKey);
            onSubscribed(sub);
          } catch (e2) { setError(e2.message); }
        }
      } else {
        setError(e.message);
      }
      setLoading(null);
    }
  }

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <div className="pricing-logo">
          <span style={{fontSize:28}}>⚡</span>
          <span style={{fontSize:20,fontWeight:800,color:"#fff",marginLeft:8}}>ClientFlow AI</span>
        </div>
        <h1 className="pricing-title">Choose your plan</h1>
        <p className="pricing-sub">Start for $1/month · Cancel anytime · 30-day guarantee</p>
        {!stripeReady && (
          <div className="pricing-stripe-warning">
            ⚠️ Stripe not configured — payments will be simulated. Add <code>VITE_STRIPE_PK</code> to enable real payments.
          </div>
        )}
        {active && (
          <div className="pricing-active-badge">
            ✅ Active <strong>{getPlanLabel(subscription.plan)}</strong> plan
            {subscription.expires_at && ` · Renews ${new Date(subscription.expires_at).toLocaleDateString()}`}
          </div>
        )}
      </div>

      {error && <div className="auth-error" style={{maxWidth:500,margin:"0 auto 16px"}}>❌ {error}</div>}

      <div className="pricing-grid">
        {PLANS.map(plan => (
          <div key={plan.key}
            className={`pricing-card ${plan.badge?"featured":""} ${subscription?.plan===plan.key&&active?"current":""}`}
            style={plan.badge?{borderColor:plan.color}:{}}>
            {plan.badge && <div className="pricing-badge" style={{background:plan.color}}>{plan.badge}</div>}
            {subscription?.plan===plan.key&&active && <div className="pricing-badge" style={{background:"#22c55e"}}>YOUR PLAN</div>}
            <div className="pricing-plan-icon">{plan.icon}</div>
            <div className="pricing-plan-name">{plan.name}</div>
            <div className="pricing-plan-price" style={{color:plan.color}}>
              {plan.price}<span className="pricing-period">{plan.period}</span>
            </div>
            <div className="pricing-save">{plan.save}</div>
            <ul className="pricing-features">
              {plan.features.map((f,i)=><li key={i}><span style={{color:plan.color}}>✓</span>{f}</li>)}
            </ul>
            <button className="pricing-cta-btn"
              style={{background:`linear-gradient(135deg,${plan.color},${plan.color}cc)`}}
              disabled={loading===plan.key || (subscription?.plan===plan.key&&active)}
              onClick={()=>handlePlan(plan.key)}>
              {loading===plan.key ? "⏳ Redirecting…"
                : subscription?.plan===plan.key&&active ? "✅ Current Plan"
                : plan.key==="lifetime" ? "Get Lifetime Access →"
                : `Start ${plan.name} →`}
            </button>
          </div>
        ))}
      </div>
      <div className="pricing-footer">
        <div className="pricing-guarantee">🔒 Secure · 30-day money back · Cancel anytime</div>
        {onSkip && (
          <button className="auth-link" onClick={onSkip} style={{marginTop:12,color:"#94a3b8"}}>
            Continue with limited free access →
          </button>
        )}
      </div>
    </div>
  );
}

export function SubBanner({ subscription, onUpgrade }) {
  if (isSubscriptionActive(subscription)) return null;
  return (
    <div className="sub-banner" onClick={onUpgrade}>
      <span>⚡ <strong>Free plan</strong> — Upgrade from $1/month to unlock all features</span>
      <button className="sub-banner-btn">Upgrade Now →</button>
    </div>
  );
}

export function FeatureGate({ subscription, children, featureName, onUpgrade }) {
  if (isSubscriptionActive(subscription)) return children;
  return (
    <div className="feature-gate">
      <div className="feature-gate-icon">🔒</div>
      <h3>Premium Feature</h3>
      <p><strong>{featureName}</strong> requires an active subscription.</p>
      <p style={{fontSize:13,color:"#64748b",marginTop:4}}>From just $1/month.</p>
      <button className="btn-primary" onClick={onUpgrade} style={{marginTop:14}}>🚀 Upgrade to Unlock</button>
    </div>
  );
}

export function ManageSubscription({ user, subscription, onClose }) {
  const active = isSubscriptionActive(subscription);
  const plan   = subscription?.plan;
  const color  = getPlanColor(plan);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{maxWidth:440}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>💳 Your Subscription</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="sub-manage-card" style={{borderColor:color}}>
            <div className="sub-manage-plan" style={{color}}>{getPlanLabel(plan)} Plan</div>
            <div className={`sub-manage-status ${active?"active":"inactive"}`}>{active?"✅ Active":"❌ Inactive"}</div>
            {subscription?.started_at && (
              <div className="sub-manage-dates">
                <div>Started: {new Date(subscription.started_at).toLocaleDateString()}</div>
                {subscription.expires_at && <div>Renews: {new Date(subscription.expires_at).toLocaleDateString()}</div>}
                {!subscription.expires_at && plan==="lifetime" && <div>♾️ Never expires</div>}
              </div>
            )}
          </div>
          <div className="sub-manage-actions">
            <a href="https://billing.stripe.com/p/login/test_YOUR_PORTAL" target="_blank" rel="noreferrer"
              className="btn-secondary" style={{display:"block",textAlign:"center",textDecoration:"none",marginBottom:8}}>
              📋 Manage Billing on Stripe
            </a>
            <a href="mailto:support@clientflow.ai?subject=Subscription"
              className="btn-ghost" style={{display:"block",textAlign:"center",textDecoration:"none",fontSize:12}}>
              💬 Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
