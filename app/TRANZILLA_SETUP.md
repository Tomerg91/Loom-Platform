# Tranzilla Payment Integration Setup

## Overview

This app is now configured to use **Tranzilla** as the payment processor with auto-renewing subscriptions via tokenization.

## Required Environment Variables

Add these to your `.env.server` file:

```bash
# ============================================
# TRANZILLA CONFIGURATION
# ============================================

# Your Tranzilla terminal name (provided by Tranzilla)
TRANZILLA_TERMINAL_NAME=your_terminal_name_here

# Your Tranzilla API password (for signature validation and API calls)
# Used for:
# - HMAC-SHA256 signature validation of incoming webhooks
# - Authentication headers for outgoing API requests (token charging)
TRANZILLA_API_PASSWORD=your_api_password_here

# ============================================
# TRANZILLA PRICING (in ILS)
# ============================================

# Hobby Plan Price (in ILS) - Used for token charging API calls
PAYMENTS_TRANZILLA_HOBBY_PRICE=99

# Pro Plan Price (in ILS) - Used for token charging API calls
PAYMENTS_TRANZILLA_PRO_PRICE=100

# Credits Plan Price (in ILS) - Used for token charging API calls
PAYMENTS_TRANZILLA_CREDITS_PRICE=50

# ============================================
# TRANZILLA WEBHOOK
# ============================================

# The webhook URL is automatically generated and sent to Tranzilla:
# {WASP_API_URL}/payments-webhook
#
# Tranzilla will POST to this URL with signature headers:
# - X-tranzila-api-app-key
# - X-tranzila-api-request-time
# - X-tranzila-api-nonce
# - X-tranzila-api-access-token
```

## How It Works

### 1. Initial Payment Flow

1. User clicks "Buy plan" on the pricing page
2. System generates a Tranzilla hosted payment page URL
3. User is redirected to Tranzilla's secure payment form
4. User enters credit card details
5. Tranzilla processes the payment and returns a **TranzilaTK token**
6. Webhook receives the payment notification with the token
7. System stores the token in `user.tranzillaToken` field
8. User's subscription status is set to "active"

### 2. Auto-Renewal (Future)

1. A cron job runs daily at 2 AM
2. Finds users with subscriptions expired >30 days
3. Currently: **Logs** these users to console
4. **Future Phase 2**: Will charge their stored TranzilaTK token

### 3. Database Changes

- **User.tranzillaToken**: Stores the TranzilaTK token for renewals
- **TranzillaTransaction**: Tracks all payment transactions for idempotency

## Testing

### Local Development

1. Add environment variables to `.env.server`
2. Use Tranzilla's **test terminal** credentials
3. Restart the app: `wasp start`
4. Navigate to `/pricing` and try purchasing a plan
5. Use test credit card numbers provided by Tranzilla

### Webhook Testing

For local webhook testing, you'll need to expose your local server:

```bash
# Install ngrok or similar tool
ngrok http 3001

# Update Tranzilla notify_url_address to point to:
# https://your-ngrok-url.ngrok.io/payments-webhook
```

**Note**: For development, the webhook URL is auto-generated as:

```
{WASP_API_URL}/payments-webhook
```

## Security Notes

### Signature Validation (Implemented ✓)

The webhook now includes **real HMAC-SHA256 signature validation** using Tranzilla's authentication headers:

**Headers validated:**

- `X-tranzila-api-app-key` - Application identifier
- `X-tranzila-api-request-time` - Unix timestamp (milliseconds)
- `X-tranzila-api-nonce` - Random 40-byte string
- `X-tranzila-api-access-token` - HMAC-SHA256 signature

**Validation logic** (`src/payment/tranzilla/tranzillaClient.ts`):

```typescript
const dataToSign = `${appKey}${apiPassword}${requestTime}${nonce}`;
const expectedSignature = crypto
  .createHmac("sha256", apiPassword)
  .update(dataToSign)
  .digest("hex");
```

**Security features:**

- Constant-time comparison to prevent timing attacks
- Replay attack prevention (5-minute window)
- Required field validation
- Detailed error logging

### Automatic Renewal Implementation (Phase 2 - Implemented ✓)

The subscription renewal system is now fully implemented and runs daily at 2 AM:

**Grace Period:** 7 days after subscription expiration (first charge attempt on day 37)

**Retry Strategy:**

- Maximum 5 daily retry attempts
- Each failed attempt triggers a 24-hour delay before next retry
- Subscription marked as `past_due` during retry period

**Failure Handling:**

- Attempt 1-4: Send failure email, retry next day
- Attempt 5: Cancel subscription, send cancellation email
- All failures logged with reason and retry schedule

**Email Notifications:**

- **Success**: Confirmation with renewal date and next renewal date
- **Failure**: Reason for failure, retry schedule, and action items
- **Cancellation**: Final notice with reactivation instructions

**Token Charging API** (`src/payment/tranzilla/chargeTranzillaToken`):

- Endpoint: `POST https://direct.tranzilla.com/{terminal}/api`
- Parameters: `TranzilaTK`, `sum`, `cred_type`, `currency`, `pdesc`
- Authentication: Same headers as webhook validation
- Response handling: Checks for response code `000` (success)

### Production Checklist

