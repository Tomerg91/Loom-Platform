# Coach Insights Dashboard Design

**Date**: 2025-11-27
**Status**: Approved
**Author**: Claude Code
**Feature**: Per-Client Insights Dashboard

---

## Overview

A lightweight coach insights dashboard that surfaces trends from somatic body maps and session data. This feature makes the "Sensory Layer" and "Infinite Session" value propositions tangible in-app by showing coaches patterns in their clients' somatic experiences.

### Goals

1. Help coaches identify recurring patterns in client sensations
2. Visualize which body zones clients focus on most
3. Provide actionable insights to inform coaching decisions
4. Make data-driven coaching accessible and intuitive

### Non-Goals

- Real-time insights (calculated on page load is sufficient)
- Predictive analytics or ML-based recommendations
- Cross-client aggregation (insights are per-client only)
- Export/reporting functionality (future enhancement)

---

## Requirements Summary

**Audience**: Coaches only (per-client insights)

**Time Ranges**:
- Last 30 days
- Last 3 months
- All time

**Key Insights**:
- Top recurring sensations (frequency bar chart)
- Body zone heat map (activity visualization)

**Visualization**: Recharts library for charts

**Empty State**: Friendly message when client has < 5 logs

**Performance**: Calculate insights on page load (simple, always fresh)

---

## Architecture

### Route Structure

**New Route**: `/coach/clients/:clientId/insights`

**Page Component**: `app/src/coach/ClientInsightsPage.tsx`

**Wasp Query**: `getClientInsights`

### Data Flow

```
Coach navigates to insights page
         ↓
useQuery(getClientInsights, { clientId, timeRange })
         ↓
Backend Operation:
  - Validate coach owns client (authorization)
  - Count total somatic logs for client
  - If < 5 logs → return { hasInsufficientData: true }
  - Otherwise → run Prisma aggregations:
      • Group by sensation → count occurrences
      • Group by bodyZone → count occurrences
      • Calculate average intensity
  - Return aggregated insights object
         ↓
Frontend Rendering:
  - Empty state if insufficient data
  - Time range toggle
  - Recharts visualizations
```

### Technology Stack

- **Backend**: Wasp query + Prisma aggregations (`groupBy`, `count`, `aggregate`)
- **Frontend**: React + Recharts (BarChart, custom heat map)
- **Validation**: Zod schema for input validation
- **Authorization**: Role-based (COACH only, must own client)
- **i18n**: Full translation support (Hebrew/English)

---

## Component Structure

### Page Layout

```
ClientInsightsPage
├── Header
│   ├── Client Name
│   ├── Back Button (→ ClientDetailsPage)
│   └── Breadcrumb (Home > Clients > [Name] > Insights)
├── TimeRangeToggle
│   └── Button Group (30 days | 3 months | all time)
├── ConditionalRender
│   ├── EmptyState (when hasInsufficientData)
│   │   ├── Icon (BarChart from lucide-react)
│   │   ├── Message: "Not enough data yet"
│   │   ├── Subtitle: "{clientName} needs at least 5 logs"
│   │   └── Action Button: "View Client Details"
│   └── InsightsDashboard (when sufficient data)
│       ├── TopRecurringSensationsCard
│       │   ├── Card Header: "Top Recurring Sensations"
│       │   └── BarChart (Recharts)
│       │       ├── Horizontal bars
│       │       ├── X-axis: Count
│       │       ├── Y-axis: Sensation names
│       │       ├── Color-coded bars (Tailwind colors)
│       │       └── Shows percentage of total logs
│       └── BodyZoneHeatMapCard
│           ├── Card Header: "Body Zone Activity"
│           └── BodyMapHeatMap Component
│               ├── Enhanced BodyMapSelector
│               ├── Frequency-based gradient coloring
│               ├── Legend (light = few, dark = many)
│               └── Click zone → show detail (count + %)
```

### UI Styling

- **Layout**: Card-based (consistent with existing Loom design)
- **Grid**: Two-column on desktop, stacked on mobile
- **Colors**: Tailwind utility classes, `bg-blue-100` → `bg-blue-900` for heat map
- **Components**: shadcn/ui (Button, Card, Toggle Group)
- **Loading**: Skeleton states during data fetch
- **Responsive**: Mobile-first design

---

## Backend Implementation

### Wasp Configuration

**File**: `app/main.wasp`

