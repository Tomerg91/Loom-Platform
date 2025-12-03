import { type Prisma } from "@prisma/client";
import sanitizeHtml from "sanitize-html";
import { type ContactFormMessage, type User } from "wasp/entities";
import { HttpError } from "wasp/server";
import {
  type GetContactMessages,
  type GetContactMessageById,
  type SubmitContactFormMessage,
  type UpdateContactFormMessageStatus,
} from "wasp/server/operations";
import * as z from "zod";
import { requireAuth } from "@src/server/rbac";
import { ensureArgsSchemaOrThrowHttpError } from "@src/server/validation";

const contactMessageFilterSchema = z.object({
  status: z.enum(["all", "unread", "replied"]).default("all"),
});

export type ContactMessageWithUser = ContactFormMessage & {
  user: Pick<User, "id" | "email" | "username">;
};

const contactMessageWithUserInclude = {
  user: {
    select: {
      id: true,
      email: true,
      username: true,
    },
  },
} satisfies Prisma.ContactFormMessageInclude;

export const getContactMessages: GetContactMessages<
  z.infer<typeof contactMessageFilterSchema>,
  ContactMessageWithUser[]
> = async (rawArgs, context) => {
  const adminContext = requireAuth(context, "Only admins can view messages");

  if (!adminContext.user.isAdmin) {
    throw new HttpError(
      403,
      "Only admins are allowed to perform this operation",
    );
  }

  const { status } = ensureArgsSchemaOrThrowHttpError(
    contactMessageFilterSchema,
    rawArgs,
  );

  const where: Prisma.ContactFormMessageWhereInput = {};

  if (status === "unread") {
    where.isRead = false;
  } else if (status === "replied") {
    where.repliedAt = {
      not: null,
    };
  }

  return adminContext.entities.ContactFormMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: contactMessageWithUserInclude,
  });
};

const contactMessageIdSchema = z.object({
  id: z.string().uuid(),
});

export const getContactMessageById: GetContactMessageById<
  z.infer<typeof contactMessageIdSchema>,
  ContactMessageWithUser
> = async (rawArgs, context) => {
  const adminContext = requireAuth(
    context,
    "Only admins can view message details",
  );

  if (!adminContext.user.isAdmin) {
    throw new HttpError(
      403,
      "Only admins are allowed to perform this operation",
    );
  }

  const { id } = ensureArgsSchemaOrThrowHttpError(
    contactMessageIdSchema,
    rawArgs,
  );

  const message = await adminContext.entities.ContactFormMessage.findUnique({
    where: { id },
    include: contactMessageWithUserInclude,
  });

  if (!message) {
    throw new HttpError(404, "Message not found");
  }

  return message;
};

const submitContactMessageSchema = z.object({
  content: z.string().min(5).max(2000),
});

export const submitContactFormMessage: SubmitContactFormMessage<
  z.infer<typeof submitContactMessageSchema>,
  ContactFormMessage
> = async (rawArgs, context) => {
  const authenticatedContext = requireAuth(
    context,
    "You must be logged in to send a message",
  );

  const { content } = ensureArgsSchemaOrThrowHttpError(
    submitContactMessageSchema,
    rawArgs,
  );

  const sanitizedContent = sanitizeHtml(content.trim(), {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

  if (sanitizedContent.length < 5) {
    throw new HttpError(
      400,
      "Message is too short after removing unsafe content",
    );
  }

  return authenticatedContext.entities.ContactFormMessage.create({
    data: {
      content: sanitizedContent,
      user: {
        connect: { id: authenticatedContext.user.id },
      },
    },
  });
};

const updateMessageStatusSchema = z.object({
  id: z.string().uuid(),
  isRead: z.boolean().optional(),
  markReplied: z.boolean().optional(),
});

export const updateContactFormMessageStatus: UpdateContactFormMessageStatus<
  z.infer<typeof updateMessageStatusSchema>,
  ContactFormMessage
> = async (rawArgs, context) => {
  const adminContext = requireAuth(
    context,
    "Only admins can update message status",
  );

  if (!adminContext.user.isAdmin) {
    throw new HttpError(
      403,
      "Only admins are allowed to perform this operation",
    );
  }

  const { id, isRead, markReplied } = ensureArgsSchemaOrThrowHttpError(
    updateMessageStatusSchema,
    rawArgs,
  );

  const updateData: Prisma.ContactFormMessageUpdateInput = {};

  if (isRead !== undefined) {
    updateData.isRead = isRead;
  }

  if (markReplied !== undefined) {
    updateData.repliedAt = markReplied ? new Date() : null;
  }

  return adminContext.entities.ContactFormMessage.update({
    where: { id },
    data: updateData,
  });
};
