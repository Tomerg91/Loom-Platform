import { HttpError } from "wasp/server";
import type {
  CreateGoal,
  UpdateGoal,
  DeleteGoal,
  GetGoals,
  ToggleMilestone,
  UpdateGoalProgress,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

// ============================================
// VALIDATION SCHEMAS
// ============================================

const CreateGoalSchema = z.object({
  title: z.string().min(1, "Goal title is required"),
  type: z.enum(["OKR", "SMART", "HABIT"]).default("OKR"),
  dueDate: z.string().datetime().optional(),
  milestones: z
    .array(
      z.object({
        text: z.string().min(1, "Milestone text is required"),
        order: z.number().default(0),
      })
    )
    .default([]),
  clientId: z.string().min(1, "Client ID is required"),
});

const UpdateGoalSchema = z.object({
  goalId: z.string().min(1, "Goal ID is required"),
  title: z.string().min(1).optional(),
  type: z.enum(["OKR", "SMART", "HABIT"]).optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]).optional(),
});

const ToggleMilestoneSchema = z.object({
  milestoneId: z.string().min(1, "Milestone ID is required"),
  completed: z.boolean(),
});

const DeleteGoalSchema = z.object({
  goalId: z.string().min(1, "Goal ID is required"),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function calculateGoalProgress(goalId: string, prisma: any): Promise<number> {
  const milestones = await prisma.milestone.findMany({
    where: { goalId },
  });

  if (milestones.length === 0) return 0;

  const completedCount = milestones.filter((m: any) => m.completed).length;
  return Math.round((completedCount / milestones.length) * 100);
}

// ============================================
// OPERATIONS
// ============================================

export const createGoal: CreateGoal<any, any> = async (args, context) => {
  const data = await ensureArgsSchemaOrThrowHttpError(
    CreateGoalSchema,
    args
  );

  if (!context.user) {
    throw new HttpError(401, "User must be logged in");
  }

  // Verify the client exists and belongs to the current user's coach
  const clientProfile = await context.entities.ClientProfile.findUnique({
    where: { id: data.clientId },
    include: { user: true, coach: true },
  });

  if (!clientProfile) {
    throw new HttpError(404, "Client not found");
  }

  // Verify access: either the client themselves or their coach
  const isClient =
    context.user.id === clientProfile.userId &&
    clientProfile.user.role === "CLIENT";
  const isCoach =
    clientProfile.coachId &&
    context.user.id === clientProfile.coach?.userId &&
    context.user.role === "COACH";

  if (!isClient && !isCoach) {
    throw new HttpError(403, "You don't have permission to create goals for this client");
  }

  // Create goal with milestones
  const goal = await context.entities.Goal.create({
    data: {
      title: data.title,
      type: data.type,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: "NOT_STARTED",
      progress: 0,
      client: {
        connect: {
          id: data.clientId,
        },
      },
      milestones: {
        create: data.milestones.map((m, index) => ({
          text: m.text,
          order: m.order ?? index,
          completed: false,
        })),
      },
    },
    include: {
      milestones: true,
    },
  });

  return goal;
};

export const updateGoal: UpdateGoal<any, any> = async (args, context) => {
  const data = await ensureArgsSchemaOrThrowHttpError(
    UpdateGoalSchema,
    args
  );

  if (!context.user) {
    throw new HttpError(401, "User must be logged in");
  }

  const goal = await context.entities.Goal.findUnique({
    where: { id: data.goalId },
    include: { client: { include: { coach: true } } },
  });

  if (!goal) {
    throw new HttpError(404, "Goal not found");
  }

  // Verify access
  const isClient =
    context.user.id === goal.client.userId && context.user.role === "CLIENT";
  const isCoach =
    goal.client.coachId &&
    context.user.id === goal.client.coach?.userId &&
    context.user.role === "COACH";

  if (!isClient && !isCoach) {
    throw new HttpError(403, "You don't have permission to update this goal");
  }

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.dueDate !== undefined) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }
  if (data.status !== undefined) updateData.status = data.status;

  const updatedGoal = await context.entities.Goal.update({
    where: { id: data.goalId },
    data: updateData,
    include: { milestones: true },
  });

  return updatedGoal;
};

export const deleteGoal: DeleteGoal<any, any> = async (args, context) => {
  const data = await ensureArgsSchemaOrThrowHttpError(
    DeleteGoalSchema,
    args
  );

  if (!context.user) {
    throw new HttpError(401, "User must be logged in");
  }

  const goal = await context.entities.Goal.findUnique({
    where: { id: data.goalId },
    include: { client: { include: { coach: true } } },
  });

  if (!goal) {
    throw new HttpError(404, "Goal not found");
  }

  // Verify access
  const isClient =
    context.user.id === goal.client.userId && context.user.role === "CLIENT";
  const isCoach =
    goal.client.coachId &&
    context.user.id === goal.client.coach?.userId &&
    context.user.role === "COACH";

  if (!isClient && !isCoach) {
    throw new HttpError(403, "You don't have permission to delete this goal");
  }

  await context.entities.Goal.delete({
    where: { id: data.goalId },
  });

  return { success: true };
};

