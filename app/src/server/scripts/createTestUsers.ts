import { type PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Helper to ensure we don't accidentally seed production unless confirmed
const isProduction = process.env["NODE_ENV"] === "production";

function ensureDevSeedAllowed(seedName: string) {
  const allowProdSeeds = process.env["ALLOW_PRODUCTION_SEEDS"] === "true";

  if (isProduction && !allowProdSeeds) {
    throw new Error(
      `${seedName} is disabled in production. Set ALLOW_PRODUCTION_SEEDS=true to override for a one-off run.`,
    );
  }
}

export async function createTestUsers(prisma: PrismaClient) {
  ensureDevSeedAllowed("createTestUsers");

  console.log("🚀 Starting seed: createTestUsers...");

  const passwordRaw = "password123";
  const hashedPassword = await bcrypt.hash(passwordRaw, 10);

  // Define users to create
  // Note: The prompt requested 'user@app.com' for multiple roles, but email must be unique.
  // We are using distinct emails for each role to accommodate all requested user types.
  const usersToCreate = [
    {
      email: "admin@app.com",
      username: "adminUser",
      role: "ADMIN" as const,
      isAdmin: true,
      description: "Admin User",
    },
    {
      email: "coach@app.com",
      username: "coachUser",
      role: "COACH" as const,
      isAdmin: false,
      description: "Coach User",
      // Coach needs a profile
      setupProfile: async (userId: string) => {
        await prisma.coachProfile.create({
          data: {
            userId,
          },
        });
      },
    },
    {
      email: "client@app.com",
      username: "clientUser",
      role: "CLIENT" as const,
      isAdmin: false,
      description: "Client User",
      // Client needs a profile and likely a coach. We'll link to our seeded coach if available, or just create profile.
      setupProfile: async (userId: string) => {
        // Try to find the coach we just created
        const coachUser = await prisma.user.findUnique({
          where: { email: "coach@app.com" },
          include: { coachProfile: true },
        });

        await prisma.clientProfile.create({
          data: {
            userId,
            clientType: "REGISTERED",
            // Link to coach if exists, otherwise leave null (orphan client)
            coachId: coachUser?.coachProfile?.id,
          },
        });
      },
    },
    {
      email: "clinic@app.com",
      username: "clinicUser",
      role: "COACH" as const, // Clinics are owned by Coaches (usually)
      isAdmin: false,
      description: "Clinic User (Coach with Clinic)",
      setupProfile: async (userId: string) => {
        // Create Coach Profile
        const coachProfile = await prisma.coachProfile.create({
          data: {
            userId,
          },
        });

        // Create Clinic
        await prisma.clinic.create({
          data: {
            name: "Test Clinic",
            ownerId: userId,
            // Add this coach as a member with OWNER role (if schema supports it, strictly schema says members relation)
            members: {
              connect: { id: coachProfile.id },
            },
          },
        });

        // Note: The schema has `clinicRole` on CoachProfile, we should update that too
        await prisma.coachProfile.update({
          where: { id: coachProfile.id },
          data: {
            clinicRole: "OWNER",
            // The `members` connect above links the relation, but we might want to ensure clinicId is set if it wasn't auto-set by connect (Prisma usually handles it).
            // But let's be explicit if needed. The connect above does set clinicId on the coachProfile side.
          },
        });
      },
    },
  ];

  for (const userDef of usersToCreate) {
    const existing = await prisma.user.findUnique({
      where: { email: userDef.email },
    });

    if (existing) {
      console.log(`ℹ️  User ${userDef.email} already exists. Skipping.`);
      continue;
    }

    console.log(`Creating ${userDef.description} (${userDef.email})...`);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email: userDef.email,
        username: userDef.username,
        role: userDef.role,
        isAdmin: userDef.isAdmin,
        isEmailVerified: true,
        onboardingCompleted: true,
        auth: {
          create: {
            identities: {
              create: {
                providerName: "email",
                providerUserId: userDef.email,
                providerData: JSON.stringify({
                  hashedPassword: hashedPassword,
                  isEmailVerified: true,
                  emailVerificationSentAt: null,
                  passwordResetSentAt: null,
                }),
              },
            },
          },
        },
      },
    });

    // Setup extra profile data if defined
    if (userDef.setupProfile) {
      await userDef.setupProfile(user.id);
    }
  }

  console.log("\n✅ Users seeding complete.");
  console.log("---------------------------------------------------");
  console.log("Admin:  admin@app.com  / password123");
  console.log("Coach:  coach@app.com  / password123");
  console.log("Client: client@app.com / password123");
  console.log("Clinic: clinic@app.com / password123");
  console.log("---------------------------------------------------\n");
}
