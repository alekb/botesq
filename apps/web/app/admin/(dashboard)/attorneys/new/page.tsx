import { AttorneyForm } from '@/components/admin/attorney-form'

export default function NewAttorneyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Add Attorney</h1>
        <p className="text-text-secondary">Create a new attorney account</p>
      </div>

      <AttorneyForm mode="create" />
    </div>
  )
}
