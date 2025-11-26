# CLAUDE.md - Loom Platform AI Assistant Guide

> **Last Updated**: 2025-11-26
> **Version**: 1.0
> **Project**: Loom Platform - Somatic Coaching Platform for the Satya Method

This document provides AI assistants with comprehensive guidance for understanding and contributing to the Loom Platform codebase.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture & Structure](#architecture--structure)
4. [Development Conventions](#development-conventions)
5. [Common Workflows](#common-workflows)
6. [Key Features & Modules](#key-features--modules)
7. [Database Schema](#database-schema)
8. [Important Files Reference](#important-files-reference)
9. [Testing & Quality](#testing--quality)
10. [Deployment & Environment](#deployment--environment)

---

## Project Overview

**Loom Platform** is a role-based somatic coaching application built on the [Open SaaS](https://opensaas.sh) template with [Wasp](https://wasp.sh) framework (v0.19.0).

### Core Purpose
Enable coaches to manage clients and track somatic sensations through an intuitive body mapping system, supporting the Satya Method of coaching.

### Key Stakeholders
- **Coaches**: Manage multiple clients, view somatic logs, conduct sessions, share resources
- **Clients**: Log somatic sensations, view session history, access shared resources
- **Admins**: System administration, analytics, user management

### Business Model
- Subscription-based (Starter/Pro plans)
- Multiple payment providers: Stripe, LemonSqueezy, Tranzilla
- Credit-based system for coaches

---

## Tech Stack

### Core Framework
- **Wasp 0.19.0**: Full-stack React + Node.js framework
  - Declarative config in `app/main.wasp`
  - Type-safe queries/actions
  - Built-in auth system
  - Cron job scheduling (PgBoss)

### Frontend
- **React 18.2.0** with TypeScript 5.8.2
- **Vite 7.0.6** for bundling
- **React Router 6.26.2** for routing
- **UI Components**:
  - **Radix UI** primitives (20+ components)
  - **shadcn/ui** configuration (style: "new-york")
  - **Tailwind CSS 3.2.7** with plugins
  - **Framer Motion 12.23.24** for animations
  - **Lucide React 0.525.0** for icons
- **Forms**: react-hook-form 7.60.0 + Zod 3.25.76
- **i18n**: i18next 25.6.3 + react-i18next 16.3.5
  - Default: Hebrew (RTL support)
  - Fallback: English
  - Translations: `app/src/client/i18n.ts`

### Backend
- **Node.js** with Express.js (via Wasp)
- **PostgreSQL** via Prisma 5.19.1
- **AWS S3** for file storage (@aws-sdk/client-s3)
- **Payment Providers**:
  - Stripe 18.1.0
  - LemonSqueezy (@lemonsqueezy/lemonsqueezy.js 3.2.0)
  - Tranzilla (custom integration)
- **Email**: SendGrid
- **Analytics**: Google Analytics 4, Plausible.io
- **Date/Time**: date-fns 4.1.0 + date-fns-tz 3.2.0 (timezone-aware)

### Development Tools
- **TypeScript** in strict mode
- **Prettier 3.1.1** with Tailwind plugin
- **Prisma** for database migrations
- **Playwright** for E2E tests (`e2e-tests/`)

---

## Architecture & Structure

### Monorepo Layout

```
Loom-Platform/
├── app/                    # Main Wasp application
│   ├── main.wasp          # Wasp configuration (routes, pages, operations)
│   ├── schema.prisma      # Database schema
│   ├── src/               # Source code (see below)
│   ├── migrations/        # Prisma migrations
│   ├── public/            # Static assets
│   └── .env.server        # Server environment variables
├── blog/                  # Astro/Starlight blog & docs
├── e2e-tests/             # Playwright E2E tests
└── README.md              # Project overview
```

### Source Code Organization (`app/src/`)

**Feature-based modules** with consistent structure:

```
app/src/
├── admin/                 # Admin dashboard (analytics, users, settings)
│   ├── dashboards/        # Analytics, messages, users dashboards
│   ├── elements/          # Calendar, settings, UI elements
│   └── layout/            # Admin layout components
├── analytics/             # Analytics operations & providers
├── auth/                  # Authentication pages & flows
│   └── email-and-pass/    # Email verification, password reset
├── client/                # Client dashboard & components
│   ├── components/        # NavBar, BodyMapSelector, NotFoundPage
│   ├── hooks/             # useColorMode, useDebounce
│   └── i18n.ts           # i18n configuration & translations
├── coach/                 # Coach dashboard & client management
│   └── components/        # UpcomingSessions
├── components/            # Shared UI components
│   └── ui/                # 20+ shadcn/ui components (button, card, dialog, etc.)
├── file-upload/           # S3 file upload operations
├── hooks/                 # Global hooks (use-toast)
├── invitation/            # Client invitation system
├── landing-page/          # Marketing landing page & components
├── lib/                   # Utility functions (cn for Tailwind merging)
├── payment/               # Payment integrations
│   ├── lemonSqueezy/      # LemonSqueezy provider
│   └── stripe/            # Stripe provider
├── resources/             # Resource library operations (Module 8)
├── server/                # Server-side utilities
│   ├── scripts/           # Database seeds (seedMockUsers, createMissingProfiles)
│   ├── utils.ts          # requireNodeEnvVar
│   └── validation.ts     # ensureArgsSchemaOrThrowHttpError
├── session/               # Session management operations
├── shared/                # Common utilities & constants
│   ├── common.ts         # DocsUrl, BlogUrl
│   └── utils.ts          # throttleWithTrailingInvocation, assertUnreachable
├── somatic-logs/          # Core somatic logging feature
└── user/                  # User operations & account management
```

### Role-Based Architecture

**Three-tier user system**:

```typescript
enum UserRole {
  ADMIN   // Full system access
  COACH   // Manages clients, creates sessions, uploads resources
  CLIENT  // Logs sensations, views sessions, accesses resources
}
```

**Profile Relationships**:

```
User (1:1)
├── CoachProfile
│   ├── clients: ClientProfile[] (1:many)
│   ├── sessions: CoachSession[]
│   ├── resources: Resource[]
│   └── invitations: ClientInvitation[]
└── ClientProfile
    ├── coach: CoachProfile (many:1)
    ├── somaticLogs: SomaticLog[]
    ├── sessions: CoachSession[]
    └── schedule fields (recurring sessions)
```

---

## Development Conventions

### File Naming

| Type | Convention | Example |
|------|-----------|---------|
| **Pages** | PascalCase + "Page" suffix | `CoachDashboardPage.tsx` |
| **Components** | PascalCase | `BodyMapSelector.tsx` |
| **Operations** | `operations.ts` per feature | `session/operations.ts` |
| **Hooks** | kebab-case with "use-" prefix | `use-toast.ts` |
| **Utils** | lowercase | `utils.ts`, `validation.ts` |

### Component Structure

**Page Components**:

```typescript
import type { User } from "wasp/entities";

export default function FeaturePage({ user }: { user: User }) {
  // 1. State declarations
  const [state, setState] = useState();

  // 2. Hook usage (queries/actions)
  const { data, isLoading } = useQuery(getOperation);
  const actionFn = useAction(createOperation);

  // 3. Event handlers
  const handleSubmit = async (e: React.FormEvent) => {
    // ...
  };

  // 4. JSX (typically Card-based layout)
  return (
    <div className="mt-10 px-6">
      <Card>
        {/* Content */}
      </Card>
    </div>
  );
}
```

### Operations Pattern

**ALL operations follow this structure** (`{feature}/operations.ts`):

```typescript
import type { OperationType } from "wasp/server/operations";
import { HttpError } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "@src/server/validation";

// 1. Define Zod schema for input validation
const operationSchema = z.object({
  field: z.string().min(1, "Error message"),
  // ...
});

type OperationInput = z.infer<typeof operationSchema>;

// 2. Implement operation
export const operationName: OperationType<OperationInput, ReturnType> = async (rawArgs, context) => {
  // 3. Validate input
  const args = ensureArgsSchemaOrThrowHttpError(operationSchema, rawArgs);

  // 4. Auth check
  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  // 5. Role-based authorization
  if (context.user.role !== "COACH") {
    throw new HttpError(403, "Only coaches can perform this action");
  }

  // 6. Business logic with Prisma
  const result = await context.entities.Model.findMany({
    where: { /* filters */ },
    include: { /* relations */ },
  });

  // 7. Return result
  return result;
};
```

**Key Examples**:
- `app/src/session/operations.ts` - Full CRUD with role-based filtering
- `app/src/somatic-logs/operations.ts` - Create and read operations
- `app/src/invitation/operations.ts` - Complex flows with email

### TypeScript Conventions

**Strong typing throughout**:

```typescript
// Runtime validation with Zod
const schema = z.object({ /* ... */ });
type Input = z.infer<typeof schema>;

// Prisma-generated types
import type { User, CoachProfile } from "wasp/entities";

// Response types with role-based filtering
export type SessionResponse = {
  id: string;
  sessionDate: Date;
  sharedSummary: string | null;
  // privateNotes excluded for clients
};

// Explicit return types on operations
export const getOperation: GetOperation<Input, Output> = async (...) => { /* ... */ };
```

### State Management

**No global state library** - React built-ins:

- `useState` for local component state
- `useQuery(operation, args)` for server state (data fetching)
- `useAction(operation)` for mutations
- Custom hooks for shared logic (`useToast`, `useColorMode`)

**Data Fetching Pattern**:

```typescript
import { useQuery, useAction } from "wasp/client/operations";
import { getOperation, createOperation } from "wasp/client/operations";

// Query (read data)
const { data, isLoading, error, refetch } = useQuery(getOperation, { id: "123" });

// Action (mutate data)
const createFn = useAction(createOperation);
await createFn({ field: "value" });
```

### Styling Conventions

**Tailwind CSS with utility-first approach**:

```typescript
import { cn } from "@src/lib/utils"; // clsx + tailwind-merge

// Component with conditional classes
<div className={cn(
  "base-classes",
  isActive && "active-classes",
  className // Allow override
)}>
```

**shadcn/ui components** (in `components/ui/`):
- Pre-styled Radix UI primitives
- Customizable via `cn()` and props
- Consistent design system

### Internationalization (i18n)

**All user-facing text must use i18n**:

```typescript
import { useTranslation } from "react-i18next";

function Component() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("coach.dashboard")}</h1>
      <p>{t("common.loading")}</p>
    </div>
  );
}
```

**Translation keys** (`app/src/client/i18n.ts`):
- `common.*` - Shared UI text (save, cancel, loading, etc.)
- `nav.*` - Navigation items
- `auth.*` - Authentication flows
- `somatic.*` - Somatic logging feature
- `coach.*` - Coach-specific text
- `client.*` - Client-specific text
- `landing.*` - Landing page content
- `pricing.*` - Pricing plans

**RTL Support**:
- Hebrew is default language (RTL)
- `document.documentElement.dir` set automatically
- Test both LTR and RTL layouts

---

## Common Workflows

### Adding a New Page/Route

**1. Define in `main.wasp`**:

```wasp
route MyFeatureRoute { path: "/my-feature", to: MyFeaturePage }
page MyFeaturePage {
  authRequired: true,  // Optional
  component: import MyFeature from "@src/feature/MyFeaturePage"
}
```

**2. Create page component**:

```typescript
// app/src/feature/MyFeaturePage.tsx
import type { User } from "wasp/entities";

export default function MyFeaturePage({ user }: { user: User }) {
  return (
    <div className="mt-10 px-6">
      <h1>My Feature</h1>
    </div>
  );
}
```

**3. Add to navigation** (if needed):

```typescript
// app/src/client/components/NavBar/constants.ts
export const getNavigationItemsForUser = (user: User) => {
  if (user.role === "COACH") {
    return [
      // ...
      { name: t("nav.myFeature"), to: "/my-feature" },
    ];
  }
};
```

### Adding a New Operation (Query/Action)

**1. Define in `main.wasp`**:

```wasp
query getMyData {
  fn: import { getMyData } from "@src/feature/operations",
  entities: [Model1, Model2]  // Prisma models used
}

action createMyData {
  fn: import { createMyData } from "@src/feature/operations",
  entities: [Model1]
}
```

**2. Implement in `operations.ts`**:

```typescript
// app/src/feature/operations.ts
import type { GetMyData, CreateMyData } from "wasp/server/operations";
import { HttpError } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "@src/server/validation";

// Query example
const getMyDataSchema = z.object({
  id: z.string(),
});

export const getMyData: GetMyData<z.infer<typeof getMyDataSchema>, OutputType> = async (rawArgs, context) => {
  const { id } = ensureArgsSchemaOrThrowHttpError(getMyDataSchema, rawArgs);

  if (!context.user) {
    throw new HttpError(401, "Unauthorized");
  }

  return context.entities.Model.findUnique({ where: { id } });
};

// Action example
const createMyDataSchema = z.object({
  name: z.string().min(1),
});

export const createMyData: CreateMyData<z.infer<typeof createMyDataSchema>, OutputType> = async (rawArgs, context) => {
  const { name } = ensureArgsSchemaOrThrowHttpError(createMyDataSchema, rawArgs);

  if (!context.user) {
    throw new HttpError(401);
  }

  return context.entities.Model.create({
    data: { name, userId: context.user.id },
  });
};
```

**3. Use in component**:

```typescript
import { useQuery, useAction } from "wasp/client/operations";
import { getMyData, createMyData } from "wasp/client/operations";

function Component() {
  const { data, isLoading, refetch } = useQuery(getMyData, { id: "123" });
  const createFn = useAction(createMyData);

  const handleCreate = async () => {
    await createFn({ name: "New Item" });
    refetch(); // Refresh query data
  };

  // ...
}
```

### Database Migration Workflow

**1. Modify `schema.prisma`**:

```prisma
model NewModel {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())

  // Relations
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
}

// Update User model to include relation
model User {
  // ...
  newModels NewModel[]
}
```

**2. Create migration**:

```bash
wasp db migrate-dev
# Prompts: Enter migration name (e.g., "add_new_model")
```

**3. Migration files stored in**:

```
app/migrations/
└── 20251126123456_add_new_model/
    └── migration.sql
```

**4. Apply in production**:

```bash
wasp db migrate-deploy
```

**5. Seed database** (optional):

```typescript
// app/src/server/scripts/dbSeeds.ts
export const seedNewData = async (prismaClient: PrismaClient) => {
  // ...
};
```

Update `main.wasp`:

```wasp
db: {
  seeds: [
    import { seedNewData } from "@src/server/scripts/dbSeeds",
  ]
}
```

Run: `wasp db seed`

### Adding a shadcn/ui Component

**1. Check if component exists** in `app/src/components/ui/`

**2. If not, add manually**:

```bash
# shadcn CLI not used in Wasp - copy component manually
# Reference: https://ui.shadcn.com/docs/components/{component}
```

**3. Create component file**:

```typescript
// app/src/components/ui/new-component.tsx
import * as React from "react";
import { cn } from "@src/lib/utils";

export interface NewComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline";
}

const NewComponent = React.forwardRef<HTMLDivElement, NewComponentProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("base-styles", className)}
        {...props}
      />
    );
  }
);
NewComponent.displayName = "NewComponent";

export { NewComponent };
```

**4. Use in your feature**:

```typescript
import { NewComponent } from "@src/components/ui/new-component";

<NewComponent variant="outline">Content</NewComponent>
```

### Running the Application Locally

**1. Prerequisites**:

```bash
# Install Wasp CLI
curl -sSL https://get.wasp.sh | sh

# Verify installation
wasp version  # Should be >= 0.19.0
```

**2. Set up environment**:

```bash
cd app/

# Copy example env files
cp .env.server.example .env.server
cp .env.client.example .env.client

# Edit .env.server with your values (DATABASE_URL, API keys, etc.)
```

**3. Start database**:

```bash
wasp start db
# Wasp manages PostgreSQL in Docker
# Keep this terminal running
```

**4. Run migrations** (first time or after schema changes):

```bash
wasp db migrate-dev
```

**5. Start application**:

```bash
wasp start
# Client: http://localhost:3000
# Server: http://localhost:3001
```

**6. Seed database** (optional):

```bash
wasp db seed
# Creates mock users and profiles
```

---

## Key Features & Modules

### 1. Coach/Client Relationship System

**Invitation Flow**:

1. Coach invites client via email (`inviteClient` action)
2. Email sent with unique token link
3. Client accepts invitation (`acceptInvitation` action)
4. User created with `role: CLIENT`, auto-linked to coach
5. Email verified automatically

**Key Operations** (`app/src/invitation/operations.ts`):

```typescript
inviteClient: { email: string } => ClientInvitation
acceptInvitation: { token: string } => void
getPendingInvitations: () => ClientInvitation[]
```

**Access Control**:
- Coaches can view all their clients
- Clients can only view their own data
- Coaches cannot view other coaches' clients

**Key Files**:
- `app/src/invitation/operations.ts` - Invitation logic
- `app/src/coach/CoachDashboardPage.tsx` - Coach UI
- `app/src/client/ClientDashboardPage.tsx` - Client UI

### 2. Somatic Logging System (Core Feature)

**Purpose**: Track bodily sensations across 9 body zones with intensity and notes.

**Data Model**:

```typescript
enum BodyZone {
  HEAD, THROAT, CHEST, SOLAR_PLEXUS, BELLY, PELVIS, ARMS, LEGS, FULL_BODY
}

type SomaticLog = {
  bodyZone: BodyZone;
  sensation: string;  // "Tight", "Hot", "Cold", "Vibrating", etc.
  intensity: number;  // 1-10 scale
  note?: string;
  createdAt: Date;
  client: ClientProfile;
};
```

**UI Components**:

- `BodyMapSelector` (`app/src/client/components/BodyMapSelector.tsx`)
  - Interactive SVG body map
  - Click to select zone
  - Visual feedback for selected zone

- `SomaticLogForm` (embedded in ClientDashboardPage)
  - Body zone selector (visual map)
  - Sensation chips (6 preset options: Tight, Hot, Cold, Vibrating, Numb, Heavy)
  - Intensity slider (1-10)
  - Optional notes textarea
  - i18n support for all labels

**Operations** (`app/src/somatic-logs/operations.ts`):

```typescript
createSomaticLog: {
  bodyZone: BodyZone;
  sensation: string;
  intensity: number;
  note?: string;
} => SomaticLog

getSomaticLogs: {
  clientId?: string;  // If coach, filter by client; if client, own logs only
} => SomaticLog[]
```

**Access Control**:
- Clients: Create own logs, view own logs
- Coaches: View client logs (read-only), cannot create
- Visual intensity indicator in coach view

**Key Files**:
- `app/src/somatic-logs/operations.ts`
- `app/src/client/SomaticLogForm.tsx`
- `app/src/client/components/BodyMapSelector.tsx`

### 3. Session Management (Modules 9 & 10)

**Module 9: Session Recaps**

**Purpose**: Track coaching sessions with role-based privacy.

**Data Model**:

```typescript
type CoachSession = {
  sessionDate: Date;
  sessionNumber: number;  // Auto-incremented per client
  topic?: string;         // e.g., "Work Stress"

  // Coach-visible only
  privateNotes?: string;

  // Visible to both coach and client
  sharedSummary?: string;

  coach: CoachProfile;
  client: ClientProfile;
};
```

**Operations** (`app/src/session/operations.ts`):

```typescript
createSession: {
  clientId: string;
  sessionDate: Date;
  topic?: string;
  privateNotes?: string;
  sharedSummary?: string;
} => CoachSession

updateSession: { id: string; /* fields */ } => CoachSession
deleteSession: { id: string } => void

getSessionsForClient: {
  clientId: string;
  limit?: number;
  offset?: number;
} => CoachSession[]  // Role-filtered: clients don't see privateNotes

getRecentSessionsForClient: {
  clientId: string;
  limit?: number;
} => CoachSession[]
```

**Role-Based Filtering**:

```typescript
// In getSessionsForClient operation
const sessions = await context.entities.CoachSession.findMany({ /* ... */ });

// Filter privateNotes for clients
if (context.user.role === "CLIENT") {
  return sessions.map(({ privateNotes, ...session }) => session);
}

return sessions; // Coaches get full data
```

**Module 10: Recurring Sessions**

**Purpose**: Timezone-aware recurring session scheduling.

**Data Model** (added to ClientProfile):

```typescript
type ClientProfile = {
  // ...
  scheduleDay?: number;      // 0-6 (Sunday-Saturday)
  scheduleTime?: string;     // "14:00" (24h format)
  scheduleTimezone?: string; // IANA timezone (e.g., "America/New_York")
  nextSessionDate?: Date;    // Computed next session in UTC
  sessionCount: number;      // Total sessions completed
};
```

**Operations** (`app/src/session/operations.ts`):

```typescript
updateClientSchedule: {
  clientId: string;
  day: number;      // 0-6
  time: string;     // "HH:mm"
  timezone: string; // IANA timezone
} => ClientProfile  // Auto-calculates nextSessionDate

logSession: {
  clientId: string;
  sessionDate: Date;
  topic?: string;
  privateNotes?: string;
  sharedSummary?: string;
} => CoachSession  // Creates session + advances nextSessionDate + increments sessionCount

getUpcomingSessions: () => {
  client: ClientProfile;
  nextSessionDate: Date;
}[]  // For coach dashboard
```

**Timezone Handling** (using `date-fns-tz`):

```typescript
import { zonedTimeToUtc, utcToZonedTime } from "date-fns-tz";

// Convert local time to UTC
const localTime = `${day} ${time}`; // "Monday 14:00"
const utcTime = zonedTimeToUtc(localTime, timezone);

// Display UTC time in client's timezone
const displayTime: utcToZonedTime(nextSessionDate, timezone);
```

**Key Files**:
- `app/src/session/operations.ts` - All session operations
- `app/src/coach/LogSessionPage.tsx` - Session logging UI
- `app/src/coach/components/UpcomingSessions.tsx` - Dashboard widget
- `app/src/client/SessionHistoryPage.tsx` - Client view

### 4. Resource Library (Module 8)

**Purpose**: Coaches upload resources (PDFs, audio, images) for clients to access.

**Data Model**:

```typescript
type Resource = {
  name: string;
  type: string;         // MIME type: "application/pdf", "audio/mpeg", etc.
  s3Key: string;
  description?: string;
  createdAt: Date;
  coach: CoachProfile;
};
```

**Operations** (`app/src/resources/operations.ts`):

```typescript
getUploadUrl: {
  fileName: string;
  fileType: string;
} => { uploadUrl: string; s3Key: string }  // Pre-signed S3 URL

createResource: {
  name: string;
  type: string;
  s3Key: string;
  description?: string;
} => Resource

getCoachResources: {
  coachId?: string;  // Optional filter
} => Resource[]

getResourceDownloadUrl: {
  resourceId: string;
} => { downloadUrl: string }  // Signed URL with expiration

deleteResource: { id: string } => void
```

**S3 Upload Flow**:

1. Client requests pre-signed URL (`getUploadUrl`)
2. Client uploads directly to S3 (no server involvement)
3. Client calls `createResource` with S3 key
4. Resource saved to database

**Access Control**:
- Coaches: Upload, view, delete own resources
- Clients: View resources from their coach (read-only)

**Key Files**:
- `app/src/resources/operations.ts`
- `app/src/coach/ResourcesPage.tsx`
- `app/src/client/ResourcesPage.tsx`

### 5. Admin Dashboard

**Purpose**: System administration, analytics, user management.

**Features**:

- **Analytics Dashboard** (`/admin`)
  - Daily stats (views, users, revenue)
  - Google Analytics integration
  - Plausible.io metrics
  - Page view sources

- **User Management** (`/admin/users`)
  - Paginated user list
  - Role toggling (admin privileges)
  - Subscription status filtering
  - `updateIsUserAdminById` action

- **Settings** (`/admin/settings`)
  - System configuration

- **Calendar** (`/admin/calendar`)
  - Scheduled sessions view

- **Messages** (`/admin/messages`)
  - Contact form messages (TODO)

**Access Control**:

```typescript
// In admin pages
if (!user.isAdmin) {
  return <div>Access denied</div>;
}
```

**Admin Setup** (via environment):

```bash
# .env.server
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

**Cron Jobs** (`main.wasp`):

```wasp
job dailyStatsJob {
  executor: PgBoss,
  perform: { fn: import { calculateDailyStats } from "@src/analytics/stats" },
  schedule: { cron: "0 * * * *" }  // Every hour
  entities: [User, DailyStats, Logs, PageViewSource]
}

job checkExpiredSubscriptionsJob {
  executor: PgBoss,
  perform: { fn: import { checkExpiredSubscriptions } from "@src/payment/worker" },
  schedule: { cron: "0 2 * * *" }  // Daily at 2 AM
  entities: [User]
}
```

**Key Files**:
- `app/src/admin/dashboards/analytics/AnalyticsDashboardPage.tsx`
- `app/src/admin/dashboards/users/UsersDashboardPage.tsx`
- `app/src/analytics/operations.ts`
- `app/src/analytics/stats.ts`

---

## Database Schema

### Key Models

**User** (Authentication & Role):

```prisma
model User {
  id                        String          @id @default(uuid())
  email                     String?         @unique
  username                  String?         @unique

  // Role management
  role                      UserRole        @default(COACH)
  isAdmin                   Boolean         @default(false)

  // i18n
  preferredLanguage         String?         @default("he")

  // Profiles (1:1)
  coachProfile              CoachProfile?
  clientProfile             ClientProfile?

  // Subscription (coaches only)
  paymentProcessorUserId    String?         @unique
  subscriptionStatus        String?         // 'active', 'cancel_at_period_end', 'past_due', 'deleted'
  subscriptionPlan          String?         // 'starter', 'pro'
  credits                   Int             @default(3)

  // Tranzilla
  tranzillaToken            String?

  // Auth
  isEmailVerified           Boolean         @default(false)
  emailVerificationToken    String?
  passwordResetToken        String?

  // Relations
  contactFormMessages       ContactFormMessage[]
  files                     File[]
}
```

**CoachProfile**:

```prisma
model CoachProfile {
  id          String            @id @default(uuid())
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String            @unique

  clients     ClientProfile[]
  invitations ClientInvitation[]
  sessions    CoachSession[]
  resources   Resource[]
}
```

**ClientProfile**:

```prisma
model ClientProfile {
  id      String          @id @default(uuid())
  user    User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId  String          @unique

  coach   CoachProfile?   @relation(fields: [coachId], references: [id])
  coachId String?

  somaticLogs SomaticLog[]
  sessions    CoachSession[]

  // Module 10: Recurring sessions
  scheduleDay      Int?      // 0-6
  scheduleTime     String?   // "HH:mm"
  scheduleTimezone String?   // IANA timezone
  nextSessionDate  DateTime?
  sessionCount     Int       @default(0)
}
```

**SomaticLog**:

```prisma
model SomaticLog {
  id        String      @id @default(uuid())
  createdAt DateTime    @default(now())

  bodyZone  BodyZone
  sensation String
  intensity Int         // 1-10
  note      String?     @db.Text

  client    ClientProfile @relation(fields: [clientId], references: [id], onDelete: Cascade)
  clientId  String
}
```

**CoachSession**:

```prisma
model CoachSession {
  id            String        @id @default(uuid())
  createdAt     DateTime      @default(now())
  sessionDate   DateTime      @default(now())
  sessionNumber Int?
  topic         String?

  privateNotes  String?       @db.Text  // Coach-only
  sharedSummary String?       @db.Text  // Both

  coach         CoachProfile  @relation(fields: [coachId], references: [id], onDelete: Cascade)
  coachId       String

  client        ClientProfile @relation(fields: [clientId], references: [id], onDelete: Cascade)
  clientId      String
}
```

**Resource**:

```prisma
model Resource {
  id          String        @id @default(uuid())
  name        String
  type        String        // MIME type
  s3Key       String
  description String?
  createdAt   DateTime      @default(now())

  coach       CoachProfile  @relation(fields: [coachId], references: [id], onDelete: Cascade)
  coachId     String
}
```

**ClientInvitation**:

```prisma
model ClientInvitation {
  id        String        @id @default(uuid())
  email     String
  token     String        @unique
  status    String        @default("PENDING")  // PENDING, ACCEPTED
  createdAt DateTime      @default(now())
  expiresAt DateTime

  coach     CoachProfile  @relation(fields: [coachId], references: [id], onDelete: Cascade)
  coachId   String
}
```

### Enums

```prisma
enum UserRole {
  ADMIN
  COACH
  CLIENT
}

enum BodyZone {
  HEAD
  THROAT
  CHEST
  SOLAR_PLEXUS
  BELLY
  PELVIS
  ARMS
  LEGS
  FULL_BODY
}
```

---

## Important Files Reference

### Configuration

| File | Purpose |
|------|---------|
| `app/main.wasp` | Wasp configuration (routes, pages, operations, auth, jobs) |
| `app/schema.prisma` | Database schema (14 models, 2 enums) |
| `app/tsconfig.json` | TypeScript configuration (strict mode) |
| `app/components.json` | shadcn/ui configuration (style: new-york) |
| `app/tailwind.config.js` | Tailwind CSS configuration + plugins |
| `app/vite.config.ts` | Vite bundler configuration |

### Core Utilities

| File | Purpose |
|------|---------|
| `app/src/lib/utils.ts` | `cn()` - Tailwind class merging |
| `app/src/server/validation.ts` | `ensureArgsSchemaOrThrowHttpError()` - Zod validation helper |
| `app/src/server/utils.ts` | `requireNodeEnvVar()` - Env var helper |
| `app/src/shared/utils.ts` | `throttleWithTrailingInvocation()`, `assertUnreachable()` |
| `app/src/client/i18n.ts` | i18n configuration + translations (en/he) |

### Feature Operations

| File | Purpose |
|------|---------|
| `app/src/session/operations.ts` | Session CRUD + scheduling (5 operations) |
| `app/src/somatic-logs/operations.ts` | Somatic log create + read (2 operations) |
| `app/src/invitation/operations.ts` | Client invitation flow (3 operations) |
| `app/src/user/operations.ts` | User management (3 operations) |
| `app/src/payment/operations.ts` | Checkout + customer portal (2 operations) |
| `app/src/resources/operations.ts` | Resource library (5 operations) |
| `app/src/analytics/operations.ts` | Daily stats query (1 operation) |

### Key Pages

| File | Purpose |
|------|---------|
| `app/src/coach/CoachDashboardPage.tsx` | Coach dashboard (client list, invites, upcoming sessions) |
| `app/src/client/ClientDashboardPage.tsx` | Client dashboard (somatic log form, recent logs) |
| `app/src/coach/ClientDetailsPage.tsx` | Individual client view (logs, sessions) |
| `app/src/coach/LogSessionPage.tsx` | Create/log a session |
| `app/src/client/SessionHistoryPage.tsx` | Client session history |
| `app/src/landing-page/LandingPage.tsx` | Marketing landing page |
| `app/src/admin/dashboards/analytics/AnalyticsDashboardPage.tsx` | Admin analytics |
| `app/src/admin/dashboards/users/UsersDashboardPage.tsx` | Admin user management |

### UI Components

| File | Purpose |
|------|---------|
| `app/src/components/ui/*` | 20+ shadcn/ui components (button, card, dialog, etc.) |
| `app/src/client/components/BodyMapSelector.tsx` | Interactive body map for somatic logging |
| `app/src/client/components/NavBar/*` | Navigation with role-based items |
| `app/src/coach/components/UpcomingSessions.tsx` | Upcoming sessions widget |

---

## Testing & Quality

### E2E Testing

**Framework**: Playwright

**Location**: `/home/user/Loom-Platform/e2e-tests/`

**Configuration**: `e2e-tests/playwright.config.ts`

**Running Tests**:

```bash
cd e2e-tests/
npm install
npx playwright test
```

### Code Quality

**Prettier** (3.1.1 with Tailwind plugin):

```bash
# Format code
npm run prettier:format

# Check formatting
npm run prettier:check
```

**TypeScript Strict Mode**:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    // ...
  }
}
```

**Best Practices**:

- All operations must validate input with Zod
- All user-facing text must use i18n
- All components must use TypeScript
- All Tailwind classes should use `cn()` for merging
- All database operations must use Prisma (no raw SQL)

---

## Deployment & Environment

### Environment Variables

**Server** (`.env.server`):

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Payment Providers
STRIPE_API_KEY=sk_***
STRIPE_WEBHOOK_SECRET=whsec_***
LEMONSQUEEZY_API_KEY=***
LEMONSQUEEZY_WEBHOOK_SECRET=***
PAYMENTS_STRIPE_STARTER_PLAN_ID=price_***
PAYMENTS_STRIPE_PRO_PLAN_ID=price_***

# Admin
ADMIN_EMAILS=admin1@example.com,admin2@example.com

# Auth
GOOGLE_CLIENT_ID=***
GOOGLE_CLIENT_SECRET=***

# Email
SENDGRID_API_KEY=SG.***

# Analytics
PLAUSIBLE_API_KEY=***
PLAUSIBLE_SITE_ID=loom-platform.com
GOOGLE_ANALYTICS_CLIENT_EMAIL=***
GOOGLE_ANALYTICS_PRIVATE_KEY=***
GOOGLE_ANALYTICS_PROPERTY_ID=***

# S3
AWS_S3_IAM_ACCESS_KEY_ID=***
AWS_S3_IAM_SECRET_ACCESS_KEY=***
AWS_S3_FILES_BUCKET=loom-platform-files
AWS_S3_REGION=us-east-1

# OpenAI (optional)
OPENAI_API_KEY=sk-***
```

**Client** (`.env.client`):

```bash
REACT_APP_GOOGLE_ANALYTICS_ID=G-***
```

### Database Seeding

**Seed Functions** (`main.wasp`):

```wasp
db: {
  seeds: [
    import { seedMockUsers } from "@src/server/scripts/dbSeeds",
    import { createMissingProfiles } from "@src/server/scripts/createMissingProfiles",
  ]
}
```

**Running Seeds**:

```bash
wasp db seed
```

**Mock Users**:
- Creates coaches and clients for development
- Auto-generates profiles
- Links clients to coaches

### Migrations

**Directory**: `app/migrations/`

**Recent Migrations**:
- `20251122084542_init/` - Initial schema
- `20251122171419_role_based_coaching_platform/` - Role system
- `20251122172759_client_invitation_system/` - Invitations
- `20251124151608_add_session_schedule/` - Module 10 (recurring sessions)

**Creating Migrations**:

```bash
wasp db migrate-dev
# Prompts for migration name
```

**Applying Migrations** (production):

```bash
wasp db migrate-deploy
```

---

## AI Assistant Guidelines

### When Adding Features

1. **Always** check for existing patterns in similar features first
2. **Follow** the operations pattern religiously (Zod validation, auth checks, role-based filtering)
3. **Use** i18n for all user-facing text (add keys to `app/src/client/i18n.ts`)
4. **Create** migrations for database changes (`wasp db migrate-dev`)
5. **Update** `main.wasp` for new routes, pages, operations
6. **Test** both coach and client perspectives (role-based access)
7. **Consider** timezone implications for date/time features
8. **Use** shadcn/ui components for UI consistency

### When Debugging

1. **Check** server logs (`wasp start` output)
2. **Verify** environment variables (`.env.server`, `.env.client`)
3. **Inspect** Prisma queries (add `console.log` in operations)
4. **Test** with different user roles (coach/client/admin)
5. **Validate** input schemas (Zod errors are descriptive)
6. **Check** database state (`wasp db studio` for Prisma Studio)

### Common Pitfalls

❌ **Don't** use raw SQL - always use Prisma
❌ **Don't** skip Zod validation in operations
❌ **Don't** hardcode text - use i18n keys
❌ **Don't** expose `privateNotes` to clients in queries
❌ **Don't** forget to check `context.user.role` for authorization
❌ **Don't** use client-side routing for auth-required pages (Wasp handles this)
❌ **Don't** modify `.wasp/` directory (auto-generated)

✅ **Do** follow existing patterns in similar features
✅ **Do** validate all inputs with Zod
✅ **Do** use `ensureArgsSchemaOrThrowHttpError` helper
✅ **Do** throw `HttpError` for auth/validation failures
✅ **Do** use `cn()` for Tailwind class merging
✅ **Do** test role-based access control
✅ **Do** use `date-fns-tz` for timezone handling

### Code Style

- **Prefer** functional components over class components
- **Use** `async/await` over `.then()` for promises
- **Destructure** props in function parameters
- **Use** TypeScript strict mode (no `any` types)
- **Keep** components focused (single responsibility)
- **Extract** complex logic into custom hooks
- **Use** Tailwind utilities over custom CSS
- **Prefer** Radix UI primitives over custom implementations

---

## Commit Message Conventions

Based on recent commits:

```
Feature: [Description]
  Example: "Feature: Implement Nano Banana Pro SomaticBodyMap interactive widget"

Implement [Module/Feature]: [Description]
  Example: "Implement Module 10: Recurring Session Tracker with timezone-aware scheduling"

Fix: [Description]
  Example: "Fix: Implement i18n translations and fix console errors"

Security: [Description]
  Example: "Security: Remove exposed credentials and update .gitignore"
```

---

## Additional Resources

- **Wasp Documentation**: https://wasp.sh/docs
- **Open SaaS Template**: https://opensaas.sh
- **shadcn/ui Components**: https://ui.shadcn.com
- **Radix UI**: https://www.radix-ui.com
- **Prisma Documentation**: https://www.prisma.io/docs
- **date-fns-tz**: https://date-fns.org/docs/Time-Zones

---

## Contact & Support

For questions about this codebase:

1. **Read this CLAUDE.md** first
2. **Check** existing similar features for patterns
3. **Explore** `app/main.wasp` for all routes/operations
4. **Review** `app/schema.prisma` for data model

---

**Document Version**: 1.0
**Last Updated**: 2025-11-26
**Maintainer**: Loom Platform Development Team
