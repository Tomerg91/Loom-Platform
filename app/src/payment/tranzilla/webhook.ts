import express from "express";
import { type MiddlewareConfigFn } from "wasp/server";
import { type PaymentsWebhook } from "wasp/server/api";
import { PaymentPlanId, SubscriptionStatus } from "../plans";
import {
  getTranzillaErrorMessage,
  getTranzillaPlanPrice,
  isTranzillaPaymentSuccessful,
  validateTranzillaSignature,
} from "./tranzillaClient";

/**
 * Tranzilla sends form-urlencoded data, not JSON like Stripe
 */
export const tranzillaMiddlewareConfigFn: MiddlewareConfigFn = (
  middlewareConfig,
) => {
  middlewareConfig.delete("express.json");
  middlewareConfig.set(
    "express.urlencoded",
    express.urlencoded({ extended: true }),
  );
  return middlewareConfig;
};

/**
 * Tranzilla Webhook Handler
 *
 * This handles payment notifications from Tranzilla and:
 * 1. Validates the webhook signature
 * 2. Checks for duplicate transactions
 * 3. CAPTURES THE TranzilaTK TOKEN for auto-renewal
 * 4. Updates user subscription status
 */
export const tranzillaWebhook: PaymentsWebhook = async (
  request,
  response,
  context,
) => {
  const prismaUserDelegate = context.entities.User;
  const prismaTranzillaTransactionDelegate =
    context.entities.TranzillaTransaction;

  try {
    // Parse the form-urlencoded body
    const body = request.body as Record<string, string>;

    if (process.env.NODE_ENV === "development") {
      console.log(
        "🔔 Tranzilla webhook received:",
        JSON.stringify(body, null, 2),
      );
    }

    // Extract key fields from Tranzilla response
    const {
      Response,
      u71: userId,
      TranzilaTK,
      sum,
      index: transactionId,
    } = body;

    // Validate required fields
    if (!Response || !userId || !sum || !transactionId) {
      console.error("❌ Missing required fields in Tranzilla webhook");
      return response.status(400).json({
        error: "Missing required fields",
      });
    }

    // Security: Validate signature using HMAC-SHA256
    const isValidSignature = validateTranzillaSignature(
      request.headers as Record<string, any>,
      body,
    );
    if (!isValidSignature) {
      console.error("❌ Invalid Tranzilla webhook signature");
      return response.status(401).json({
        error: "Invalid signature",
      });
    }

    // Check for duplicate transaction (idempotency)
    const existingTransaction =
      await prismaTranzillaTransactionDelegate.findUnique({
        where: { transactionId },
      });

    if (existingTransaction) {
      console.warn(
        `⚠️  Duplicate Tranzilla transaction detected: ${transactionId}`,
      );
      // Return success to prevent Tranzilla from retrying
      return response.status(200).json({
        message: "Transaction already processed",
      });
    }

    // Check if payment was successful
    const isSuccessful = isTranzillaPaymentSuccessful(Response);

    if (!isSuccessful) {
      const errorMessage = getTranzillaErrorMessage(Response);
      console.error(`❌ Tranzilla payment failed: ${errorMessage}`, {
        userId,
        transactionId,
        Response,
      });

      // Store failed transaction for reference
      await prismaTranzillaTransactionDelegate.create({
        data: {
          transactionId,
          userId,
          amount: parseFloat(sum),
          response: Response,
          tranzilaTK: TranzilaTK || null,
        },
      });

      // Return 200 to prevent retry, but log the failure
      return response.status(200).json({
        message: "Payment failed",
        error: errorMessage,
      });
    }

    // ========================================
    // SUCCESS FLOW: Process the payment
    // ========================================

    console.log(`✅ Tranzilla payment successful for user ${userId}`);

    // Determine payment plan based on amount
    const paymentPlanId = getPaymentPlanIdByAmount(parseFloat(sum));

    // Store transaction record
    await prismaTranzillaTransactionDelegate.create({
      data: {
        transactionId,
        userId,
        amount: parseFloat(sum),
        response: Response,
        tranzilaTK: TranzilaTK || null,
      },
    });

    // CRITICAL: Update user with active subscription and TOKEN
    await prismaUserDelegate.update({
      where: { id: userId },
      data: {
        subscriptionStatus: SubscriptionStatus.Active,
        tranzillaToken: TranzilaTK || null, // 🔑 STORE TOKEN FOR AUTO-RENEWAL
        datePaid: new Date(),
        subscriptionPlan: paymentPlanId,
      },
    });

    console.log(`🔑 TranzilaTK token captured for user ${userId}:`, TranzilaTK);
    console.log(`   Plan: ${paymentPlanId}`);
    console.log(`   Amount: ${sum} ILS`);

    // Return success
    return response.status(200).json({
      message: "Payment processed successfully",
      transactionId,
    });
  } catch (error) {
    console.error("💥 Tranzilla webhook error:", error);

    if (error instanceof Error) {
      return response.status(500).json({
        error: error.message,
      });
    }

    return response.status(500).json({
      error: "Error processing Tranzilla webhook event",
    });
  }
};

/**
 * Determine which payment plan was purchased based on the amount paid
 *
 * This matches the amount to the configured prices in environment variables
 */
function getPaymentPlanIdByAmount(amount: number): PaymentPlanId {
  // Check each plan to find matching amount
  for (const planId of Object.values(PaymentPlanId)) {
    try {
      const planPrice = getTranzillaPlanPrice(planId);
      // Allow small floating point differences
      if (Math.abs(planPrice - amount) < 0.01) {
        return planId;
      }
    } catch {
      // Skip if plan price not configured
      continue;
    }
  }

  // Default to Pro if no match (shouldn't happen in production)
  console.warn(
    `⚠️  No payment plan found for amount ${amount} ILS, defaulting to Pro`,
  );
  return PaymentPlanId.Pro;
}
