import type {
  CreateCheckoutSessionArgs,
  FetchCustomerPortalUrlArgs,
  PaymentProcessor,
} from "../paymentProcessor";
import { prettyPaymentPlanName, parsePaymentPlanId } from "../plans";
import {
  buildTranzillaCheckoutUrl,
  getTranzillaPlanPrice,
} from "./tranzillaClient";
import { tranzillaMiddlewareConfigFn, tranzillaWebhook } from "./webhook";

/**
 * Tranzilla Payment Processor Implementation
 *
 * This implements the PaymentProcessor interface for Tranzilla's
 * hosted payment page with tokenization support for auto-renewal.
 */
export const tranzillaPaymentProcessor: PaymentProcessor = {
  id: "tranzilla",

  /**
   * Create a checkout session by generating a Tranzilla hosted page URL
   */
  createCheckoutSession: async ({
    userId,
    userEmail,
    paymentPlan,
  }: CreateCheckoutSessionArgs) => {
    // Get the price for this plan from environment variables
    const planIdString = paymentPlan.getPaymentProcessorPlanId();
    const paymentPlanId = parsePaymentPlanId(planIdString);
    const amount = getTranzillaPlanPrice(paymentPlanId);

    // Generate a user-friendly description
    const planName = prettyPaymentPlanName(paymentPlanId);
    const planDescription = `${planName} Subscription`;

    // Build the Tranzilla hosted page URL
    const checkoutUrl = buildTranzillaCheckoutUrl({
      userId,
      amount,
      planDescription,
    });

    // Log for debugging in development
    if (process.env['NODE_ENV'] === "development") {
      console.log("🔗 Tranzilla checkout URL generated:", checkoutUrl);
      console.log("   User:", userEmail);
      console.log("   Plan:", planDescription);
      console.log("   Amount:", amount, "ILS");
    }

    // Return in the format expected by the operations
    // sessionId is not applicable for Tranzilla hosted pages
    return {
      session: {
        url: checkoutUrl,
        id: `tranzilla_${userId}_${Date.now()}`,
      },
    };
  },

  /**
   * Fetch customer portal URL
   *
   * Tranzilla does not provide a customer portal like Stripe does.
   * Users manage their subscription by contacting support or through
   * our own custom portal (if we build one).
   */
  fetchCustomerPortalUrl: async ({ userId }: FetchCustomerPortalUrlArgs) => {
    // Tranzilla doesn't have a customer portal
    // We could build our own custom portal in the future
    if (process.env['NODE_ENV'] === "development") {
      console.log(
        "ℹ️  Tranzilla does not provide a customer portal. User:",
        userId,
      );
    }

    return null;
  },

  webhook: tranzillaWebhook,
  webhookMiddlewareConfigFn: tranzillaMiddlewareConfigFn,
};
