import type { CheckExpiredSubscriptionsJob } from "wasp/server/jobs";
import { emailSender } from "wasp/server/email";
import {
  chargeTranzillaToken,
  getTranzillaPlanPrice,
  getTranzillaErrorMessage,
} from "./tranzilla/tranzillaClient";
import { getSubscriptionRenewalSuccessEmailContent } from "@src/notifications/templates/subscriptionRenewalSuccess";
import { getSubscriptionRenewalFailedEmailContent } from "@src/notifications/templates/subscriptionRenewalFailed";
import { getSubscriptionCancelledEmailContent } from "@src/notifications/templates/subscriptionCancelled";
import type { PaymentPlanId } from "./plans";

interface SubscriptionRenewalResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  cancelledCount: number;
  details: Array<{
    userId: string;
    email: string | null;
    status: "success" | "failure" | "cancelled" | "skipped";
    reason?: string;
  }>;
  error?: string;
}

/**
 * Subscription Renewal Worker
 *
 * This cron job runs daily to check for expired subscriptions that need renewal.
 * It charges stored Tranzilla tokens and handles retries with email notifications.
 *
 * Schedule: Daily at 2 AM (configured in main.wasp)
 *
 * Logic:
 * 1. Find users with active subscriptions >37 days old (30 days + 7-day grace)
 * 2. Filter those with stored tranzillaToken and <5 retry attempts
 * 3. Attempt to charge each stored token
 * 4. On success: Update datePaid, reset retryCount, send success email
 * 5. On failure: Increment retryCount, set next retry date, send failure email
 * 6. After 5 failures: Mark as cancelled, send cancellation email
 */
export const checkExpiredSubscriptions: CheckExpiredSubscriptionsJob<
  never,
  SubscriptionRenewalResult
