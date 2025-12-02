# API Contracts

Phase 1 requires every query/action to declare explicit request/response DTOs and validate inputs on ingress. The table below summarizes the contracts enforced today. Each request payload is backed by a Zod schema inside the referenced source file and is validated with `ensureArgsSchemaOrThrowHttpError` before any side-effects execute.

## Coach & Client Management (`src/coach/operations.ts`)

### `getClientsForCoach` (query)

- **Request DTO:** `void` (uses authenticated coach context).
- **Response DTO:** `ClientWithStats[]` containing `{ id, userId, email, username, displayName, somaticLogCount, lastLogDate }`.
- **Schema:** n/a (no args).

### `getClientProfile` (query)

- **Request DTO:** `GetClientProfileInput` (`clientId: string`).
- **Response DTO:** `GetClientProfileResponse` `{ id, clientType, displayName, contactEmail, avatarS3Key, lastActivityDate, user?: { email, username } }`.
- **Schema:** `getClientProfileSchema`.

### `createOfflineClient` (action)

- **Request DTO:** `CreateOfflineClientInput` `{ displayName: string; contactEmail?: string; avatarS3Key?: string }`.
- **Response DTO:** `void`.
- **Schema:** `createOfflineClientSchema`.

### `updateOfflineClient` (action)

- **Request DTO:** `UpdateOfflineClientInput` `{ clientId: string; displayName?: string; contactEmail?: string; avatarS3Key?: string }`.
- **Response DTO:** `void`.
- **Schema:** `updateOfflineClientSchema`.

### `deleteOfflineClient` (action)

- **Request DTO:** `DeleteOfflineClientInput` `{ clientId: string }`.
- **Response DTO:** `void`.
- **Schema:** `deleteOfflineClientSchema`.

## User & Onboarding (`src/user/operations.ts`)

### `getPaginatedUsers` (query)

- **Request DTO:** `GetPaginatedUsersInput` `{ skipPages: number; filter: { emailContains?: string; isAdmin?: boolean; subscriptionStatusIn?: (SubscriptionStatus | null)[] } }`.
- **Response DTO:** `{ users: Pick<User, "id" | "email" | "username" | "subscriptionStatus" | "paymentProcessorUserId" | "isAdmin">[]; totalPages: number }`.
- **Schema:** `getPaginatorArgsSchema`.

### `updateIsUserAdminById` (action)

- **Request DTO:** `{ id: string; isAdmin: boolean }`.
- **Response DTO:** `User`.
- **Schema:** `updateUserAdminByIdInputSchema`.

### `updateUserLanguage` (action)

- **Request DTO:** `{ language: "en" | "he" }`.
- **Response DTO:** `User`.
- **Schema:** `updateUserLanguageInputSchema`.

### `getOnboardingStatus` (query)

- **Request DTO:** `void`.
- **Response DTO:** `{ onboardingCompleted: boolean; onboardingSteps: Record<string, boolean> | null }`.
- **Schema:** n/a (no args).

### `updateOnboardingStatus` (action)

- **Request DTO:** `{ onboardingCompleted: boolean; onboardingSteps?: Record<string, boolean> }`.
- **Response DTO:** same shape as `getOnboardingStatus`.
- **Schema:** `updateOnboardingStatusInputSchema`.

## Invitations (`src/invitation/operations.ts`)

### `inviteClient` (action)

- **Request DTO:** `{ email: string }`.
- **Response DTO:** `void`.
- **Schema:** `inviteClientSchema`.

### `acceptInvitation` (action)

- **Request DTO:** `{ token: string; password: string; username: string }`.
- **Response DTO:** `void`.
- **Schema:** `acceptInvitationSchema`.

### `cancelInvitation` (action)

- **Request DTO:** `{ invitationId: string }`.
- **Response DTO:** `void`.
- **Schema:** `cancelInvitationSchema`.

### `getPendingInvitations` (query)

- **Request DTO:** `void`.
- **Response DTO:** `PendingInvitation[]` `{ id, email, createdAt, expiresAt }`.
- **Schema:** n/a (no args).

## Somatic Logs & Analytics (`src/somatic-logs/operations.ts`)

### `createSomaticLog` (action)

- **Request DTO:** `{ bodyZone: BodyZone; sensation: string; intensity: number (1-10); note?: string; sharedWithCoach?: boolean }`.
- **Response DTO:** `void`.
- **Schema:** `createSomaticLogSchema`.

### `getSomaticLogs` (query)

- **Request DTO:** `{ clientId?: string; startDate?: Date; endDate?: Date; bodyZones?: string[]; minIntensity?: number; maxIntensity?: number }`.
- **Response DTO:** `SomaticLogResponse[]` `{ id, createdAt, bodyZone, sensation, intensity, note, sharedWithCoach }`.
- **Schema:** `getSomaticLogsSchema`.

### `updateSomaticLogVisibility` (action)

- **Request DTO:** `{ logId: string; sharedWithCoach: boolean }`.
- **Response DTO:** `SomaticLogResponse` for the updated log.
- **Schema:** `updateSomaticLogVisibilitySchema`.

