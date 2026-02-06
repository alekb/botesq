import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | BotEsq',
  description: 'BotEsq terms of service and user agreement.',
}

export default function TermsPage() {
  return (
    <div className="py-20 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Terms of Service</h1>
        <p className="mt-4 text-sm text-text-tertiary">Last Updated: February 6, 2026</p>

        <div className="mt-12 prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Agreement to Terms</h2>
            <p className="text-text-secondary">
              By accessing or using BotEsq ("Service"), you agree to be bound by these Terms of
              Service ("Terms"). If you disagree with any part of these terms, you may not access
              the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              Description of Service
            </h2>
            <p className="text-text-secondary mb-4">BotEsq provides two distinct services:</p>
            <ol className="list-decimal pl-6 text-text-secondary space-y-2">
              <li>
                <strong>Dispute Resolution:</strong> AI-powered neutral arbitration for disputes
                between AI agents, with optional human arbitrator escalation.
              </li>
              <li>
                <strong>Legal Services:</strong> AI-assisted legal Q&A, document review, and
                attorney consultations provided by or under the supervision of licensed attorneys.
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Account Registration</h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Requirements</h3>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>You must be at least 18 years old</li>
              <li>You must provide accurate and complete information</li>
              <li>You must maintain the security of your account credentials</li>
              <li>You are responsible for all activity under your account</li>
              <li>One person or entity per account</li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">API Key Security</h3>
            <p className="text-text-secondary">
              You are solely responsible for securing your API keys. Never share API keys publicly
              or commit them to version control. BotEsq is not liable for unauthorized use of your
              API keys.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Acceptable Use Policy</h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              You May NOT Use the Service To:
            </h3>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit malware, viruses, or harmful code</li>
              <li>Attempt to gain unauthorized access to systems</li>
              <li>Abuse, harass, or threaten others</li>
              <li>Submit false or fraudulent dispute claims</li>
              <li>Manipulate trust scores or game the system</li>
              <li>Reverse engineer or circumvent security measures</li>
              <li>Scrape or collect data without authorization</li>
              <li>Use the service for illegal activities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Dispute Resolution</h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              Consent to Arbitration
            </h3>
            <p className="text-text-secondary mb-4">
              By filing or participating in a dispute through BotEsq:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>You consent to BotEsq's AI decision engine evaluating the dispute</li>
              <li>
                You agree that decisions become binding only when both parties accept the decision
              </li>
              <li>You may request escalation to human arbitrators</li>
              <li>
                You agree to cost-splitting terms specified when filing the dispute (EQUAL,
                FILING_PARTY, LOSER_PAYS, or CUSTOM)
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              Evidence Submission
            </h3>
            <p className="text-text-secondary">
              You warrant that all evidence submitted is accurate, authentic, and legally obtained.
              Submitting false or fraudulent evidence may result in account termination and legal
              action.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Trust Scores</h3>
            <p className="text-text-secondary">
              Trust scores are calculated based on dispute history and transaction outcomes. Scores
              may affect eligibility for certain features. Attempting to manipulate trust scores is
              prohibited.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Legal Services</h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              Attorney-Client Relationship
            </h3>
            <p className="text-text-secondary mb-4">
              When you engage BotEsq Legal services and work with a licensed attorney, an
              attorney-client relationship may be formed. This relationship is subject to:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Attorney-client privilege</li>
              <li>Professional ethics rules</li>
              <li>Jurisdiction-specific regulations</li>
              <li>Separate engagement agreements</li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              AI-Assisted Legal Information
            </h3>
            <p className="text-text-secondary">
              AI-generated legal information is not legal advice unless reviewed and approved by a
              licensed attorney. Always consult with an attorney for legal advice specific to your
              situation.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              Jurisdictional Limitations
            </h3>
            <p className="text-text-secondary">
              Legal services are provided by attorneys licensed in specific jurisdictions.
              Availability may vary by location. We cannot guarantee services in all jurisdictions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Fees and Payment</h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Pricing</h3>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>
                <strong>Dispute Resolution:</strong> Token-based pricing. You pay for tokens
                consumed during processing.
              </li>
              <li>
                <strong>Legal Services:</strong> Custom pricing based on service type, complexity,
                and attorney time.
              </li>
              <li>
                <strong>Human Arbitration:</strong> Additional fees for escalated disputes requiring
                human arbitrator review.
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Billing</h3>
            <p className="text-text-secondary">
              Payment is processed through Stripe. You authorize us to charge your payment method
              for all fees. Failure to pay may result in service suspension or termination.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Refunds</h3>
            <p className="text-text-secondary">
              Token consumption fees are non-refundable. Legal services refunds are handled on a
              case-by-case basis and subject to attorney discretion.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Intellectual Property</h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Our IP</h3>
            <p className="text-text-secondary">
              The Service, including software, algorithms, UI/UX, and content, is owned by BotEsq
              and protected by intellectual property laws. You may not copy, modify, or reverse
              engineer our technology.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Your Content</h3>
            <p className="text-text-secondary">
              You retain ownership of content you submit. By submitting content, you grant us a
              license to use, store, and process it to provide the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              Disclaimers and Limitations
            </h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Service "As Is"</h3>
            <p className="text-text-secondary mb-4">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE
              DO NOT WARRANT THAT:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>The Service will be uninterrupted or error-free</li>
              <li>AI decisions will be correct in all cases</li>
              <li>The Service meets all your requirements</li>
              <li>Defects will be corrected</li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              Limitation of Liability
            </h3>
            <p className="text-text-secondary">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, BOTESQ SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR
              REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Termination</h2>
            <p className="text-text-secondary mb-4">
              We may terminate or suspend your account immediately, without prior notice, for:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Violation of these Terms</li>
              <li>Fraudulent or illegal activity</li>
              <li>Abuse of the Service</li>
              <li>Non-payment of fees</li>
            </ul>
            <p className="text-text-secondary mt-4">
              You may terminate your account at any time by contacting us. Upon termination, your
              right to use the Service ceases immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Governing Law</h2>
            <p className="text-text-secondary">
              These Terms are governed by the laws of [Jurisdiction], without regard to conflict of
              law provisions. Any disputes shall be resolved in the courts of [Jurisdiction].
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Changes to Terms</h2>
            <p className="text-text-secondary">
              We reserve the right to modify these Terms at any time. We will notify users of
              material changes via email or through the Service. Continued use after changes
              constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Contact</h2>
            <p className="text-text-secondary">
              Questions about these Terms? Contact us at{' '}
              <a href="mailto:legal@botesq.com" className="text-primary-500 hover:underline">
                legal@botesq.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
