import { faker } from "@faker-js/faker";
import type { PrismaClient, BodyZone } from "@prisma/client";
import { type User } from "wasp/entities";
import {
  getSubscriptionPaymentPlanIds,
  SubscriptionStatus,
} from "../../payment/plans";

type MockUserData = Omit<User, "id" | "onboardingSteps">;

/**
 * This function, which we've imported in `app.db.seeds` in the `main.wasp` file,
 * seeds the database with mock users via the `wasp db seed` command.
 * For more info see: https://wasp.sh/docs/data-model/backends#seeding-the-database
 */
export async function seedMockUsers(prismaClient: PrismaClient) {
  await Promise.all(
    generateMockUsersData(50).map((data) =>
      prismaClient.user.create({
        data: {
          ...data,
          // Auto-create CoachProfile for COACH users
          coachProfile: data.role === "COACH" ? { create: {} } : undefined,
        },
      })
    )
  );
}

function generateMockUsersData(numOfUsers: number): MockUserData[] {
  return faker.helpers.multiple(generateMockUserData, { count: numOfUsers });
}

function generateMockUserData(): MockUserData {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const subscriptionStatus =
    faker.helpers.arrayElement<SubscriptionStatus | null>([
      ...Object.values(SubscriptionStatus),
      null,
    ]);
  const now = new Date();
  const createdAt = faker.date.past({ refDate: now });
  const timePaid = faker.date.between({ from: createdAt, to: now });
  const credits = subscriptionStatus
    ? 0
    : faker.number.int({ min: 0, max: 10 });
  const hasUserPaidOnStripe = !!subscriptionStatus || credits > 3;
  return {
    email: faker.internet.email({ firstName, lastName }),
    username: faker.internet.userName({ firstName, lastName }),
    createdAt,
    role: "COACH", // All seed users are coaches
    isAdmin: false,
    isEmailVerified: true,
    emailVerificationToken: null,
    passwordResetToken: null,
    credits,
    subscriptionStatus,
    lemonSqueezyCustomerPortalUrl: null,
    paymentProcessorUserId: hasUserPaidOnStripe
      ? `cus_test_${faker.string.uuid()}`
      : null,
    datePaid: hasUserPaidOnStripe
      ? faker.date.between({ from: createdAt, to: timePaid })
      : null,
    subscriptionPlan: subscriptionStatus
      ? faker.helpers.arrayElement(getSubscriptionPaymentPlanIds())
      : null,
    tranzillaToken: null, // Mock users don't have Tranzilla tokens
    preferredLanguage: "he", // Default language is Hebrew
    onboardingCompleted: false,
  };
}

/**
 * Seeds the database with a test coach and multiple test clients
 * with realistic data for development and testing.
 *
 * To use in development, signup with:
 * - Coach: coach@test.com (then invite clients)
 * - Or use existing clients if they were seeded
 */
