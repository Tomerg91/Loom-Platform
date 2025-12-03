import type { OperationType } from "wasp/server/operations";
import { HttpError } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "@src/server/validation";

// ============================================
// ZOD VALIDATION SCHEMAS
// ============================================

const createAvailabilitySlotSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timezone: z.string(), // IANA timezone (e.g., "America/New_York")
  notes: z.string().optional(),
});

type CreateAvailabilitySlotInput = z.infer<typeof createAvailabilitySlotSchema>;

const getCoachAvailabilitySchema = z.object({
  coachId: z.string(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

type GetCoachAvailabilityInput = z.infer<typeof getCoachAvailabilitySchema>;

const updateAvailabilitySlotSchema = z.object({
  id: z.string(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  notes: z.string().optional(),
});

type UpdateAvailabilitySlotInput = z.infer<typeof updateAvailabilitySlotSchema>;

const deleteAvailabilitySlotSchema = z.object({
  id: z.string(),
});

type DeleteAvailabilitySlotInput = z.infer<typeof deleteAvailabilitySlotSchema>;

const bookAvailabilitySlotSchema = z.object({
  slotId: z.string(),
});

type BookAvailabilitySlotInput = z.infer<typeof bookAvailabilitySlotSchema>;

const holdAvailabilitySlotSchema = z.object({
  slotId: z.string(),
});

type HoldAvailabilitySlotInput = z.infer<typeof holdAvailabilitySlotSchema>;

const releaseHeldSlotSchema = z.object({
  slotId: z.string(),
});

type ReleaseHeldSlotInput = z.infer<typeof releaseHeldSlotSchema>;

// ============================================
// OPERATIONS
// ============================================

/**
 * Creates an availability slot for a coach
 * Only coaches can create slots
 * Status defaults to OPEN
 */
export const createAvailabilitySlot: OperationType<
  CreateAvailabilitySlotInput,
  any
> = async (rawArgs: any, context: any) => {
  const args = ensureArgsSchemaOrThrowHttpError(
    createAvailabilitySlotSchema,
    rawArgs,
  );

  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  // Only coaches can create availability slots
  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can create availability slots");
  }

  // Verify coach has a profile
  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!coachProfile) {
    throw new HttpError(400, "Coach profile not found");
  }

  // Validate times
  const start = new Date(args.startTime);
  const end = new Date(args.endTime);

  if (start >= end) {
    throw new HttpError(400, "Start time must be before end time");
  }

  if (start < new Date()) {
    throw new HttpError(400, "Cannot create availability slots in the past");
  }

  // Check for conflicts with existing slots
  const conflictingSlot = await context.entities.AvailabilitySlot.findFirst({
    where: {
      coachId: coachProfile.id,
      deletedAt: null,
      status: "OPEN",
      AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
    },
  });

  if (conflictingSlot) {
    throw new HttpError(400, "Availability slot conflicts with existing slot");
  }

  return context.entities.AvailabilitySlot.create({
    data: {
      coachId: coachProfile.id,
      startTime: start,
      endTime: end,
      timezone: args.timezone,
      notes: args.notes,
      status: "OPEN",
    },
  });
};

/**
 * Gets availability slots for a coach
 * Coaches see all their slots (any status)
 * Clients only see OPEN slots for their coach
 */
export const getCoachAvailability: OperationType<
  GetCoachAvailabilityInput,
  any[]
> = async (rawArgs: any, context: any) => {
  const args = ensureArgsSchemaOrThrowHttpError(
    getCoachAvailabilitySchema,
    rawArgs,
  );

  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  // Get the coach profile
  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { id: args.coachId },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach not found");
  }

  // Build query conditions
  const where: any = {
    coachId: args.coachId,
    deletedAt: null,
  };

  // Add date range filter if provided
  if (args.startDate && args.endDate) {
    const start = new Date(args.startDate);
    const end = new Date(args.endDate);

    where.AND = [{ startTime: { gte: start } }, { endTime: { lte: end } }];
  }

  // If user is coach owner, show all statuses
  // If user is client, show only OPEN slots
  if (
    context.user.role === "COACH" &&
    context.user.id === coachProfile.userId
  ) {
    // Coach sees all their slots
  } else if (context.user.role === "CLIENT") {
    // Clients only see OPEN slots
    where.status = "OPEN";
  } else {
    throw new HttpError(403, "Cannot view this coach's availability");
  }

  return context.entities.AvailabilitySlot.findMany({
    where,
    orderBy: { startTime: "asc" },
  });
};

/**
 * Updates an availability slot
 * Only coaches can update, and only OPEN slots can be modified
 */
export const updateAvailabilitySlot: OperationType<
  UpdateAvailabilitySlotInput,
  any
> = async (rawArgs: any, context: any) => {
  const args = ensureArgsSchemaOrThrowHttpError(
    updateAvailabilitySlotSchema,
    rawArgs,
  );

  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can update availability slots");
  }

  // Get the slot
  const slot = await context.entities.AvailabilitySlot.findUnique({
    where: { id: args.id },
  });

  if (!slot) {
    throw new HttpError(404, "Availability slot not found");
  }

  // Verify coach ownership
  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!coachProfile || coachProfile.id !== slot.coachId) {
    throw new HttpError(403, "Cannot update another coach's slot");
  }

  // Only allow updating OPEN slots
  if (slot.status !== "OPEN") {
    throw new HttpError(
      400,
      "Cannot update a slot that has been held or booked",
    );
  }

  // If updating times, validate them
  if (args.startTime && args.endTime) {
    const start = new Date(args.startTime);
    const end = new Date(args.endTime);

    if (start >= end) {
      throw new HttpError(400, "Start time must be before end time");
    }

    // Check for conflicts with other open slots
    const conflictingSlot = await context.entities.AvailabilitySlot.findFirst({
      where: {
        id: { not: args.id },
        coachId: coachProfile.id,
        deletedAt: null,
        status: "OPEN",
        AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }],
      },
    });

    if (conflictingSlot) {
      throw new HttpError(400, "Updated slot conflicts with existing slot");
    }
  }

  return context.entities.AvailabilitySlot.update({
    where: { id: args.id },
    data: {
      startTime: args.startTime ? new Date(args.startTime) : undefined,
      endTime: args.endTime ? new Date(args.endTime) : undefined,
      notes: args.notes,
    },
  });
};

