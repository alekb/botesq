// Helper functions for creating code samples - can be used in server components

export interface CodeSample {
  language: string
  label: string
  code: string
  filename?: string
}

// Pre-configured language combinations for common use cases
export function TYPESCRIPT_PYTHON(
  tsCode: string,
  pyCode: string,
  tsFilename?: string,
  pyFilename?: string
): CodeSample[] {
  return [
    { language: 'typescript', label: 'TypeScript', code: tsCode, filename: tsFilename },
    { language: 'python', label: 'Python', code: pyCode, filename: pyFilename },
  ]
}
