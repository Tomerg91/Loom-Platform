import { requireNodeEnvVar } from "../server/utils";

export enum SubscriptionStatus {
  PastDue = "past_due",
  CancelAtPeriodEnd = "cancel_at_period_end",
  Active = "active",
  Deleted = "deleted",
}

export enum PaymentPlanId {
  Hobby = "hobby",
  Pro = "pro",
  Credits10 = "credits10",
}

export interface PaymentPlan {
  /**
   * Returns the id under which this payment plan is identified on your payment processor.
   *
   * E.g. price id on Stripe, or variant id on LemonSqueezy.
   */
  getPaymentProcessorPlanId: () => string;
  effect: PaymentPlanEffect;
}

export type PaymentPlanEffect =
  | { kind: "subscription" }
  | { kind: "credits"; amount: number };

export const paymentPlans = {
  [PaymentPlanId.Hobby]: {
    getPaymentProcessorPlanId: () => {
      // Check which payment processor is active
      // For Tranzilla, return the plan ID (which is used to lookup price)
      // For Stripe/LemonSqueezy, return their specific plan ID
      try {
        return requireNodeEnvVar("PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID");
      } catch {
        // If Stripe/LS env var not set, assume Tranzilla
        return PaymentPlanId.Hobby;
      }
    },
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.Pro]: {
    getPaymentProcessorPlanId: () => {
      try {
        return requireNodeEnvVar("PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID");
      } catch {
        // If Stripe/LS env var not set, assume Tranzilla
        return PaymentPlanId.Pro;
      }
    },
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.Credits10]: {
    getPaymentProcessorPlanId: () => {
      try {
        return requireNodeEnvVar("PAYMENTS_CREDITS_10_PLAN_ID");
      } catch {
        // If Stripe/LS env var not set, assume Tranzilla
        return PaymentPlanId.Credits10;
      }
    },
    effect: { kind: "credits", amount: 10 },
  },
} as const satisfies Record<PaymentPlanId, PaymentPlan>;

export function prettyPaymentPlanName(planId: PaymentPlanId): string {
  const planToName: Record<PaymentPlanId, string> = {
    [PaymentPlanId.Hobby]: "Hobby",
    [PaymentPlanId.Pro]: "Pro",
    [PaymentPlanId.Credits10]: "10 Credits",
  };
  return planToName[planId];
}

export function parsePaymentPlanId(planId: string): PaymentPlanId {
  if ((Object.values(PaymentPlanId) as string[]).includes(planId)) {
    return planId as PaymentPlanId;
  } else {
    throw new Error(`Invalid PaymentPlanId: ${planId}`);
  }
}

export function getSubscriptionPaymentPlanIds(): PaymentPlanId[] {
  return Object.values(PaymentPlanId).filter(
    (planId) => paymentPlans[planId].effect.kind === "subscription",
  );
}
