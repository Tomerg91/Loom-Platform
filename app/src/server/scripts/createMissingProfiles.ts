import type { PrismaClient } from "@prisma/client";

/**
 * Creates CoachProfile for all COACH users who don't have one
 * and ClientProfile for all CLIENT users who don't have one.
 *
 * Run this script with: wasp db seed --name=createMissingProfiles
 */
export async function createMissingProfiles(prismaClient: PrismaClient) {
  console.log("🔍 Checking for users without profiles...");

  // Find all COACH users without a CoachProfile
  const coachesWithoutProfile = await prismaClient.user.findMany({
    where: {
      role: "COACH",
      coachProfile: null,
    },
  });

  // Find all CLIENT users without a ClientProfile
  const clientsWithoutProfile = await prismaClient.user.findMany({
    where: {
      role: "CLIENT",
      clientProfile: null,
    },
  });

  console.log(`Found ${coachesWithoutProfile.length} coaches without profiles`);
  console.log(`Found ${clientsWithoutProfile.length} clients without profiles`);

  // Create CoachProfiles
  for (const coach of coachesWithoutProfile) {
    await prismaClient.coachProfile.create({
      data: {
        userId: coach.id,
      },
    });
    console.log(`✅ Created CoachProfile for user: ${coach.email}`);
  }

  // Create ClientProfiles
  for (const client of clientsWithoutProfile) {
    await prismaClient.clientProfile.create({
      data: {
        userId: client.id,
      },
    });
    console.log(`✅ Created ClientProfile for user: ${client.email}`);
  }

  console.log("✨ Done! All profiles created.");
}
