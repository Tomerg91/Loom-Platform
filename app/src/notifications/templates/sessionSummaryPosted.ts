/**
 * Session Summary Posted Email Template
 *
 * Sent when a coach posts a shared summary after a session
 */

export interface SessionSummaryPostedData {
  clientName: string;
  coachName: string;
  sessionDate: Date;
  topic?: string;
  summary: string;
  appUrl: string;
}

export function getSessionSummaryPostedEmailContent(
  data: SessionSummaryPostedData
) {
  const formattedDate = data.sessionDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const truncatedSummary =
    data.summary.length > 300
      ? data.summary.substring(0, 300) + '...'
      : data.summary;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="margin: 0; color: #333;">📝 Session Summary Posted</h1>
      </div>

      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        Hi <strong>${escapeHtml(data.clientName)}</strong>,
      </p>

      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        <strong>${escapeHtml(data.coachName)}</strong> has posted a summary of your session from ${formattedDate}.
      </p>

      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0;">
        ${data.topic ? `<p style="margin: 0 0 12px 0; color: #333;"><strong>Topic:</strong> ${escapeHtml(data.topic)}</p>` : ''}
        <p style="margin: 0; color: #555; line-height: 1.6;">
          ${escapeHtml(truncatedSummary)}
        </p>
      </div>

      <div style="margin: 30px 0;">
        <a href="${escapeHtml(data.appUrl)}" style="display: inline-block; background-color: #0891b2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          View Full Summary
        </a>
      </div>

      <p style="color: #666; font-size: 14px; line-height: 1.6;">
        You can always return to your session history in Loom to review all session summaries and track your progress.
      </p>

      <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This is an automated notification from Loom.
        </p>
      </div>
    </div>
  `;

  return {
    subject: `${data.coachName} posted your session summary`,
    text: `Session Summary: ${data.coachName} has posted a summary of your session from ${formattedDate}.`,
    html,
  };
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
