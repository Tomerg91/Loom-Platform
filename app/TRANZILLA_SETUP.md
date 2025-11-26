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

# Your Tranzilla API password (for signature validation)
TRANZILLA_API_PASSWORD=your_api_password_here

# ============================================
# TRANZILLA PRICING (in ILS)
# ============================================

# Hobby Plan Price (in ILS)
PAYMENTS_TRANZILLA_HOBBY_PRICE=99

# Pro Plan Price (in ILS)
PAYMENTS_TRANZILLA_PRO_PRICE=100

# Credits Plan Price (in ILS)
PAYMENTS_TRANZILLA_CREDITS_PRICE=50
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

### Signature Validation
The webhook includes **placeholder signature validation**. You must implement the actual Tranzilla signature algorithm:

1. Contact Tranzilla support for their signature validation algorithm
2. Update `validateTranzillaSignature()` in `src/payment/tranzilla/tranzillaClient.ts`
3. Common algorithms include:
   - HMAC-SHA256 of specific fields + API password
   - MD5 hash of concatenated parameters
   - Custom Tranzilla-specific algorithm

### Production Checklist
- [ ] Implement real signature validation (not placeholder)
- [ ] Use production Tranzilla terminal credentials
- [ ] Configure webhook URL in Tranzilla dashboard
- [ ] Test duplicate transaction prevention
- [ ] Set up monitoring for failed payments
- [ ] Test the cron job with users who have expired subscriptions

## Cron Job Schedule

**Job Name**: `checkExpiredSubscriptionsJob`
**Schedule**: Daily at 2 AM (`0 2 * * *`)
**Current Behavior**: Logs expired subscriptions to console

### Current Output Example:
```
🔄 Starting subscription renewal check...
⚠️  Found 3 subscription(s) needing renewal:
────────────────────────────────────────────
📧 Email:          user@example.com
🆔 User ID:        abc123
🔑 Token:          TRZ_TOKEN_12345
📅 Last Paid:      10/24/2024
⏰ Days Overdue:   5 days
📦 Plan:           pro
────────────────────────────────────────────
```

## Phase 2: Automatic Token Charging

To implement automatic renewal charging:

1. **Tranzilla API Documentation**: Get the endpoint and parameters for token-based charging
2. **Implement Charging Logic**: In `src/payment/worker.ts`, uncomment and implement `chargeTranzillaToken()`
3. **Handle Responses**:
   - Success: Update `user.datePaid` to current date
   - Failure: Update `user.subscriptionStatus` to "past_due"
4. **Email Notifications**: Send success/failure emails to users
5. **Retry Logic**: Implement retry for failed charges (3 attempts over 7 days)

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
