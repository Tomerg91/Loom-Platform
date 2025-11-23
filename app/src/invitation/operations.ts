import { HttpError } from "wasp/server";
import type {
  InviteClient,
  AcceptInvitation,
  GetPendingInvitations,
} from "wasp/server/operations";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { emailSender } from "wasp/server/email";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ============================================
// INVITE CLIENT
// ============================================
const inviteClientSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type InviteClientInput = z.infer<typeof inviteClientSchema>;

export const inviteClient: InviteClient<InviteClientInput, void> = async (
  rawArgs,
  context
) => {
  const { email } = ensureArgsSchemaOrThrowHttpError(
    inviteClientSchema,
    rawArgs
  );

  if (!context.user) {
    throw new HttpError(401, "You must be logged in to invite clients");
  }

  // Ensure user is a COACH
  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can invite clients");
  }

  // Get the coach profile
  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { userId: context.user.id },
  });

  if (!coachProfile) {
    throw new HttpError(404, "Coach profile not found");
  }

  // Check if user already exists
  const existingUser = await context.entities.User.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new HttpError(
      400,
      "A user with this email already exists. Please use a different email."
    );
  }

  // Check if invitation already exists and is pending
  const existingInvitation = await context.entities.ClientInvitation.findFirst({
    where: {
      email,
      status: "PENDING",
    },
  });

  if (existingInvitation) {
    throw new HttpError(
      400,
      "An invitation has already been sent to this email."
    );
  }

  // Generate secure token
  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  // Create invitation
  await context.entities.ClientInvitation.create({
    data: {
      email,
      token,
      coachId: coachProfile.id,
      expiresAt,
    },
  });

  // Send invitation email
  const invitationLink = `${process.env.WASP_WEB_CLIENT_URL}/accept-invite?token=${token}`;

  try {
    await emailSender.send({
      to: email,
      subject: "You've been invited to join Loom Platform",
      text: `You've been invited by ${context.user.email} to join Loom Platform as a client. Click the link to accept: ${invitationLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Loom Platform!</h2>
          <p>You've been invited by <strong>${context.user.email}</strong> to join as a client.</p>
          <p>Click the button below to set up your account:</p>
          <a href="${invitationLink}"
             style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Accept Invitation
          </a>
          <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
          <p style="color: #666; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    // Log the invitation link for development
    console.log("\n" + "=".repeat(60));
    console.log("📧 INVITATION EMAIL (Development Mode)");
    console.log("=".repeat(60));
    console.log("To:", email);
    console.log("From:", context.user.email);
    console.log("Invitation Link:");
    console.log(invitationLink);
    console.log("=".repeat(60) + "\n");
  }
};

// ============================================
// ACCEPT INVITATION
// ============================================
const acceptInvitationSchema = z.object({
  token: z.string().nonempty("Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  username: z.string().min(2, "Name must be at least 2 characters"),
});

type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const acceptInvitation: AcceptInvitation<
  AcceptInvitationInput,
  void
> = async (rawArgs, context) => {
  const { token, password, username } = ensureArgsSchemaOrThrowHttpError(
    acceptInvitationSchema,
    rawArgs
  );

  // Find invitation
  const invitation = await context.entities.ClientInvitation.findUnique({
    where: { token },
    include: {
      coach: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new HttpError(404, "Invalid invitation token");
  }

  // Check if expired
  if (new Date() > invitation.expiresAt) {
    throw new HttpError(400, "This invitation has expired");
  }

  // Check if already accepted
  if (invitation.status === "ACCEPTED") {
    throw new HttpError(400, "This invitation has already been used");
  }

  // Check if user already exists (edge case)
  const existingUser = await context.entities.User.findUnique({
    where: { email: invitation.email },
  });

  if (existingUser) {
    throw new HttpError(400, "An account with this email already exists");
  }

  // Create the client user with hashed password
  const hashedPassword = await hashPassword(password);

  const newUser = await context.entities.User.create({
    data: {
      email: invitation.email,
      username,
      // Using 'as any' because Wasp hides the password field from types but requires it
      // The hash function returns the properly formatted password for Wasp's auth system
      ...(hashedPassword && { password: hashedPassword as any }),
      role: "CLIENT",
      isEmailVerified: true, // Auto-verify invited clients
    },
  });

  // Create client profile and link to coach
  await context.entities.ClientProfile.create({
    data: {
      userId: newUser.id,
      coachId: invitation.coachId,
    },
  });

  // Mark invitation as accepted
  await context.entities.ClientInvitation.update({
    where: { id: invitation.id },
    data: { status: "ACCEPTED" },
  });
};

// ============================================
// GET PENDING INVITATIONS (for coach dashboard)
// ============================================
type PendingInvitation = {
  id: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
};

export const getPendingInvitations: GetPendingInvitations<
  void,
  PendingInvitation[]
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "You must be logged in");
  }

  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can view invitations");
  }

  const coachProfile = await context.entities.CoachProfile.findUnique({
    where: { userId: context.user.id },
    include: {
      invitations: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!coachProfile) {
    return [];
  }

  return coachProfile.invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    createdAt: inv.createdAt,
    expiresAt: inv.expiresAt,
  }));
};

// ============================================
// HELPER FUNCTIONS
// ============================================
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
