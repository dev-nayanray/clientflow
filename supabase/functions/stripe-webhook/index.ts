// supabase/functions/stripe-webhook/index.ts
// Deploy with: supabase functions deploy stripe-webhook
// Set secret: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature failed: ${err.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId  = session.client_reference_id;
    const plan    = session.metadata?.plan || "monthly";

    if (!userId) return new Response("No userId", { status: 400 });

    const now = new Date();
    let expiresAt: string | null = null;
    if (plan === "monthly") expiresAt = new Date(now.getTime() + 30 * 86400000).toISOString();
    if (plan === "yearly")  expiresAt = new Date(now.getTime() + 365 * 86400000).toISOString();

    await supabase.from("subscriptions").upsert({
      user_id:            userId,
      plan,
      status:             "active",
      started_at:         now.toISOString(),
      expires_at:         expiresAt,
      stripe_session_id:  session.id,
      stripe_customer_id: session.customer as string,
      stripe_sub_id:      session.subscription as string,
      updated_at:         now.toISOString(),
    });
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await supabase.from("subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("stripe_sub_id", sub.id);
  }

  if (event.type === "invoice.payment_failed") {
    const inv = event.data.object as Stripe.Invoice;
    await supabase.from("subscriptions")
      .update({ status: "past_due", updated_at: new Date().toISOString() })
      .eq("stripe_sub_id", inv.subscription as string);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
