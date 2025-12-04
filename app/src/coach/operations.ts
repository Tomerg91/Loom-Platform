import { HttpError } from "wasp/server";
import type {
  GetClientsForCoach,
  CreateOfflineClient,
  UpdateOfflineClient,
  DeleteOfflineClient,
  GetClientProfile,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { requireRole } from "../server/rbac";

// ============================================
// GET CLIENTS FOR COACH
// ============================================
type ClientWithStats = {
  id: string;
  userId: string | null;
  email: string | null;
  username: string | null;
  displayName: string | null;
  somaticLogCount: number;
  lastLogDate: Date | null;
};

export const getClientsForCoach: GetClientsForCoach<
  void,
  ClientWithStats[]
> = async (_args, context) => {
  const coachContext = requireRole(context, ["COACH"], {
    unauthenticatedMessage: "You must be logged in to view clients",
    unauthorizedMessage: "Only coaches can view their client list",
  });

  // Get the coach profile with clients
  const coachProfile = await coachContext.entities.CoachProfile.findUnique({
    where: { userId: coachContext.user.id },
    select: { id: true },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  const clients = await coachContext.entities.ClientProfile.findMany({
    where: { coachId: coachProfile.id },
    include: {
      user: true,
      _count: {
        select: { somaticLogs: true },
      },
    },
  });

  const clientIds = clients.map((client) => client.id);

  const lastLogs = clientIds.length
    ? await coachContext.entities.SomaticLog.groupBy({
        by: ["clientId"],
        where: { clientId: { in: clientIds } },
        _max: { createdAt: true },
      })
    : [];

  const lastLogMap = Object.fromEntries(
    lastLogs.map((log) => [log.clientId, log._max.createdAt ?? null]),
  );

  // Transform the data to our return type
  return clients.map((client) => ({
    id: client.id,
    userId: client.user?.id || null,
    email: client.user?.email || null,
    username: client.user?.username || null,
    displayName: client.displayName || null,
    somaticLogCount: client._count.somaticLogs,
    lastLogDate: lastLogMap[client.id] || null,
  }));
};

// ============================================
// CREATE OFFLINE CLIENT
// ============================================
const createOfflineClientSchema = z.object({
  displayName: z.string().min(1, "Client name is required"),
  contactEmail: z.string().email().optional(),
  avatarS3Key: z.string().optional(),
});

type CreateOfflineClientInput = z.infer<typeof createOfflineClientSchema>;

import { getMaxClients } from "../auth/permissions";

// ... (existing imports)

export const createOfflineClient: CreateOfflineClient<
  CreateOfflineClientInput,
  void
> = async (rawArgs, context) => {
  const { displayName, contactEmail, avatarS3Key } =
    ensureArgsSchemaOrThrowHttpError(createOfflineClientSchema, rawArgs);

  const coachContext = requireRole(context, ["COACH"], {
    unauthenticatedMessage: "You must be logged in to create clients",
    unauthorizedMessage: "Only coaches can create clients",
  });

  // Get the coach profile
  const coachProfile = await coachContext.entities.CoachProfile.findUnique({
    where: { userId: coachContext.user.id },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  // Check client limit
  const currentClientCount = await coachContext.entities.ClientProfile.count({
    where: { coachId: coachProfile.id },
  });

  const maxClients = getMaxClients(coachContext.user);
  if (currentClientCount >= maxClients) {
    throw new HttpError(
      403,
      `You have reached the maximum number of clients (${maxClients}) for your current plan. Please upgrade to add more clients.`,
    );
  }

  // Create the offline client profile (no userId)
  await coachContext.entities.ClientProfile.create({
    data: {
      coachId: coachProfile.id,
      clientType: "OFFLINE",
      displayName,
      contactEmail: contactEmail || null,
      avatarS3Key: avatarS3Key || null,
    },
  });
};

// ============================================
// UPDATE OFFLINE CLIENT
// ============================================
const updateOfflineClientSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  displayName: z.string().min(1).optional(),
  contactEmail: z.string().email().optional(),
  avatarS3Key: z.string().optional(),
});

type UpdateOfflineClientInput = z.infer<typeof updateOfflineClientSchema>;

export const updateOfflineClient: UpdateOfflineClient<
  UpdateOfflineClientInput,
  void
> = async (rawArgs, context) => {
  const { clientId, displayName, contactEmail, avatarS3Key } =
    ensureArgsSchemaOrThrowHttpError(updateOfflineClientSchema, rawArgs);

  const coachContext = requireRole(context, ["COACH"], {
    unauthenticatedMessage: "You must be logged in to update clients",
    unauthorizedMessage: "Only coaches can update clients",
  });

  // Get the coach profile
  const coachProfile = await coachContext.entities.CoachProfile.findUnique({
    where: { userId: coachContext.user.id },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  // Verify the client belongs to this coach
  const client = await coachContext.entities.ClientProfile.findUnique({
    where: { id: clientId },
  });

  if (!client || client.coachId !== coachProfile.id) {
    throw new HttpError(403, "You do not have access to this client");
  }

  // Only allow updating offline clients
  if (client.clientType !== "OFFLINE") {
    throw new HttpError(400, "Cannot update registered clients in this way");
  }

  // Update the client
  await coachContext.entities.ClientProfile.update({
    where: { id: clientId },
    data: {
      ...(displayName && { displayName }),
      ...(contactEmail !== undefined && { contactEmail }),
      ...(avatarS3Key !== undefined && { avatarS3Key }),
    },
  });
};

// ============================================
// DELETE OFFLINE CLIENT
// ============================================
const deleteOfflineClientSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
});

type DeleteOfflineClientInput = z.infer<typeof deleteOfflineClientSchema>;

export const deleteOfflineClient: DeleteOfflineClient<
  DeleteOfflineClientInput,
  void
> = async (rawArgs, context) => {
  const { clientId } = ensureArgsSchemaOrThrowHttpError(
    deleteOfflineClientSchema,
    rawArgs,
  );

  const coachContext = requireRole(context, ["COACH"], {
    unauthenticatedMessage: "You must be logged in to delete clients",
    unauthorizedMessage: "Only coaches can delete clients",
  });

  // Get the coach profile
  const coachProfile = await coachContext.entities.CoachProfile.findUnique({
    where: { userId: coachContext.user.id },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  // Verify the client belongs to this coach
  const client = await coachContext.entities.ClientProfile.findUnique({
    where: { id: clientId },
  });

  if (!client || client.coachId !== coachProfile.id) {
    throw new HttpError(403, "You do not have access to this client");
  }

  // Only allow deleting offline clients
  if (client.clientType !== "OFFLINE") {
    throw new HttpError(400, "Cannot delete registered clients in this way");
  }

  // Delete the client (cascade delete handles sessions, logs, etc.)
  await coachContext.entities.ClientProfile.delete({
    where: { id: clientId },
  });
};

// ============================================
// GET CLIENT PROFILE (for ClientDetailsPage)
// ============================================
export type GetClientProfileResponse = {
  id: string;
  coachId: string | null;
  clientType: string;
  displayName: string | null;
  contactEmail: string | null;
  avatarS3Key: string | null;
  lastActivityDate: Date | null;
  user: {
    email: string | null;
    username: string | null;
  } | null;
};

const getClientProfileSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
});

type GetClientProfileInput = z.infer<typeof getClientProfileSchema>;

export const getClientProfile: GetClientProfile<
  GetClientProfileInput,
  GetClientProfileResponse
> = async (rawArgs, context) => {
  const { clientId } = ensureArgsSchemaOrThrowHttpError(
    getClientProfileSchema,
    rawArgs,
  );

  const coachContext = requireRole(context, ["COACH"], {
    unauthenticatedMessage: "You must be logged in",
    unauthorizedMessage: "Only coaches can view client profiles",
  });

  const coachProfile = await coachContext.entities.CoachProfile.findUnique({
    where: { userId: coachContext.user.id },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  const clientProfile = await coachContext.entities.ClientProfile.findUnique({
    where: { id: clientId },
    include: { user: true },
  });

  if (!clientProfile || clientProfile.coachId !== coachProfile.id) {
    throw new HttpError(403, "You do not have access to this client");
  }

  return {
    id: clientProfile.id,
    coachId: clientProfile.coachId,
    clientType: clientProfile.clientType,
    displayName: clientProfile.displayName,
    contactEmail: clientProfile.contactEmail,
    avatarS3Key: clientProfile.avatarS3Key,
    lastActivityDate: clientProfile.lastActivityDate,
    user: clientProfile.user
      ? {
          email: clientProfile.user.email,
          username: clientProfile.user.username,
        }
      : null,
  };
};
