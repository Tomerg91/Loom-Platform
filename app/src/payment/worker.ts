import type { CheckExpiredSubscriptionsJob } from "wasp/server/jobs";

/**
 * Subscription Renewal Worker
 *
 * This cron job runs daily to check for expired subscriptions that need renewal.
 * For now, it only logs the users who need renewal. In Phase 2, this will be
 * enhanced to actually charge their stored Tranzilla tokens.
 *
 * Schedule: Daily at 2 AM (configured in main.wasp)
 *
 * Logic:
 * 1. Find users with active subscriptions
 * 2. Filter those where datePaid is >30 days ago
 * 3. Ensure they have a tranzillaToken stored
 * 4. Log their details for manual follow-up (or future automatic charging)
 */
export const checkExpiredSubscriptions: CheckExpiredSubscriptionsJob<
  never,
  { success: boolean; expiredCount: number; users?: Array<{ id: string; email: string | null; lastPaid: string | null }>; error?: string }
> = async (
  _args,
  context,
) => {
  console.log("🔄 Starting subscription renewal check...");

  try {
    // Calculate the date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find users with expired subscriptions
    const expiredUsers = await context.entities.User.findMany({
      where: {
        subscriptionStatus: "active", // Still marked as active
        datePaid: {
          lt: thirtyDaysAgo, // But last payment was >30 days ago
        },
        tranzillaToken: {
          not: null, // Must have a token to charge
        },
      },
      select: {
        id: true,
        email: true,
        tranzillaToken: true,
        datePaid: true,
        subscriptionPlan: true,
      },
    });

    if (expiredUsers.length === 0) {
      console.log("✅ No expired subscriptions found. All users are up to date.");
      return {
        success: true,
        expiredCount: 0,
      };
    }

    console.log(
      `⚠️  Found ${expiredUsers.length} subscription(s) needing renewal:`,
    );
    console.log("─".repeat(80));

    // Log each user that needs renewal
    for (const user of expiredUsers) {
      const daysSincePayment = Math.floor(
        (Date.now() - user.datePaid!.getTime()) / (1000 * 60 * 60 * 24),
      );

      console.log(`📧 Email:          ${user.email}`);
      console.log(`🆔 User ID:        ${user.id}`);
      console.log(`🔑 Token:          ${user.tranzillaToken}`);
      console.log(`📅 Last Paid:      ${user.datePaid?.toLocaleDateString()}`);
      console.log(`⏰ Days Overdue:   ${daysSincePayment - 30} days`);
      console.log(`📦 Plan:           ${user.subscriptionPlan || "Unknown"}`);
      console.log("─".repeat(80));
    }

    // TODO: Phase 2 - Implement automatic token charging
    console.log("\n💡 Next Steps:");
    console.log(
      "   [ ] Implement Tranzilla API call to charge stored tokens",
    );
    console.log("   [ ] Handle successful charges (update datePaid)");
    console.log(
      "   [ ] Handle failed charges (mark as past_due, send email)",
    );
    console.log("   [ ] Add retry logic for failed charges");
    console.log(
      "   [ ] Send renewal success/failure emails to users\n",
    );

    // Return summary
    return {
      success: true,
      expiredCount: expiredUsers.length,
      users: expiredUsers.map((u) => ({
        id: u.id,
        email: u.email,
        lastPaid: u.datePaid?.toISOString() ?? null,
      })),
    };
  } catch (error) {
    console.error("💥 Error checking expired subscriptions:", error);

    return {
      success: false,
      expiredCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Future Enhancement: Charge Tranzilla Token
 *
 * This function will be implemented in Phase 2 to actually charge
 * the stored Tranzilla token for subscription renewal.
 *
 * Example implementation outline:
 *
 * async function chargeTranzillaToken(params: {
 *   token: string;
 *   amount: number;
 *   userId: string;
 * }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
 *   // 1. Make API call to Tranzilla
 *   //    POST https://direct.tranzilla.com/{terminal}/api
 *   //    Body: { TranzilaTK: token, sum: amount, cred_type: 1, ... }
 *
 *   // 2. Parse response
 *   //    Check if Response === '000' (success)
 *
 *   // 3. Update database
 *   //    If success: Update user.datePaid = now
 *   //    If failure: Update user.subscriptionStatus = 'past_due'
 *
 *   // 4. Send email notification
 *   //    Success: "Your subscription has been renewed"
 *   //    Failure: "Payment failed, please update payment method"
 *
 *   // 5. Return result
 *   return { success: true, transactionId: '...' };
 * }
 */
