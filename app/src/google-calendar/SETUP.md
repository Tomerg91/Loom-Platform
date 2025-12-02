# Google Calendar Integration Setup

## Prerequisites

1. Google Cloud Project with Calendar API enabled
2. Service Account with Calendar API permissions

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (name: "Loom Platform" or similar)
3. Enable Calendar API:
   - Search for "Calendar API"
   - Click "Enable"

### 2. Create Service Account

1. Navigate to Service Accounts (left sidebar)
2. Click "Create Service Account"
3. Fill in details:
   - Service account name: "loom-platform-calendar"
   - Grant role: "Editor" (or custom with calendar permissions)
4. Click "Create and Continue"

### 3. Create and Export Key

1. In the service account details, go to "Keys" tab
2. Click "Add Key" → "Create new key"
3. Choose "JSON" format
4. Download the JSON file
5. Base64 encode it:
   ```bash
   cat service-account-key.json | base64
   ```
6. Copy the output and paste into `.env.server` as `GOOGLE_SERVICE_ACCOUNT_KEY`

### 4. Share Calendar Access

For each user who connects their calendar:
1. User logs into their Google account
2. App displays "Connect Google Calendar" button
3. User clicks button
4. App creates a calendar in their account via service account
5. User manually grants app access to their calendar (or implement OAuth for automation)

## Testing

To test locally:

```bash
# Set GOOGLE_SERVICE_ACCOUNT_KEY in .env.server
wasp start

# In browser:
# 1. Log in as coach
# 2. Go to Settings
# 3. Click "Connect Google Calendar"
# 4. Check Google Calendar - should see "Loom Platform - email@example.com"
# 5. Create a session
# 6. Check Google Calendar - session should appear
```

## Troubleshooting

- **"Failed to create Google Calendar"**: Check service account has Calendar API permissions
- **"Unauthorized"**: Verify GOOGLE_SERVICE_ACCOUNT_KEY is valid JSON and properly formatted
- **Event not appearing**: Check calendar ID in database and user's Google Calendar settings
