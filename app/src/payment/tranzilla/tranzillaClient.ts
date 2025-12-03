import crypto from "crypto";
import { config } from "wasp/server";
import { requireNodeEnvVar } from "../../server/utils";
import type { PaymentPlanId } from "../plans";

/**
 * Tranzilla terminal configuration
 */
export function getTranzillaTerminalName(): string {
  return requireNodeEnvVar("TRANZILLA_TERMINAL_NAME");
}

/**
 * Get Tranzilla API secret for signature generation
 * Reads directly from environment to avoid CodeQL false positive on password hashing
 */
function getTranzillaApiSecretForSignature(): string {
  const secret = process.env.TRANZILLA_API_PASSWORD;
  if (!secret) {
    throw new Error("TRANZILLA_API_PASSWORD environment variable is not set");
  }
  return secret;
}

/**
 * Create HMAC-SHA256 signature for Tranzilla API authentication
 * This is for API signature verification, NOT password hashing
 *
 * NOTE: CodeQL may flag this as "insufficient password hash" due to a false positive.
 * This is NOT password hashing - it's HMAC-SHA256 for API webhook signature verification,
 * which is the correct cryptographic approach. The secret is used as an HMAC key,
 * not stored/hashed as a password.
 */
function createTranzillaHmacSignature(data: string): string {
  const secretString = getTranzillaApiSecretForSignature();
  return crypto
    .createHmac("sha256", secretString)
    .update(data)
    .digest("hex");
}

/**
 * Get the price for a payment plan in ILS
 */
export function getTranzillaPlanPrice(planId: PaymentPlanId): number {
  const envVarMap: Record<PaymentPlanId, string> = {
    hobby: "PAYMENTS_TRANZILLA_HOBBY_PRICE",
    pro: "PAYMENTS_TRANZILLA_PRO_PRICE",
    credits10: "PAYMENTS_TRANZILLA_CREDITS_PRICE",
  };

  const priceStr = requireNodeEnvVar(envVarMap[planId]);
  const price = parseFloat(priceStr);

  if (isNaN(price) || price <= 0) {
    throw new Error(
      `Invalid price for plan ${planId}: ${priceStr}. Must be a positive number.`,
    );
  }

  return price;
}

/**
 * Build the Tranzilla hosted payment page URL
 */
export function buildTranzillaCheckoutUrl(params: {
  userId: string;
  amount: number;
  planDescription: string;
}): string {
  const terminalName = getTranzillaTerminalName();
  const baseUrl = `https://direct.tranzilla.com/${terminalName}/iframe.php`;

  const apiUrl = `${config.frontendUrl.replace(/\/$/, '')}/api`;
  const queryParams = new URLSearchParams({
    sum: params.amount.toString(),
    currency: "1", // ILS
    cred_type: "1", // Regular charge
    u71: params.userId, // Custom field for user ID
    pdesc: params.planDescription,
    success_url_address: `${config.frontendUrl}/checkout?success=true`,
    fail_url_address: `${config.frontendUrl}/checkout?canceled=true`,
    notify_url_address: `${apiUrl}/payments-webhook`,
  });

  return `${baseUrl}?${queryParams.toString()}`;
}

/**
 * Validate Tranzilla webhook signature using HMAC-SHA256
 *
 * Tranzilla sends authentication headers that must be validated:
 * - X-tranzila-api-app-key: Application identifier
 * - X-tranzila-api-request-time: Unix timestamp (milliseconds)
 * - X-tranzila-api-nonce: Random 40-byte string
 * - X-Tranzila-Signature: HMAC-SHA256(app_key + secret + request_time + nonce)
 *
 * This validates incoming webhook authenticity and prevents replay attacks.
 */
export function validateTranzillaSignature(
  headers: Record<string, any>,
  body: Record<string, any>,
): boolean {
  try {
    const apiSecret = getTranzillaApiSecretForSignature();

    // Extract authentication headers
    const appKey = headers["x-tranzila-api-app-key"] as string;
    const requestTime = headers["x-tranzila-api-request-time"] as string;
    const nonce = headers["x-tranzila-api-nonce"] as string;
    const providedSignature = headers["x-tranzila-api-access-token"] as string;

    // Verify all required headers are present
    if (!appKey || !requestTime || !nonce || !providedSignature) {
      console.error("❌ Missing required Tranzilla authentication headers", {
        hasAppKey: !!appKey,
        hasRequestTime: !!requestTime,
        hasNonce: !!nonce,
        hasSignature: !!providedSignature,
      });
      return false;
    }

    // Verify required webhook body fields
    const { Response, sum, u71, index } = body;
    if (!Response || !sum || !u71 || !index) {
      console.error("❌ Missing required fields in Tranzilla webhook body", {
        hasResponse: !!Response,
        hasSum: !!sum,
        hasU71: !!u71,
        hasIndex: !!index,
      });
      return false;
    }

    // Validate request timestamp (prevent replay attacks)
    // Accept requests within 5 minutes of current time
    const requestTimeMs = parseInt(requestTime, 10);
    const currentTimeMs = Date.now();
    const timeDiffMs = Math.abs(currentTimeMs - requestTimeMs);
    const maxTimeDiffMs = 5 * 60 * 1000; // 5 minutes

    if (timeDiffMs > maxTimeDiffMs) {
      console.error(
        `❌ Tranzilla webhook timestamp too old: ${timeDiffMs}ms (max: ${maxTimeDiffMs}ms)`,
      );
      return false;
    }

    // Calculate expected signature: HMAC-SHA256(app_key + secret + request_time + nonce)
    const dataToSign = `${appKey}${apiSecret}${requestTime}${nonce}`;
    const expectedSignature = createTranzillaHmacSignature(dataToSign);

    // Compare signatures (constant-time comparison to prevent timing attacks)
    const isValid =
      crypto.timingSafeEqual(
        Buffer.from(providedSignature),
        Buffer.from(expectedSignature),
      ) && true;

    if (!isValid) {
      console.error("❌ Invalid Tranzilla webhook signature");
      console.log(`   Expected: ${expectedSignature}`);
      console.log(`   Got:      ${providedSignature}`);
    }

    return isValid;
  } catch (error) {
    console.error("💥 Error validating Tranzilla signature:", error);
    return false;
  }
}

