import type { Prisma } from "@prisma/client";
import { type AdminSettings, type User } from "wasp/entities";
import { HttpError } from "wasp/server";
import {
  type GetAdminAvatarUploadUrl,
  type GetAdminSettings,
  type GetPublicLegalSettings,
  type UpdateAdminSettings,
} from "wasp/server/operations";
import * as z from "zod";
import { getDownloadFileSignedURLFromS3, getUploadFileSignedURLFromS3 } from "../../file-upload/s3Utils";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";
import { LEGAL_LINKS } from "../../shared/legalLinks";

const SETTINGS_ID = "global-admin-settings";

const adminSettingsSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  phoneNumber: z.string().min(6).max(30).optional(),
  emailAddress: z.string().email(),
  username: z.string().min(1, "Username is required"),
  bio: z.string().max(1000).optional(),
  avatarS3Key: z.string().optional().nullable(),
  privacyPolicyUrl: z.string().url(),
  termsOfServiceUrl: z.string().url(),
});

type AdminSettingsInput = z.infer<typeof adminSettingsSchema>;

type SettingsWithAvatarUrl = AdminSettings & { avatarUrl: string | null };

const avatarUploadSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]),
});

type AvatarUploadInput = z.infer<typeof avatarUploadSchema>;

type AdminOperationContext = {
  user: User | null | undefined;
  entities: {
    AdminSettings: {
      upsert: Prisma.AdminSettingsDelegate<unknown>["upsert"];
    };
  };
};

const ensureAdmin = <TContext extends AdminOperationContext>(
  context: TContext,
  messages?: { unauthenticated?: string; unauthorized?: string },
): TContext & { user: User } => {
  if (!context.user) {
    throw new HttpError(401, messages?.unauthenticated || "You must be logged in.");
  }

  if (!context.user.isAdmin && context.user.role !== "ADMIN") {
    throw new HttpError(403, messages?.unauthorized || "Only admins can access this area.");
  }

  return context as TContext & { user: User };
};

const buildDefaultSettings = (user: User | null | undefined) => ({
  id: SETTINGS_ID,
  fullName: user?.username || "Loom Admin",
  phoneNumber: null,
  emailAddress: user?.email || "admin@loom-platform.com",
  username: user?.username || "admin",
  bio: null,
  avatarS3Key: null,
  privacyPolicyUrl: LEGAL_LINKS.privacyPolicyUrl,
  termsOfServiceUrl: LEGAL_LINKS.termsOfServiceUrl,
});

async function getOrCreateSettings(
  context: AdminOperationContext & { user: User },
): Promise<AdminSettings> {
  return context.entities.AdminSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: buildDefaultSettings(context.user),
  });
}

const withAvatarUrl = async (
  settings: AdminSettings,
): Promise<SettingsWithAvatarUrl> => {
  if (!settings.avatarS3Key) {
    return { ...settings, avatarUrl: null };
  }

  try {
    const url = await getDownloadFileSignedURLFromS3({ s3Key: settings.avatarS3Key });
    return { ...settings, avatarUrl: url };
  } catch (error) {
    console.error("Failed to build admin avatar URL", error);
    return { ...settings, avatarUrl: null };
  }
};

export const getAdminSettings: GetAdminSettings<void, SettingsWithAvatarUrl> = async (
  _args,
  rawContext,
) => {
  const context = ensureAdmin(rawContext, {
    unauthenticated: "You must be logged in to view admin settings.",
    unauthorized: "Only admins can view admin settings.",
  });

  const settings = await getOrCreateSettings(context);
  return withAvatarUrl(settings);
};

export const updateAdminSettings: UpdateAdminSettings<
  AdminSettingsInput,
  SettingsWithAvatarUrl
> = async (rawArgs, rawContext) => {
  const context = ensureAdmin(rawContext, {
    unauthenticated: "You must be logged in to update admin settings.",
    unauthorized: "Only admins can update admin settings.",
  });

  const {
    fullName,
    phoneNumber,
    emailAddress,
    username,
    bio,
    avatarS3Key,
    privacyPolicyUrl,
    termsOfServiceUrl,
  } = ensureArgsSchemaOrThrowHttpError(adminSettingsSchema, rawArgs);

  const updated = await context.entities.AdminSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {
      fullName,
      phoneNumber: phoneNumber || null,
      emailAddress,
      username,
      bio: bio || null,
      avatarS3Key: avatarS3Key || null,
      privacyPolicyUrl,
      termsOfServiceUrl,
    },
    create: {
      ...buildDefaultSettings(context.user),
      fullName,
      phoneNumber: phoneNumber || null,
      emailAddress,
      username,
      bio: bio || null,
      avatarS3Key: avatarS3Key || null,
      privacyPolicyUrl,
      termsOfServiceUrl,
    },
  });

  return withAvatarUrl(updated);
};

export const getPublicLegalSettings: GetPublicLegalSettings<
  void,
  { privacyPolicyUrl: string; termsOfServiceUrl: string }
> = async (_args, rawContext) => {
  const context = rawContext as AdminOperationContext & { user: User | null | undefined };
  const settings = await context.entities.AdminSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: buildDefaultSettings(context.user),
  });

  return {
    privacyPolicyUrl: settings.privacyPolicyUrl,
    termsOfServiceUrl: settings.termsOfServiceUrl,
  };
};

export const getAdminAvatarUploadUrl: GetAdminAvatarUploadUrl<
  AvatarUploadInput,
  { uploadUrl: string; uploadFields: Record<string, string>; s3Key: string }
> = async (rawArgs, rawContext) => {
  const context = ensureAdmin(rawContext, {
    unauthenticated: "You must be logged in to upload an avatar.",
    unauthorized: "Only admins can upload this avatar.",
  });

  const { fileName, fileType } = ensureArgsSchemaOrThrowHttpError(
    avatarUploadSchema,
    rawArgs,
  );

  const upload = await getUploadFileSignedURLFromS3({
    fileType,
    fileName,
    userId: context.user.id,
    prefix: "admin-avatars",
  });

  return {
    uploadUrl: upload.s3UploadUrl,
    uploadFields: upload.s3UploadFields,
    s3Key: upload.s3Key,
  };
};
