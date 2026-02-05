'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Highlight, themes, type Language } from 'prism-react-renderer'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
}

// Map common language names to Prism language identifiers
const languageMap: Record<string, Language> = {
  typescript: 'typescript',
  ts: 'typescript',
  javascript: 'javascript',
  js: 'javascript',
  python: 'python',
  py: 'python',
  json: 'json',
  bash: 'bash',
  shell: 'bash',
  sh: 'bash',
  go: 'go',
  golang: 'go',
  text: 'markdown',
  plain: 'markdown',
}

export function CodeBlock({
  code,
  language = 'typescript',
  filename,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const prismLanguage = languageMap[language.toLowerCase()] || 'typescript'

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border-default bg-background-tertiary">
      {/* Header with filename and copy button */}
      <div className="flex items-center justify-between border-b border-border-default bg-background-secondary px-4 py-2">
        <div className="flex items-center gap-2">
          {filename && <span className="font-mono text-xs text-text-secondary">{filename}</span>}
          {!filename && language && (
            <span className="font-mono text-xs text-text-secondary">{language}</span>
          )}
        </div>
        <button
          onClick={copyToClipboard}
          className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-background-tertiary hover:text-text-primary"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-4 w-4 text-success-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      {/* Code content with syntax highlighting */}
      <Highlight theme={themes.nightOwl} code={code.trim()} language={prismLanguage}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <div className="overflow-x-auto p-4">
            <pre
              className={`font-mono text-sm ${className}`}
              style={{ ...style, background: 'transparent', margin: 0 }}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })} className="flex">
                  {showLineNumbers && (
                    <span className="mr-4 inline-block w-8 select-none text-right text-text-tertiary">
                      {i + 1}
                    </span>
                  )}
                  <span>
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              ))}
            </pre>
          </div>
        )}
      </Highlight>
    </div>
  )
}
