import { type File } from "wasp/entities";
import { HttpError } from "wasp/server";
import {
  type AddFileToDb,
  type CreateFileUploadUrl,
  type DeleteFile,
  type GetAllFilesByUser,
  type GetDownloadFileSignedURL,
  type GetClientAvatarUploadUrl,
} from "wasp/server/operations";

import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  checkFileExistsInS3,
  deleteFileFromS3,
  getDownloadFileSignedURLFromS3,
  getUploadFileSignedURLFromS3,
} from "./s3Utils";
import { ALLOWED_FILE_TYPES } from "./validation";

const createFileInputSchema = z.object({
  fileType: z.enum(ALLOWED_FILE_TYPES),
  fileName: z.string().nonempty(),
});

type CreateFileInput = z.infer<typeof createFileInputSchema>;

export const createFileUploadUrl: CreateFileUploadUrl<
  CreateFileInput,
  {
    s3UploadUrl: string;
    s3UploadFields: Record<string, string>;
    s3Key: string;
  }
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { fileType, fileName } = ensureArgsSchemaOrThrowHttpError(
    createFileInputSchema,
    rawArgs,
  );

  return await getUploadFileSignedURLFromS3({
    fileType,
    fileName,
    userId: context.user.id,
  });
};

const addFileToDbInputSchema = z.object({
  s3Key: z.string(),
  fileType: z.enum(ALLOWED_FILE_TYPES),
  fileName: z.string(),
});

type AddFileToDbInput = z.infer<typeof addFileToDbInputSchema>;

export const addFileToDb: AddFileToDb<AddFileToDbInput, File> = async (
  args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const fileExists = await checkFileExistsInS3({ s3Key: args.s3Key });
  if (!fileExists) {
    throw new HttpError(404, "File not found in S3.");
  }

  return context.entities.File.create({
    data: {
      name: args.fileName,
      s3Key: args.s3Key,
      type: args.fileType,
      user: { connect: { id: context.user.id } },
    },
  });
};

export const getAllFilesByUser: GetAllFilesByUser<void, File[]> = async (
  _args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  return context.entities.File.findMany({
    where: {
      user: {
        id: context.user.id,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const getDownloadFileSignedURLInputSchema = z.object({
  s3Key: z.string().nonempty(),
});

type GetDownloadFileSignedURLInput = z.infer<
  typeof getDownloadFileSignedURLInputSchema
>;

export const getDownloadFileSignedURL: GetDownloadFileSignedURL<
  GetDownloadFileSignedURLInput,
  string
> = async (rawArgs, context) => {
  // Authentication check - require logged in user
  if (!context.user) {
    throw new HttpError(401, "Unauthorized. Please log in to download files.");
  }

  const { s3Key } = ensureArgsSchemaOrThrowHttpError(
    getDownloadFileSignedURLInputSchema,
    rawArgs,
  );

  // Authorization check - verify the user owns this file
  const file = await context.entities.File.findFirst({
    where: { s3Key, userId: context.user.id },
  });

  // If file doesn't exist in database, deny access
  if (!file) {
    throw new HttpError(
      404,
      "File not found or you do not have permission to access it.",
    );
  }

  // Verify ownership - only the file owner can download
  if (file.userId !== context.user.id) {
    throw new HttpError(403, "Forbidden. You do not own this file.");
  }

  // Generate and return signed download URL
  return await getDownloadFileSignedURLFromS3({ s3Key });
};

const deleteFileInputSchema = z.object({
  id: z.string(),
});

type DeleteFileInput = z.infer<typeof deleteFileInputSchema>;

export const deleteFile: DeleteFile<DeleteFileInput, File> = async (
  args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const deletedFile = await context.entities.File.delete({
    where: {
      id: args.id,
      user: {
        id: context.user.id,
      },
    },
  });

  try {
    await deleteFileFromS3({ s3Key: deletedFile.s3Key });
  } catch (error) {
    console.error(
      `S3 deletion failed. Orphaned file s3Key: ${deletedFile.s3Key}`,
      error,
    );
  }

  return deletedFile;
};

// ============================================
// GET CLIENT AVATAR UPLOAD URL
// ============================================
const getClientAvatarUploadUrlSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
});

type GetClientAvatarUploadUrlInput = z.infer<
  typeof getClientAvatarUploadUrlSchema
>;

export const getClientAvatarUploadUrl: GetClientAvatarUploadUrl<
  GetClientAvatarUploadUrlInput,
  {
    uploadUrl: string;
    s3Key: string;
  }
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "You must be logged in to upload client avatars");
  }

  // Verify user is a coach
  if (context.user.role !== "COACH") {
    throw new HttpError(
      403,
      "Only coaches can upload client avatars"
    );
  }

  const { fileName, fileType } = ensureArgsSchemaOrThrowHttpError(
    getClientAvatarUploadUrlSchema,
    rawArgs
  );

  const result = await getUploadFileSignedURLFromS3({
    fileType,
    fileName,
    userId: context.user.id,
    prefix: "client-avatars",
  });

  return {
    uploadUrl: result.s3UploadUrl,
    s3Key: result.s3Key,
  };
};
