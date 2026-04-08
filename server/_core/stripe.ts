/**
 * Stripe payment service for subscription management.
 * Handles customer creation, checkout sessions, webhook processing, and subscription queries.
 */

import Stripe from "stripe";
import { ENV } from "./env";
import { db } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Lazy initialization to avoid errors when STRIPE_SECRET_KEY is not set
let _stripe: Stripe | null = null;

/**
 * Get or initialize the Stripe instance.
 * Throws an error if STRIPE_SECRET_KEY is not configured.
 */
function getStripe(): Stripe {
  if (!_stripe) {
    if (!ENV.stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }
    _stripe = new Stripe(ENV.stripeSecretKey, {
      apiVersion: "2024-12-18.acacia" as any, // Type assertion needed for version string
    });
  }
  return _stripe;
}

/**
 * Map Stripe price IDs to subscription plan names.
 */
function getPlanFromPriceId(priceId: string): "monthly" | "yearly" | "family" | null {
  if (priceId === ENV.stripePriceMonthly) return "monthly";
  if (priceId === ENV.stripePriceAnnual) return "yearly";
  if (priceId === ENV.stripePriceFamily) return "family";
  return null;
}

/**
 * Get or create a Stripe customer for a user.
 * Stores the stripeCustomerId in the database for future reference.
 */
export async function getOrCreateCustomer(
  userId: number,
  email: string,
  name?: string
): Promise<string> {
  const stripe = getStripe();

  // Check if user already has a Stripe customer ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      userId: userId.toString(),
    },
  });

  // Store the customer ID in the database
  await db
    .update(users)
    .set({ stripeCustomerId: customer.id })
    .where(eq(users.id, userId));

  return customer.id;
}

/**
 * Create a Stripe Checkout session for subscription.
 * Returns the checkout URL for the client to redirect to.
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  userId: number,
  trialDays?: number,
  successUrl: string = "https://example.com/success",
  cancelUrl: string = "https://example.com/cancel"
): Promise<string> {
  const stripe = getStripe();

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: userId.toString(),
    },
  };

  // Add trial days if provided
  if (trialDays && trialDays > 0) {
    sessionConfig.subscription_data = {
      trial_period_days: trialDays,
    };
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);

  if (!session.url) {
    throw new Error("Failed to create checkout session");
  }

  return session.url;
}

/**
 * Create a billing portal session for users to manage their subscription.
 * Returns the portal URL.
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string = "https://example.com"
): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Get the current subscription status for a customer from Stripe.
 * Returns subscription details or null if no active subscription.
 */
export async function getSubscriptionStatus(customerId: string): Promise<{
  subscriptionId: string;
  plan: "monthly" | "yearly" | "family";
  status: string;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
} | null> {
  const stripe = getStripe();

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
  });

  if (!subscriptions.data.length) {
    return null;
  }

  const subscription = subscriptions.data[0];

  // Get the plan from the price ID
  const item = subscription.items.data[0];
  if (!item.price.id) return null;

  const plan = getPlanFromPriceId(item.price.id);
  if (!plan) return null;

  return {
    subscriptionId: subscription.id,
    plan,
    status: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
  };
}

/**
 * Process a Stripe webhook event.
 * Updates the database with subscription status changes.
 */
export async function handleWebhookEvent(payload: Buffer, signature: string): Promise<void> {
  const stripe = getStripe();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      ENV.stripeWebhookSecret
    ) as Stripe.Event;
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err}`);
  }

  // Handle different event types
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionCreateOrUpdate(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }
}

/**
 * Handle subscription creation or update.
 */
async function handleSubscriptionCreateOrUpdate(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.warn("[Stripe Webhook] Subscription event missing userId metadata");
    return;
  }

  const item = subscription.items.data[0];
  if (!item.price.id) {
    console.warn("[Stripe Webhook] Subscription item missing price ID");
    return;
  }

  const plan = getPlanFromPriceId(item.price.id);
  if (!plan) {
    console.warn(`[Stripe Webhook] Unknown price ID: ${item.price.id}`);
    return;
  }

  const expiresAt = new Date(subscription.current_period_end * 1000);

  await db
    .update(users)
    .set({
      subscriptionPlan: plan,
      subscriptionExpiresAt: expiresAt,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
    })
    .where(eq(users.id, parseInt(userId as string, 10)));

  console.log(`[Stripe Webhook] Updated subscription for user ${userId}: ${plan} (${subscription.status})`);
}

/**
 * Handle subscription deletion (cancellation).
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.warn("[Stripe Webhook] Subscription deletion event missing userId metadata");
    return;
  }

  await db
    .update(users)
    .set({
      subscriptionPlan: "free",
      subscriptionExpiresAt: null,
      subscriptionStatus: "none",
    })
    .where(eq(users.id, parseInt(userId as string, 10)));

  console.log(`[Stripe Webhook] Downgraded user ${userId} to free plan (subscription deleted)`);
}

/**
 * Handle successful invoice payment (subscription renewal).
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const subscription = invoice.subscription;
  if (!subscription || typeof subscription !== "string") {
    return;
  }

  // Fetch the subscription to get user ID
  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscription);
  const userId = sub.metadata?.userId;

  if (!userId) return;

  const item = sub.items.data[0];
  if (!item.price.id) return;

  const expiresAt = new Date(sub.current_period_end * 1000);

  await db
    .update(users)
    .set({
      subscriptionExpiresAt: expiresAt,
      subscriptionStatus: sub.status,
    })
    .where(eq(users.id, parseInt(userId as string, 10)));

  console.log(`[Stripe Webhook] Updated subscription expiration for user ${userId}`);
}

/**
 * Handle failed invoice payment.
 * Optionally flag the user for notification.
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscription = invoice.subscription;
  if (!subscription || typeof subscription !== "string") {
    return;
  }

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscription);
  const userId = sub.metadata?.userId;

  if (!userId) return;

  // Update subscription status to past_due
  await db
    .update(users)
    .set({
      subscriptionStatus: sub.status,
    })
    .where(eq(users.id, parseInt(userId as string, 10)));

  console.warn(`[Stripe Webhook] Payment failed for user ${userId} (status: ${sub.status})`);
}
