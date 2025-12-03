import { HttpError } from "wasp/server";
import type { User } from "wasp/entities";
import type { UserRole } from "@prisma/client";

export type OperationContext = {
  user?: User | null | undefined;
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

type Entities = {
  CoachProfile: {
    findUnique: (...args: any[]) => Promise<any>;
  };
  ClientProfile: {
    findUnique: (...args: any[]) => Promise<any>;
  };
};

type CoachClientContext<TContext extends OperationContext> =
  AuthenticatedContext<TContext & { entities: Entities }>;

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

type WorkspaceEntities = {
  CoachProfile: {
    findUnique: (...args: any[]) => Promise<{ id: string } | null>;
  };
  ClientProfile: {
    findUnique: (
      ...args: any[]
    ) => Promise<{ id: string; coachId: string | null } | null>;
  };
};

/**
 * Verify user has access to a coach-client workspace
 * CRITICAL SECURITY: Actually verifies database relationships
 * Coaches can access their own client's workspaces
 * Clients can access their own workspace
 */
export async function requireWorkspaceAccess(
  coachId: string,
  clientId: string,
  userId: string,
  userRole: UserRole | string,
  entities?: WorkspaceEntities,
) {
  if (userRole === "ADMIN") {
    // Admins can access any workspace
    return;
  }

  if (!entities) {
    // If no entities provided, do basic role check (for backward compatibility)
    if (userRole === "COACH" || userRole === "CLIENT") {
      return;
    }
    throw new HttpError(
      403,
      "You do not have permission to access this workspace",
    );
  }

  if (userRole === "COACH") {
    // Verify coach owns this coachId
    const coachProfile = await entities.CoachProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!coachProfile) {
      throw new HttpError(404, "Coach profile not found");
    }

    if (coachProfile.id !== coachId) {
      throw new HttpError(403, "You do not own this workspace");
    }

    // Verify client belongs to this coach
    const clientProfile = await entities.ClientProfile.findUnique({
      where: { id: clientId },
      select: { id: true, coachId: true },
    });

    if (!clientProfile) {
      throw new HttpError(404, "Client not found");
    }

    if (clientProfile.coachId !== coachId) {
      throw new HttpError(403, "Client does not belong to your workspace");
    }
  } else if (userRole === "CLIENT") {
    // Verify client owns this clientId
    const clientProfile = await entities.ClientProfile.findUnique({
      where: { userId },
      select: { id: true, coachId: true },
    });

    if (!clientProfile) {
      throw new HttpError(404, "Client profile not found");
    }

    if (clientProfile.id !== clientId) {
      throw new HttpError(403, "You do not have access to this workspace");
    }

    if (clientProfile.coachId !== coachId) {
      throw new HttpError(
        403,
        "Workspace does not match your client assignment",
      );
    }
  } else {
    throw new HttpError(
      403,
      "You do not have permission to access this workspace",
    );
  }
}
