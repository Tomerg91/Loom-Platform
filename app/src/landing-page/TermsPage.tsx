import { Link } from "wasp/client/router";

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 font-sans text-gray-800 dark:text-gray-200">
      <div className="mb-8">
        <Link to="/" className="text-primary hover:underline">
          &larr; Back to Home
        </Link>
      </div>

      <h1 className="text-4xl font-bold mb-8 font-serif">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last Updated: December 2025</p>

      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using Loom Platform, you agree to be bound by these
            Terms of Service. If you do not agree, please do not use our
            services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Medical Disclaimer</h2>
          <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Loom Platform is a coaching tool, not a medical device.
            </p>
            <p className="mt-2 text-amber-700 dark:text-amber-300 text-sm">
              The content and tools provided are for educational and
              self-exploration purposes only. They are not intended to diagnose,
              treat, cure, or prevent any disease or medical condition. Always
              seek the advice of a qualified healthcare provider with any
              questions you may have regarding a medical condition.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            3. User Responsibilities
          </h2>
          <p>You are responsible for:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Maintaining the confidentiality of your account credentials.
            </li>
            <li>The accuracy of the data you log.</li>
            <li>Using the platform in a respectful and legal manner.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">4. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at our
            sole discretion, without notice, for conduct that we believe
            violates these Terms or is harmful to other users, us, or third
            parties, or for any other reason.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">5. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. We will notify you of
            significant changes via email or a notice on our platform.
          </p>
        </section>
      </div>
    </div>
  );
}
