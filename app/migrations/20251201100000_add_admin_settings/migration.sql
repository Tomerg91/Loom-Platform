-- CreateTable
CREATE TABLE "AdminSettings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "emailAddress" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "bio" TEXT,
    "avatarS3Key" TEXT,
    "privacyPolicyUrl" TEXT NOT NULL,
    "termsOfServiceUrl" TEXT NOT NULL,
    CONSTRAINT "AdminSettings_pkey" PRIMARY KEY ("id")
);

-- Ensure singleton row uniqueness if reused
CREATE UNIQUE INDEX "AdminSettings_id_key" ON "AdminSettings"("id");
