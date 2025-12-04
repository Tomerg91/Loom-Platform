import { defineUserSignupFields } from "wasp/auth/providers/types";
import { z } from "zod";

const adminEmails = process.env["ADMIN_EMAILS"]?.split(",") || [];

// ============================================
// EMAIL SIGNUP
// ============================================
const emailDataSchema = z.object({
  email: z.string(),
});

export const getEmailUserFields = defineUserSignupFields({
  email: (data) => {
    const emailData = emailDataSchema.parse(data);
    return emailData.email;
  },
  username: (data) => {
    const emailData = emailDataSchema.parse(data);
    return emailData.email;
  },
  isAdmin: (data) => {
    const emailData = emailDataSchema.parse(data);
    return adminEmails.includes(emailData.email);
  },
  role: () => "COACH" as const, // All public signups default to COACH
  isEmailVerified: () => false,
  // Auto-create the CoachProfile using Prisma nested write
  coachProfile: () => ({
    create: {},
  }),
});

// ============================================
// GOOGLE SIGNUP
// ============================================
const googleDataSchema = z.object({
  profile: z.object({
    email: z.string(),
    email_verified: z.boolean(),
    name: z.string().optional(),
  }),
});

export const getGoogleUserFields = defineUserSignupFields({
  email: (data) => {
    const googleData = googleDataSchema.parse(data);
    return googleData.profile.email;
  },
  username: (data) => {
    const googleData = googleDataSchema.parse(data);
    // Use name if available, fallback to email
    return googleData.profile.name || googleData.profile.email;
  },
  isAdmin: (data) => {
    const googleData = googleDataSchema.parse(data);
    if (!googleData.profile.email_verified) {
      return false;
    }
    return adminEmails.includes(googleData.profile.email);
  },
  role: () => "COACH" as const, // All public signups default to COACH
  isEmailVerified: (data) => {
    const googleData = googleDataSchema.parse(data);
    return googleData.profile.email_verified;
  },
  // Auto-create the CoachProfile using Prisma nested write
  coachProfile: () => ({
    create: {},
  }),
});

export function getGoogleAuthConfig() {
  return {
    scopes: ["profile", "email"], // must include at least 'profile' for Google
  };
}

// ============================================
// GITHUB SIGNUP
// ============================================
const githubDataSchema = z.object({
  profile: z.object({
    emails: z
      .array(
        z.object({
          email: z.string(),
          verified: z.boolean(),
        }),
      )
      .min(
        1,
        "You need to have an email address associated with your GitHub account to sign up.",
      ),
    login: z.string(),
  }),
});

export const getGitHubUserFields = defineUserSignupFields({
  email: (data) => {
    const githubData = githubDataSchema.parse(data);
    return getGithubEmailInfo(githubData).email;
  },
  username: (data) => {
    const githubData = githubDataSchema.parse(data);
    return githubData.profile.login;
  },
  isAdmin: (data) => {
    const githubData = githubDataSchema.parse(data);
    const emailInfo = getGithubEmailInfo(githubData);
    if (!emailInfo.verified) {
      return false;
    }
    return adminEmails.includes(emailInfo.email);
  },
  role: () => "COACH" as const, // All public signups default to COACH
  isEmailVerified: (data) => {
    const githubData = githubDataSchema.parse(data);
    return getGithubEmailInfo(githubData).verified;
  },
  // Auto-create the CoachProfile using Prisma nested write
  coachProfile: () => ({
    create: {},
  }),
});

function getGithubEmailInfo(githubData: z.infer<typeof githubDataSchema>) {
  const emailInfo = githubData.profile.emails[0];
  if (!emailInfo) {
    throw new Error("No email information available from GitHub");
  }
  return emailInfo;
}

export function getGitHubAuthConfig() {
  return {
    scopes: ["user"],
  };
}

// ============================================
// DISCORD SIGNUP
// ============================================
const discordDataSchema = z.object({
  profile: z.object({
    username: z.string(),
    email: z.string().email().nullable(),
    verified: z.boolean().nullable(),
  }),
});

export const getDiscordUserFields = defineUserSignupFields({
  email: (data) => {
    const discordData = discordDataSchema.parse(data);
    // Users need to have an email for payment processing.
    if (!discordData.profile.email) {
      throw new Error(
        "You need to have an email address associated with your Discord account to sign up.",
      );
    }
    return discordData.profile.email;
  },
  username: (data) => {
    const discordData = discordDataSchema.parse(data);
    return discordData.profile.username;
  },
  isAdmin: (data) => {
    const discordData = discordDataSchema.parse(data);
    if (!discordData.profile.email || !discordData.profile.verified) {
      return false;
    }
    return adminEmails.includes(discordData.profile.email);
  },
  role: () => "COACH" as const, // All public signups default to COACH
  isEmailVerified: (data) => {
    const discordData = discordDataSchema.parse(data);
    return discordData.profile.verified || false;
  },
  // Auto-create the CoachProfile using Prisma nested write
  coachProfile: () => ({
    create: {},
  }),
});

export function getDiscordAuthConfig() {
  return {
    scopes: ["identify", "email"],
  };
}
