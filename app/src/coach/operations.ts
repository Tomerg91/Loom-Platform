import { HttpError } from "wasp/server";
import type {
  GetClientsForCoach,
  CreateOfflineClient,
  UpdateOfflineClient,
  DeleteOfflineClient,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

// ============================================
// GET CLIENTS FOR COACH
// ============================================
type ClientWithStats = {
  id: string;
  userId: string | null;
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
    userId: client.user?.id || null,
    email: client.user?.email || null,
    username: client.user?.username || null,
    somaticLogCount: client._count.somaticLogs,
    lastLogDate: client.somaticLogs[0]?.createdAt || null,
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

export const createOfflineClient: CreateOfflineClient<
  CreateOfflineClientInput,
  void
> = async (rawArgs, context) => {
  const { displayName, contactEmail, avatarS3Key } =
    ensureArgsSchemaOrThrowHttpError(createOfflineClientSchema, rawArgs);

  if (!context.user) {
    throw new HttpError(401, "You must be logged in to create clients");
  }

  // Ensure user is a COACH
  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can create clients");
  }

  // Get the coach profile
  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  // Create the offline client profile (no userId)
  await context.entities.ClientProfile.create({
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

  if (!context.user) {
    throw new HttpError(401, "You must be logged in to update clients");
  }

  // Ensure user is a COACH
  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can update clients");
  }

  // Get the coach profile
  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  // Verify the client belongs to this coach
  const client = await context.entities.ClientProfile.findUnique({
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
  await context.entities.ClientProfile.update({
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
    rawArgs
  );

  if (!context.user) {
    throw new HttpError(401, "You must be logged in to delete clients");
  }

  // Ensure user is a COACH
  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can delete clients");
  }

  // Get the coach profile
  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  // Verify the client belongs to this coach
  const client = await context.entities.ClientProfile.findUnique({
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
  await context.entities.ClientProfile.delete({
    where: { id: clientId },
  });
};

// ============================================
// GET CLIENT PROFILE (for ClientDetailsPage)
// ============================================
type GetClientProfileResponse = {
  id: string;
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

export const getClientProfile = async (
  rawArgs: any,
  context: any
): Promise<GetClientProfileResponse> => {
  const { clientId } = ensureArgsSchemaOrThrowHttpError(
    getClientProfileSchema,
    rawArgs
  );

  if (!context.user) {
    throw new HttpError(401, "You must be logged in");
  }

  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can view client profiles");
  }

  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  const clientProfile = await context.entities.ClientProfile.findUnique({
    where: { id: clientId },
    include: { user: true },
  });

  if (!clientProfile || clientProfile.coachId !== coachProfile.id) {
    throw new HttpError(403, "You do not have access to this client");
  }

  return {
    id: clientProfile.id,
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
