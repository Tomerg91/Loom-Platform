/**
 * Resource Shared Email Template
 *
 * Sent when a coach uploads and shares a new resource with clients
 */

export interface ResourceSharedData {
  clientName: string;
  coachName: string;
  resourceName: string;
  resourceDescription?: string;
  appUrl: string;
}

export function getResourceSharedEmailContent(data: ResourceSharedData) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="margin: 0; color: #333;">📚 New Resource Available</h1>
      </div>

      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        Hi <strong>${escapeHtml(data.clientName)}</strong>,
      </p>

      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        <strong>${escapeHtml(
          data.coachName,
        )}</strong> has shared a new resource with you.
      </p>

      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; color: #333; font-size: 18px;">
          <strong>${escapeHtml(data.resourceName)}</strong>
        </p>
        ${
          data.resourceDescription
            ? `<p style="margin: 0; color: #666; line-height: 1.5;">${escapeHtml(
                data.resourceDescription,
              )}</p>`
            : ""
        }
      </div>

      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        You can access this resource anytime from your Loom dashboard. It may contain valuable exercises, recordings, or materials to support your coaching journey.
      </p>

      <div style="margin: 30px 0;">
        <a href="${escapeHtml(
          data.appUrl,
        )}" style="display: inline-block; background-color: #0891b2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          View Resources
        </a>
      </div>

      <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This is an automated notification from Loom. If you have questions about this resource, please reach out to your coach.
        </p>
      </div>
    </div>
  `;

  return {
    subject: `${data.coachName} shared a new resource with you`,
    text: `New Resource: ${data.coachName} has shared "${data.resourceName}" with you.`,
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
