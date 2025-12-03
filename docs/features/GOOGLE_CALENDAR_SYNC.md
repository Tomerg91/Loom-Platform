# Google Calendar Sync Feature

## Overview

Users can connect their Google Calendar to automatically sync coaching sessions, preventing double bookings and keeping their calendar up-to-date.

## Features

- **Push-only sync**: Sessions automatically added to Google Calendar
- **Error resilience**: Session creation succeeds even if Google Calendar sync fails
- **Service account**: Single shared service account manages calendar access
- **Connection management**: Users can connect/disconnect their calendar anytime
- **Error tracking**: Sync errors logged for debugging

## Architecture

### Service Account

The app uses a Google Cloud service account to:
1. Create a dedicated "Loom Platform" calendar per user
2. Add/update/delete session events
3. Manage all calendar operations server-side

Users grant access to the service account, which then has permission to their calendar.

### Data Models

```
UserCalendarConnection
├── userId (unique)
├── calendarId (Google Calendar ID)
├── isConnected (boolean)
├── lastSyncAt (timestamp)
└── syncErrorCount (error tracking)

GoogleCalendarEvent
├── sessionId (unique)
├── googleEventId
└── syncedAt
```

### Operations

- `connectGoogleCalendar()` - Create calendar and establish connection
- `disconnectGoogleCalendar()` - Disable sync (calendar remains in Google)
- `getCalendarConnection()` - Query current connection status

## Event Details

When a session syncs to Google Calendar:

| Field | Value |
|-------|-------|
| **Title** | Session topic or "Coaching Session" |
| **Time** | Session date + 1 hour duration |
| **Description** | Topic, notes, link back to Loom Platform |
| **Availability** | Marked as "busy" (opaque) |

## Error Handling

- **Connection fails**: User sees error toast, can retry
- **Sync fails after creation**: Session saved, error logged and tracked
- **API quota exceeded**: Error logged, user sees notification in settings
- **Calendar access revoked**: `isConnected` set to false on next sync attempt

## Setup & Deployment

See `/Users/tomergalansky/loom-platform/.worktrees/feature/google-calendar-sync/app/src/google-calendar/SETUP.md` for complete setup instructions.

## Testing

- Unit tests: `/Users/tomergalansky/loom-platform/.worktrees/feature/google-calendar-sync/app/src/google-calendar/service.test.ts`
- Integration tests: `/Users/tomergalansky/loom-platform/.worktrees/feature/google-calendar-sync/app/src/google-calendar/integration.test.ts`
- E2E tests: `/Users/tomergalansky/loom-platform/.worktrees/feature/google-calendar-sync/e2e-tests/calendar-sync.spec.ts`

## Future Enhancements

- Bidirectional sync (read Google Calendar for availability)
- Automatic conflict detection before booking
- Custom calendar colors per coach
- Timezone-aware event times
- Event update/deletion propagation
