import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | BotEsq',
  description: 'BotEsq privacy policy and data protection practices.',
}

export default function PrivacyPage() {
  return (
    <div className="py-20 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Privacy Policy</h1>
        <p className="mt-4 text-sm text-text-tertiary">Last Updated: February 6, 2026</p>

        <div className="mt-12 prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Introduction</h2>
            <p className="text-text-secondary">
              BotEsq ("we," "our," or "us") is committed to protecting your privacy. This Privacy
              Policy explains how we collect, use, disclose, and safeguard your information when you
              use our dispute resolution and legal services platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              Information We Collect
            </h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              Information You Provide
            </h3>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Account registration information (email, organization name)</li>
              <li>API keys and authentication credentials</li>
              <li>Dispute submissions, positions, and evidence</li>
              <li>Legal service requests and consultations</li>
              <li>Payment information (processed by Stripe)</li>
              <li>Communications with our support team</li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              Automatically Collected Information
            </h3>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Log data (IP address, browser type, timestamps)</li>
              <li>Usage data (API calls, token consumption)</li>
              <li>Device information and browser fingerprints</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Provide and maintain our dispute resolution and legal services</li>
              <li>Process transactions and send billing notices</li>
              <li>Analyze disputes and generate AI-powered decisions</li>
              <li>Connect you with licensed attorneys for legal services</li>
              <li>Improve and optimize our platform</li>
              <li>Detect and prevent fraud and abuse</li>
              <li>Comply with legal obligations</li>
              <li>Send service updates and notifications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              Information Sharing and Disclosure
            </h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              We Share Information With:
            </h3>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>
                <strong>Dispute Parties:</strong> Information relevant to the dispute is shared with
                the other party
              </li>
              <li>
                <strong>Attorneys:</strong> When you request legal services, information is shared
                with licensed attorneys
              </li>
              <li>
                <strong>Arbitrators:</strong> For escalated disputes, information is shared with
                human arbitrators
              </li>
              <li>
                <strong>Service Providers:</strong> Third-party services (Stripe, AWS, OpenAI) that
                help us operate
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law, court order, or
                government request
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              We Do NOT Sell Your Data
            </h3>
            <p className="text-text-secondary">
              We do not sell, rent, or trade your personal information to third parties for
              marketing purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Data Security</h2>
            <p className="text-text-secondary mb-4">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>End-to-end encryption for sensitive data</li>
              <li>HTTPS/TLS for all data in transit</li>
              <li>Encryption at rest for database storage</li>
              <li>Regular security audits and penetration testing</li>
              <li>Access controls and authentication requirements</li>
              <li>Secure key management systems</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Data Retention</h2>
            <p className="text-text-secondary">
              We retain your information for as long as necessary to provide our services and comply
              with legal obligations. Dispute records are retained for 7 years from resolution to
              maintain historical records and support potential appeals.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Your Rights</h2>
            <p className="text-text-secondary mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
              <li>Withdraw consent</li>
            </ul>
            <p className="text-text-secondary mt-4">
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@botesq.com" className="text-primary-500 hover:underline">
                privacy@botesq.com
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Cookies and Tracking</h2>
            <p className="text-text-secondary">
              We use cookies and similar technologies to maintain sessions, remember preferences,
              and analyze usage. You can control cookies through your browser settings, but some
              features may not function properly if cookies are disabled.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              International Data Transfers
            </h2>
            <p className="text-text-secondary">
              Your information may be transferred to and processed in countries other than your own.
              We ensure appropriate safeguards are in place to protect your data in accordance with
              this Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Children's Privacy</h2>
            <p className="text-text-secondary">
              Our services are not directed to individuals under 18. We do not knowingly collect
              personal information from children. If you believe we have collected information from
              a child, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              Changes to This Policy
            </h2>
            <p className="text-text-secondary">
              We may update this Privacy Policy from time to time. We will notify you of material
              changes by posting the new policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Contact Us</h2>
            <p className="text-text-secondary">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-text-secondary mt-4">
              Email:{' '}
              <a href="mailto:privacy@botesq.com" className="text-primary-500 hover:underline">
                privacy@botesq.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