```wasp
query getClientInsights {
  fn: import { getClientInsights } from "@src/insights/operations",
  entities: [SomaticLog, ClientProfile, CoachProfile]
}

route ClientInsightsRoute {
  path: "/coach/clients/:clientId/insights",
  to: ClientInsightsPage
}

page ClientInsightsPage {
  authRequired: true,
  component: import ClientInsightsPage from "@src/coach/ClientInsightsPage"
}
```

### Operation Structure

**File**: `app/src/insights/operations.ts`

**Input Schema (Zod)**:
```typescript
const getClientInsightsSchema = z.object({
  clientId: z.string().uuid(),
  timeRange: z.enum(['30days', '3months', 'allTime'])
});

type GetClientInsightsInput = z.infer<typeof getClientInsightsSchema>;
```

**Authorization Logic**:
1. Verify user is authenticated
2. Verify user has COACH role
3. Fetch ClientProfile with clientId, include coach relation
4. Verify `clientProfile.coachId === currentUser.coachProfile.id`
5. Throw HttpError(403) if unauthorized

**Data Queries**:

1. **Count Total Logs**:
```typescript
const totalLogs = await context.entities.SomaticLog.count({
  where: {
    clientId,
    createdAt: getDateFilter(timeRange)
  }
});
```

2. **Early Return for Insufficient Data**:
```typescript
if (totalLogs < 5) {
  return {
    hasInsufficientData: true,
    minLogsRequired: 5,
    totalLogs
  };
}
```

3. **Sensation Frequency Aggregation**:
```typescript
const sensationData = await context.entities.SomaticLog.groupBy({
  by: ['sensation'],
  where: { clientId, createdAt: getDateFilter(timeRange) },
  _count: { sensation: true },
  orderBy: { _count: { sensation: 'desc' } },
  take: 10
});

const topSensations = sensationData.map(item => ({
  sensation: item.sensation,
  count: item._count.sensation,
  percentage: Math.round((item._count.sensation / totalLogs) * 100)
}));
```

4. **Body Zone Frequency Aggregation**:
```typescript
const bodyZoneData = await context.entities.SomaticLog.groupBy({
  by: ['bodyZone'],
  where: { clientId, createdAt: getDateFilter(timeRange) },
  _count: { bodyZone: true }
});

const bodyZoneActivity = bodyZoneData.map(item => ({
  bodyZone: item.bodyZone,
  count: item._count.bodyZone,
  percentage: Math.round((item._count.bodyZone / totalLogs) * 100)
}));
```

5. **Average Intensity**:
```typescript
const intensityData = await context.entities.SomaticLog.aggregate({
  where: { clientId, createdAt: getDateFilter(timeRange) },
  _avg: { intensity: true }
});

const averageIntensity = intensityData._avg.intensity || 0;
```

**Time Range Filtering**:
```typescript
import { subDays, subMonths } from 'date-fns';

const getDateFilter = (timeRange: string) => {
  const now = new Date();
  switch (timeRange) {
    case '30days':
      return { gte: subDays(now, 30) };
    case '3months':
      return { gte: subMonths(now, 3) };
    case 'allTime':
      return undefined; // No filter
    default:
      return undefined;
  }
};
```

**Return Type**:
```typescript
type ClientInsightsResponse =
  | {
      hasInsufficientData: true;
      minLogsRequired: number;
      totalLogs: number;
    }
  | {
      hasInsufficientData: false;
      topSensations: Array<{
        sensation: string;
        count: number;
        percentage: number
      }>;
      bodyZoneActivity: Array<{
        bodyZone: BodyZone;
        count: number;
        percentage: number
      }>;
      averageIntensity: number;
      totalLogs: number;
      timeRange: string;
    };
```

**Error Handling**:
- `401` if not authenticated
- `403` if coach doesn't own client
- `404` if client not found
- `500` for unexpected errors (with logging)

---

## Frontend Implementation

### Main Page Component

**File**: `app/src/coach/ClientInsightsPage.tsx`

**Key Features**:
- Uses `useQuery(getClientInsights, { clientId, timeRange })`
- State management for time range toggle
- Conditional rendering based on `hasInsufficientData`
- Loading skeletons during data fetch
- Error boundary for error handling
- i18n throughout

**Component Structure**:
```typescript
export default function ClientInsightsPage({ user }: { user: User }) {
  const { clientId } = useParams();
  const [timeRange, setTimeRange] = useState<'30days' | '3months' | 'allTime'>('30days');

  const { data, isLoading, error } = useQuery(getClientInsights, {
    clientId,
    timeRange
  });

  // Render logic
}
```

### Visualization Components

**1. TopRecurringSensationsCard**

