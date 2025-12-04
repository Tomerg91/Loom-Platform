import { requireNodeEnvVar } from "../server/utils";

export enum SubscriptionStatus {
  PastDue = "past_due",
  CancelAtPeriodEnd = "cancel_at_period_end",
  Active = "active",
  Deleted = "deleted",
}

export enum PaymentPlanId {
  Starter = "starter",
  Pro = "pro",
  Clinic = "clinic",
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
  [PaymentPlanId.Starter]: {
    getPaymentProcessorPlanId: () => {
      try {
        return requireNodeEnvVar("PAYMENTS_STARTER_SUBSCRIPTION_PLAN_ID");
      } catch {
        return PaymentPlanId.Starter;
      }
    },
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.Pro]: {
    getPaymentProcessorPlanId: () => {
      try {
        return requireNodeEnvVar("PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID");
      } catch {
        return PaymentPlanId.Pro;
      }
    },
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.Clinic]: {
    getPaymentProcessorPlanId: () => {
      try {
        return requireNodeEnvVar("PAYMENTS_CLINIC_SUBSCRIPTION_PLAN_ID");
      } catch {
        return PaymentPlanId.Clinic;
      }
    },
    effect: { kind: "subscription" },
  },
  [PaymentPlanId.Credits10]: {
    getPaymentProcessorPlanId: () => {
      try {
        return requireNodeEnvVar("PAYMENTS_CREDITS_10_PLAN_ID");
      } catch {
        return PaymentPlanId.Credits10;
      }
    },
    effect: { kind: "credits", amount: 10 },
  },
} as const satisfies Record<PaymentPlanId, PaymentPlan>;

export function prettyPaymentPlanName(planId: PaymentPlanId): string {
  const planToName: Record<PaymentPlanId, string> = {
    [PaymentPlanId.Starter]: "Starter",
    [PaymentPlanId.Pro]: "Pro",
    [PaymentPlanId.Clinic]: "Clinic",
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
