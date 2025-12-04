import { type Resource } from "wasp/entities";
import { HttpError } from "wasp/server";
import {
  type GetUploadUrl,
  type CreateResource,
  type GetCoachResources,
  type GetResourceDownloadUrl,
  type DeleteResource,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  checkFileExistsInS3,
  deleteFileFromS3,
  getDownloadFileSignedURLFromS3,
} from "../file-upload/s3Utils";
import { ALLOWED_RESOURCE_TYPES, MAX_RESOURCE_FILE_SIZE } from "./validation";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { s3Client } from "../file-upload/s3Utils";
import { randomUUID } from "crypto";
import * as path from "path";
import {
  notificationEmitter,
  NotificationEventType,
} from "../notifications/eventEmitter";
import { requireAuth, requireRole } from "../server/rbac";

// ============================================
// getUploadUrl - Generate presigned S3 URL for resource upload
// ============================================

const getUploadUrlInputSchema = z.object({
  fileName: z.string().nonempty(),
  fileType: z.enum(ALLOWED_RESOURCE_TYPES),
});

type GetUploadUrlInput = z.infer<typeof getUploadUrlInputSchema>;

/**
 * Generates a presigned S3 URL for uploading a resource.
 * Only coaches can upload resources.
 */
export const getUploadUrl: GetUploadUrl<
  GetUploadUrlInput,
  {
    uploadUrl: string;
    uploadFields: Record<string, string>;
    s3Key: string;
  }
