import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ConsultationQuestionProps {
  consultation: {
    question: string
    context: string | null
    jurisdiction: string | null
    matter: {
      type: string
    } | null
  }
}

export function ConsultationQuestion({ consultation }: ConsultationQuestionProps) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Question</h2>
        <div className="flex gap-2">
          {consultation.matter && <Badge variant="secondary">{consultation.matter.type}</Badge>}
          {consultation.jurisdiction && (
            <Badge variant="secondary">{consultation.jurisdiction}</Badge>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg bg-background-primary p-4">
          <p className="whitespace-pre-wrap text-text-primary">{consultation.question}</p>
        </div>

        {consultation.context && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-text-secondary">Context</h3>
            <div className="rounded-lg bg-background-primary p-4">
              <p className="whitespace-pre-wrap text-sm text-text-primary">
                {consultation.context}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
