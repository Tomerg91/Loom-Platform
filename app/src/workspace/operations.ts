import { HttpError } from "wasp/server";
import type {
  GetWorkspaceUploadUrl,
  CreateWorkspaceFile,
  GetWorkspaceFiles,
  DeleteWorkspaceFile,
  GetWorkspaceFileDownloadUrl,
  CreateActionItem,
  UpdateActionItem,
  CompleteActionItem,
  GetActionItems,
  DeleteActionItem,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { requireNodeEnvVar } from "../server/utils";
import {
  getUploadFileSignedURLFromS3,
  checkFileExistsInS3,
  getDownloadFileSignedURLFromS3,
  deleteFileFromS3,
} from "../file-upload/s3Utils";
import { requireWorkspaceAccess } from "../server/rbac";

// Validate S3 configuration at module load time
const validateS3Config = () => {
  try {
    requireNodeEnvVar("AWS_S3_FILES_BUCKET");
    requireNodeEnvVar("AWS_S3_IAM_ACCESS_KEY_ID");
    requireNodeEnvVar("AWS_S3_IAM_SECRET_ACCESS_KEY");
  } catch {
    console.error(
      "ERROR: S3 file storage is not properly configured. Please set AWS_S3_FILES_BUCKET, AWS_S3_IAM_ACCESS_KEY_ID, and AWS_S3_IAM_SECRET_ACCESS_KEY environment variables.",
    );
  }
};

validateS3Config();

// ============================================
// WORKSPACE FILES - OPERATIONS
// ============================================

/**
 * Get a presigned S3 upload URL for workspace files
 * Both coaches and clients can upload files to the shared workspace
 */
const getWorkspaceUploadUrlSchema = z.object({
  coachId: z.string().min(1),
  clientId: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  sessionId: z.string().optional(), // Optional: link to specific session
});

type GetWorkspaceUploadUrlInput = z.infer<typeof getWorkspaceUploadUrlSchema>;

export const getWorkspaceUploadUrl: GetWorkspaceUploadUrl<
  GetWorkspaceUploadUrlInput,
  {
    uploadUrl: string;
    s3Key: string;
  }
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  const { coachId, clientId, fileName, fileType } =
    ensureArgsSchemaOrThrowHttpError(getWorkspaceUploadUrlSchema, rawArgs);

  // Verify workspace access (with database verification)
  await requireWorkspaceAccess(
    coachId,
    clientId,
    context.user.id,
    context.user.role,
    context.entities as any,
  );

  const result = await getUploadFileSignedURLFromS3({
    fileType,
    fileName,
    userId: context.user.id,
    prefix: `workspace/${coachId}/${clientId}`,
  });

  return {
    uploadUrl: result.s3UploadUrl,
    s3Key: result.s3Key,
  };
};

/**
 * Create a workspace file record after successful S3 upload
 */
const createWorkspaceFileSchema = z.object({
  coachId: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  s3Key: z.string().min(1),
  sessionId: z.string().optional(),
});

type CreateWorkspaceFileInput = z.infer<typeof createWorkspaceFileSchema>;

export const createWorkspaceFile: CreateWorkspaceFile<
  CreateWorkspaceFileInput,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  const { coachId, clientId, name, type, s3Key, sessionId } =
    ensureArgsSchemaOrThrowHttpError(createWorkspaceFileSchema, rawArgs);

  // Verify workspace access (with database verification)
  await requireWorkspaceAccess(
    coachId,
    clientId,
    context.user.id,
    context.user.role,
    context.entities as any,
  );

  // Verify file exists in S3
  const fileExists = await checkFileExistsInS3({ s3Key });
  if (!fileExists) {
    throw new HttpError(404, "File not found in S3");
  }

  return context.entities.WorkspaceFile.create({
    data: {
      name,
      type,
      s3Key,
      uploadedByUserId: context.user.id,
      coachId,
      clientId,
      ...(sessionId && { sessionId }),
    },
    include: {
      uploadedBy: true,
    },
  });
};

/**
 * Get all workspace files for a coach-client pair
 */
const getWorkspaceFilesSchema = z.object({
  coachId: z.string().min(1),
  clientId: z.string().min(1),
  sessionId: z.string().optional(), // Filter by session if provided
});

type GetWorkspaceFilesInput = z.infer<typeof getWorkspaceFilesSchema>;

