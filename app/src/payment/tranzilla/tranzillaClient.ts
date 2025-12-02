import { config } from "wasp/server";
import { requireNodeEnvVar } from "../../server/utils";
import type { PaymentPlanId } from "../plans";

/**
 * Tranzilla terminal configuration
 */
export function getTranzillaTerminalName(): string {
  return requireNodeEnvVar("TRANZILLA_TERMINAL_NAME");
}

export function getTranzillaApiPassword(): string {
  return requireNodeEnvVar("TRANZILLA_API_PASSWORD");
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
 * Validate Tranzilla webhook signature
 *
 * NOTE: This is a placeholder implementation. The exact signature validation
 * algorithm must be confirmed with Tranzilla's official documentation.
 *
 * Common approaches:
 * 1. HMAC-SHA256 of certain fields + API password
 * 2. MD5 hash of concatenated fields
 * 3. Custom algorithm provided by Tranzilla
 *
 * For now, this function performs basic validation and can be enhanced
 * when the exact algorithm is known.
 */
export function validateTranzillaSignature(
  body: Record<string, any>,
): boolean {
  // TODO: Implement actual signature validation based on Tranzilla docs
  // This is a placeholder that checks for required fields

  const { Response, sum, u71, index } = body;

  // Basic validation: ensure critical fields are present
  if (!Response || !sum || !u71 || !index) {
    console.error("Missing required fields in Tranzilla webhook");
    return false;
  }

  // Placeholder for actual signature validation
  // Example (NOT ACTUAL ALGORITHM - needs Tranzilla docs):
  // const expectedSignature = crypto
  //   .createHmac('sha256', apiPassword)
  //   .update(`${index}${sum}${u71}${Response}`)
  //   .digest('hex');
  // return body.signature === expectedSignature;

  // For development: log the signature validation attempt
  if (process.env.NODE_ENV === "development") {
    console.log("⚠️  Tranzilla signature validation is using placeholder logic");
    console.log("   Webhook body:", JSON.stringify(body, null, 2));
  }

  // Return true for now - MUST BE REPLACED with real validation
  return true;
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
