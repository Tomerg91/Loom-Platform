/**
 * Subscription Renewal Failed Email Template
 *
 * Sent when automatic token charging fails and will be retried
 */

export interface SubscriptionRenewalFailedData {
  userEmail: string;
  planName: string; // e.g., "Pro Plan"
  amount: number; // in ILS
  failureReason: string; // e.g., "Card expired"
  attemptNumber: number; // 1-5
  retryDate: Date;
  appUrl: string;
}

export function getSubscriptionRenewalFailedEmailContent(
  data: SubscriptionRenewalFailedData,
) {
  const formattedRetryDate = data.retryDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const remainingAttempts = 5 - data.attemptNumber;
  const isLastAttempt = data.attemptNumber === 5;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="margin: 0; color: #d97706;">⚠ Payment Failed</h1>
      </div>

      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        We attempted to renew your Loom subscription but the payment failed.
      </p>

      <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 12px 0; color: #333;">
          <strong>Failed Renewal Details</strong>
        </p>
        <p style="margin: 8px 0; color: #666;">
          Plan: <strong>${data.planName}</strong>
        </p>
        <p style="margin: 8px 0; color: #666;">
          Amount: <strong>₪${data.amount.toFixed(2)}</strong>
        </p>
        <p style="margin: 8px 0; color: #666;">
          Reason: <strong>${escapeHtml(data.failureReason)}</strong>
        </p>
      </div>

      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        <strong>What happens next:</strong>
      </p>
      <p style="color: #666; font-size: 16px; line-height: 1.6; margin-left: 20px;">
        ${
          !isLastAttempt
            ? `We'll automatically retry on <strong>${formattedRetryDate}</strong>. You have <strong>${remainingAttempts} more attempt${
                remainingAttempts > 1 ? "s" : ""
              }</strong> before your subscription is cancelled.`
            : `This is your final retry attempt. If this payment fails, your subscription will be cancelled.`
        }
      </p>

      <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 20px;">
        <strong>How to fix this:</strong>
      </p>
      <ul style="color: #666; font-size: 16px; line-height: 1.8;">
        <li>Ensure your card hasn't expired</li>
        <li>Check that you have sufficient funds</li>
        <li>Contact your bank if your card was declined</li>
      </ul>

      <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 20px;">
        If you need to update your payment method or have other questions, please reach out to our support team.
      </p>

      <div style="margin: 30px 0;">
        <a
          href="${escapeHtml(data.appUrl)}"
          style="display: inline-block; background-color: #d97706; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;"
        >
          Contact Support
        </a>
      </div>

      <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This is an automated notification from Loom. Your subscription will be cancelled if we can't process payment after 5 failed attempts.
        </p>
      </div>
    </div>
  `;

  return {
    subject: `⚠ Your Loom subscription renewal payment failed`,
    text: `Payment renewal failed: ${
      data.failureReason
    }. We'll retry on ${formattedRetryDate}. ${
      !isLastAttempt
        ? `You have ${remainingAttempts} more attempt${
            remainingAttempts > 1 ? "s" : ""
          } before cancellation.`
        : "This is your final attempt."
    }`,
    html,
  };
}

function escapeHtml(text: string | undefined): string {
  if (!text) return "";
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
