import { HttpError } from "wasp/server";
import type { User } from "wasp/entities";
import type { UserRole } from "@prisma/client";

export type OperationContext = {
  user: User | null | undefined;
  entities: Record<string, any>;
};

type AuthenticatedContext<TContext extends OperationContext> = TContext & {
  user: User;
};

type AuthorizationMessages = {
  unauthenticatedMessage?: string;
  unauthorizedMessage?: string;
};

export function requireAuth<TContext extends OperationContext>(
  context: TContext,
  message = "You must be logged in to perform this action",
): AuthenticatedContext<TContext> {
  if (!context.user) {
    throw new HttpError(401, message);
  }

  return context as AuthenticatedContext<TContext>;
}

export function requireRole<TContext extends OperationContext>(
  context: TContext,
  allowedRoles: ReadonlyArray<UserRole>,
  messages?: AuthorizationMessages,
): AuthenticatedContext<TContext> {
  const authenticatedContext = requireAuth(
    context,
    messages?.unauthenticatedMessage,
  );

  if (!allowedRoles.includes(authenticatedContext.user.role as UserRole)) {
    throw new HttpError(
      403,
      messages?.unauthorizedMessage ||
        "You do not have permission to perform this action",
    );
  }

  return authenticatedContext;
}

export const isCoach = (
  user: Pick<User, "role"> | null | undefined,
): user is User & { role: "COACH" } => user?.role === "COACH";

export const isAdmin = (
  user: Pick<User, "role"> | null | undefined,
): user is User & { role: "ADMIN" } => user?.role === "ADMIN";

export const isClient = (
  user: Pick<User, "role"> | null | undefined,
): user is User & { role: "CLIENT" } => user?.role === "CLIENT";
