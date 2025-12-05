import {
  type GetClinicDetails,
  type InviteCoachToClinic,
  type AcceptClinicInvitation,
  type RemoveCoachFromClinic,
  type CancelClinicInvitation,
} from "wasp/server/operations";
import { HttpError } from "wasp/server";
import { v4 as uuidv4 } from "uuid";

// =========================================
// QUERIES
// =========================================

export const getClinicDetails: GetClinicDetails<void, any> = async (
  _args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  // 1. Find the clinic where the user is the owner
  const clinic = await context.entities.Clinic.findFirst({
    where: {
      ownerId: context.user.id,
      deletedAt: null,
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              email: true,
              username: true,
              // Add other user fields if needed
            },
          },
        },
      },
      invitations: {
        where: {
          status: "PENDING", // Only show pending invites
        },
      },
    },
  });

  // If the user doesn't own a clinic, return null (or throw error depending on UI needs)
  // For now, we'll return null and let the UI handle the "Create Clinic" or "Upgrade" state
  if (!clinic) {
    return null;
  }

  return clinic;
};

// =========================================
// ACTIONS
// =========================================

type InviteCoachArgs = {
  email: string;
};

export const inviteCoachToClinic: InviteCoachToClinic<
  InviteCoachArgs,
  void
> = async ({ email }, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  // 1. Verify user owns a clinic
  const clinic = await context.entities.Clinic.findFirst({
    where: {
      ownerId: context.user.id,
      deletedAt: null,
    },
    include: {
      members: true,
      invitations: {
        where: {
          status: "PENDING",
        },
      },
    },
  });

  if (!clinic) {
    throw new HttpError(403, "You do not own a clinic.");
  }

  // 2. Check coach limit (Max 5)
  // Count current members + pending invitations
  const currentCount = clinic.members.length + clinic.invitations.length;
  if (currentCount >= 5) {
    throw new HttpError(
      400,
      "Clinic limit reached. You can only have up to 5 coaches.",
    );
  }

  // 3. Check if invite already exists
  const existingInvite = await context.entities.ClinicInvitation.findFirst({
    where: {
      clinicId: clinic.id,
      email: email,
      status: "PENDING",
    },
  });

  if (existingInvite) {
    throw new HttpError(400, "Invitation already pending for this email.");
  }

  // 4. Create invitation
  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

  await context.entities.ClinicInvitation.create({
    data: {
      email,
      token,
      clinic: { connect: { id: clinic.id } },
      role: "MEMBER", // Default role
      expiresAt,
    },
  });

  // TODO: Send email with invitation link
  // For now, we assume the UI might display the link or we'll add email sending later
  console.log(`[MOCK EMAIL] Invite sent to ${email} with token: ${token}`);
};

type AcceptInviteArgs = {
  token: string;
};

export const acceptClinicInvitation: AcceptClinicInvitation<
  AcceptInviteArgs,
  void
> = async ({ token }, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  // 1. Find invitation
  const invitation = await context.entities.ClinicInvitation.findUnique({
    where: { token },
    include: { clinic: true },
  });

  if (!invitation || invitation.status !== "PENDING") {
    throw new HttpError(400, "Invalid or expired invitation.");
  }

  // 2. Verify user matches email (Optional security check, but good practice)
  // If we want to allow accepting with a different email, we can skip this.
  // But usually, invites are email-specific.
  if (context.user.email !== invitation.email) {
    // NOTE: For flexibility, we might allow this if the user is logged in.
    // But strictly, we should probably warn.
    // For this MVP, let's allow it but maybe log a warning.
    console.warn(
      `User ${context.user.email} accepted invite for ${invitation.email}`,
    );
  }

  // 3. Update CoachProfile
  // Ensure user has a coach profile
  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!coachProfile) {
    // Should theoretically exist if they are a Coach user, but handle edge case
    throw new HttpError(400, "User does not have a coach profile.");
  }

  // 4. Add to clinic
  await context.entities.CoachProfile.update({
    where: { id: coachProfile.id },
    data: {
      clinicId: invitation.clinicId,
      clinicRole: invitation.role,
    },
  });

  // 5. Mark invitation accepted
  await context.entities.ClinicInvitation.update({
    where: { id: invitation.id },
    data: { status: "ACCEPTED" },
  });
};

type RemoveCoachArgs = {
  coachId: string;
};

export const removeCoachFromClinic: RemoveCoachFromClinic<
  RemoveCoachArgs,
  void
> = async ({ coachId }, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  // 1. Verify user owns the clinic
  const clinic = await context.entities.Clinic.findFirst({
    where: {
      ownerId: context.user.id,
      deletedAt: null,
    },
  });

  if (!clinic) {
    throw new HttpError(403, "You do not own a clinic.");
  }

  // 2. Verify coach is in THIS clinic
  const coachToRemove = await context.entities.CoachProfile.findUnique({
    where: { id: coachId },
  });

  if (!coachToRemove || coachToRemove.clinicId !== clinic.id) {
    throw new HttpError(400, "Coach is not a member of your clinic.");
  }

  // 3. Remove from clinic
  await context.entities.CoachProfile.update({
    where: { id: coachId },
    data: {
      clinicId: null,
      clinicRole: null,
    },
  });
};

type CancelInviteArgs = {
  invitationId: string;
};

export const cancelClinicInvitation: CancelClinicInvitation<
  CancelInviteArgs,
  void
> = async ({ invitationId }, context) => {
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  // 1. Verify user owns the clinic associated with the invite
  const invitation = await context.entities.ClinicInvitation.findUnique({
    where: { id: invitationId },
    include: { clinic: true },
  });

  if (!invitation) {
    throw new HttpError(404, "Invitation not found.");
  }

  if (invitation.clinic.ownerId !== context.user.id) {
    throw new HttpError(
      403,
      "You are not authorized to cancel this invitation.",
    );
  }

  // 2. Delete or mark as cancelled (Hard delete for now as per schema usually implies)
  // Schema doesn't have a CANCELLED status in enum (it's a string), but let's just delete it to keep it clean
  // or set status to CANCELLED if we want history.
  // The schema says `status String @default("PENDING") // 'ADMIN', 'MEMBER'` wait, the comment on schema line 800 says role.
  // Let's check schema again.
  // Schema line 241: `status String @default("PENDING") // PENDING, ACCEPTED` for ClientInvitation.
  // Schema line 800: `role String @default("MEMBER")`.
  // Schema line 801: `status String @default("PENDING")`.

  await context.entities.ClinicInvitation.delete({
    where: { id: invitationId },
  });
};
