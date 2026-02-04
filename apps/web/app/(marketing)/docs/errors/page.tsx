import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '../components/code-block'

const errorCategories = [
  {
    name: 'Authentication Errors',
    errors: [
      {
        code: 'INVALID_API_KEY',
        status: 401,
        description: 'The provided API key is invalid, malformed, or has been revoked.',
        resolution:
          'Check your API key in the operator dashboard. Ensure you are using the correct environment (live vs test).',
      },
      {
        code: 'SESSION_EXPIRED',
        status: 401,
        description:
          'The session token has expired due to inactivity (24 hours) or explicit logout.',
        resolution: 'Call start_session again to create a new session.',
      },
      {
        code: 'INVALID_SESSION',
        status: 401,
        description: 'The session token is invalid or does not exist.',
        resolution: 'Call start_session to create a valid session.',
      },
      {
        code: 'UNAUTHORIZED_SERVICE',
        status: 403,
        description: 'Your operator account is not authorized for this service.',
        resolution: 'Contact support to enable the required service for your account.',
      },
    ],
  },
  {
    name: 'Validation Errors',
    errors: [
      {
        code: 'VALIDATION_ERROR',
        status: 400,
        description: 'One or more parameters failed validation.',
        resolution: 'Check the error details for specific field errors and correct your input.',
      },
      {
        code: 'MISSING_PARAMETER',
        status: 400,
        description: 'A required parameter was not provided.',
        resolution: 'Include all required parameters in your request.',
      },
      {
        code: 'INVALID_PARAMETER',
        status: 400,
        description: 'A parameter value is invalid or out of range.',
        resolution: 'Check parameter constraints in the documentation.',
      },
    ],
  },
  {
    name: 'Credit Errors',
    errors: [
      {
        code: 'INSUFFICIENT_CREDITS',
        status: 402,
        description: 'Your account does not have enough credits for this operation.',
        resolution: 'Add credits using the add_credits tool or through the operator dashboard.',
      },
      {
        code: 'CREDIT_LIMIT_EXCEEDED',
        status: 402,
        description: 'This operation would exceed your account credit limit.',
        resolution: 'Contact support to increase your credit limit.',
      },
      {
        code: 'PAYMENT_FAILED',
        status: 402,
        description: 'The payment for credit purchase failed.',
        resolution: 'Check your payment method in the operator dashboard.',
      },
    ],
  },
  {
    name: 'Resource Errors',
    errors: [
      {
        code: 'MATTER_NOT_FOUND',
        status: 404,
        description: 'The specified matter does not exist or is not accessible.',
        resolution: 'Verify the matter_id and ensure it belongs to your account.',
      },
      {
        code: 'DOCUMENT_NOT_FOUND',
        status: 404,
        description: 'The specified document does not exist or is not accessible.',
        resolution: 'Verify the document_id and ensure it belongs to your account.',
      },
      {
        code: 'CONSULTATION_NOT_FOUND',
        status: 404,
        description: 'The specified consultation does not exist or is not accessible.',
        resolution: 'Verify the consultation_id and ensure it belongs to your account.',
      },
      {
        code: 'RETAINER_NOT_FOUND',
        status: 404,
        description: 'The specified retainer does not exist or has expired.',
        resolution: 'Call get_retainer_terms to get a fresh retainer offer.',
      },
    ],
  },
  {
    name: 'State Errors',
    errors: [
      {
        code: 'RETAINER_REQUIRED',
        status: 409,
        description: 'This operation requires an accepted retainer agreement.',
        resolution: 'Call get_retainer_terms and accept_retainer before proceeding.',
      },
      {
        code: 'MATTER_NOT_ACTIVE',
        status: 409,
        description: 'The matter is not in an active state.',
        resolution: 'Check matter status. May need to accept retainer or reopen the matter.',
      },
      {
        code: 'DOCUMENT_PROCESSING',
        status: 409,
        description: 'The document is still being processed.',
        resolution: 'Wait and retry. Check status with get_document_analysis.',
      },
      {
        code: 'CONSULTATION_PENDING',
        status: 409,
        description: 'The consultation is still pending attorney review.',
        resolution: 'Wait and retry. Check status with get_consultation_result.',
      },
    ],
  },
  {
    name: 'Rate Limiting',
    errors: [
      {
        code: 'RATE_LIMITED',
        status: 429,
        description: 'Too many requests. You have exceeded the rate limit.',
        resolution: 'Implement exponential backoff. Check Retry-After header.',
      },
      {
        code: 'CONCURRENT_LIMIT',
        status: 429,
        description: 'Too many concurrent requests from this session.',
        resolution: 'Reduce parallel requests. Wait for pending requests to complete.',
      },
    ],
  },
  {
    name: 'Server Errors',
    errors: [
      {
        code: 'INTERNAL_ERROR',
        status: 500,
        description: 'An unexpected internal error occurred.',
        resolution: 'Retry the request. If persistent, contact support with the request ID.',
      },
      {
        code: 'SERVICE_UNAVAILABLE',
        status: 503,
        description: 'The service is temporarily unavailable.',
        resolution: 'Retry with exponential backoff. Check status page for outages.',
      },
    ],
  },
]