- [x] Implement real signature validation (HMAC-SHA256)
- [x] Implement token charging API integration
- [x] Implement retry logic with email notifications
- [x] Add database fields for retry tracking (subscriptionRetryCount, lastRetryAttempt, subscriptionNextRetryDate)
- [x] Create email templates (success, failure, cancellation)
- [ ] Use production Tranzilla terminal credentials
- [ ] Configure webhook URL in Tranzilla dashboard
- [ ] Test duplicate transaction prevention
- [ ] Set up monitoring for failed payments
- [ ] Test the cron job with users who have expired subscriptions
- [ ] Test email delivery for renewal notifications
- [ ] Monitor webhook logs for signature validation failures

## Cron Job Schedule

**Job Name**: `checkExpiredSubscriptionsJob`
**Schedule**: Daily at 2 AM UTC (`0 2 * * *`)
**Behavior**: Automatically charges expired subscriptions and sends email notifications

### Output Example (Success):

```
🔄 Starting subscription renewal check...
🔄 Found 2 subscription(s) to process...
💳 Charging user abc123 (user@example.com): ₪100
✅ Successfully renewed subscription for user abc123
📧 Success email sent to user@example.com

📊 Subscription Renewal Summary:
   ✅ Successful: 2
   ⚠️  Failed: 0
   ❌ Cancelled: 0
```

### Output Example (Retry):

```
🔄 Starting subscription renewal check...
🔄 Found 1 subscription(s) to process...
💳 Charging user xyz789 (client@test.com): ₪99
❌ Renewal failed for user xyz789: Card expired. Will retry 4 more time(s).
📧 Failure email sent to client@test.com

📊 Subscription Renewal Summary:
   ✅ Successful: 0
   ⚠️  Failed: 1
   ❌ Cancelled: 0
```

## Automatic Renewal Flow (Implemented ✓)

### Complete Renewal Lifecycle

**Day 30**: Subscription period ends (user marked as "active" but `datePaid` is 30 days ago)

**Days 31-37**: Grace period (no renewal attempts)

**Day 37+**: First renewal attempt

- Worker attempts to charge stored TranzilaTK
- **Success**: Subscription renewed, email sent, clock reset
- **Failure**: Marked as "past_due", retry scheduled for tomorrow

**Days 38-41**: Retry attempts 2-4

- Same process: attempt charge, send email notification
- Each failure schedules next retry for following day

**Day 42**: Final attempt (Attempt 5)

- **Success**: Subscription renewed, email sent
- **Failure**: Subscription marked as "cancelled", cancellation email sent

**After Day 42**: Subscription remains cancelled

- User receives limited access to Loom
- Data retained for 30 days
- Can be reactivated if user provides working payment method

### Email Workflow

**Renewal Success Email**

- Sent immediately upon successful charge
- Includes: amount charged, renewal date, next renewal date
- Contains link to Loom dashboard

**Renewal Failure Email (Attempts 1-4)**

- Sent immediately upon failed charge
- Includes: failure reason, retry schedule, remaining attempts
- Provides guidance on resolving payment issues
- Contains link to support

**Renewal Failure Email (Attempt 5 - Final)**

- Warns this is the final attempt
- Emphasizes importance of fixing payment method

**Subscription Cancelled Email**

- Sent after 5th failed attempt
- Explains limited access going forward
- Provides reactivation instructions
- Contains support contact link

## Troubleshooting

### Webhook not receiving payments

1. Check that `WASP_API_URL` is set correctly
2. Ensure webhook URL is accessible (use ngrok for local testing)
3. Check Tranzilla dashboard for webhook configuration
4. Review server logs for webhook errors

### Users not getting tokens

1. Check webhook logs - token should appear in body as `TranzilaTK`
2. Verify signature validation is passing
3. Check for duplicate transaction errors
4. Review database to ensure `tranzillaToken` field is populated

### Cron job not running

1. Check PgBoss is configured correctly
2. Review job logs: `wasp db studio` → PgBoss tables
3. Verify cron schedule is correct: `0 2 * * *`
4. Check server timezone settings

## Switching Back to Stripe/LemonSqueezy

If you need to switch payment processors:

1. Edit `src/payment/paymentProcessor.ts`
2. Comment out Tranzilla, uncomment your preferred processor:

```typescript
// export const paymentProcessor = tranzillaPaymentProcessor;
export const paymentProcessor = stripePaymentProcessor;
```

## Support

- **Tranzilla Documentation**: https://docs.tranzila.com/
- **Tranzilla Support**: Contact your Tranzilla account manager
- **Wasp Jobs Documentation**: https://wasp.sh/docs/advanced/jobs

## Files Modified/Created

### New Files

- `src/payment/tranzilla/tranzillaClient.ts` - Helper utilities
- `src/payment/tranzilla/paymentProcessor.ts` - Payment processor implementation
- `src/payment/tranzilla/webhook.ts` - Webhook handler with token capture
- `src/payment/worker.ts` - Cron job for checking expired subscriptions
- `migrations/XXX_add_tranzilla_fields/` - Database migration

### Modified Files

- `schema.prisma` - Added `tranzillaToken` and `TranzillaTransaction` model
- `src/payment/paymentProcessor.ts` - Switched to Tranzilla
- `src/payment/plans.ts` - Added Tranzilla pricing support
- `main.wasp` - Added cron job and updated webhook entities
- `src/server/scripts/dbSeeds.ts` - Added `tranzillaToken` to mock data
