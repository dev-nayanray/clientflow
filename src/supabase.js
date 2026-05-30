// src/supabase.js  — Vite/React browser client (NOT Next.js)
import { createClient } from "@supabase/supabase-js";

// Your Supabase project credentials
// These are safe to use as VITE_ env vars (browser-side anon key)
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "https://ifdqoizimmoirkotbjmd.supabase.co";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || "sb_publishable_TKYDxVxzOQPURfghs6_AXA_kHSqTyzD";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { autoRefreshToken:true, persistSession:true, detectSessionInUrl:true },
});

// ── Auth helpers ──────────────────────────────────────────────────────────────
export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email, password, options: { data: { full_name: name } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}`,
  });
  if (error) throw error;
}

// ── Profile helpers ───────────────────────────────────────────────────────────
export async function getProfile(userId) {
  try {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error && error.code !== "PGRST116") return null;
    return data;
  } catch { return null; }
}

export async function upsertProfile(userId, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, updated_at: new Date().toISOString(), ...updates })
    .select().single();
  if (error) throw error;
  return data;
}

// ── Subscription helpers ──────────────────────────────────────────────────────
export async function getSubscription(userId) {
  try {
    const { data, error } = await supabase
      .from("subscriptions").select("*")
      .eq("user_id", userId).eq("status","active")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) return null;
    return data;
  } catch { return null; }
}

export async function createSubscription(userId, plan, stripeData = {}) {
  const now = new Date();
  let expiresAt = null;
  if (plan === "monthly") expiresAt = new Date(now.getTime() + 30*86400000).toISOString();
  if (plan === "yearly")  expiresAt = new Date(now.getTime() + 365*86400000).toISOString();
  const { data, error } = await supabase.from("subscriptions").upsert({
    user_id: userId, plan, status: "active",
    started_at: now.toISOString(), expires_at: expiresAt,
    stripe_session_id: stripeData.sessionId || null,
    updated_at: now.toISOString(),
  }).select().single();
  if (error) throw error;
  return data;
}

export function isSubscriptionActive(sub) {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  if (!sub.expires_at) return true; // lifetime
  return new Date(sub.expires_at) > new Date();
}
export function getPlanLabel(plan) {
  return { monthly:"Monthly", yearly:"Yearly", lifetime:"Lifetime", free:"Free" }[plan] || "Free";
}
export function getPlanColor(plan) {
  return { monthly:"#3b82f6", yearly:"#8b5cf6", lifetime:"#f59e0b", free:"#64748b" }[plan] || "#64748b";
}
