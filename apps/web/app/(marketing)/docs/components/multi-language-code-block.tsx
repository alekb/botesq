'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CodeBlock } from './code-block'
import type { CodeSample } from './code-samples'

interface MultiLanguageCodeBlockProps {
  samples: CodeSample[]
  defaultLanguage?: string
  showLineNumbers?: boolean
}

export function MultiLanguageCodeBlock({
  samples,
  defaultLanguage,
  showLineNumbers = false,
}: MultiLanguageCodeBlockProps) {
  const defaultLang = defaultLanguage || samples[0]?.language || 'typescript'

  if (samples.length === 1 && samples[0]) {
    // Single language - no tabs needed
    const sample = samples[0]
    return (
      <CodeBlock
        code={sample.code}
        language={sample.language}
        filename={sample.filename}
        showLineNumbers={showLineNumbers}
      />
    )
  }

  return (
    <Tabs defaultValue={defaultLang} className="w-full">
      <TabsList>
        {samples.map((sample) => (
          <TabsTrigger key={sample.language} value={sample.language}>
            {sample.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {samples.map((sample) => (
        <TabsContent key={sample.language} value={sample.language} className="mt-4">
          <CodeBlock
            code={sample.code}
            language={sample.language}
            filename={sample.filename}
            showLineNumbers={showLineNumbers}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}
