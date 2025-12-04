/**
 * Subscription Renewal Success Email Template
 *
 * Sent when a stored Tranzilla token is successfully charged for subscription renewal
 */

export interface SubscriptionRenewalSuccessData {
  userEmail: string;
  planName: string; // e.g., "Pro Plan"
  amountCharged: number; // in ILS
  renewalDate: Date;
  nextRenewalDate: Date;
  appUrl: string;
}

export function getSubscriptionRenewalSuccessEmailContent(
  data: SubscriptionRenewalSuccessData,
) {
  const formattedRenewalDate = data.renewalDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedNextDate = data.nextRenewalDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="margin: 0; color: #15803d;">✓ Subscription Renewed</h1>
      </div>

      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        Great news! Your Loom subscription has been successfully renewed.
      </p>

      <div style="background-color: #f0fdf4; border-left: 4px solid #15803d; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 12px 0; color: #333;">
          <strong style="font-size: 18px;">${data.planName}</strong>
        </p>
        <p style="margin: 8px 0; color: #666;">
          💳 Amount charged: <strong>₪${data.amountCharged.toFixed(2)}</strong>
        </p>
        <p style="margin: 8px 0; color: #666;">
          📅 Renewed on: <strong>${formattedRenewalDate}</strong>
        </p>
        <p style="margin: 8px 0; color: #666;">
          🔄 Next renewal: <strong>${formattedNextDate}</strong>
        </p>
      </div>

      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        Your access to Loom is now extended for another month. You can continue managing your coaching practice and client sessions without interruption.
      </p>

      <div style="margin: 30px 0;">
        <a
          href="${escapeHtml(data.appUrl)}"
          style="display: inline-block; background-color: #15803d; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;"
        >
          Back to Loom
        </a>
      </div>

      <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This is an automated confirmation from Loom. Your subscription will automatically renew monthly using the card on file. If you have any questions, please contact support.
        </p>
      </div>
    </div>
  `;

  return {
    subject: `✓ Your ${data.planName} subscription has been renewed`,
    text: `Your ${
      data.planName
    } subscription has been successfully renewed for ₪${data.amountCharged.toFixed(
      2,
    )} on ${formattedRenewalDate}. Next renewal is scheduled for ${formattedNextDate}.`,
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