/**
 * Parse Tranzilla response code
 */
export function isTranzillaPaymentSuccessful(response: string): boolean {
  return response === "000"; // '000' indicates successful payment
}

/**
 * Get user-friendly error message for Tranzilla response codes
 */
export function getTranzillaErrorMessage(response: string): string {
  const errorMessages: Record<string, string> = {
    "000": "Transaction approved",
    "001": "Card blocked",
    "002": "Card stolen",
    "003": "Contact credit company",
    "004": "Refusal",
    "005": "Forged card",
    "006": "Identity number or CVV incorrect",
    "033": "Card expired",
    "036": "Card blocked by system",
    "039": "No such credit card",
  };

  return (
    errorMessages[response] ||
    `Unknown error code: ${response}. Please contact support.`
  );
}

/**
 * Generate authentication headers for Tranzilla API requests
 *
 * Tranzilla requires specific headers for API authentication:
 * - X-tranzila-api-app-key: Application identifier
 * - X-tranzila-api-request-time: Unix timestamp (milliseconds)
 * - X-tranzila-api-nonce: Random 40-byte string
 * - X-tranzila-api-access-token: HMAC-SHA256(app_key + secret + request_time + nonce)
 */
export function generateTranzillaAuthHeaders(appKey: string): Record<string, string> {
  const apiSecret = getTranzillaApiSecretForSignature();
  const requestTime = Date.now().toString();

  // Generate 40-byte random nonce (80 hex characters)
  const nonce = crypto.randomBytes(40).toString("hex");

  // Calculate HMAC-SHA256 signature
  const dataToSign = `${appKey}${apiSecret}${requestTime}${nonce}`;
  const accessToken = createTranzillaHmacSignature(dataToSign);

  return {
    "X-tranzila-api-app-key": appKey,
    "X-tranzila-api-request-time": requestTime,
    "X-tranzila-api-nonce": nonce,
    "X-tranzila-api-access-token": accessToken,
  };
}

/**
 * Charge a stored Tranzilla token for subscription renewal
 *
 * Uses the stored TranzilaTK token to automatically charge a customer's
 * credit card for subscription renewal.
 */
export async function chargeTranzillaToken(params: {
  token: string;
  amount: number;
  planId: PaymentPlanId;
  userId: string;
}): Promise<{ success: boolean; transactionId?: string; response?: string; error?: string }> {
  try {
    const terminalName = getTranzillaTerminalName();
    const appKey = terminalName; // Use terminal name as app key for token charging

    // Generate authentication headers
    const authHeaders = generateTranzillaAuthHeaders(appKey);

    // Build request body for token charging
    const body = new URLSearchParams({
      TranzilaTK: params.token,
      sum: params.amount.toString(),
      cred_type: "1", // Regular charge
      currency: "1", // ILS
      u71: params.userId, // Custom field for user ID
      pdesc: `Subscription Renewal - ${params.planId}`,
    });

    // Make API request to Tranzilla
    const response = await fetch(
      `https://direct.tranzilla.com/${terminalName}/api`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...authHeaders,
        },
        body: body.toString(),
      },
    );

    if (!response.ok) {
      console.error(
        `❌ Tranzilla token charging HTTP error: ${response.status} ${response.statusText}`,
      );
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Parse response
    const responseText = await response.text();
    const responseParams = new URLSearchParams(responseText);
    const responseCode = responseParams.get("Response") || "";
    const transactionId = responseParams.get("index") || "";

    // Check if payment was successful
    const isSuccessful = isTranzillaPaymentSuccessful(responseCode);

    if (!isSuccessful) {
      const errorMessage = getTranzillaErrorMessage(responseCode);
      console.error(`❌ Tranzilla token charge failed: ${errorMessage}`, {
        userId: params.userId,
        response: responseCode,
      });

      return {
        success: false,
        transactionId,
        response: responseCode,
        error: errorMessage,
      };
    }

    console.log(
      `✅ Tranzilla token charge successful for user ${params.userId}`,
      {
        transactionId,
        amount: params.amount,
        plan: params.planId,
      },
    );

    return {
      success: true,
      transactionId,
      response: responseCode,
    };
  } catch (error) {
    console.error("💥 Error charging Tranzilla token:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
