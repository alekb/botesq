import { Metadata } from 'next'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Attorney Advertising | BotEsq',
  description: 'Attorney advertising disclosures and professional notices.',
}

export default function AttorneyAdvertisingPage() {
  return (
    <div className="py-20 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">
          Attorney Advertising
        </h1>
        <p className="mt-4 text-sm text-text-tertiary">Last Updated: February 6, 2026</p>

        <Card className="mt-8 border-warning-500/30 bg-gradient-to-br from-warning-500/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="inline-flex rounded-lg bg-warning-500/10 p-3 flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-warning-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-2">
                  Attorney Advertising Notice
                </h2>
                <p className="text-sm text-text-secondary">
                  This website contains information about BotEsq's legal services and may be
                  considered attorney advertising in some jurisdictions. Please read the following
                  disclosures carefully.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-12 prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              Professional Disclosures
            </h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Not a Law Firm</h3>
            <p className="text-text-secondary">
              BotEsq is a technology platform that provides dispute resolution services and connects
              users with licensed attorneys for legal services. BotEsq itself is not a law firm and
              does not provide legal advice directly.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              Licensed Attorneys
            </h3>
            <p className="text-text-secondary">
              Legal services through BotEsq are provided by independent licensed attorneys or under
              the supervision of licensed attorneys. Each attorney maintains their own professional
              liability insurance and is subject to the professional rules of conduct in their
              jurisdiction(s).
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              No Attorney-Client Relationship
            </h3>
            <p className="text-text-secondary">
              Viewing this website or using BotEsq's dispute resolution service does not create an
              attorney-client relationship. An attorney-client relationship is formed only when you
              explicitly engage legal services and enter into an agreement with a licensed attorney
              through our platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Results and Outcomes</h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              No Guarantee of Results
            </h3>
            <p className="text-text-secondary">
              Past results do not guarantee future outcomes. Every legal matter is unique, and the
              outcome of any dispute or legal service depends on the specific facts and
              circumstances of each case. Success in one matter does not predict success in another.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              AI-Powered Decisions
            </h3>
            <p className="text-text-secondary">
              BotEsq's dispute resolution uses AI to analyze disputes and generate decisions.
              AI-powered decisions are based on the information provided and may not account for all
              relevant legal considerations. Parties may request human arbitrator review for complex
              matters.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Trust Scores</h3>
            <p className="text-text-secondary">
              Trust scores displayed on our platform are based on historical transaction and dispute
              data. Trust scores are informational only and do not constitute recommendations,
              endorsements, or guarantees of future behavior.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              Jurisdictional Limitations
            </h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              State-Specific Restrictions
            </h3>
            <p className="text-text-secondary mb-4">
              Legal services are subject to state bar regulations and attorney licensing
              requirements. Not all services may be available in all jurisdictions. The availability
              of specific attorneys or services depends on:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Attorney licensure in your jurisdiction</li>
              <li>State bar rules regarding legal technology platforms</li>
              <li>Jurisdiction-specific practice restrictions</li>
              <li>Multi-jurisdictional practice rules</li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              International Users
            </h3>
            <p className="text-text-secondary">
              Legal services through BotEsq are primarily provided by attorneys licensed in the
              United States. International users should consult with local legal counsel to
              understand applicable laws and regulations in their jurisdiction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              Information on This Website
            </h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Not Legal Advice</h3>
            <p className="text-text-secondary">
              Information on this website is general in nature and does not constitute legal advice.
              Legal advice can only be provided by a licensed attorney after reviewing the specific
              facts of your situation. Do not rely on website content as a substitute for
              professional legal counsel.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">
              Accuracy and Currency
            </h3>
            <p className="text-text-secondary">
              While we strive to keep information accurate and up-to-date, laws and regulations
              change frequently. Information on this website may not reflect the most current legal
              developments. Always consult with a licensed attorney for current legal advice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              Confidentiality and Privacy
            </h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Communications</h3>
            <p className="text-text-secondary">
              Communications through this website, including forms and general inquiries, may not be
              confidential or protected by attorney-client privilege until you establish an
              attorney-client relationship. Do not send confidential information through general
              contact forms.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Dispute Data</h3>
            <p className="text-text-secondary">
              Information submitted in disputes is shared with the other party and relevant
              arbitrators or attorneys. While we implement security measures to protect your data,
              dispute resolution inherently involves disclosure to other parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Fees and Costs</h2>
            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">No Hidden Fees</h3>
            <p className="text-text-secondary">
              Our pricing structure is transparent. Dispute resolution uses token-based pricing.
              Legal services are quoted based on service type and complexity. Additional costs may
              apply for human arbitrator escalation or specialized legal services.
            </p>

            <h3 className="text-xl font-semibold text-text-primary mb-3 mt-6">Cost Comparison</h3>
            <p className="text-text-secondary">
              We do not make claims about cost savings compared to traditional legal services. Costs
              depend on the nature and complexity of each matter. Users should evaluate whether our
              services are appropriate for their specific needs and budget.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">State Bar Compliance</h2>
            <p className="text-text-secondary mb-4">
              BotEsq operates in compliance with state bar rules and regulations. Our platform:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Does not engage in the unauthorized practice of law</li>
              <li>Ensures attorneys maintain their professional independence</li>
              <li>Complies with attorney advertising rules</li>
              <li>Maintains proper attorney-client privilege protections</li>
              <li>Follows fee-sharing and referral regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Questions or Concerns</h2>
            <p className="text-text-secondary">
              If you have questions about these disclosures or concerns about our compliance with
              attorney advertising rules, please contact us at{' '}
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
