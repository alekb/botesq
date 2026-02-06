import { Metadata } from 'next'
import { AlertCircle, Scale } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Disclaimers | BotEsq',
  description: 'Important disclaimers and limitations regarding BotEsq services.',
}

export default function DisclaimersPage() {
  return (
    <div className="py-20 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Disclaimers</h1>
        <p className="mt-4 text-sm text-text-tertiary">Last Updated: February 6, 2026</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Card className="border-error-500/30 bg-gradient-to-br from-error-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-error-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-text-primary text-sm">Important</h3>
                  <p className="text-xs text-text-secondary mt-1">
                    Read these disclaimers carefully before using BotEsq
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-warning-500/30 bg-gradient-to-br from-warning-500/5 to-transparent">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Scale className="h-5 w-5 text-warning-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-text-primary text-sm">Legal Notice</h3>
                  <p className="text-xs text-text-secondary mt-1">
                    These disclaimers are legally binding
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              General Service Disclaimer
            </h2>
            <div className="bg-background-secondary p-6 rounded-lg border border-border-default">
              <p className="text-text-secondary font-medium">
                THE SERVICES PROVIDED BY BOTESQ ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
                WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
                WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT,
                OR COURSE OF PERFORMANCE.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              AI-Powered Dispute Resolution
            </h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">AI Limitations</h3>
            <p className="text-text-secondary mb-4">
              BotEsq uses artificial intelligence to analyze disputes and generate decisions. Users
              should understand:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>AI decisions are based on the information provided by both parties</li>
              <li>AI may not identify all relevant legal issues or considerations</li>
              <li>AI analysis is probabilistic and may contain errors</li>
              <li>Confidence scores indicate AI certainty, not legal correctness</li>
              <li>AI decisions should not be solely relied upon for high-stakes matters</li>
              <li>Human arbitrator review is available for complex disputes</li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              Binding Nature of Decisions
            </h3>
            <p className="text-text-secondary">
              AI-powered decisions become binding only when both parties explicitly accept the
              decision. Acceptance constitutes agreement to the decision's terms and remedies.
              Parties may reject decisions and request escalation, subject to additional fees.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              Not Legal Precedent
            </h3>
            <p className="text-text-secondary">
              BotEsq decisions are not legal precedent and do not establish binding legal
              principles. Decisions are specific to the facts presented and do not constitute
              judicial rulings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              Legal Services Disclaimer
            </h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Not Legal Advice</h3>
            <p className="text-text-secondary">
              Information provided through BotEsq, including AI-generated legal content, is for
              informational purposes only and does not constitute legal advice unless explicitly
              provided by a licensed attorney in an attorney-client relationship.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              Attorney Independence
            </h3>
            <p className="text-text-secondary">
              Attorneys providing services through BotEsq are independent professionals exercising
              their own professional judgment. BotEsq does not control attorney work product or
              legal opinions. Attorneys maintain their own professional liability insurance.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              Jurisdictional Limitations
            </h3>
            <p className="text-text-secondary">
              Legal services are subject to attorney licensing and jurisdictional restrictions.
              Attorneys can only provide services within their licensed jurisdictions. BotEsq makes
              no representation that services are available in all locations or appropriate for all
              legal matters.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              Outcome Disclaimer
            </h3>
            <p className="text-text-secondary">
              BotEsq makes no representations or warranties about the outcome of any legal matter.
              Past results do not guarantee or predict future outcomes. Every case is unique and
              depends on specific facts, applicable law, and circumstances.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              Trust Score Disclaimer
            </h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              Informational Only
            </h3>
            <p className="text-text-secondary">
              Trust scores are calculated based on historical transaction and dispute data. Trust
              scores are informational metrics and should not be the sole basis for business
              decisions. Scores do not predict future behavior or guarantee reliability.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Score Calculation</h3>
            <p className="text-text-secondary">
              Trust score algorithms are proprietary and subject to change. BotEsq reserves the
              right to modify scoring methodology without notice. Scores may not reflect all
              relevant factors and should be used as one data point among many.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              Not an Endorsement
            </h3>
            <p className="text-text-secondary">
              High trust scores do not constitute endorsements or recommendations. BotEsq does not
              vouch for the reliability, honesty, or capabilities of any agent or user.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Service Availability</h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Uptime</h3>
            <p className="text-text-secondary">
              While we strive for 99.9% uptime, we do not guarantee uninterrupted service. The
              platform may be unavailable due to maintenance, technical issues, or unforeseen
              circumstances. We are not liable for damages resulting from service interruptions.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Feature Changes</h3>
            <p className="text-text-secondary">
              We reserve the right to modify, suspend, or discontinue any feature or service at any
              time without notice. We may impose usage limits or restrictions at our discretion.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Beta Features</h3>
            <p className="text-text-secondary">
              Features marked as "beta" or "experimental" are provided for testing purposes and may
              not work as intended. Beta features are provided without warranties and may be changed
              or removed at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Third-Party Services</h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              External Dependencies
            </h3>
            <p className="text-text-secondary mb-4">
              BotEsq relies on third-party services including:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>OpenAI for AI processing</li>
              <li>Stripe for payment processing</li>
              <li>AWS for infrastructure</li>
              <li>Email and notification services</li>
            </ul>
            <p className="text-text-secondary mt-4">
              We are not responsible for the availability, accuracy, or performance of third-party
              services. Issues with third-party services may affect BotEsq functionality.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">External Links</h3>
            <p className="text-text-secondary">
              Our website may contain links to external sites. We do not endorse or control external
              sites and are not responsible for their content, privacy practices, or services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Security Disclaimer</h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Security Measures</h3>
            <p className="text-text-secondary">
              While we implement industry-standard security measures, no system is completely
              secure. We cannot guarantee absolute security of your data. Users are responsible for:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mt-4">
              <li>Maintaining the confidentiality of API keys</li>
              <li>Using strong passwords and authentication</li>
              <li>Monitoring account activity</li>
              <li>Reporting suspicious activity promptly</li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Breach Response</h3>
            <p className="text-text-secondary">
              In the event of a data breach, we will notify affected users as required by law.
              However, we are not liable for unauthorized access to or disclosure of your data
              resulting from circumstances beyond our reasonable control.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              Limitation of Liability
            </h2>
            <div className="bg-background-secondary p-6 rounded-lg border border-border-default">
              <p className="text-text-secondary font-medium mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, BOTESQ SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc pl-6 text-text-secondary space-y-2">
                <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                <li>Loss of profits, revenue, data, or use</li>
                <li>Business interruption</li>
                <li>Errors or inaccuracies in AI decisions</li>
                <li>Actions or inactions of attorneys providing services</li>
                <li>Third-party service failures</li>
                <li>Unauthorized access to your account</li>
                <li>Disputes between users</li>
              </ul>
              <p className="text-text-secondary font-medium mt-4">
                IN NO EVENT SHALL BOTESQ'S TOTAL LIABILITY EXCEED THE AMOUNT PAID BY YOU IN THE
                TWELVE MONTHS PRECEDING THE CLAIM.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Dispute Between Users</h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              User Responsibility
            </h3>
            <p className="text-text-secondary">
              Users are solely responsible for their interactions with other users. BotEsq provides
              a platform for dispute resolution but does not guarantee outcomes or enforce
              decisions. Users should verify counterparty information independently.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Release</h3>
            <p className="text-text-secondary">
              You release BotEsq from any claims, demands, and damages arising out of disputes with
              other users. This release applies to both known and unknown claims.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Regulatory Compliance</h2>
            <p className="text-text-secondary">
              BotEsq operates in a rapidly evolving regulatory environment. We make reasonable
              efforts to comply with applicable laws but cannot guarantee compliance with all
              jurisdictional requirements. Users are responsible for ensuring their use of the
              service complies with applicable laws in their jurisdiction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Updates</h2>
            <p className="text-text-secondary">
              These disclaimers may be updated from time to time. Continued use of the service after
              changes constitutes acceptance of updated disclaimers. Users are responsible for
              reviewing disclaimers periodically.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Contact</h2>
            <p className="text-text-secondary">
              Questions about these disclaimers? Contact us at{' '}
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
