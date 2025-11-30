-- Add performance indexes for common coach workflows
CREATE INDEX "ClientProfile_coachId_idx" ON "ClientProfile"("coachId");
CREATE INDEX "SomaticLog_clientId_createdAt_idx" ON "SomaticLog"("clientId", "createdAt");
CREATE INDEX "CoachSession_coachId_sessionDate_idx" ON "CoachSession"("coachId", "sessionDate");
CREATE INDEX "CoachSession_clientId_sessionDate_idx" ON "CoachSession"("clientId", "sessionDate");
CREATE INDEX "Goal_clientId_status_idx" ON "Goal"("clientId", "status");
CREATE INDEX "Resource_coachId_idx" ON "Resource"("coachId");
CREATE INDEX "ClientInvitation_coachId_status_idx" ON "ClientInvitation"("coachId", "status");
