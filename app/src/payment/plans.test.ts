import { describe, it, expect } from "vitest";
import {
  PaymentPlanId,
  paymentPlans,
  prettyPaymentPlanName,
  getSubscriptionPaymentPlanIds,
} from "./plans";

describe("Pricing Plans", () => {
  it("should have correct plan IDs", () => {
    expect(PaymentPlanId.Starter).toBe("starter");
    expect(PaymentPlanId.Pro).toBe("pro");
    expect(PaymentPlanId.Clinic).toBe("clinic");
    expect(PaymentPlanId.Credits10).toBe("credits10");
  });

  it("should have correct pretty names", () => {
    expect(prettyPaymentPlanName(PaymentPlanId.Starter)).toBe("Starter");
    expect(prettyPaymentPlanName(PaymentPlanId.Pro)).toBe("Pro");
    expect(prettyPaymentPlanName(PaymentPlanId.Clinic)).toBe("Clinic");
  });

  it("should identify subscription plans correctly", () => {
    const subscriptionPlans = getSubscriptionPaymentPlanIds();
    expect(subscriptionPlans).toContain(PaymentPlanId.Starter);
    expect(subscriptionPlans).toContain(PaymentPlanId.Pro);
    expect(subscriptionPlans).toContain(PaymentPlanId.Clinic);
    expect(subscriptionPlans).not.toContain(PaymentPlanId.Credits10);
  });

  it("should have correct effects for plans", () => {
    expect(paymentPlans[PaymentPlanId.Starter].effect).toEqual({
      kind: "subscription",
    });
    expect(paymentPlans[PaymentPlanId.Pro].effect).toEqual({
      kind: "subscription",
    });
    expect(paymentPlans[PaymentPlanId.Clinic].effect).toEqual({
      kind: "subscription",
    });
    expect(paymentPlans[PaymentPlanId.Credits10].effect).toEqual({
      kind: "credits",
      amount: 10,
    });
  });
});
