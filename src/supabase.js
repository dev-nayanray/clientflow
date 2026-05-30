// src/supabase.js
// ── Supabase Client ───────────────────────────────────────────────────────────
// Replace the values below with your own from:
// https://supabase.com/dashboard → Project Settings → API

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || "YOUR_ANON_KEY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ── Auth helpers ──────────────────────────────────────────────────────────────
export async function signUp(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: name } },
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
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ── Profile helpers ───────────────────────────────────────────────────────────
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function upsertProfile(userId, updates) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, updated_at: new Date().toISOString(), ...updates })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Subscription helpers ──────────────────────────────────────────────────────
export async function getSubscription(userId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") return null;
  return data;
}

export async function createSubscription(userId, plan, stripeData = {}) {
  const now = new Date();
  let expiresAt = null;
  if (plan === "monthly") {
    expiresAt = new Date(now.getTime() + 30 * 86400000).toISOString();
  } else if (plan === "yearly") {
    expiresAt = new Date(now.getTime() + 365 * 86400000).toISOString();
  }
  // lifetime = null (never expires)

  const { data, error } = await supabase
    .from("subscriptions")
    .upsert({
      user_id: userId,
      plan,
      status: "active",
      started_at: now.toISOString(),
      expires_at: expiresAt,
      stripe_session_id: stripeData.sessionId || null,
      stripe_customer_id: stripeData.customerId || null,
      updated_at: now.toISOString(),
    })
    .select()
    .single();
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
  return { monthly: "Monthly", yearly: "Yearly", lifetime: "Lifetime", free: "Free" }[plan] || "Free";
}

export function getPlanColor(plan) {
  return { monthly: "#3b82f6", yearly: "#8b5cf6", lifetime: "#f59e0b", free: "#64748b" }[plan] || "#64748b";
}
