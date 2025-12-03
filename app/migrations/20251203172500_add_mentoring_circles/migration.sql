-- Add isMentor field to CoachProfile
ALTER TABLE "CoachProfile" ADD COLUMN "isMentor" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable MentorRequest
CREATE TABLE "MentorRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionNote" TEXT,
    "coachId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "MentorRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable Group
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "mentorId" TEXT NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable GroupMember
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3),
    "groupId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable GroupPost
CREATE TABLE "GroupPost" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "postType" TEXT NOT NULL DEFAULT 'STANDARD',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "groupId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "GroupPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable GroupPostReply
CREATE TABLE "GroupPostReply" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "GroupPostReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Group_mentorId_idx" ON "Group"("mentorId");

-- CreateIndex
CREATE INDEX "Group_deletedAt_idx" ON "Group"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_coachId_key" ON "GroupMember"("groupId", "coachId");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");

-- CreateIndex
CREATE INDEX "GroupMember_coachId_idx" ON "GroupMember"("coachId");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_status_idx" ON "GroupMember"("groupId", "status");

-- CreateIndex
CREATE INDEX "GroupPost_groupId_createdAt_idx" ON "GroupPost"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "GroupPost_groupId_postType_idx" ON "GroupPost"("groupId", "postType");

-- CreateIndex
CREATE INDEX "GroupPost_groupId_isPinned_createdAt_idx" ON "GroupPost"("groupId", "isPinned", "createdAt");

-- CreateIndex
CREATE INDEX "GroupPost_deletedAt_idx" ON "GroupPost"("deletedAt");

-- CreateIndex
CREATE INDEX "GroupPostReply_postId_createdAt_idx" ON "GroupPostReply"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "GroupPostReply_postId_deletedAt_idx" ON "GroupPostReply"("postId", "deletedAt");

-- CreateIndex
CREATE INDEX "GroupPostReply_authorId_idx" ON "GroupPostReply"("authorId");

-- CreateIndex
CREATE INDEX "GroupPostReply_deletedAt_idx" ON "GroupPostReply"("deletedAt");

-- CreateIndex for MentorRequest
CREATE INDEX "MentorRequest_coachId_status_idx" ON "MentorRequest"("coachId", "status");

-- CreateIndex
CREATE INDEX "MentorRequest_status_idx" ON "MentorRequest"("status");

-- CreateIndex
CREATE INDEX "MentorRequest_createdAt_idx" ON "MentorRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPost" ADD CONSTRAINT "GroupPost_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPost" ADD CONSTRAINT "GroupPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPostReply" ADD CONSTRAINT "GroupPostReply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "GroupPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPostReply" ADD CONSTRAINT "GroupPostReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for MentorRequest
ALTER TABLE "MentorRequest" ADD CONSTRAINT "MentorRequest_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorRequest" ADD CONSTRAINT "MentorRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
