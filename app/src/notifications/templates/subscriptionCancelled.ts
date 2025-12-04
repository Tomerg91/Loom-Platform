/**
 * Subscription Cancelled Email Template
 *
 * Sent when a subscription is cancelled after maximum retry attempts have been exhausted
 */

export interface SubscriptionCancelledData {
  userEmail: string;
  planName: string; // e.g., "Pro Plan"
  cancelledDate: Date;
  appUrl: string;
  supportContactUrl: string;
}

export function getSubscriptionCancelledEmailContent(
  data: SubscriptionCancelledData,
) {
  const formattedDate = data.cancelledDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="margin: 0; color: #dc2626;">✗ Subscription Cancelled</h1>
      </div>

      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        We're sorry to inform you that your Loom subscription has been cancelled due to repeated payment failures.
      </p>

      <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 12px 0; color: #333;">
          <strong>Cancellation Details</strong>
        </p>
        <p style="margin: 8px 0; color: #666;">
          Plan: <strong>${data.planName}</strong>
        </p>
        <p style="margin: 8px 0; color: #666;">
          Cancelled on: <strong>${formattedDate}</strong>
        </p>
        <p style="margin: 8px 0; color: #666;">
          Reason: <strong>Payment could not be processed after 5 attempts</strong>
        </p>
      </div>

      <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 20px;">
        <strong>What this means:</strong>
      </p>
      <ul style="color: #666; font-size: 16px; line-height: 1.8;">
        <li>Your access to Loom features will be limited</li>
        <li>You'll no longer be able to manage coaching sessions and client resources</li>
        <li>Your data will be preserved for 30 days</li>
      </ul>

      <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 20px;">
        <strong>Want to reactivate your subscription?</strong>
      </p>
      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        We'd love to have you back! You can reactivate your subscription at any time by updating your payment method.
      </p>

      <div style="margin: 30px 0;">
        <a
          href="${escapeHtml(data.appUrl)}"
          style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-right: 12px;"
        >
          Reactivate Subscription
        </a>
        <a
          href="${escapeHtml(data.supportContactUrl)}"
          style="display: inline-block; background-color: #666; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;"
        >
          Contact Support
        </a>
      </div>

      <p style="color: #666; font-size: 16px; line-height: 1.6; margin-top: 20px;">
        If you have any questions or need assistance, please don't hesitate to reach out to our support team. We're here to help!
      </p>

      <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This is an automated notification from Loom. Your account and data will be retained for 30 days before permanent deletion. Contact support to extend this period.
        </p>
      </div>
    </div>
  `;

  return {
    subject: `✗ Your Loom subscription has been cancelled`,
    text: `Your ${data.planName} subscription has been cancelled due to repeated payment failures on ${formattedDate}. Your data will be retained for 30 days. Reactivate at any time.`,
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
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}
