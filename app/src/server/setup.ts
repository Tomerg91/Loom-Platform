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

  // Build Content Security Policy directives
  const cspDirectives = {
    // Default: only load resources from same origin
    "default-src": ["'self'"],

    // Scripts: allow self, Google Analytics, and Plausible (if configured)
    "script-src": [
      "'self'",
      "'unsafe-inline'", // Required for Wasp's inline scripts - consider using nonces in production
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      ...(plausibleSiteId ? ["https://plausible.io"] : []),
    ],

    // Styles: allow self and inline styles (required for React/Tailwind)
    "style-src": ["'self'", "'unsafe-inline'"],

    // Images: allow self, data URIs, and external sources
    "img-src": [
      "'self'",
      "data:",
      "https:",
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
    ],

    // Fonts: allow self and data URIs
    "font-src": ["'self'", "data:"],

    // Connect: API calls, analytics, S3 buckets
    "connect-src": [
      "'self'",
      "https://www.google-analytics.com",
      "https://analytics.google.com",
      ...(plausibleSiteId ? [plausibleBaseUrl] : []),
      // Allow S3 bucket connections for file downloads
      `https://${process.env.AWS_S3_FILES_BUCKET || "*"}.s3.${process.env.AWS_S3_REGION || "*"}.amazonaws.com`,
      // Allow Stripe if configured
      ...(process.env.STRIPE_API_KEY ? ["https://api.stripe.com"] : []),
      // Allow LemonSqueezy if configured
      ...(process.env.LEMONSQUEEZY_API_KEY
        ? ["https://api.lemonsqueezy.com"]
        : []),
    ],

    // Frames: allow Stripe for payment forms
    "frame-src": [
      "'self'",
      ...(process.env.STRIPE_API_KEY ? ["https://js.stripe.com"] : []),
    ],

    // Objects: block plugins
    "object-src": ["'none'"],

    // Base URI: restrict to same origin
    "base-uri": ["'self'"],

    // Form actions: allow same origin and payment providers
    "form-action": [
      "'self'",
      ...(process.env.STRIPE_API_KEY ? ["https://checkout.stripe.com"] : []),
    ],

    // Upgrade insecure requests (HTTP to HTTPS)
    "upgrade-insecure-requests": [],
  };

  // Convert CSP directives object to header string
  const cspHeader = Object.entries(cspDirectives)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(" ")}`;
    })
    .join("; ");

  // Add security middleware
  app.use((req, res, next) => {
    // Content Security Policy
    res.setHeader("Content-Security-Policy", cspHeader);

    // Additional security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );

    next();
  });

  console.log("✅ Security middleware configured:");
  console.log("   - Content Security Policy (CSP)");
  console.log("   - X-Content-Type-Options: nosniff");
  console.log("   - X-Frame-Options: SAMEORIGIN");
  console.log("   - X-XSS-Protection: enabled");
  console.log("   - Referrer-Policy: strict-origin-when-cross-origin");
  console.log("   - Permissions-Policy: camera, microphone, geolocation blocked");

  if (plausibleSiteId) {
    console.log(`   - Plausible Analytics allowed for: ${plausibleSiteId}`);
  }
};
