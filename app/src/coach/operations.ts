import { HttpError } from "wasp/server";
import type { GetClientsForCoach } from "wasp/server/operations";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

// ============================================
// GET CLIENTS FOR COACH
// ============================================
type ClientWithStats = {
  id: string;
  userId: string;
  email: string | null;
  username: string | null;
  somaticLogCount: number;
  lastLogDate: Date | null;
};

export const getClientsForCoach: GetClientsForCoach<
  void,
  ClientWithStats[]
> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, "You must be logged in to view clients");
  }

  // Ensure user is a COACH
  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can view their client list");
  }

  // Get the coach profile with clients
  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { userId: context.user.id },
    include: {
      clients: {
        include: {
          user: true,
          somaticLogs: {
            orderBy: { createdAt: "desc" },
            take: 1, // Get the most recent log for lastLogDate
          },
          _count: {
            select: { somaticLogs: true },
          },
        },
      },
    },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  // Transform the data to our return type
  return coachProfile.clients.map((client) => ({
    id: client.id,
    userId: client.user.id,
    email: client.user.email,
    username: client.user.username,
    somaticLogCount: client._count.somaticLogs,
    lastLogDate: client.somaticLogs[0]?.createdAt || null,
  }));
};