/**
 * Soft deletes an availability slot
 * Only coaches can delete, and only OPEN slots
 */
export const deleteAvailabilitySlot: OperationType<
  DeleteAvailabilitySlotInput,
  any
> = async (rawArgs: any, context: any) => {
  const args = ensureArgsSchemaOrThrowHttpError(
    deleteAvailabilitySlotSchema,
    rawArgs,
  );

  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can delete availability slots");
  }

  // Get the slot
  const slot = await context.entities.AvailabilitySlot.findUnique({
    where: { id: args.id },
  });

  if (!slot) {
    throw new HttpError(404, "Availability slot not found");
  }

  // Verify coach ownership
  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!coachProfile || coachProfile.id !== slot.coachId) {
    throw new HttpError(403, "Cannot delete another coach's slot");
  }

  // Only allow deleting OPEN slots
  if (slot.status !== "OPEN") {
    throw new HttpError(400, "Can only delete open availability slots");
  }

  // Soft delete
  return context.entities.AvailabilitySlot.update({
    where: { id: args.id },
    data: { deletedAt: new Date() },
  });
};

/**
 * Books an availability slot (OPEN → BOOKED)
 * Only clients can book
 * Auto-creates a CoachSession
 */
export const bookAvailabilitySlot: OperationType<
  BookAvailabilitySlotInput,
  any
