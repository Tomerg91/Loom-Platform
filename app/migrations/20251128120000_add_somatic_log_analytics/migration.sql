-- CreateTable for SomaticLogAnalytics
CREATE TABLE "SomaticLogAnalytics" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,
    "periodStartDate" TIMESTAMP(3) NOT NULL,
    "periodEndDate" TIMESTAMP(3) NOT NULL,
    "topBodyZones" JSONB NOT NULL,
    "topSensations" JSONB NOT NULL,
    "intensityTrendOverTime" JSONB NOT NULL,
    "totalLogsInPeriod" INTEGER NOT NULL,

    CONSTRAINT "SomaticLogAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for unique constraint on clientId and period
CREATE UNIQUE INDEX "SomaticLogAnalytics_clientId_period_key" ON "SomaticLogAnalytics"("clientId", "period");

-- CreateIndex for clientId lookups
CREATE INDEX "SomaticLogAnalytics_clientId_idx" ON "SomaticLogAnalytics"("clientId");

-- CreateIndex for computedAt lookups
CREATE INDEX "SomaticLogAnalytics_computedAt_idx" ON "SomaticLogAnalytics"("computedAt");

-- AddForeignKey for ClientProfile relation
ALTER TABLE "SomaticLogAnalytics" ADD CONSTRAINT "SomaticLogAnalytics_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