export const getWorkspaceFiles: GetWorkspaceFiles<
  GetWorkspaceFilesInput,
  any[]
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  const { coachId, clientId, sessionId } = ensureArgsSchemaOrThrowHttpError(
    getWorkspaceFilesSchema,
    rawArgs,
  );

  // Verify workspace access (with database verification)
  await requireWorkspaceAccess(
    coachId,
    clientId,
    context.user.id,
    context.user.role,
    context.entities as any,
  );

  return context.entities.WorkspaceFile.findMany({
    where: {
      coachId,
      clientId,
      deletedAt: null,
      ...(sessionId && { sessionId }),
    },
    include: {
      uploadedBy: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * Delete a workspace file (soft delete)
 */
const deleteWorkspaceFileSchema = z.object({
  fileId: z.string().min(1),
  coachId: z.string().min(1),
  clientId: z.string().min(1),
});

type DeleteWorkspaceFileInput = z.infer<typeof deleteWorkspaceFileSchema>;

export const deleteWorkspaceFile: DeleteWorkspaceFile<
  DeleteWorkspaceFileInput,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  const { fileId, coachId, clientId } = ensureArgsSchemaOrThrowHttpError(
    deleteWorkspaceFileSchema,
    rawArgs,
  );

  // Verify workspace access (with database verification)
  await requireWorkspaceAccess(
    coachId,
    clientId,
    context.user.id,
    context.user.role,
    context.entities as any,
  );

  // Get the file to verify it exists and belongs to this workspace
  const file = await context.entities.WorkspaceFile.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new HttpError(404, "File not found");
  }

  if (file.coachId !== coachId || file.clientId !== clientId) {
    throw new HttpError(403, "File does not belong to this workspace");
  }

  // Soft delete
  const deletedFile = await context.entities.WorkspaceFile.update({
    where: { id: fileId },
    data: { deletedAt: new Date() },
    include: {
      uploadedBy: true,
    },
  });

  // Try to delete from S3, but don't fail if it doesn't exist
  try {
    await deleteFileFromS3({ s3Key: file.s3Key });
  } catch (error) {
    console.error(`S3 deletion failed for workspace file ${fileId}`, error);
  }

  return deletedFile;
};

/**
 * Get a presigned download URL for a workspace file
 */
const getWorkspaceFileDownloadUrlSchema = z.object({
  fileId: z.string().min(1),
  coachId: z.string().min(1),
  clientId: z.string().min(1),
});

type GetWorkspaceFileDownloadUrlInput = z.infer<
  typeof getWorkspaceFileDownloadUrlSchema
>;

export const getWorkspaceFileDownloadUrl: GetWorkspaceFileDownloadUrl<
  GetWorkspaceFileDownloadUrlInput,
  string
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  const { fileId, coachId, clientId } = ensureArgsSchemaOrThrowHttpError(
    getWorkspaceFileDownloadUrlSchema,
    rawArgs,
  );

  // Verify workspace access (with database verification)
  await requireWorkspaceAccess(
    coachId,
    clientId,
    context.user.id,
    context.user.role,
    context.entities as any,
  );

  // Get the file
  const file = await context.entities.WorkspaceFile.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new HttpError(404, "File not found");
  }

  if (file.coachId !== coachId || file.clientId !== clientId) {
    throw new HttpError(403, "File does not belong to this workspace");
  }

  return getDownloadFileSignedURLFromS3({ s3Key: file.s3Key });
};

// ============================================
// ACTION ITEMS - OPERATIONS
// ============================================

/**
 * Create an action item (homework/task)
 * Only coaches can create action items
 */
const createActionItemSchema = z.object({
  coachId: z.string().min(1),
  clientId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(), // ISO datetime string
  sessionId: z.string().optional(),
});

type CreateActionItemInput = z.infer<typeof createActionItemSchema>;

export const createActionItem: CreateActionItem<
  CreateActionItemInput,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can create action items");
  }

  const { coachId, clientId, title, description, dueDate, sessionId } =
    ensureArgsSchemaOrThrowHttpError(createActionItemSchema, rawArgs);

  // Verify workspace access (with database verification)
  await requireWorkspaceAccess(
    coachId,
    clientId,
    context.user.id,
    "COACH",
    context.entities as any,
  );

  return context.entities.ActionItem.create({
    data: {
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      completed: false,
      assignedByUserId: context.user.id,
      coachId,
      clientId,
      ...(sessionId && { sessionId }),
    },
  });
};

/**
 * Update an action item (coaches only)
 */