> = async (rawArgs: any, context: any) => {
  const args = ensureArgsSchemaOrThrowHttpError(
    bookAvailabilitySlotSchema,
    rawArgs,
  );

  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  if (context.user.role !== "CLIENT") {
    throw new HttpError(403, "Only clients can book availability slots");
  }

  // Get the slot
  const slot = await context.entities.AvailabilitySlot.findUnique({
    where: { id: args.slotId },
  });

  if (!slot) {
    throw new HttpError(404, "Availability slot not found");
  }

  if (slot.status !== "OPEN") {
    throw new HttpError(400, "Slot is not available for booking");
  }

  // Get client profile
  const clientProfile = await context.entities.ClientProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!clientProfile) {
    throw new HttpError(400, "Client profile not found");
  }

  // Verify client can only book slots from their coach
  if (clientProfile.coachId !== slot.coachId) {
    throw new HttpError(403, "You can only book slots from your coach");
  }

  // Get coach before transaction
  const coach = await context.entities.CoachProfile.findUnique({
    where: { id: slot.coachId },
  });

  if (!coach) {
    throw new HttpError(500, "Coach not found");
  }

  // Book the slot and create session in atomic transaction
  // This prevents race conditions where two clients could book the same slot
  try {
    const result = await (context.entities as any).$transaction(
      async (tx: any) => {
        // Re-fetch slot within transaction to prevent double-booking
        const currentSlot = await tx.AvailabilitySlot.findUnique({
          where: { id: args.slotId },
        });

        // Double-check slot is still available
        if (!currentSlot || currentSlot.status !== "OPEN") {
          throw new HttpError(400, "Slot is no longer available for booking");
        }

        // Update slot atomically
        const bookedSlot = await tx.AvailabilitySlot.update({
          where: { id: args.slotId },
          data: {
            status: "BOOKED",
            clientId: clientProfile.id,
          },
        });

        // Calculate session number
        const previousSessions = await tx.CoachSession.count({
          where: {
            clientId: clientProfile.id,
            deletedAt: null,
          },
        });

        // Create session in same transaction
        await tx.CoachSession.create({
          data: {
            sessionDate: bookedSlot.startTime,
            sessionNumber: previousSessions + 1,
            coachId: coach.id,
            clientId: clientProfile.id,
          },
        });

        return bookedSlot;
      },
    );

    return result;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(500, "Failed to book availability slot");
  }
};

/**
 * Holds an availability slot (OPEN → HELD)
 * Temporary reservation for 15 minutes
 * Only clients can hold
 */
export const holdAvailabilitySlot: OperationType<
  HoldAvailabilitySlotInput,
  any
> = async (rawArgs: any, context: any) => {
  const args = ensureArgsSchemaOrThrowHttpError(
    holdAvailabilitySlotSchema,
    rawArgs,
  );

  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  if (context.user.role !== "CLIENT") {
    throw new HttpError(403, "Only clients can hold availability slots");
  }

  // Get the slot
  const slot = await context.entities.AvailabilitySlot.findUnique({
    where: { id: args.slotId },
  });

  if (!slot) {
    throw new HttpError(404, "Availability slot not found");
  }

  if (slot.status !== "OPEN") {
    throw new HttpError(400, "Slot is not available for holding");
  }

  // Get client profile
  const clientProfile = await context.entities.ClientProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!clientProfile) {
    throw new HttpError(400, "Client profile not found");
  }

  // Verify client can only hold slots from their coach
  if (clientProfile.coachId !== slot.coachId) {
    throw new HttpError(403, "You can only hold slots from your coach");
  }

  // Hold the slot
  return context.entities.AvailabilitySlot.update({
    where: { id: args.slotId },
    data: {
      status: "HELD",
      clientId: clientProfile.id,
    },
  });
};

/**
 * Releases a held availability slot (HELD → OPEN)
 * Can be triggered by client or by cron job for expired holds
 */
export const releaseHeldSlot: OperationType<ReleaseHeldSlotInput, any> = async (
  rawArgs: any,
  context: any,
) => {
  const args = ensureArgsSchemaOrThrowHttpError(releaseHeldSlotSchema, rawArgs);

  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  // Get the slot
  const slot = await context.entities.AvailabilitySlot.findUnique({
    where: { id: args.slotId },
  });

  if (!slot) {
    throw new HttpError(404, "Availability slot not found");
  }

  if (slot.status !== "HELD") {
    throw new HttpError(400, "Slot is not currently held");
  }

  // If client, verify they own the hold
  if (context.user.role === "CLIENT") {
    const clientProfile = await context.entities.ClientProfile.findUnique({
      where: { userId: context.user.id },
    });

    if (!clientProfile || clientProfile.id !== slot.clientId) {
      throw new HttpError(403, "You cannot release this hold");
    }
  } else if (context.user.role !== "ADMIN") {
    // Only admin and client can release
    throw new HttpError(403, "Cannot release this hold");
  }

  // Release the hold
  return context.entities.AvailabilitySlot.update({
    where: { id: args.slotId },
    data: {
      status: "OPEN",
      clientId: null,
    },
  });
};
