import { Link } from "wasp/client/router";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 font-sans text-gray-800 dark:text-gray-200">
      <div className="mb-8">
        <Link to="/" className="text-primary hover:underline">
          &larr; Back to Home
        </Link>
      </div>

      <h1 className="text-4xl font-bold mb-8 font-serif">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last Updated: December 2025</p>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
          <p className="mb-4">
            At Loom Platform (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;),
            we are committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, and safeguard your information when
            you use our website and services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            2. Information We Collect
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Account Information:</strong> Name, email address, and
              password.
            </li>
            <li>
              <strong>Somatic Data:</strong> Body sensations, intensity levels,
              and notes you log in the application.
            </li>
            <li>
              <strong>Usage Data:</strong> Information about how you interact
              with the platform, including session logs and analytics.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            3. How We Use Your Data
          </h2>
          <p>We use your data solely to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide and improve the somatic coaching experience.</li>
            <li>
              Facilitate the coaching relationship between you and your coach.
            </li>
            <li>Send important account notifications.</li>
          </ul>
          <p className="mt-4 font-medium">
            We do NOT sell your data to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
          <p>
            We implement industry-standard security measures, including
            encryption and role-based access control, to protect your sensitive
            health-related data. However, no method of transmission over the
            internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Contact Us</h2>
          <p>
            If you have any questions about this policy, please contact us at{" "}
            <a
              href="mailto:support@loom-platform.com"
              className="text-primary hover:underline"
            >
              support@loom-platform.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