> = async (_args, context) => {
  console.log("🔄 Starting subscription renewal check...");

  const result: SubscriptionRenewalResult = {
    success: true,
    successCount: 0,
    failureCount: 0,
    cancelledCount: 0,
    details: [],
  };

  try {
    // Calculate the threshold: 30 days subscription + 7 day grace period
    const thirtySevenDaysAgo = new Date();
    thirtySevenDaysAgo.setDate(thirtySevenDaysAgo.getDate() - 37);

    // Find users with active subscriptions that are past the grace period
    const expiredUsers = await context.entities.User.findMany({
      where: {
        subscriptionStatus: "active",
        datePaid: {
          lt: thirtySevenDaysAgo, // >37 days since last payment
        },
        tranzillaToken: {
          not: null, // Must have a token to charge
        },
        subscriptionRetryCount: {
          lt: 5, // Not exceeded max retries
        },
      },
      select: {
        id: true,
        email: true,
        tranzillaToken: true,
        datePaid: true,
        subscriptionPlan: true,
        subscriptionRetryCount: true,
        subscriptionNextRetryDate: true,
      },
    });

    if (expiredUsers.length === 0) {
      console.log("✅ No subscriptions require renewal at this time.");
      return result;
    }

    console.log(
      `🔄 Found ${expiredUsers.length} subscription(s) to process...`,
    );

    // Process each expired subscription
    for (const user of expiredUsers) {
      try {
        // Check if we should attempt renewal now or wait for next retry date
        if (
          user.subscriptionNextRetryDate &&
          user.subscriptionNextRetryDate > new Date()
        ) {
          console.log(
            `⏸️  Skipping user ${
              user.id
            }: next retry is ${user.subscriptionNextRetryDate.toLocaleDateString()}`,
          );
          result.details.push({
            userId: user.id,
            email: user.email,
            status: "skipped",
            reason: "Not yet due for retry",
          });
          continue;
        }

        // Get plan price for renewal
        const planPrice = getTranzillaPlanPrice(
          user.subscriptionPlan as PaymentPlanId,
        );

        console.log(
          `💳 Charging user ${user.id} (${user.email}): ₪${planPrice}`,
        );

        // Attempt to charge the stored token
        const chargeResult = await chargeTranzillaToken({
          token: user.tranzillaToken,
          amount: planPrice,
          planId: user.subscriptionPlan as PaymentPlanId,
          userId: user.id,
        });

        if (chargeResult.success) {
          // ✅ SUCCESS: Update user subscription
          await context.entities.User.update({
            where: { id: user.id },
            data: {
              datePaid: new Date(),
              subscriptionRetryCount: 0, // Reset retry counter
              lastRetryAttempt: new Date(),
              subscriptionNextRetryDate: null, // Clear next retry date
            },
          });

          console.log(
            `✅ Successfully renewed subscription for user ${user.id}`,
          );

          // Send success email
          try {
            const nextRenewalDate = new Date();
            nextRenewalDate.setDate(nextRenewalDate.getDate() + 30);

            const emailContent = getSubscriptionRenewalSuccessEmailContent({
              userEmail: user.email || "",
              planName: formatPlanName(user.subscriptionPlan),
              amountCharged: planPrice,
              renewalDate: new Date(),
              nextRenewalDate,
              appUrl: `${
                process.env.WASP_WEB_CLIENT_URL || "https://loom.local"
              }/dashboard`,
            });

            await emailSender.send({
              to: user.email || "",
              subject: emailContent.subject,
              text: emailContent.text,
              html: emailContent.html,
            });

            console.log(`📧 Success email sent to ${user.email}`);
          } catch (emailError) {
            console.warn(
              `⚠️  Failed to send success email to ${user.email}:`,
              emailError,
            );
          }

          result.successCount++;
          result.details.push({
            userId: user.id,
            email: user.email,
            status: "success",
          });
        } else {
          // ❌ FAILURE: Handle retry logic
          const newRetryCount = (user.subscriptionRetryCount || 0) + 1;
          const isLastRetry = newRetryCount >= 5;

          if (isLastRetry) {
            // Cancel subscription after max retries
            await context.entities.User.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: "cancelled",
                subscriptionRetryCount: newRetryCount,
                lastRetryAttempt: new Date(),
                subscriptionNextRetryDate: null,
              },
            });

            console.log(
              `❌ Subscription cancelled for user ${user.id} after 5 failed attempts`,
            );

            // Send cancellation email
            try {
              const emailContent = getSubscriptionCancelledEmailContent({
                userEmail: user.email || "",
                planName: formatPlanName(user.subscriptionPlan),
                cancelledDate: new Date(),
                appUrl: `${
                  process.env.WASP_WEB_CLIENT_URL || "https://loom.local"
                }/dashboard`,
                supportContactUrl: `${
                  process.env.WASP_WEB_CLIENT_URL || "https://loom.local"
                }/support`,
              });

              await emailSender.send({
                to: user.email || "",
                subject: emailContent.subject,
                text: emailContent.text,
                html: emailContent.html,
              });

              console.log(`📧 Cancellation email sent to ${user.email}`);
            } catch (emailError) {
              console.warn(
                `⚠️  Failed to send cancellation email to ${user.email}:`,
                emailError,
              );
            }

            result.cancelledCount++;
            result.details.push({
              userId: user.id,
              email: user.email,
              status: "cancelled",
              reason: "Max retries exceeded",
            });
          } else {
            // Schedule next retry for tomorrow
            const nextRetryDate = new Date();
            nextRetryDate.setDate(nextRetryDate.getDate() + 1);

            await context.entities.User.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: "past_due",
                subscriptionRetryCount: newRetryCount,
                lastRetryAttempt: new Date(),
                subscriptionNextRetryDate: nextRetryDate,
              },
            });

            console.log(
              `⚠️  Renewal failed for user ${user.id}: ${
                chargeResult.error
              }. Will retry ${5 - newRetryCount} more time(s).`,
            );

            // Send failure email
            try {
              const emailContent = getSubscriptionRenewalFailedEmailContent({
                userEmail: user.email || "",
                planName: formatPlanName(user.subscriptionPlan),
                amount: planPrice,
                failureReason: chargeResult.error || "Unknown error",
                attemptNumber: newRetryCount,
                retryDate: nextRetryDate,
                appUrl: `${
                  process.env.WASP_WEB_CLIENT_URL || "https://loom.local"
                }/dashboard`,
              });

              await emailSender.send({
                to: user.email || "",
                subject: emailContent.subject,
                text: emailContent.text,
                html: emailContent.html,
              });

              console.log(`📧 Failure email sent to ${user.email}`);
            } catch (emailError) {
              console.warn(
                `⚠️  Failed to send failure email to ${user.email}:`,
                emailError,
              );
            }

            result.failureCount++;
            result.details.push({
              userId: user.id,
              email: user.email,
              status: "failure",
              reason: chargeResult.error,
            });
          }
        }
      } catch (error) {
        console.error(`💥 Error processing user ${user.id}:`, error);
        result.details.push({
          userId: user.id,
          email: user.email,
          status: "failure",
          reason: error instanceof Error ? error.message : "Processing error",
        });
        result.failureCount++;
      }
    }

    // Log summary
    console.log("\n📊 Subscription Renewal Summary:");
    console.log(`   ✅ Successful: ${result.successCount}`);
    console.log(`   ⚠️  Failed: ${result.failureCount}`);
    console.log(`   ❌ Cancelled: ${result.cancelledCount}`);

    return result;
  } catch (error) {
    console.error("💥 Error in subscription renewal worker:", error);
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      cancelledCount: 0,
      details: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Format subscription plan name for user-friendly display
 */
function formatPlanName(planId: string | null): string {
  if (!planId) return "Unknown Plan";
  const names: Record<string, string> = {
    hobby: "Hobby Plan",
    pro: "Pro Plan",
    credits10: "Credits (10 pack)",
    starter: "Starter Plan",
  };
  return names[planId] || planId;
}
