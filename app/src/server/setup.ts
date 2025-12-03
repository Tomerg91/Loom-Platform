import crypto from "crypto";
import type { Application } from "express";

/**
 * Server Setup Function
 *
 * This function is called when the Wasp server starts.
 * It configures global middleware for security headers and other server-level settings.
 */
export const setupServer = async (app: Application) => {
  // Get Plausible configuration from environment (optional)
  const plausibleSiteId = process.env.PLAUSIBLE_SITE_ID;
  const plausibleBaseUrl =
    process.env.PLAUSIBLE_BASE_URL || "https://plausible.io";

  const awsS3Bucket = process.env.AWS_S3_FILES_BUCKET;
  const awsS3Region = process.env.AWS_S3_REGION;
  const stripeConfigured = Boolean(process.env.STRIPE_API_KEY);
  const lemonSqueezyConfigured = Boolean(process.env.LEMONSQUEEZY_API_KEY);

  // Add security middleware
  app.use((req, res, next) => {
    const cspNonce = crypto.randomBytes(16).toString("base64");
    res.locals.cspNonce = cspNonce;

    const s3Origins =
      awsS3Bucket && awsS3Region
        ? [`https://${awsS3Bucket}.s3.${awsS3Region}.amazonaws.com`]
        : [];

    const analyticsDomains = [
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://stats.g.doubleclick.net",
      "https://region1.google-analytics.com",
      ...(plausibleSiteId ? [plausibleBaseUrl] : []),
    ];

    // Build Content Security Policy directives
    const cspDirectives = {
      "default-src": ["'self'"],
      "script-src": [
        "'self'",
        `'nonce-${cspNonce}'`,
        ...analyticsDomains,
        ...(stripeConfigured ? ["https://js.stripe.com"] : []),
      ],
      "style-src": [
        "'self'",
        `'nonce-${cspNonce}'`,
        "https://fonts.googleapis.com",
      ],
      "img-src": [
        "'self'",
        "data:",
        ...analyticsDomains,
        ...s3Origins,
      ],
      "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
      "connect-src": [
        "'self'",
        ...analyticsDomains,
        "https://analytics.google.com",
        "https://www.googleapis.com",
        ...s3Origins,
        ...(stripeConfigured ? ["https://api.stripe.com"] : []),
        ...(lemonSqueezyConfigured
          ? ["https://api.lemonsqueezy.com"]
          : []),
      ],
      "frame-src": [
        "'self'",
        ...(stripeConfigured ? ["https://js.stripe.com"] : []),
      ],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": [
        "'self'",
        ...(stripeConfigured ? ["https://checkout.stripe.com"] : []),
        ...(lemonSqueezyConfigured
          ? ["https://pay.lemonsqueezy.com"]
          : []),
      ],
      "upgrade-insecure-requests": [],
    } as const;

    const cspHeader = Object.entries(cspDirectives)
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return directive;
        }
        return `${directive} ${sources.join(" ")}`;
      })
      .join("; ");

    res.setHeader("Content-Security-Policy", cspHeader);

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      [
        "accelerometer=()",
        "camera=()",
        "geolocation=()",
        "gyroscope=()",
        "magnetometer=()",
        "microphone=()",
        "payment=()",
        "usb=()",
        "fullscreen=(self)",
      ].join(", "),
    );
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );

    next();
  });

  console.log("✅ Security middleware configured:");
  console.log("   - Content Security Policy (CSP)");
  console.log("   - X-Content-Type-Options: nosniff");
  console.log("   - X-Frame-Options: SAMEORIGIN");
  console.log("   - X-XSS-Protection: enabled");
  console.log("   - Referrer-Policy: strict-origin-when-cross-origin");
  console.log(
    "   - Permissions-Policy: limited to required browser capabilities",
  );
  console.log("   - Strict-Transport-Security: enabled");

  if (plausibleSiteId) {
    console.log(`   - Plausible Analytics allowed for: ${plausibleSiteId}`);
  }
};