export default function ErrorsPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <Badge variant="primary">Reference</Badge>
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">Error Handling</h1>
        <p className="text-lg text-text-secondary">
          Learn how to handle errors from BotEsq API calls. All errors follow a consistent format
          and include actionable information for resolution.
        </p>
      </div>

      {/* Error format */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Error Response Format</h2>
        <p className="text-text-secondary">All errors return a consistent JSON structure:</p>
        <CodeBlock
          language="json"
          code={`{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Your account does not have enough credits for this operation",
    "details": {
      "required_credits": 10000,
      "available_credits": 5000,
      "operation": "create_matter"
    },
    "request_id": "req_abc123..."
  }
}`}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="py-3 text-left font-medium text-text-primary">Field</th>
                <th className="py-3 text-left font-medium text-text-primary">Type</th>
                <th className="py-3 text-left font-medium text-text-primary">Description</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              <tr className="border-b border-border-default">
                <td className="py-3 font-mono">code</td>
                <td className="py-3">string</td>
                <td className="py-3">Machine-readable error code</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3 font-mono">message</td>
                <td className="py-3">string</td>
                <td className="py-3">Human-readable error message</td>
              </tr>
              <tr className="border-b border-border-default">
                <td className="py-3 font-mono">details</td>
                <td className="py-3">object</td>
                <td className="py-3">Additional context (varies by error)</td>
              </tr>
              <tr>
                <td className="py-3 font-mono">request_id</td>
                <td className="py-3">string</td>
                <td className="py-3">Unique ID for support inquiries</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Error handling example */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Handling Errors</h2>
        <p className="text-text-secondary">
          Here is a recommended pattern for handling BotEsq errors:
        </p>
        <CodeBlock
          language="typescript"
          code={`async function callBotEsq(tool: string, params: object) {
  try {
    const result = await mcp.callTool(tool, params);
    return result;
  } catch (error) {
    if (error.code === 'SESSION_EXPIRED') {
      // Refresh session and retry
      await refreshSession();
      return mcp.callTool(tool, params);
    }

    if (error.code === 'INSUFFICIENT_CREDITS') {
      // Notify user or auto-purchase credits
      console.log(\`Need \${error.details.required_credits} credits\`);
      throw new Error('Insufficient credits for this operation');
    }

    if (error.code === 'RATE_LIMITED') {
      // Implement exponential backoff
      const retryAfter = error.details.retry_after || 60;
      await sleep(retryAfter * 1000);
      return mcp.callTool(tool, params);
    }

    // Log unexpected errors for debugging
    console.error(\`BotEsq error: \${error.code}\`, {
      message: error.message,
      request_id: error.request_id
    });

    throw error;
  }
}`}
        />
      </div>

      {/* Error codes by category */}
      {errorCategories.map((category) => (
        <div key={category.name} className="space-y-4">
          <h2 className="text-2xl font-semibold text-text-primary">{category.name}</h2>
          <div className="space-y-4">
            {category.errors.map((error) => (
              <Card key={error.code}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-base">{error.code}</CardTitle>
                    <Badge
                      variant={
                        error.status >= 500
                          ? 'error'
                          : error.status >= 400
                            ? 'warning'
                            : 'secondary'
                      }
                    >
                      {error.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-text-secondary">{error.description}</p>
                  <p className="text-sm">
                    <strong className="text-text-primary">Resolution:</strong>{' '}
                    <span className="text-text-secondary">{error.resolution}</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {/* Retry strategy */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Retry Strategy</h2>
        <p className="text-text-secondary">
          For transient errors (5xx, rate limits), use exponential backoff:
        </p>
        <CodeBlock
          language="typescript"
          code={`async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry client errors (except rate limits)
      if (error.status >= 400 && error.status < 500 && error.code !== 'RATE_LIMITED') {
        throw error;
      }

      // Calculate delay with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}`}
        />
      </div>
    </div>
  )
}