### `getClientAnalytics` (query)

- **Request DTO:** `{ clientId: string; period: "30d" | "90d" | "365d" }`.
- **Response DTO:** `ClientAnalyticsResult` `{ topBodyZones, topSensations, intensityTrendOverTime, totalLogsInPeriod }` (cached via `SomaticLogAnalytics`).
- **Schema:** `getClientAnalyticsSchema`.

## Client Insights (`src/insights/operations.ts`)

### `getClientInsights` (query)

- **Request DTO:** `{ clientId: string; timeRange: "30days" | "3months" | "allTime" }`.
- **Response DTO:** Either `{ hasInsufficientData: true; minLogsRequired; totalLogs }` or `{ hasInsufficientData: false; topSensations: { sensation, count, percentage }[]; bodyZoneActivity: { bodyZone, count, percentage }[]; averageIntensity; totalLogs; timeRange }`.
- **Schema:** `getClientInsightsSchema`.

## Sessions (`src/session/operations.ts`)

### `createSession` (action)

- **Request DTO:** `{ clientId: string; sessionDate?: string | Date; privateNotes?: string | null; sharedSummary?: string | null }`.
- **Response DTO:** `SessionResponse` `{ id, createdAt, sessionDate, sessionNumber?, topic?, privateNotes, sharedSummary }`.
- **Schema:** `createSessionSchema`.

### `updateSession` (action)

- **Request DTO:** `{ sessionId: string; sessionDate?: string | Date; privateNotes?: string | null; sharedSummary?: string | null }`.
- **Response DTO:** `SessionResponse`.
- **Schema:** `updateSessionSchema`.

### `deleteSession` (action)

- **Request DTO:** `{ sessionId: string }`.
- **Response DTO:** `void`.
- **Schema:** `deleteSessionSchema`.

### `getSessionsForClient` (query)

- **Request DTO:** `{ clientId: string; page?: number; limit?: number }`.
- **Response DTO:** `{ sessions: SessionResponse[] | SessionResponsePublic[]; total; page; limit; totalPages }` where client viewers receive only public fields (`SessionResponsePublic`).
- **Schema:** `getSessionsForClientSchema`.

### `getRecentSessionsForClient` (query)

- **Request DTO:** `{ clientId?: string }` (coaches must supply, clients get theirs by default).
- **Response DTO:** `SessionResponsePublic[]` (last three sessions with shared summary, somatic anchor, attached resources).
- **Schema:** `getRecentSessionsForClientSchema`.

### `logSession` (action)

- **Request DTO:** `{ clientId: string; sessionDate?: string | Date; topic?: string | null; privateNotes?: string | null; sharedSummary?: string | null; somaticAnchor?: BodyZone | null; resourceIds?: string[] }`.
- **Response DTO:** `LogSessionResponse` `{ id, sessionNumber, sessionDate, topic, privateNotes, sharedSummary, somaticAnchor }`.
- **Schema:** `logSessionSchema`.

## Goals & Milestones (`src/goals/operations.ts`)

### `createGoal` (action)

- **Request DTO:** `{ title: string; type: "OKR" | "SMART" | "HABIT"; dueDate?: ISO string; milestones?: { text: string; order?: number }[]; clientId: string }`.
- **Response DTO:** `GoalWithMilestones` (Prisma payload with ordered milestones).
- **Schema:** `CreateGoalSchema`.

### `updateGoal` (action)

- **Request DTO:** `{ goalId: string; title?: string; type?: "OKR" | "SMART" | "HABIT"; dueDate?: ISO string; status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" }`.
- **Response DTO:** `GoalWithMilestones`.
- **Schema:** `UpdateGoalSchema`.

### `deleteGoal` (action)

- **Request DTO:** `{ goalId: string }`.
- **Response DTO:** `{ success: true }`.
- **Schema:** `DeleteGoalSchema`.

### `getGoals` (query)

- **Request DTO:** `{ clientId?: string }` (coaches must pass a client id; clients default to own profile).
- **Response DTO:** `GoalWithMilestones[]` ordered newest first.
- **Schema:** `GetGoalsSchema`.

### `toggleMilestone` (action)

- **Request DTO:** `{ milestoneId: string; completed: boolean }`.
- **Response DTO:** `{ milestone: Milestone; goal: GoalWithMilestones }` with recalculated progress.
- **Schema:** `ToggleMilestoneSchema`.

### `updateGoalProgress` (action)

- **Request DTO:** `{ goalId: string }`.
- **Response DTO:** `GoalWithMilestones` after recalculating progress based on milestone completion.
- **Schema:** `UpdateGoalProgressSchema`.

## Payments & Billing (`src/payment/operations.ts`)

### `generateCheckoutSession` (action)

- **Request DTO:** `PaymentPlanId` enum (one of the plan ids defined in `payment/plans.ts`).
- **Response DTO:** `CheckoutSession` `{ sessionUrl: string | null; sessionId: string }`.
- **Schema:** `generateCheckoutSessionSchema`.

### `getCustomerPortalUrl` (query)

- **Request DTO:** `void`.
- **Response DTO:** `string | null` pointing to the billing portal.
- **Schema:** n/a.

