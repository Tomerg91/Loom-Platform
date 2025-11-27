-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('REGISTERED', 'OFFLINE', 'INVITED');

-- AlterTable
ALTER TABLE "ClientProfile" ADD COLUMN     "avatarS3Key" TEXT,
ADD COLUMN     "clientType" "ClientType" NOT NULL DEFAULT 'OFFLINE',
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "lastActivityDate" TIMESTAMP(3),
ALTER COLUMN "userId" DROP NOT NULL;