export const getGoals: GetGoals<any, any> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, "User must be logged in");
  }

  // If clientId is provided, coach can view client's goals
  // Otherwise, client sees their own goals
  const { clientId } = args as any;

  let targetClientId: string;

  if (clientId) {
    // Coach viewing a specific client's goals
    if (context.user.role !== "COACH") {
      throw new HttpError(403, "Only coaches can view client goals this way");
    }

    const clientProfile = await context.entities.ClientProfile.findUnique({
      where: { id: clientId },
      include: { coach: true },
    });

    if (!clientProfile) {
      throw new HttpError(404, "Client not found");
    }

    const coachProfile = await context.entities.CoachProfile.findUnique({
      where: { userId: context.user.id },
    });

    if (!coachProfile || clientProfile.coachId !== coachProfile.id) {
      throw new HttpError(403, "This client is not assigned to you");
    }

    targetClientId = clientId;
  } else {
    // Client viewing their own goals
    if (context.user.role === "CLIENT") {
      const clientProfile = await context.entities.ClientProfile.findUnique({
        where: { userId: context.user.id },
      });

      if (!clientProfile) {
        throw new HttpError(404, "Client profile not found");
      }

      targetClientId = clientProfile.id;
    } else if (context.user.role === "COACH") {
      throw new HttpError(400, "Coach must provide clientId parameter");
    } else {
      throw new HttpError(403, "Unauthorized");
    }
  }

  const goals = await context.entities.Goal.findMany({
    where: { clientId: targetClientId },
    include: {
      milestones: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return goals;
};

export const toggleMilestone: ToggleMilestone<any, any> = async (
  args,
  context
) => {
  const data = await ensureArgsSchemaOrThrowHttpError(
    ToggleMilestoneSchema,
    args
  );

  if (!context.user) {
    throw new HttpError(401, "User must be logged in");
  }

  const milestone = await context.entities.Milestone.findUnique({
    where: { id: data.milestoneId },
    include: {
      goal: {
        include: {
          client: { include: { coach: true } },
        },
      },
    },
  });

  if (!milestone) {
    throw new HttpError(404, "Milestone not found");
  }

  // Verify access
  const isClient =
    context.user.id === milestone.goal.client.userId &&
    context.user.role === "CLIENT";
  const isCoach =
    milestone.goal.client.coachId &&
    context.user.id === milestone.goal.client.coach?.userId &&
    context.user.role === "COACH";

  if (!isClient && !isCoach) {
    throw new HttpError(403, "You don't have permission to update this milestone");
  }

  // Update milestone
  const updatedMilestone = await context.entities.Milestone.update({
    where: { id: data.milestoneId },
    data: {
      completed: data.completed,
    },
  });

  // Recalculate goal progress
  const progress = await calculateGoalProgress(
    milestone.goal.id,
    context.entities
  );

  // Update goal progress
  const updatedGoal = await context.entities.Goal.update({
    where: { id: milestone.goal.id },
    data: {
      progress,
      // Auto-mark as completed if progress reaches 100
      status: progress === 100 ? "COMPLETED" : "IN_PROGRESS",
    },
    include: {
      milestones: {
        orderBy: { order: "asc" },
      },
    },
  });

  return {
    milestone: updatedMilestone,
    goal: updatedGoal,
  };
};

export const updateGoalProgress: UpdateGoalProgress<any, any> = async (
  args,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, "User must be logged in");
  }

  const { goalId } = args as any;

  const goal = await context.entities.Goal.findUnique({
    where: { id: goalId },
    include: { client: { include: { coach: true } } },
  });

  if (!goal) {
    throw new HttpError(404, "Goal not found");
  }

  // Verify access
  const isClient =
    context.user.id === goal.client.userId && context.user.role === "CLIENT";
  const isCoach =
    goal.client.coachId &&
    context.user.id === goal.client.coach?.userId &&
    context.user.role === "COACH";

  if (!isClient && !isCoach) {
    throw new HttpError(403, "You don't have permission to update this goal");
  }

  // Recalculate progress
  const progress = await calculateGoalProgress(goalId, context.entities);

  const updatedGoal = await context.entities.Goal.update({
    where: { id: goalId },
    data: { progress },
    include: { milestones: { orderBy: { order: "asc" } } },
  });

  return updatedGoal;
};