## File Uploads (`src/file-upload/operations.ts`)

### `createFileUploadUrl` (action)

- **Request DTO:** `{ fileType: AllowedFileType; fileName: string }`.
- **Response DTO:** `{ s3UploadUrl: string; s3UploadFields: Record<string, string>; s3Key: string }`.
- **Schema:** `createFileInputSchema`.

### `addFileToDb` (action)

- **Request DTO:** `{ s3Key: string; fileType: AllowedFileType; fileName: string }`.
- **Response DTO:** `File` entity row.
- **Schema:** `addFileToDbInputSchema`.

### `getAllFilesByUser` (query)

- **Request DTO:** `void`.
- **Response DTO:** `File[]` scoped to the authenticated user.
- **Schema:** n/a.

### `getDownloadFileSignedURL` (query)

- **Request DTO:** `{ s3Key: string }`.
- **Response DTO:** `string` signed URL (owner-validated).
- **Schema:** `getDownloadFileSignedURLInputSchema`.

### `deleteFile` (action)

- **Request DTO:** `{ id: string }` (file id).
- **Response DTO:** `File` that was deleted (also cleans S3 best-effort).
- **Schema:** `deleteFileInputSchema`.

### `getClientAvatarUploadUrl` (action)

- **Request DTO:** `{ fileName: string; fileType: "image/png" | "image/jpeg" | "image/webp" | "image/gif" }`.
- **Response DTO:** `{ uploadUrl: string; s3Key: string }` for avatar uploads.
- **Schema:** `getClientAvatarUploadUrlSchema`.

## Resource Library (`src/resources/operations.ts`)

### `getUploadUrl` (action)

- **Request DTO:** `{ fileName: string; fileType: AllowedResourceMime }`.
- **Response DTO:** `{ uploadUrl: string; uploadFields: Record<string, string>; s3Key: string }`.
- **Schema:** `getUploadUrlInputSchema`.

### `createResource` (action)

- **Request DTO:** `{ name: string; type: AllowedResourceMime; s3Key: string; description?: string }`.
- **Response DTO:** `Resource` entity row.
- **Schema:** `createResourceInputSchema`.

### `getCoachResources` (query)

- **Request DTO:** `void` (coach receives own resources, client gets their coach's).
- **Response DTO:** `Resource[]` sorted newest first.
- **Schema:** n/a.

### `getResourceDownloadUrl` (query)

- **Request DTO:** `{ resourceId: string }`.
- **Response DTO:** `string` signed download URL.
- **Schema:** `getResourceDownloadUrlInputSchema`.

### `deleteResource` (action)

- **Request DTO:** `{ resourceId: string }`.
- **Response DTO:** `Resource` that was deleted locally (S3 cleanup best-effort).
- **Schema:** `deleteResourceInputSchema`.

## Analytics & Reporting

### `getDailyStats` (query, `src/analytics/operations.ts`)

- **Request DTO:** `void`.
- **Response DTO:** `{ dailyStats: DailyStatsWithSources; weeklyStats: DailyStatsWithSources[] }` where each stats object includes totals plus nested `PageViewSource[]`.
- **Schema:** n/a.

### `generateClientExportPdf` (action, `src/analytics/exportOperations.ts`)

- **Request DTO:** `{ clientId: string; period: "30d" | "90d" | "365d" }`.
- **Response DTO:** `{ pdfBase64: string; filename: string }` with analytics snapshot rendered to PDF.
- **Schema:** `generateClientExportPdfSchema`.

## Notifications (`src/notifications/operations.ts`)

### `getNotifications` (query)

- **Request DTO:** `{ limit?: number (1-100); offset?: number; filter?: "all" | "unread" }` (defaults applied by schema).
- **Response DTO:** `{ notifications: NotificationResponse[]; total: number; hasMore: boolean }`.
- **Schema:** `getNotificationsSchema`.

### `markNotificationRead` (action)

- **Request DTO:** `{ notificationId: string }`.
- **Response DTO:** `NotificationResponse` for the updated notification.
- **Schema:** `markNotificationReadSchema`.

### `markAllNotificationsRead` (action)

- **Request DTO:** `Record<string, never>` (no args).
- **Response DTO:** `void`.
- **Schema:** n/a.

### `getNotificationPreferences` (query)

- **Request DTO:** `Record<string, never>`.
- **Response DTO:** `NotificationPreferences` row (created on demand).
- **Schema:** n/a.

### `updateNotificationPreferences` (action)

- **Request DTO:** `{ emailSessionReminders?: boolean; emailSessionSummaries?: boolean; emailResourceShared?: boolean; inAppSessionReminders?: boolean; inAppSessionSummaries?: boolean; inAppResourceShared?: boolean }`.
- **Response DTO:** Updated `NotificationPreferences`.
- **Schema:** `updateNotificationPreferencesSchema`.

---

Every operation above now documents its input and output DTOs, references the Zod schema enforcing shape, and runs through `ensureArgsSchemaOrThrowHttpError` (when arguments exist) inside the cited module. This list should be kept in sync whenever a new query/action is added.
