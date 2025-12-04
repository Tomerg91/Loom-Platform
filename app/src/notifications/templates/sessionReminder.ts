/**
 * Session Reminder Email Template
 *
 * Sent 24 hours before a scheduled session to remind the client
 */

export interface SessionReminderData {
  clientName: string;
  coachName: string;
  sessionDate: Date;
  time?: string; // e.g., "2:00 PM EST"
  appUrl: string;
}

export function getSessionReminderEmailContent(data: SessionReminderData) {
  const formattedDate = data.sessionDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="margin: 0; color: #333;">Session Reminder</h1>
      </div>

      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        Hi <strong>${escapeHtml(data.clientName)}</strong>,
      </p>

      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        You have a coaching session scheduled with <strong>${escapeHtml(
          data.coachName,
        )}</strong> tomorrow:
      </p>

      <div style="background-color: #e8f4f8; border-left: 4px solid #0891b2; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #333;">
          <strong style="font-size: 18px;">📅 ${formattedDate}</strong>
        </p>
        ${
          data.time && data.time.length > 0
            ? `<p style="margin: 8px 0 0 0; color: #666;">⏰ ${escapeHtml(
                data.time,
              )}</p>`
            : ""
        }
      </div>

      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        Please make sure you're in a comfortable, quiet space and ready to explore your somatic experience.
      </p>

      <div style="margin: 30px 0;">
        <a href="${escapeHtml(
          data.appUrl,
        )}" style="display: inline-block; background-color: #0891b2; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Open Loom
        </a>
      </div>

      <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          This is an automated reminder from Loom. If you have questions, please reach out to your coach.
        </p>
      </div>
    </div>
  `;

  return {
    subject: `Reminder: Your session with ${data.coachName} is tomorrow`,
    text: `Session Reminder: You have a coaching session scheduled with ${
      data.coachName
    } on ${formattedDate}${
      data.time && data.time.length > 0 ? ` at ${data.time}` : ""
    }.`,
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