const updateActionItemSchema = z.object({
  actionItemId: z.string().min(1),
  coachId: z.string().min(1),
  clientId: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

type UpdateActionItemInput = z.infer<typeof updateActionItemSchema>;

export const updateActionItem: UpdateActionItem<
  UpdateActionItemInput,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can update action items");
  }

  const { actionItemId, coachId, clientId, title, description, dueDate } =
    ensureArgsSchemaOrThrowHttpError(updateActionItemSchema, rawArgs);

  // Verify workspace access (with database verification)
  await requireWorkspaceAccess(
    coachId,
    clientId,
    context.user.id,
    "COACH",
    context.entities as any,
  );

  // Verify item belongs to this workspace
  const item = await context.entities.ActionItem.findUnique({
    where: { id: actionItemId },
  });

  if (!item) {
    throw new HttpError(404, "Action item not found");
  }

  if (item.coachId !== coachId || item.clientId !== clientId) {
    throw new HttpError(403, "Action item does not belong to this workspace");
  }

  return context.entities.ActionItem.update({
    where: { id: actionItemId },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(dueDate && { dueDate: new Date(dueDate) }),
    },
  });
};

/**
 * Mark an action item as complete/incomplete
 * Coaches and clients can toggle completion
 */
const completeActionItemSchema = z.object({
  actionItemId: z.string().min(1),
  coachId: z.string().min(1),
  clientId: z.string().min(1),
  completed: z.boolean(),
});

type CompleteActionItemInput = z.infer<typeof completeActionItemSchema>;

export const completeActionItem: CompleteActionItem<
  CompleteActionItemInput,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  const { actionItemId, coachId, clientId, completed } =
    ensureArgsSchemaOrThrowHttpError(completeActionItemSchema, rawArgs);

  // Verify workspace access (with database verification)
  await requireWorkspaceAccess(
    coachId,
    clientId,
    context.user.id,
    context.user.role,
    context.entities as any,
  );

  // Verify item belongs to this workspace
  const item = await context.entities.ActionItem.findUnique({
    where: { id: actionItemId },
  });

  if (!item) {
    throw new HttpError(404, "Action item not found");
  }

  if (item.coachId !== coachId || item.clientId !== clientId) {
    throw new HttpError(403, "Action item does not belong to this workspace");
  }

  return context.entities.ActionItem.update({
    where: { id: actionItemId },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
    },
  });
};

/**
 * Get action items for a workspace
 */
const getActionItemsSchema = z.object({
  coachId: z.string().min(1),
  clientId: z.string().min(1),
  sessionId: z.string().optional(),
  completed: z.boolean().optional(), // Filter by completion status
});

type GetActionItemsInput = z.infer<typeof getActionItemsSchema>;

export const getActionItems: GetActionItems<
  GetActionItemsInput,
  any[]
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  const { coachId, clientId, sessionId, completed } =
    ensureArgsSchemaOrThrowHttpError(getActionItemsSchema, rawArgs);

  // Verify workspace access (with database verification)
  await requireWorkspaceAccess(
    coachId,
    clientId,
    context.user.id,
    context.user.role,
    context.entities as any,
  );

  return context.entities.ActionItem.findMany({
    where: {
      coachId,
      clientId,
      deletedAt: null,
      ...(sessionId && { sessionId }),
      ...(completed !== undefined && { completed }),
    },
    include: {
      assignedBy: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
};

/**
 * Delete an action item (soft delete)
 * Only coaches can delete
 */
const deleteActionItemSchema = z.object({
  actionItemId: z.string().min(1),
  coachId: z.string().min(1),
  clientId: z.string().min(1),
});

type DeleteActionItemInput = z.infer<typeof deleteActionItemSchema>;

export const deleteActionItem: DeleteActionItem<
  DeleteActionItemInput,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can delete action items");
  }

  const { actionItemId, coachId, clientId } = ensureArgsSchemaOrThrowHttpError(
    deleteActionItemSchema,
    rawArgs,
  );

  // Verify workspace access (with database verification)
  await requireWorkspaceAccess(
    coachId,
    clientId,
    context.user.id,
    "COACH",
    context.entities as any,
  );

  // Verify item belongs to this workspace
  const item = await context.entities.ActionItem.findUnique({
    where: { id: actionItemId },
  });

  if (!item) {
    throw new HttpError(404, "Action item not found");
  }

  if (item.coachId !== coachId || item.clientId !== clientId) {
    throw new HttpError(403, "Action item does not belong to this workspace");
  }

  // Soft delete
  return context.entities.ActionItem.update({
    where: { id: actionItemId },
    data: { deletedAt: new Date() },
  });
};
