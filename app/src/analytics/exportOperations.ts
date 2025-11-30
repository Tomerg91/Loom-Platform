import type { HttpError } from "wasp/server";
import { HttpError as WaspHttpError } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "@src/server/validation";
import { generateAnalyticsPdf, generatePdfFilename, bufferToBase64 } from "@src/server/pdf/exportPdf";
import { computeClientAnalytics } from "@src/somatic-logs/analytics";
import { isAdmin, isCoach, isClient, requireAuth } from "@src/server/rbac";
import type { GenerateClientExportPdf } from "wasp/server/operations";

// ============================================
// SCHEMA VALIDATION
// ============================================

const generateClientExportPdfSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  period: z.enum(["30d", "90d", "365d"]),
});

export type GenerateClientExportPdfInput = z.infer<typeof generateClientExportPdfSchema>;

// ============================================
// PDF EXPORT OPERATION
// ============================================

export const generateClientExportPdf: GenerateClientExportPdf<
  GenerateClientExportPdfInput,
  { pdfBase64: string; filename: string }
> = async (rawArgs, context) => {
  const { clientId, period } = ensureArgsSchemaOrThrowHttpError(
    generateClientExportPdfSchema,
    rawArgs
  );

  // ========== AUTHORIZATION ==========
  const authenticatedContext = requireAuth(
    context,
    "You must be logged in to export data",
  );

  // Get the client profile
  const clientProfile = await context.entities.ClientProfile.findUnique({
    where: { id: clientId },
    include: {
      user: {
        select: {
          email: true,
          username: true,
        },
      },
    },
  });

  if (!clientProfile) {
    throw new WaspHttpError(404, "Client not found");
  }

  // Authorization: coaches can export their clients' data, admins can export any
  if (isCoach(authenticatedContext.user)) {
    if (!clientProfile.coachId) {
      throw new WaspHttpError(403, "Client has no assigned coach");
    }

    const coach = await authenticatedContext.entities.CoachProfile.findUnique({
      where: { id: clientProfile.coachId },
    });

    if (!coach || coach.userId !== authenticatedContext.user.id) {
      throw new WaspHttpError(
        403,
        "You do not have permission to export this client's data"
      );
    }
  } else if (isClient(authenticatedContext.user)) {
    throw new WaspHttpError(403, "Clients cannot export analytics data");
  } else if (!isAdmin(authenticatedContext.user)) {
    throw new WaspHttpError(403, "Invalid user role");
  }

  // ========== FETCH DATA ==========
  try {
    // Compute analytics
    const analytics = await computeClientAnalytics(
      authenticatedContext.entities,
      clientId,
      period,
    );

    // Get session history
    const sessions = await authenticatedContext.entities.CoachSession.findMany({
      where: { clientId },
      orderBy: { sessionDate: "desc" },
      select: {
        id: true,
        sessionDate: true,
        sessionNumber: true,
        topic: true,
        sharedSummary: true,
      },
    });

    // Get client name for PDF
    const clientName = clientProfile.user?.username || "Client";

    // ========== GENERATE PDF ==========
    const pdfBuffer = await generateAnalyticsPdf(
      { name: clientName, email: clientProfile.user?.email },
      analytics,
      sessions,
      period
    );

    // Convert to base64 for transmission
    const pdfBase64 = bufferToBase64(pdfBuffer);
    const filename = generatePdfFilename(clientName, period);

    return {
      pdfBase64,
      filename,
    };
  } catch (error) {
    console.error("Error generating PDF export:", error);
    throw new WaspHttpError(500, "Failed to generate PDF export");
  }
};