**File**: `app/src/coach/components/TopRecurringSensationsCard.tsx`

- Uses Recharts `BarChart` component
- Horizontal bars for better readability
- Displays count and percentage
- Tooltips on hover
- Responsive container

**Example**:
```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={300}>
  <BarChart data={topSensations} layout="horizontal">
    <XAxis type="number" />
    <YAxis type="category" dataKey="sensation" />
    <Tooltip />
    <Bar dataKey="count" fill="#3b82f6" />
  </BarChart>
</ResponsiveContainer>
```

**2. BodyMapHeatMap Component**

**File**: `app/src/coach/components/BodyMapHeatMap.tsx`

- Extends/reuses existing `BodyMapSelector` component
- Dynamic fill colors based on frequency data
- Color scale: Tailwind blue gradient (`bg-blue-100` to `bg-blue-900`)
- Hover tooltips showing exact counts and percentages
- Click interaction to show detailed modal (optional)
- Legend component explaining color scale

**Color Mapping Logic**:
```typescript
const getColorForFrequency = (count: number, maxCount: number): string => {
  const intensity = count / maxCount;
  if (intensity < 0.2) return '#dbeafe'; // blue-100
  if (intensity < 0.4) return '#bfdbfe'; // blue-200
  if (intensity < 0.6) return '#93c5fd'; // blue-300
  if (intensity < 0.8) return '#60a5fa'; // blue-400
  return '#3b82f6'; // blue-500
};
```

---

## Integration & Navigation

### Adding Navigation Link

**File**: `app/src/coach/ClientDetailsPage.tsx`

**Changes**:
- Add "View Insights" button in header section next to client name
- Button styling: `variant="outline"`, icon: `TrendingUp` (lucide-react)
- Link component: `Link to={`/coach/clients/${clientId}/insights`}`

**Example**:
```typescript
<div className="flex items-center gap-4">
  <h1>{clientName}</h1>
  <Link to={`/coach/clients/${clientId}/insights`}>
    <Button variant="outline" size="sm">
      <TrendingUp className="mr-2 h-4 w-4" />
      {t('insights.viewInsights')}
    </Button>
  </Link>
</div>
```

### Navigation Flow

1. **Coach Dashboard** → Click client → **ClientDetailsPage**
2. **ClientDetailsPage** → Click "View Insights" → **ClientInsightsPage**
3. **ClientInsightsPage** → Click back button → **ClientDetailsPage**

### Breadcrumb

Display: `Home > Clients > [Client Name] > Insights`

### Optional: Preview Widget

Consider adding a "Quick Insights" card on `ClientDetailsPage` showing:
- Top 3 sensations
- "See Full Report" link to insights page
- Creates discoverability without requiring separate navigation

---

## Internationalization (i18n)

### Translation Keys

**File**: `app/src/client/i18n.ts`

**New Keys**:
```typescript
insights: {
  title: "Client Insights",
  viewInsights: "View Insights",

  timeRange: {
    '30days': "Last 30 Days",
    '3months': "Last 3 Months",
    'allTime': "All Time"
  },

  emptyState: {
    title: "Not enough data yet",
    subtitle: "{{clientName}} needs at least {{minLogs}} somatic logs to generate insights.",
    action: "View Client Details"
  },

  sensations: {
    title: "Top Recurring Sensations",
    count: "{{count}} logs",
    percentage: "{{percentage}}% of total"
  },

  bodyZones: {
    title: "Body Zone Activity",
    legend: "Activity Level",
    legendLow: "Few logs",
    legendHigh: "Many logs",
    detail: "{{zone}}: {{count}} logs ({{percentage}}%)"
  },

  stats: {
    totalLogs: "Total Logs",
    averageIntensity: "Average Intensity"
  }
}
```

**Hebrew Translations**: Mirror structure with Hebrew text

**RTL Support**: Ensure charts and layouts work correctly in RTL mode

---

## Testing & Edge Cases

### Testing Strategy

**Unit Tests**:
- Test `getClientInsights` operation with mock data
- Authorization checks (coach owns client)
- Empty data handling (< 5 logs)
- Time range filtering accuracy
- Percentage calculation correctness

**Integration Tests**:
- Full flow: Create logs → Query insights → Verify aggregations
- Test with various log distributions (even/uneven)
- Test with all body zones and sensations

### Edge Cases