export async function seedTestCoachWithClients(prismaClient: PrismaClient) {
  const now = new Date();
  const bodyZones: BodyZone[] = [
    "HEAD",
    "THROAT",
    "CHEST",
    "SOLAR_PLEXUS",
    "BELLY",
    "PELVIS",
    "ARMS",
    "LEGS",
  ];
  const sensations = [
    "Tight",
    "Hot",
    "Vibrating",
    "Tense",
    "Relaxed",
    "Numb",
    "Tingling",
  ];

  // Create test coach
  console.log("Creating test coach...");
  const coach = await prismaClient.user.create({
    data: {
      email: "coach@test.com",
      username: "testcoach",
      role: "COACH",
      isAdmin: false,
      isEmailVerified: true,
      emailVerificationToken: null,
      passwordResetToken: null,
      credits: 100,
      subscriptionStatus: null,
      lemonSqueezyCustomerPortalUrl: null,
      paymentProcessorUserId: null,
      datePaid: null,
      subscriptionPlan: null,
      tranzillaToken: null,
      preferredLanguage: "he",
      onboardingCompleted: false,
      coachProfile: {
        create: {},
      },
    },
    include: {
      coachProfile: true,
    },
  });

  console.log("\n=== TEST COACH CREATED ===");
  console.log("Coach Account:");
  console.log("  Email: coach@test.com");
  console.log("  Signup at: http://localhost:3000/signup\n");

  // Create Client 1: Active Client with lots of data
  console.log("Creating Client 1 (Active)...");
  const client1 = await prismaClient.user.create({
    data: {
      email: "client1@test.com",
      username: "testclient1",
      role: "CLIENT",
      isAdmin: false,
      isEmailVerified: true,
      emailVerificationToken: null,
      passwordResetToken: null,
      credits: 0,
      subscriptionStatus: null,
      lemonSqueezyCustomerPortalUrl: null,
      paymentProcessorUserId: null,
      datePaid: null,
      subscriptionPlan: null,
      tranzillaToken: null,
      preferredLanguage: "he",
      onboardingCompleted: false,
      clientProfile: {
        create: {
          coachId: coach.coachProfile!.id,
          clientType: "REGISTERED",
          scheduleDay: 1, // Monday
          scheduleTime: "14:00",
          scheduleTimezone: "Asia/Jerusalem",
          nextSessionDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          sessionCount: 5,
        },
      },
    },
    include: {
      clientProfile: true,
    },
  });

  console.log("Client 1 Account (Active):");
  console.log("  Email: client1@test.com\n");

  // Create somatic logs for client1
  for (let i = 0; i < 10; i++) {
    await prismaClient.somaticLog.create({
      data: {
        clientId: client1.clientProfile!.id,
        bodyZone: bodyZones[i % bodyZones.length],
        sensation: sensations[Math.floor(Math.random() * sensations.length)],
        intensity: Math.floor(Math.random() * 10) + 1,
        note: `Test somatic log ${i + 1}`,
        createdAt: new Date(now.getTime() - (10 - i) * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Create sessions for client1
  for (let i = 1; i <= 5; i++) {
    await prismaClient.coachSession.create({
      data: {
        coachId: coach.coachProfile!.id,
        clientId: client1.clientProfile!.id,
        sessionNumber: i,
        sessionDate: new Date(now.getTime() - (5 - i) * 14 * 24 * 60 * 60 * 1000),
        topic: `Session ${i} - Focus Topic`,
        privateNotes: `Private coach notes for session ${i}. Client showing good progress.`,
        sharedSummary: `Session ${i} summary. Key takeaways and action items for next week.`,
        somaticAnchor: bodyZones[i % bodyZones.length],
        createdAt: new Date(now.getTime() - (5 - i) * 14 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Create goals for client1
  const goal1 = await prismaClient.goal.create({
    data: {
      clientId: client1.clientProfile!.id,
      title: "Reduce Neck Tension",
      type: "SMART",
      status: "IN_PROGRESS",
      progress: 60,
      dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
    },
  });

  await prismaClient.milestone.createMany({
    data: [
      {
        goalId: goal1.id,
        text: "Complete breathing exercises daily",
        completed: true,
        order: 1,
      },
      {
        goalId: goal1.id,
        text: "Practice progressive muscle relaxation",
        completed: true,
        order: 2,
      },
      {
        goalId: goal1.id,
        text: "Maintain relaxed posture during work",
        completed: false,
        order: 3,
      },
    ],
  });

  const goal2 = await prismaClient.goal.create({
    data: {
      clientId: client1.clientProfile!.id,
      title: "Increase Body Awareness",
      type: "OKR",
      status: "IN_PROGRESS",
      progress: 40,
      dueDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prismaClient.milestone.createMany({
    data: [
      {
        goalId: goal2.id,
        text: "Log somatic sensations 3x per week",
        completed: true,
        order: 1,
      },
      {
        goalId: goal2.id,
        text: "Identify emotional triggers in body",
        completed: false,
        order: 2,
      },
    ],
  });

  const goal3 = await prismaClient.goal.create({
    data: {
      clientId: client1.clientProfile!.id,
      title: "Improve Sleep Quality",
      type: "HABIT",
      status: "COMPLETED",
      progress: 100,
      dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    },
  });

  await prismaClient.milestone.createMany({
    data: [
      {
        goalId: goal3.id,
        text: "Establish consistent bedtime routine",
        completed: true,
        order: 1,
      },
      {
        goalId: goal3.id,
        text: "Reduce screen time 1 hour before bed",
        completed: true,
        order: 2,
      },
      {
        goalId: goal3.id,
        text: "Track sleep patterns for 4 weeks",
        completed: true,
        order: 3,
      },
    ],
  });

  // Create Client 2: New Client with minimal data
  console.log("Creating Client 2 (New)...");
  const client2 = await prismaClient.user.create({
    data: {
      email: "client2@test.com",
      username: "testclient2",
      role: "CLIENT",
      isAdmin: false,
      isEmailVerified: true,
      emailVerificationToken: null,
      passwordResetToken: null,
      credits: 0,
      subscriptionStatus: null,
      lemonSqueezyCustomerPortalUrl: null,
      paymentProcessorUserId: null,
      datePaid: null,
      subscriptionPlan: null,
      tranzillaToken: null,
      preferredLanguage: "he",
      onboardingCompleted: false,
      clientProfile: {
        create: {
          coachId: coach.coachProfile!.id,
          clientType: "REGISTERED",
          sessionCount: 1,
        },
      },
    },
    include: {
      clientProfile: true,
    },
  });

  console.log("Client 2 Account (New):");
  console.log("  Email: client2@test.com\n");

  // Create introductory session for client2
  await prismaClient.coachSession.create({
    data: {
      coachId: coach.coachProfile!.id,
      clientId: client2.clientProfile!.id,
      sessionNumber: 1,
      sessionDate: now,
      topic: "Introductory Session",
      privateNotes: "First session. Client interested in somatic practices.",
      sharedSummary: "Welcome! We discussed your wellness goals and initial direction.",
      somaticAnchor: "CHEST" as BodyZone,
      createdAt: now,
    },
  });

  // Create one goal for client2
  const goal2_1 = await prismaClient.goal.create({
    data: {
      clientId: client2.clientProfile!.id,
      title: "Start Somatic Practice",
      type: "SMART",
      status: "NOT_STARTED",
      progress: 0,
      dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: now,
    },
  });

  await prismaClient.milestone.createMany({
    data: [
      {
        goalId: goal2_1.id,
        text: "Learn basic body scanning technique",
        completed: false,
        order: 1,
      },
      {
        goalId: goal2_1.id,
        text: "Practice for 10 minutes daily",
        completed: false,
        order: 2,
      },
    ],
  });

  // Create Client 3: Progress Client
  console.log("Creating Client 3 (Progress)...");
  const client3 = await prismaClient.user.create({
    data: {
      email: "client3@test.com",
      username: "testclient3",
      role: "CLIENT",
      isAdmin: false,
      isEmailVerified: true,
      emailVerificationToken: null,
      passwordResetToken: null,
      credits: 0,
      subscriptionStatus: null,
      lemonSqueezyCustomerPortalUrl: null,
      paymentProcessorUserId: null,
      datePaid: null,
      subscriptionPlan: null,
      tranzillaToken: null,
      preferredLanguage: "he",
      onboardingCompleted: false,
      clientProfile: {
        create: {
          coachId: coach.coachProfile!.id,
          clientType: "REGISTERED",
          scheduleDay: 3, // Wednesday
          scheduleTime: "10:00",
          scheduleTimezone: "Asia/Jerusalem",
          nextSessionDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          sessionCount: 3,
        },
      },
    },
    include: {
      clientProfile: true,
    },
  });

  console.log("Client 3 Account (Progress):");
  console.log("  Email: client3@test.com\n");

  // Create somatic logs for client3
  for (let i = 0; i < 5; i++) {
    await prismaClient.somaticLog.create({
      data: {
        clientId: client3.clientProfile!.id,
        bodyZone: bodyZones[i % bodyZones.length],
        sensation: sensations[Math.floor(Math.random() * sensations.length)],
        intensity: Math.floor(Math.random() * 10) + 1,
        note: `Somatic observation ${i + 1}`,
        createdAt: new Date(now.getTime() - (5 - i) * 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Create sessions for client3
  for (let i = 1; i <= 3; i++) {
    await prismaClient.coachSession.create({
      data: {
        coachId: coach.coachProfile!.id,
        clientId: client3.clientProfile!.id,
        sessionNumber: i,
        sessionDate: new Date(now.getTime() - (3 - i) * 14 * 24 * 60 * 60 * 1000),
        topic: `Session ${i} Focus`,
        privateNotes: `Coach notes from session ${i}.`,
        sharedSummary: `Session ${i} recap and insights.`,
        somaticAnchor: bodyZones[(i + 2) % bodyZones.length],
        createdAt: new Date(now.getTime() - (3 - i) * 14 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Create goals for client3
  const goal3_1 = await prismaClient.goal.create({
    data: {
      clientId: client3.clientProfile!.id,
      title: "Overcome Anxiety",
      type: "SMART",
      status: "COMPLETED",
      progress: 100,
      dueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
    },
  });

  await prismaClient.milestone.createMany({
    data: [
      {
        goalId: goal3_1.id,
        text: "Learn grounding techniques",
        completed: true,
        order: 1,
      },
      {
        goalId: goal3_1.id,
        text: "Practice daily meditation",
        completed: true,
        order: 2,
      },
    ],
  });

  const goal3_2 = await prismaClient.goal.create({
    data: {
      clientId: client3.clientProfile!.id,
      title: "Build Emotional Resilience",
      type: "OKR",
      status: "IN_PROGRESS",
      progress: 50,
      dueDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prismaClient.milestone.createMany({
    data: [
      {
        goalId: goal3_2.id,
        text: "Identify emotional patterns",
        completed: true,
        order: 1,
      },
      {
        goalId: goal3_2.id,
        text: "Develop coping strategies",
        completed: false,
        order: 2,
      },
    ],
  });

  console.log("=== TEST DATA SEEDING COMPLETE ===");
  console.log("\nTest accounts created with data:");
  console.log("  Coach: coach@test.com");
  console.log("  Client 1 (Active): client1@test.com - Has 5 sessions, 3 goals, 10 somatic logs");
  console.log("  Client 2 (New): client2@test.com - Just started, 1 session, 1 goal");
  console.log("  Client 3 (Progress): client3@test.com - 3 sessions, 2 goals, 5 somatic logs");
  console.log("\nTo setup passwords and test:");
  console.log("1. Visit http://localhost:3000/signup");
  console.log("2. Sign up with coach@test.com - you'll now own the clients");
  console.log("3. Visit http://localhost:3000/coach/client/{id} to see client data");
  console.log("\nOr to setup passwords for existing accounts, visit:");
  console.log("http://localhost:3000/forgot-password and reset each account\n");
}

/**
 * Migration seed to set clientType=REGISTERED for all existing clients
 * that have user accounts (clients created via invitation).
 *
 * This ensures backward compatibility when clientType was added to the schema.
 */
export async function migrateClientTypesToRegistered(
  prismaClient: PrismaClient
) {
  try {
    console.log("Migrating existing ClientProfiles to clientType=REGISTERED...");

    const updated = await prismaClient.clientProfile.updateMany({
      where: {
        userId: {
          not: null, // Only update clients with user accounts
        },
        clientType: "OFFLINE", // Only update those still marked as OFFLINE
      },
      data: {
        clientType: "REGISTERED",
      },
    });

    console.log(
      `Successfully migrated ${updated.count} existing clients to clientType=REGISTERED`
    );
  } catch (error) {
    console.error("Error migrating client types:", error);
    throw error;
  }
}
