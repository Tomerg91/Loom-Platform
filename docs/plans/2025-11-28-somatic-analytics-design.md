# Somatic Analytics Dashboard - Complete Design Document

**Date Created**: 2025-11-28
**Status**: In Progress
**Last Updated**: 2025-11-28
**Owner**: Development Team
**Feature**: Coach Analytics Dashboard with Somatic Pattern Insights

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Solution Overview](#solution-overview)
4. [Architecture Design](#architecture-design)
5. [Implementation Status](#implementation-status)
6. [Remaining Tasks](#remaining-tasks)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Plan](#deployment-plan)

---

## Executive Summary

This document outlines the design and implementation of a **Somatic Analytics Dashboard** feature for the Loom Platform. The feature enables coaches to view actionable insights about their clients' somatic patterns, including:

- **Top Body Zones**: Which body areas clients report sensations in most frequently
- **Common Sensations**: Most reported sensation types with average intensity
- **Intensity Trends**: Weekly average intensity trends over time (30d, 90d, 365d periods)

The solution uses a **hybrid caching architecture** with hourly cron jobs pre-computing analytics while maintaining on-demand fallback capability for optimal performance at scale.

---

## Problem Statement

### Current State
Coaches currently can view raw somatic logs for individual clients but lack:
- Visual pattern recognition across multiple logs
- Time-series trend analysis
- Actionable insights to inform coaching strategy
- Performance-optimized analytics queries for growing datasets

### Target Improvement
Provide coaches with intuitive, data-driven insights on the **ClientDetailsPage** to:
- Identify recurring somatic patterns (hot zones)
- Track sensation trends over time
- Make informed coaching decisions based on quantified data
- Support multiple time periods (30d, 90d, 365d) for different analysis needs

---

## Solution Overview

### Key Features

#### 1. Analytics Computation
- **Backend**: Aggregates SomaticLog records per client per time period
- **Metrics**: Top 5 body zones, top 5 sensations, weekly intensity trends
- **Periods**: 30-day, 90-day, 365-day rolling windows
- **Automation**: Hourly cron job processes active clients (logged in last 7 days)

#### 2. Caching Strategy
- **Cache Table**: `SomaticLogAnalytics` stores pre-computed snapshots
- **Unique Index**: One record per `(clientId, period)` combination
- **TTL Concept**: Computed hourly (eventual consistency model)
- **Fallback**: On-demand computation if cache stale/missing

#### 3. Frontend Visualization
- **Location**: Enhanced `ClientDetailsPage` with new analytics section
- **Charts**: Recharts library for responsive, interactive visualizations
- **Period Selector**: Tab-based UI for 30d/90d/365d switching
- **i18n Support**: Full translations for Hebrew (RTL) and English (LTR)

#### 4. Role-Based Access
- **Coaches**: Can view their clients' analytics
- **Clients**: Cannot access analytics (read-only log view)
- **Authorization**: Validated at operation level (context.user.role)

---

## Architecture Design

### Database Schema

#### New Table: `SomaticLogAnalytics`

```prisma
model SomaticLogAnalytics {
  id                    String        @id @default(uuid())
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  // Foreign key and unique constraint
  client                ClientProfile @relation(fields: [clientId], references: [id], onDelete: Cascade)
  clientId              String
  period                String        // "30d", "90d", "365d"

  // Computation metadata
  computedAt            DateTime      // When this snapshot was computed
  periodStartDate       DateTime      // Analysis window start
  periodEndDate         DateTime      // Analysis window end

  // Aggregated analytics data (JSON)
  topBodyZones          Json          // [{zone, count, avgIntensity}]
  topSensations         Json          // [{sensation, count, avgIntensity}]
  intensityTrendOverTime Json         // [{weekStart, avgIntensity}]
  totalLogsInPeriod     Int

  // Indexes for optimal query performance
  @@unique([clientId, period])
  @@index([clientId])
  @@index([computedAt])
}
```

**Relation Update** to `ClientProfile`:
```prisma
model ClientProfile {
  // ... existing fields
  analytics SomaticLogAnalytics[]  // NEW: One-to-many relation
}
```

#### Migration Details
- **File**: `app/migrations/20251128120000_add_somatic_log_analytics/migration.sql`
- **Status**: ✅ Created and ready to apply
- **Command**: `wasp db migrate-dev`

### Backend Operations

#### File: `app/src/somatic-logs/analytics.ts`

**Key Functions**:

1. **`computeClientAnalytics(prisma, clientId, period)`**
   - **Input**: Prisma client, client ID, time period ("30d"|"90d"|"365d")
   - **Output**: `ClientAnalyticsResult` with aggregated metrics
   - **Logic**:
     - Fetches all SomaticLog records in period
     - Groups by bodyZone and sensation
     - Calculates top 5 by frequency + avg intensity
     - Generates weekly trend data (12 weeks for 90d period)
   - **Performance**: O(n) where n = number of logs (typically < 500 per client per period)

2. **`computeAllClientAnalytics(entities)`**
   - **Triggered**: Hourly cron job (PgBoss)
   - **Logic**:
     - Finds all clients with activity in last 7 days
     - Processes 3 periods (30d, 90d, 365d) for each client
     - Upserts records into `SomaticLogAnalytics`
   - **Error Handling**: Logs failures per client, continues processing
   - **Performance**: ~500ms per active client (typical production load)

**Export Types**:
```typescript
interface BodyZoneStats {
  zone: string;
  count: number;
  avgIntensity: number;
}

interface SensationStats {
  sensation: string;
  count: number;
  avgIntensity: number;
}

interface IntensityTrendPoint {
  weekStart: string; // ISO date
  avgIntensity: number;
}

interface ClientAnalyticsResult {
  topBodyZones: BodyZoneStats[];
  topSensations: SensationStats[];
  intensityTrendOverTime: IntensityTrendPoint[];
  totalLogsInPeriod: number;
}
```

#### File: `app/src/somatic-logs/operations.ts` (NEW)

**`getClientAnalytics` Query**:
```typescript
input: {
  clientId: string;
  period: "30d" | "90d" | "365d";
}

output: ClientAnalyticsResult

authorization:
  - Coach: Can access their own clients' analytics
  - Client: Cannot access (403 Forbidden)
  - Admin: Can access any client

behavior:
  1. Validates input (Zod schema)
  2. Checks user authorization
  3. Queries SomaticLogAnalytics cache
  4. If missing/stale (>1h old): triggers on-demand computation
  5. Returns cached data
```

### Wasp Configuration

#### `main.wasp` Updates

**Query Declaration**:
```wasp
query getClientAnalytics {
  fn: import { getClientAnalytics } from "@src/somatic-logs/operations",
  entities: [SomaticLogAnalytics, ClientProfile, SomaticLog]
}
```

**Cron Job Declaration**:
```wasp
job computeSomaticAnalyticsJob {
  executor: PgBoss,
  perform: {
    fn: import { computeAllClientAnalytics } from "@src/somatic-logs/analytics"
  },
  schedule: {
    cron: "0 * * * *"  // Every hour at minute 0
  },
  entities: [ClientProfile, SomaticLog, SomaticLogAnalytics]
}
```

### Frontend Components

#### Location: `app/src/coach/ClientDetailsPage.tsx`

**Integration Point**: Add analytics section above existing session history

```typescript
// Near line 80, after client info card
<ClientAnalyticsDashboard clientId={clientId} />

// Import at top
import { ClientAnalyticsDashboard } from "./components/ClientAnalyticsDashboard";
```

#### New File: `app/src/coach/components/ClientAnalyticsDashboard.tsx`

**Purpose**: Main container component for analytics UI

**Props**:
```typescript
interface ClientAnalyticsDashboardProps {
  clientId: string;
}
```

**Features**:
- Period selector (30d/90d/365d tabs)
- Loading state (skeleton cards)
- Error state (alert with retry button)
- Empty state (message if no logs yet)
- Conditional rendering based on chart data availability

**State**:
```typescript
const [period, setPeriod] = useState<"30d" | "90d" | "365d">("30d");
const { data, isLoading, error } = useQuery(getClientAnalytics, { clientId, period });
```

#### New File: `app/src/coach/components/charts/BodyZoneChart.tsx`

**Chart Type**: Horizontal bar chart (Recharts BarChart)

**Data**: `analytics.topBodyZones` array

**Visual Details**:
- X-axis: Count (frequency)
- Y-axis: Body zone names (CHEST, HEAD, etc.)
- Color: Intensity-based gradient (blue=low, red=high)
- Tooltip: Shows zone, count, avg intensity
- Responsive: Auto-scales on window resize

**Example Data**:
```json
[
  { "zone": "CHEST", "count": 23, "avgIntensity": 7.2 },
  { "zone": "HEAD", "count": 18, "avgIntensity": 6.1 },
  { "zone": "BELLY", "count": 15, "avgIntensity": 5.8 }
]
```

#### New File: `app/src/coach/components/charts/SensationChart.tsx`

**Chart Type**: Horizontal bar chart (similar to BodyZoneChart)

**Data**: `analytics.topSensations` array

**Visual Details**:
- X-axis: Count (frequency)
- Y-axis: Sensation types (Tight, Hot, Vibrating, etc.)
- Responsive layout matching BodyZoneChart
- Color scheme: Consistent with platform design

**Example Data**:
```json
[
  { "sensation": "Tight", "count": 25, "avgIntensity": 6.8 },
  { "sensation": "Hot", "count": 18, "avgIntensity": 7.4 },
  { "sensation": "Vibrating", "count": 12, "avgIntensity": 5.2 }
]
```

#### New File: `app/src/coach/components/charts/IntensityTrendChart.tsx`

**Chart Type**: Line chart (Recharts LineChart)

**Data**: `analytics.intensityTrendOverTime` array

**Visual Details**:
- X-axis: Week start dates (ISO format, displayed as "Nov 18", "Nov 25", etc.)
- Y-axis: Average intensity (0-10 scale)
- Line: Smooth animation, 2px stroke
- Dots: Show on hover, clickable for details
- Grid: Light background for readability
- Responsive: Maintains aspect ratio

**Example Data**:
```json
[
  { "weekStart": "2025-11-03", "avgIntensity": 6.2 },
  { "weekStart": "2025-11-10", "avgIntensity": 6.8 },
  { "weekStart": "2025-11-17", "avgIntensity": 5.9 },
  { "weekStart": "2025-11-24", "avgIntensity": 7.1 }
]
```

### Internationalization

#### File: `app/src/client/i18n.ts`

**New Translation Keys**:

```typescript
// English (en) and Hebrew (he) translations
somatic: {
  analytics: {
    title: "Somatic Patterns",
    topZones: "Most Active Body Zones",
    topSensations: "Common Sensations",
    intensityTrend: "Intensity Over Time",
    period: {
      "30d": "Last 30 Days",
      "90d": "Last 90 Days",
      "365d": "Last Year"
    },
    empty: "No somatic logs recorded yet. Client logs will appear here.",
    loading: "Loading analytics...",
    error: "Error loading analytics. Please try again.",
    noData: "No data available for this period."
  }
}
```

---

## Implementation Status

### ✅ COMPLETED (3/15 tasks)

1. **Database Schema & Migration** (100%)
   - ✅ Schema.prisma updated with `SomaticLogAnalytics` model
   - ✅ ClientProfile relation added
   - ✅ Migration file created: `20251128120000_add_somatic_log_analytics`
   - ✅ Status: Ready to apply with `wasp db migrate-dev`

2. **Analytics Computation Module** (100%)
   - ✅ `app/src/somatic-logs/analytics.ts` created
   - ✅ `computeClientAnalytics()` function implemented
   - ✅ `computeAllClientAnalytics()` cron job handler implemented
   - ✅ Helper functions for date ranges and weekly aggregation
   - ✅ Full TypeScript type definitions exported

3. **Compilation Error Fixes** (100%)
   - ✅ Fixed error #1: Added `displayName` to `ClientWithStats` type
   - ✅ Fixed error #2: Corrected import paths in `AddOfflineClientDialog.tsx`
   - ✅ Fixed error #3: Typed result variable in `LogSessionPage.tsx`
   - ✅ Fixed error #4: Added optional `prefix` to `S3Upload` type
   - ✅ Fixed error #5: Updated `getS3Key()` to support prefix parameter

### 🔄 IN PROGRESS (0/15 tasks)

### ⏳ PENDING (12/15 tasks)

1. **Wasp Configuration** (0%) - Priority: HIGH
   - [ ] Add `getClientAnalytics` query to `main.wasp`
   - [ ] Add `computeSomaticAnalyticsJob` cron job to `main.wasp`
   - [ ] Verify entities declarations
   - [ ] Estimated time: 15 mins

2. **Backend Operation** (0%) - Priority: HIGH
   - [ ] Create `getClientAnalytics` operation in `somatic-logs/operations.ts`
   - [ ] Implement input validation (Zod schema)
   - [ ] Implement authorization logic
   - [ ] Implement cache check and fallback logic
   - [ ] Estimated time: 45 mins

3. **Frontend - Main Dashboard** (0%) - Priority: HIGH
   - [ ] Create `ClientAnalyticsDashboard.tsx`
   - [ ] Implement period selector tabs
   - [ ] Implement loading/error/empty states
   - [ ] Integrate with `useQuery` hook
   - [ ] Estimated time: 60 mins

4. **Frontend - Chart Components** (0%) - Priority: HIGH
   - [ ] Create `BodyZoneChart.tsx` with Recharts
   - [ ] Create `SensationChart.tsx` with Recharts
   - [ ] Create `IntensityTrendChart.tsx` with Recharts
   - [ ] Style and responsive design
   - [ ] Estimated time: 90 mins

5. **Frontend - Integration** (0%) - Priority: HIGH
   - [ ] Update `ClientDetailsPage.tsx` to include analytics
   - [ ] Wire up analytics component with useQuery
   - [ ] Test period switching
   - [ ] Test empty/loading/error states
   - [ ] Estimated time: 30 mins

6. **Dependencies** (0%) - Priority: MEDIUM
   - [ ] Add `recharts` to `package.json`
   - [ ] Verify installation
   - [ ] Check for version conflicts
   - [ ] Estimated time: 10 mins

7. **Internationalization** (0%) - Priority: MEDIUM
   - [ ] Add translation keys to `app/src/client/i18n.ts`
   - [ ] Add Hebrew translations
   - [ ] Test RTL layout
   - [ ] Estimated time: 30 mins

8. **Testing** (0%) - Priority: MEDIUM
   - [ ] Write unit tests for `computeClientAnalytics()`
   - [ ] Write unit tests for aggregation logic
   - [ ] Write E2E test for coach analytics flow
   - [ ] Test with multiple periods
   - [ ] Estimated time: 120 mins

9. **Documentation** (0%) - Priority: LOW
   - [ ] Update CLAUDE.md with analytics feature
   - [ ] Add code examples to CLAUDE.md
   - [ ] Create developer guide for extending analytics
   - [ ] Estimated time: 45 mins

10. **Verification & QA** (0%) - Priority: HIGH
    - [ ] Run database migration
    - [ ] Test `wasp start` compile
    - [ ] Verify cron job executes hourly
    - [ ] Test analytics computation with sample data
    - [ ] Test all 3 period views (30d/90d/365d)
    - [ ] Test empty state (no logs)
    - [ ] Test authorization (client can't access)
    - [ ] Test performance (load time < 500ms)
    - [ ] Estimated time: 90 mins

---

## Remaining Tasks

### Quick Reference Checklist

```markdown
## IMPLEMENTATION CHECKLIST

### Phase 1: Backend Setup (Est. 3 hours)
- [ ] Run database migration: `wasp db migrate-dev`
- [ ] Update `main.wasp` with query and cron job
- [ ] Implement `getClientAnalytics` operation
- [ ] Test migration success
- [ ] Verify cron job scheduled

### Phase 2: Frontend Components (Est. 3 hours)
- [ ] Create `ClientAnalyticsDashboard.tsx`
- [ ] Create chart components (3 files)
- [ ] Update `ClientDetailsPage.tsx`
- [ ] Add `recharts` dependency
- [ ] Test all components render

### Phase 3: Polish & Internationalization (Est. 1.5 hours)
- [ ] Add i18n translations
- [ ] Test Hebrew RTL layout
- [ ] Add loading/error states
- [ ] Test empty state

### Phase 4: Testing (Est. 2 hours)
- [ ] Write unit tests
- [ ] Write E2E tests
- [ ] Test all periods (30d/90d/365d)
- [ ] Test authorization

### Phase 5: Documentation & QA (Est. 1.5 hours)
- [ ] Update CLAUDE.md
- [ ] Final QA testing
- [ ] Performance verification
- [ ] Code review preparation

## TOTAL ESTIMATED TIME: 11 hours (1-2 days for solo developer)
```

### Critical Path

**Day 1 (Morning)**:
1. Run migration
2. Implement `getClientAnalytics` operation
3. Verify backend compiles

**Day 1 (Afternoon)**:
4. Create chart components
5. Integrate into ClientDetailsPage
6. Test basic functionality

**Day 2 (Morning)**:
7. Add i18n translations
8. Add loading/error states
9. Polish UI

**Day 2 (Afternoon)**:
10. Write tests
11. QA and verification
12. Documentation updates

---

## Testing Strategy

### Unit Tests

**File**: `app/src/somatic-logs/analytics.test.ts`

```typescript
describe("computeClientAnalytics", () => {
  test("should aggregate body zones by frequency", () => {
    // Arrange: Create mock SomaticLog data
    // Act: Call computeClientAnalytics
    // Assert: Verify topBodyZones sorted by frequency, limited to 5

  test("should calculate average intensity per zone", () => {
    // Verify avgIntensity precision (2 decimals)

  test("should generate weekly trends", () => {
    // Verify IntensityTrendPoint array in chronological order

  test("should handle empty logs (no logs in period)", () => {
    // Verify returns empty arrays, totalLogsInPeriod = 0

  test("should handle single log", () => {
    // Verify single zone/sensation appears with correct stats
});
```

### Integration Tests

```typescript
describe("getClientAnalytics operation", () => {
  test("coach can access their client's analytics", () => {
    // Arrange: Seed coach, client, somatic logs
    // Act: Call getClientAnalytics with coach context
    // Assert: Returns analytics data

  test("coach cannot access other coach's client analytics", () => {
    // Assert: Returns 403 Forbidden

  test("client cannot access analytics", () => {
    // Assert: Returns 403 Forbidden

  test("admin can access any client's analytics", () => {
    // Assert: Returns analytics data
});
```

### E2E Tests

**File**: `e2e-tests/coach-analytics.spec.ts`

```typescript
test.describe("Coach Analytics Dashboard", () => {
  test("coach can view client analytics with 30-day period", async ({ page }) => {
    // Login as coach
    // Navigate to client details page
    // Verify analytics section visible
    // Verify BodyZoneChart renders with data
    // Verify SensationChart renders with data
    // Verify IntensityTrendChart renders with data

  test("coach can toggle between periods (30d/90d/365d)", async ({ page }) => {
    // Click 90d tab
    // Wait for data refresh
    // Verify charts update with different data

  test("analytics empty state shows when no logs", async ({ page }) => {
    // Create new client with no logs
    // Navigate to client details
    // Verify "No logs recorded yet" message

  test("analytics load time is under 500ms", async ({ page }) => {
    // Measure time from query to render
    // Assert: performance < 500ms
});
```

---

## Deployment Plan

### Pre-Deployment Checklist

```markdown
- [ ] All code changes reviewed and approved
- [ ] All unit tests passing (100% coverage for analytics module)
- [ ] All E2E tests passing
- [ ] Staging database migrated successfully
- [ ] Cron job executed successfully in staging (1+ cycles)
- [ ] Performance benchmarks met (< 500ms load time)
- [ ] Documentation updated (CLAUDE.md, code comments)
- [ ] No console errors or warnings
```

### Deployment Steps

1. **Database Migration**
   ```bash
   # Staging
   wasp db migrate-deploy --env staging

   # Production (with backup first)
   wasp db migrate-deploy --env production
   ```

2. **Code Deployment**
   - Push to `develop` branch
   - CI/CD pipeline runs all tests
   - Merge to `main` branch
   - Deploy to production

3. **Post-Deployment Verification**
   - [ ] Check cron job logs (first hour)
   - [ ] Monitor API latency (getClientAnalytics queries)
   - [ ] Verify database query performance
   - [ ] Check error rates in production logs
   - [ ] Spot-check analytics data accuracy

4. **Rollback Plan**
   - If critical issues found, revert code deployment
   - Database migration is backwards compatible (can safely exist)
   - Remove cron job from `main.wasp` if needed

### Monitoring

**Key Metrics**:
- Cron job execution time (target: < 1 min per 100 active clients)
- getClientAnalytics query latency (target: < 200ms p95)
- Cache hit rate (target: > 90%)
- Error rates (target: < 0.1%)

---

## Known Limitations & Future Enhancements

### Current Limitations

1. **Analytics computed hourly**: 1-hour staleness acceptable for coaching use case
2. **Top 5 only**: Prevents extremely long lists; users can filter raw logs for more
3. **Weekly granularity**: Daily granularity would add 7x storage; weekly sufficient for pattern detection
4. **No drill-down**: Charts don't drill down to individual logs (future enhancement)

### Future Enhancements (Post-MVP)

1. **AI-Powered Insights**
   - Auto-detect anomalies in patterns
   - Suggest focus areas for coaching
   - Predict next likely sensation zones

2. **Comparative Analytics**
   - Compare client's trends to program average
   - Benchmark improvements over time

3. **Session Impact Analysis**
   - Track how sessions affect somatic patterns
   - Measure coaching effectiveness

4. **Export Functionality**
   - PDF reports with charts
   - CSV export for analysis in external tools

5. **Real-Time Updates**
   - Trigger partial cache updates on new log creation
   - Reduce wait time for latest data (instead of hourly)

---

## Technical Debt & Considerations

### Performance Optimization Opportunities

1. **Query Optimization**: Add composite index on `(clientId, createdAt)` for faster log fetches
2. **Materialized Views**: Consider PostgreSQL materialized views if 50+ coaches
3. **Caching Layer**: Redis could replace database caching for extreme scale
4. **Data Retention**: Archive logs older than 2 years to manage table size

### Security Considerations

1. **Rate Limiting**: Add rate limit on getClientAnalytics (prevent abuse)
2. **Data Privacy**: Ensure PII not in analytics (currently none, but good practice)
3. **Audit Logging**: Log who accesses which client's analytics

---

## Questions & Decisions

### Open Questions

1. **Should we cache for 24h instead of 1h?**
   - Pro: Reduce database load, faster queries
   - Con: Coaches see stale data for 24 hours
   - Decision: Stick with 1h for MVP, revisit if performance issues

2. **Should analytics be visible to clients?**
   - Pro: Self-awareness and progress tracking
   - Con: Adds complexity, not in initial scope
   - Decision: Coaches only for MVP

3. **Should we include private notes in intensity calculations?**
   - Pro: More complete picture
   - Con: Coach notes can bias pattern analysis
   - Decision: Only count client-created logs (sharedWithCoach=true)

---

## Success Criteria

✅ Feature is complete when:

1. **All code complete**: Every task in remaining tasks section finished
2. **All tests passing**: Unit, integration, and E2E tests at 100%
3. **Performance targets met**: < 500ms load time, cron < 1 min
4. **Zero breaking changes**: Existing functionality unaffected
5. **Documentation complete**: CLAUDE.md updated, code well-commented
6. **User acceptance**: Coach can view analytics on ClientDetailsPage
7. **Data accuracy**: Spot-check 5 clients, verify calculations by hand
8. **No regressions**: Full regression test suite passes

---

## Contact & Questions

For questions about this design:
- Review related CLAUDE.md sections: Coach Dashboard, Somatic Logging
- Check existing patterns in `app/src/session/operations.ts` for query examples
- Ask in development team standup

---

**Document Version**: 1.0
**Last Updated**: 2025-11-28
**Status**: Design Complete, Implementation In Progress