1. **No logs at all**: Show empty state with "0/5 logs" message
2. **All logs same sensation**: Bar chart shows single bar at 100%
3. **Sparse data in time range**: Show available data (no warnings needed)
4. **Client changes coaches**: Authorization prevents old coach from viewing
5. **Concurrent log creation**: Insights refresh on page reload
6. **RTL mode**: Charts render correctly in Hebrew
7. **Mobile**: Cards stack vertically, charts remain readable
8. **Very long sensation names**: Truncate with tooltip
9. **Many unique sensations**: Show top 10, indicate "X more not shown"

### Manual Testing Checklist

- [ ] Coach can view insights for their clients
- [ ] Coach cannot view insights for other coaches' clients (403)
- [ ] Empty state shows when < 5 logs
- [ ] Time range toggle updates data correctly
- [ ] Bar chart renders with accurate data
- [ ] Body zone heat map colors correctly
- [ ] Percentages sum to ~100% (allowing for rounding)
- [ ] i18n works in Hebrew and English
- [ ] Mobile layout is readable and functional
- [ ] Loading states display properly
- [ ] Error states handled gracefully (404, 500)
- [ ] Back button navigation works
- [ ] Breadcrumb displays correctly

---

## Performance Considerations

### Database Performance

**Current Approach**: Calculate on page load
- Prisma aggregations are efficient
- Queries are indexed on `clientId` and `createdAt`
- Expected load time: < 500ms with 100s of logs

**Future Optimization** (if needed):
- Add composite index: `@@index([clientId, createdAt])`
- Pre-compute insights with cron job (if data becomes very large)
- Cache results in-memory briefly (e.g., 5 minutes)

### Frontend Performance

- Use `ResponsiveContainer` for chart responsiveness
- Implement loading skeletons (avoid blank states)
- Lazy load Recharts library (code splitting)
- Optimize body map SVG rendering

---

## Future Enhancements

### Phase 2 Considerations (Not in Scope)

1. **Intensity Trends Over Time**
   - Line chart showing average intensity week-over-week
   - Detect increasing/decreasing trends

2. **Session Correlation**
   - Show insights relative to session dates
   - "Pre-session vs post-session" patterns

3. **Export Functionality**
   - PDF report generation
   - CSV data export

4. **Comparative Insights**
   - Compare current period vs previous period
   - Percentage change indicators

5. **Client-Facing Insights**
   - Allow clients to see their own insights
   - Personal trend tracking

6. **Predictive Analytics**
   - ML-based pattern recognition
   - Proactive coaching suggestions

---

## Files to Create/Modify

### New Files

1. `app/src/insights/operations.ts` - Backend operation
2. `app/src/coach/ClientInsightsPage.tsx` - Main page component
3. `app/src/coach/components/TopRecurringSensationsCard.tsx` - Sensations chart
4. `app/src/coach/components/BodyMapHeatMap.tsx` - Heat map visualization

### Modified Files

1. `app/main.wasp` - Add route and query definitions
2. `app/src/client/i18n.ts` - Add translation keys
3. `app/src/coach/ClientDetailsPage.tsx` - Add "View Insights" button
4. `package.json` - Verify `recharts` dependency (likely already present)

### Optional Files

1. `app/src/coach/components/QuickInsightsCard.tsx` - Preview widget for ClientDetailsPage

---

## Success Metrics

### User Experience

- Coaches discover insights within first 2 client views
- < 3 clicks to reach insights from dashboard
- Page loads in < 1 second

### Feature Adoption

- 70%+ of coaches view insights within first week
- Avg 3+ insights views per coach per week
- Positive feedback in user interviews

### Technical

- No performance degradation with 1000+ logs per client
- < 5% error rate on insights queries
- Mobile responsive (100% functionality on mobile)

---

## Implementation Timeline

**Estimated Effort**: 2-3 days

1. **Day 1 - Backend** (4-6 hours)
   - Create insights operation
   - Add Wasp configuration
   - Write unit tests
   - Test authorization

2. **Day 2 - Frontend** (4-6 hours)
   - Build ClientInsightsPage
   - Create visualization components
   - Add i18n translations
   - Integrate with backend

3. **Day 3 - Polish & Testing** (2-4 hours)
   - Add navigation links
   - Test edge cases
   - Mobile responsiveness
   - Final QA

---

## Approval & Next Steps

**Design Status**: ✅ Approved

**Next Actions**:
1. Create implementation plan with detailed tasks
2. Set up git worktree for isolated development (optional)
3. Begin backend implementation
4. Iterate on frontend components
5. Comprehensive testing
6. Deploy to staging for user testing

---

**Document Version**: 1.0
**Last Updated**: 2025-11-27
**Review Status**: Design approved, ready for implementation