> = async (rawArgs, context) => {
  const coachContext = requireRole(context, ["COACH"], {
    unauthenticatedMessage: "You must be logged in to upload resources",
    unauthorizedMessage: "Only coaches can upload resources",
  });

  const coachProfile = await coachContext.entities.CoachProfile.findUnique({
    where: { userId: coachContext.user.id, deletedAt: null },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  const { fileName, fileType } = ensureArgsSchemaOrThrowHttpError(
    getUploadUrlInputSchema,
    rawArgs,
  );

  // Generate S3 key with coach ID and resources folder
  const ext = path.extname(fileName).slice(1);
  const s3Key = `${coachProfile.id}/resources/${randomUUID()}.${ext}`;

  try {
    const { url: uploadUrl, fields: uploadFields } = await createPresignedPost(
      s3Client,
      {
        Bucket: process.env['AWS_S3_FILES_BUCKET']!,
        Key: s3Key,
        Conditions: [["content-length-range", 0, MAX_RESOURCE_FILE_SIZE]],
        Fields: {
          "Content-Type": fileType,
        },
        Expires: 3600,
      },
    );

    return { uploadUrl, s3Key, uploadFields };
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw new HttpError(500, "Failed to generate upload URL");
  }
};

// ============================================
// createResource - Save resource metadata after upload
// ============================================

const createResourceInputSchema = z.object({
  name: z.string().nonempty(),
  type: z.enum(ALLOWED_RESOURCE_TYPES),
  s3Key: z.string().nonempty(),
  description: z.string().optional(),
});

type CreateResourceInput = z.infer<typeof createResourceInputSchema>;

/**
 * Creates a Resource record after file has been uploaded to S3.
 * Only coaches can create resources for themselves.
 */
export const createResource: CreateResource<
  CreateResourceInput,
  Resource
> = async (rawArgs, context) => {
  const coachContext = requireRole(context, ["COACH"], {
    unauthenticatedMessage: "You must be logged in to create resources",
    unauthorizedMessage: "Only coaches can create resources",
  });

  const { name, type, s3Key, description } = ensureArgsSchemaOrThrowHttpError(
    createResourceInputSchema,
    rawArgs,
  );

  // Verify user is a coach and get their profile
  const coachProfile = await coachContext.entities.CoachProfile.findUnique({
    where: { userId: coachContext.user.id, deletedAt: null },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  // Verify file exists in S3
  const fileExists = await checkFileExistsInS3({ s3Key });
  if (!fileExists) {
    throw new HttpError(404, "File not found in S3");
  }

  // Create the resource
  const resource = await coachContext.entities.Resource.create({
    data: {
      name,
      type,
      s3Key,
      description: description || null,
      coach: { connect: { id: coachProfile.id } },
    },
  });

  // ============================================
  // EMIT NOTIFICATION EVENTS TO ALL CLIENTS
  // ============================================
  try {
    // Get all clients of this coach
    const clients = await coachContext.entities.ClientProfile.findMany({
      where: { coachId: coachProfile.id, deletedAt: null },
    });

    // Emit RESOURCE_SHARED event for each client
    for (const client of clients) {
      try {
        await notificationEmitter.emit(NotificationEventType.RESOURCE_SHARED, {
          clientId: client.id,
          resourceId: resource.id,
          resourceName: name,
          coachName: coachContext.user.email?.split("@")[0] || "Your Coach",
        });
      } catch (error) {
        console.error(
          `Error emitting resource notification for client ${client.id}:`,
          error,
        );
        // Don't fail the operation if notification fails
      }
    }
  } catch (error) {
    console.error("Error emitting resource notifications:", error);
    // Don't fail the operation if notification fails
  }

  return resource;
};

// ============================================
// getCoachResources - Get resources (coach's own or client's coach's)
// ============================================

/**
 * Get coach resources:
 * - If user is a COACH: return their own resources
 * - If user is a CLIENT: return their coach's resources
 */
export const getCoachResources: GetCoachResources<void, Resource[]> = async (
  _args,
  context,
) => {
  const authenticatedContext = requireAuth(
    context,
    "You must be logged in to view resources",
  );

  let coachId: string | null = null;

  // Determine which coach's resources to fetch
  const coachProfile =
    await authenticatedContext.entities.CoachProfile.findUnique({
      where: { userId: authenticatedContext.user.id, deletedAt: null },
    });

  if (coachProfile) {
    // User is a coach
    coachId = coachProfile.id;
  } else {
    // User might be a client - check for client profile
    const clientProfile =
      await authenticatedContext.entities.ClientProfile.findUnique({
        where: { userId: authenticatedContext.user.id, deletedAt: null },
      });

    if (!clientProfile || !clientProfile.coachId) {
      // Not a coach and not linked to a coach
      return [];
    }

    coachId = clientProfile.coachId;
  }

  // Fetch resources for the coach
  return authenticatedContext.entities.Resource.findMany({
    where: {
      coachId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

// ============================================
// getResourceDownloadUrl - Generate presigned download URL
// ============================================

const getResourceDownloadUrlInputSchema = z.object({
  resourceId: z.string().nonempty(),
});

type GetResourceDownloadUrlInput = z.infer<
  typeof getResourceDownloadUrlInputSchema
>;

/**
 * Generate a presigned download URL for a resource.
 * Access control:
 * - Coaches can download their own resources
 * - Clients can download resources from their coach
 */
export const getResourceDownloadUrl: GetResourceDownloadUrl<
  GetResourceDownloadUrlInput,
  string
> = async (rawArgs, context) => {
  const authenticatedContext = requireAuth(
    context,
    "You must be logged in to download resources",
  );

  const { resourceId } = ensureArgsSchemaOrThrowHttpError(
    getResourceDownloadUrlInputSchema,
    rawArgs,
  );

  // Fetch the resource
  const resource = await authenticatedContext.entities.Resource.findUnique({
    where: { id: resourceId, deletedAt: null },
    include: { coach: true },
  });

  if (!resource) {
    throw new HttpError(404, "Resource not found");
  }

  // Check access permissions
  const coachProfile =
    await authenticatedContext.entities.CoachProfile.findUnique({
      where: { userId: authenticatedContext.user.id, deletedAt: null },
    });

  const clientProfile =
    await authenticatedContext.entities.ClientProfile.findUnique({
      where: { userId: authenticatedContext.user.id, deletedAt: null },
    });

  // Coach can access their own resources
  if (coachProfile && coachProfile.id === resource.coachId) {
    return await getDownloadFileSignedURLFromS3({ s3Key: resource.s3Key });
  }

  // Client can access their coach's resources
  if (clientProfile && clientProfile.coachId === resource.coachId) {
    return await getDownloadFileSignedURLFromS3({ s3Key: resource.s3Key });
  }

  // No access
  throw new HttpError(403, "You do not have access to this resource");
};

// ============================================
// deleteResource - Delete resource from DB and S3
// ============================================

const deleteResourceInputSchema = z.object({
  resourceId: z.string().nonempty(),
});

type DeleteResourceInput = z.infer<typeof deleteResourceInputSchema>;

/**
 * Delete a resource.
 * Only the coach who owns the resource can delete it.
 */
export const deleteResource: DeleteResource<
  DeleteResourceInput,
  Resource
> = async (rawArgs, context) => {
  const coachContext = requireRole(context, ["COACH"], {
    unauthenticatedMessage: "You must be logged in to delete resources",
    unauthorizedMessage: "Only coaches can delete resources",
  });

  const { resourceId } = ensureArgsSchemaOrThrowHttpError(
    deleteResourceInputSchema,
    rawArgs,
  );

  // Verify user is a coach
  const coachProfile = await coachContext.entities.CoachProfile.findUnique({
    where: { userId: coachContext.user.id },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  // Fetch the resource
  const resource = await coachContext.entities.Resource.findUnique({
    where: { id: resourceId, deletedAt: null },
  });

  if (!resource) {
    throw new HttpError(404, "Resource not found");
  }

  // Verify coach owns this resource
  if (resource.coachId !== coachProfile.id) {
    throw new HttpError(403, "You can only delete your own resources");
  }

  // Delete from database
  const deletedResource = await coachContext.entities.Resource.update({
    where: { id: resourceId },
    data: { deletedAt: new Date() },
  });

  // Delete from S3 (best effort - log errors but don't fail)
  try {
    await deleteFileFromS3({ s3Key: deletedResource.s3Key });
  } catch (error) {
    console.error(
      `S3 deletion failed. Orphaned file s3Key: ${deletedResource.s3Key}`,
      error,
    );
  }

  return deletedResource;
};
