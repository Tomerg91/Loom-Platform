import { HttpError } from "wasp/server";
import type { User } from "wasp/entities";
import type { UserRole } from "@prisma/client";

export type OperationContext = {
  user: User | null | undefined;
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

type Entities = {
  CoachProfile: {
    findUnique: (...args: any[]) => Promise<any>;
  };
  ClientProfile: {
    findUnique: (...args: any[]) => Promise<any>;
  };
};

type CoachClientContext<TContext extends OperationContext> = AuthenticatedContext<
  TContext & { entities: Entities }
>;

export async function requireCoachOwnsClient<TContext extends OperationContext>(
  context: TContext & { entities: Entities },
  clientId: string,
  messages?: AuthorizationMessages,
) {
  const coachContext = requireRole(context, ["COACH"], messages);

  const coachProfile = await coachContext.entities.CoachProfile.findUnique({
    where: { userId: coachContext.user.id, deletedAt: null },
    select: { id: true },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  const clientProfile = await coachContext.entities.ClientProfile.findUnique({
    where: { id: clientId, deletedAt: null },
    select: { id: true, coachId: true },
  });

  if (!clientProfile || clientProfile.coachId !== coachProfile.id) {
    throw new HttpError(403, "You do not have access to this client");
  }

  return {
    coachContext: coachContext as CoachClientContext<TContext>,
    coachProfile,
    clientProfile,
  };
}
