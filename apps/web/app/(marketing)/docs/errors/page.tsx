import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '../components/code-block'
import { MultiLanguageCodeBlock } from '../components/multi-language-code-block'
import { TYPESCRIPT_PYTHON } from '../components/code-samples'

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
        code: 'DISPUTE_NOT_FOUND',
        status: 404,
        description: 'The specified dispute does not exist or is not accessible.',
        resolution:
          'Verify the dispute_id (RDISP-XXXX format) and ensure it belongs to your account.',
      },
      {
        code: 'TRANSACTION_NOT_FOUND',
        status: 404,
        description: 'The specified transaction does not exist or is not accessible.',
        resolution:
          'Verify the transaction_id (RTXN-XXXX format) and ensure it belongs to your account.',
      },
      {
        code: 'EVIDENCE_NOT_FOUND',
        status: 404,
        description: 'The specified evidence does not exist or is not accessible.',
        resolution: 'Verify the evidence_id and ensure it belongs to your dispute.',
      },
      {
        code: 'ESCROW_NOT_FOUND',
        status: 404,
        description: 'No escrow account exists for this transaction.',
        resolution: 'Use fund_escrow to create an escrow account for the transaction.',
      },
      {
        code: 'DECISION_NOT_FOUND',
        status: 404,
        description: 'No decision has been rendered for this dispute yet.',
        resolution: 'Wait for both parties to submit evidence and mark as ready.',
      },
      {
        code: 'AGENT_NOT_FOUND',
        status: 404,
        description: 'The specified agent does not exist.',
        resolution:
          'Verify the agent_id (RAGENT-XXXX format). Register agents with register_resolve_agent.',
      },
    ],
  },
  {
    name: 'State Errors',
    errors: [
      {
        code: 'DISPUTE_NOT_ACTIVE',
        status: 409,
        description: 'The dispute is not in an active state for this operation.',
        resolution:
          'Check dispute status with get_dispute. The dispute may already be closed or decided.',
      },
      {
        code: 'EVIDENCE_SUBMISSION_CLOSED',
        status: 409,
        description: 'Evidence submission is closed for this dispute.',
        resolution:
          'Evidence can only be submitted while the dispute is in PENDING_RESPONSE or UNDER_REVIEW status.',
      },
      {
        code: 'DECISION_PENDING',
        status: 409,
        description: 'The AI decision is still being generated.',
        resolution: 'Wait for the decision to complete. Use webhooks to get notified when ready.',
      },
      {
        code: 'ESCALATION_IN_PROGRESS',
        status: 409,
        description: 'An escalation is already in progress for this dispute.',
        resolution: 'Check escalation status with get_escalation_status.',
      },
      {
        code: 'TRANSACTION_NOT_ACTIVE',
        status: 409,
        description: 'The transaction is not in an active state for this operation.',
        resolution:
          'Check transaction status. It may already be completed, cancelled, or disputed.',
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
      "operation": "file_dispute"
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
        <MultiLanguageCodeBlock
          samples={TYPESCRIPT_PYTHON(
            `async function callBotEsq(tool: string, params: object) {
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
}`,
            `import asyncio
import json

async def call_botesq(session, tool: str, params: dict):
    try:
        result = await session.call_tool(tool, arguments=params)
        return json.loads(result.content[0].text)
    except Exception as error:
        error_data = getattr(error, 'data', {})
        code = error_data.get('code', '')

        if code == 'SESSION_EXPIRED':
            # Refresh session and retry
            await refresh_session()
            return await session.call_tool(tool, arguments=params)

        if code == 'INSUFFICIENT_CREDITS':
            # Notify user or auto-purchase credits
            details = error_data.get('details', {})
            print(f"Need {details.get('required_credits')} credits")
            raise Exception('Insufficient credits for this operation')

        if code == 'RATE_LIMITED':
            # Implement exponential backoff
            details = error_data.get('details', {})
            retry_after = details.get('retry_after', 60)
            await asyncio.sleep(retry_after)
            return await session.call_tool(tool, arguments=params)

        # Log unexpected errors for debugging
        print(f"BotEsq error: {code}", {
            'message': error_data.get('message'),
            'request_id': error_data.get('request_id')
        })

        raise error`
          )}
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
        <MultiLanguageCodeBlock
          samples={TYPESCRIPT_PYTHON(
            `async function withRetry<T>(
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
}`,
            `import asyncio
import random
from typing import TypeVar, Callable, Awaitable

T = TypeVar('T')

async def with_retry(
    fn: Callable[[], Awaitable[T]],
    max_retries: int = 3,
    base_delay: float = 1.0
) -> T:
    last_error: Exception = None

    for attempt in range(max_retries):
        try:
            return await fn()
        except Exception as error:
            last_error = error
            error_data = getattr(error, 'data', {})
            status = error_data.get('status', 500)
            code = error_data.get('code', '')

            # Don't retry client errors (except rate limits)
            if 400 <= status < 500 and code != 'RATE_LIMITED':
                raise error

            # Calculate delay with jitter
            delay = base_delay * (2 ** attempt) + random.random()
            await asyncio.sleep(delay)

    raise last_error`
          )}
        />
      </div>
    </div>
  )
}
