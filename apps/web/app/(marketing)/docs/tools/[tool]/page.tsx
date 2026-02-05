import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MultiLanguageCodeBlock } from '../../components/multi-language-code-block'
import { TYPESCRIPT_PYTHON } from '../../components/code-samples'

interface ToolParam {
  name: string
  type: string
  required: boolean
  description: string
  default?: string
}

interface ToolDoc {
  name: string
  description: string
  longDescription: string
  credits: string | number
  params: ToolParam[]
  returns: ToolParam[]
  exampleTs: string
  examplePy: string
  notes?: string[]
}

const tools: Record<string, ToolDoc> = {
  'start-session': {
    name: 'start_session',
    description: 'Start a new authenticated session',
    longDescription:
      'Creates a new session for an AI agent to interact with BotEsq services. This must be called before any other tools can be used. The session token returned should be stored and used for all subsequent API calls.',
    credits: 0,
    params: [
      {
        name: 'api_key',
        type: 'string',
        required: true,
        description: 'Your BotEsq API key (starts with botesq_live_ or botesq_test_)',
      },
      {
        name: 'agent_identifier',
        type: 'string',
        required: false,
        description: 'Optional identifier for your agent instance (for logging/debugging)',
      },
    ],
    returns: [
      {
        name: 'session_token',
        type: 'string',
        required: true,
        description: 'Session token to use for subsequent calls',
      },
      {
        name: 'operator_name',
        type: 'string',
        required: true,
        description: 'Name of the operator account',
      },
      {
        name: 'credits_available',
        type: 'number',
        required: true,
        description: 'Current credit balance',
      },
      {
        name: 'services_enabled',
        type: 'string[]',
        required: true,
        description: 'List of enabled services',
      },
    ],
    exampleTs: `const session = await mcp.callTool("start_session", {
  api_key: "botesq_live_abc123...",
  agent_identifier: "my-legal-assistant-v1"
});

console.log(session.session_token);  // "sess_xyz789..."
console.log(session.credits_available);  // 50000`,
    examplePy: `result = await session.call_tool(
    "start_session",
    arguments={
        "api_key": "botesq_live_abc123...",
        "agent_identifier": "my-legal-assistant-v1"
    }
)
session_data = json.loads(result.content[0].text)

print(session_data["session_token"])  # "sess_xyz789..."
print(session_data["credits_available"])  # 50000`,
  },
  'get-session-info': {
    name: 'get_session_info',
    description: 'Get information about the current session',
    longDescription:
      'Retrieves detailed information about an active session, including the operator details, credit balance, and session metadata.',
    credits: 0,
    params: [
      {
        name: 'session_token',
        type: 'string',
        required: true,
        description: 'The session token from start_session',
      },
    ],
    returns: [
      {
        name: 'session_id',
        type: 'string',
        required: true,
        description: 'Unique session identifier',
      },
      { name: 'operator_id', type: 'string', required: true, description: 'Operator account ID' },
      {
        name: 'operator_name',
        type: 'string',
        required: true,
        description: 'Operator account name',
      },
      {
        name: 'credits_available',
        type: 'number',
        required: true,
        description: 'Current credit balance',
      },
      {
        name: 'created_at',
        type: 'string',
        required: true,
        description: 'Session creation timestamp (ISO 8601)',
      },
      {
        name: 'expires_at',
        type: 'string',
        required: true,
        description: 'Session expiration timestamp (ISO 8601)',
      },
    ],
    exampleTs: `const info = await mcp.callTool("get_session_info", {
  session_token: "sess_xyz789..."
});

console.log(info.credits_available);  // 49800
console.log(info.expires_at);  // "2024-01-16T12:00:00Z"`,
    examplePy: `result = await session.call_tool(
    "get_session_info",
    arguments={"session_token": "sess_xyz789..."}
)
info = json.loads(result.content[0].text)

print(info["credits_available"])  # 49800
print(info["expires_at"])  # "2024-01-16T12:00:00Z"`,
  },
  'list-services': {
    name: 'list_services',
    description: 'List all available legal services',
    longDescription:
      'Returns a list of all legal services available through BotEsq, including their descriptions, pricing, and availability status.',
    credits: 0,
    params: [],
    returns: [
      {
        name: 'services',
        type: 'Service[]',
        required: true,
        description: 'Array of available services',
      },
    ],
    exampleTs: `const result = await mcp.callTool("list_services", {});

// Returns:
// {
//   services: [
//     { id: "legal_qa", name: "Legal Q&A", description: "...", pricing: {...} },
//     { id: "matters", name: "Matter Management", description: "...", pricing: {...} },
//     ...
//   ]
// }`,
    examplePy: `result = await session.call_tool("list_services", arguments={})
services = json.loads(result.content[0].text)

# Returns:
# {
#   "services": [
#     {"id": "legal_qa", "name": "Legal Q&A", "description": "...", "pricing": {...}},
#     {"id": "matters", "name": "Matter Management", "description": "...", "pricing": {...}},
#     ...
#   ]
# }`,
  },
  'get-disclaimers': {
    name: 'get_disclaimers',
    description: 'Get legal disclaimers and terms',
    longDescription:
      'Retrieves the legal disclaimers and terms of service that should be presented to end users. This information should be shown before providing legal advice.',
    credits: 0,
    params: [],
    returns: [
      {
        name: 'disclaimers',
        type: 'Disclaimer[]',
        required: true,
        description: 'Array of disclaimers to display',
      },
      {
        name: 'terms_url',
        type: 'string',
        required: true,
        description: 'URL to full terms of service',
      },
    ],
    exampleTs: `const result = await mcp.callTool("get_disclaimers", {});

// Always show disclaimers before legal advice
console.log(result.disclaimers[0].text);
// "This information is for educational purposes only..."`,
    examplePy: `result = await session.call_tool("get_disclaimers", arguments={})
disclaimers = json.loads(result.content[0].text)

# Always show disclaimers before legal advice
print(disclaimers["disclaimers"][0]["text"])
# "This information is for educational purposes only..."`,
  },
  'check-credits': {
    name: 'check_credits',
    description: 'Check your current credit balance',
    longDescription:
      'Returns the current credit balance and usage statistics for the session. Use this to monitor spending and ensure sufficient credits before expensive operations.',
    credits: 0,
    params: [
      {
        name: 'session_token',
        type: 'string',
        required: true,
        description: 'The session token from start_session',
      },
    ],
    returns: [
      {
        name: 'credits_available',
        type: 'number',
        required: true,
        description: 'Current credit balance',
      },
      {
        name: 'credits_used_this_session',
        type: 'number',
        required: true,
        description: 'Credits used in this session',
      },
      {
        name: 'credits_used_all_time',
        type: 'number',
        required: true,
        description: 'Total credits used by this operator',
      },
    ],
    exampleTs: `const credits = await mcp.callTool("check_credits", {
  session_token: "sess_xyz789..."
});

if (credits.credits_available < 10000) {
  console.log("Low credits! Consider adding more.");
}`,
    examplePy: `result = await session.call_tool(
    "check_credits",
    arguments={"session_token": "sess_xyz789..."}
)
credits = json.loads(result.content[0].text)

if credits["credits_available"] < 10000:
    print("Low credits! Consider adding more.")`,
  },
  'add-credits': {
    name: 'add_credits',
    description: 'Add credits to your account',
    longDescription:
      'Initiates a credit purchase using the payment method on file. Credits are added immediately upon successful payment. Minimum purchase is $10, maximum is $1,000 per transaction.',
    credits: 0,
    params: [
      {
        name: 'session_token',
        type: 'string',
        required: true,
        description: 'The session token from start_session',
      },
      {
        name: 'amount_usd',
        type: 'number',
        required: true,
        description: 'Amount in USD to add (min: 10, max: 1000)',
      },
    ],
    returns: [
      {
        name: 'credits_added',
        type: 'number',
        required: true,
        description: 'Number of credits added',
      },
      {
        name: 'credits_available',
        type: 'number',
        required: true,
        description: 'New credit balance',
      },
      {
        name: 'transaction_id',
        type: 'string',
        required: true,
        description: 'Payment transaction ID',
      },
    ],
    exampleTs: `const result = await mcp.callTool("add_credits", {
  session_token: "sess_xyz789...",
  amount_usd: 50
});

console.log(result.credits_added);
console.log(result.credits_available);`,
    examplePy: `result = await session.call_tool(
    "add_credits",
    arguments={
        "session_token": "sess_xyz789...",
        "amount_usd": 50
    }
)
data = json.loads(result.content[0].text)

print(data["credits_added"])
print(data["credits_available"])`,
    notes: ['Credit packages available in your dashboard', 'Requires payment method on file'],
  },
  'ask-legal-question': {
    name: 'ask_legal_question',
    description: 'Ask a legal question and get an instant answer',
    longDescription:
      "Submit a legal question and receive an immediate response from BotEsq's legal AI system, reviewed by licensed attorneys. Credit cost varies based on question complexity.",
    credits: '200-1,000',
    params: [
      {
        name: 'session_token',
        type: 'string',
        required: true,
        description: 'The session token from start_session',
      },
      {
        name: 'question',
        type: 'string',
        required: true,
        description: 'The legal question to ask (minimum 10 characters)',
      },
      {
        name: 'jurisdiction',
        type: 'string',
        required: false,
        description: 'Jurisdiction code (e.g., "US-CA", "US-NY", "UK")',
      },
      {
        name: 'context',
        type: 'string',
        required: false,
        description: 'Additional context to help answer the question',
      },
    ],
    returns: [
      { name: 'answer', type: 'string', required: true, description: 'The legal answer' },
      {
        name: 'complexity',
        type: 'string',
        required: true,
        description: 'Question complexity: simple, moderate, or complex',
      },
      {
        name: 'credits_charged',
        type: 'number',
        required: true,
        description: 'Credits deducted for this question',
      },
      {
        name: 'disclaimer',
        type: 'string',
        required: true,
        description: 'Legal disclaimer to display',
      },
      {
        name: 'attorney_id',
        type: 'string',
        required: true,
        description: 'ID of reviewing attorney',
      },
    ],
    exampleTs: `const result = await mcp.callTool("ask_legal_question", {
  session_token: "sess_xyz789...",
  question: "What are the key elements required for a valid contract?",
  jurisdiction: "US-CA"
});

console.log(result.answer);
// "A valid contract under California law requires four key elements:
// 1. Offer and acceptance, 2. Consideration, 3. Capacity, 4. Legality..."

console.log(result.complexity);  // "simple"
console.log(result.credits_charged);  // 200`,
    examplePy: `result = await session.call_tool(
    "ask_legal_question",
    arguments={
        "session_token": "sess_xyz789...",
        "question": "What are the key elements required for a valid contract?",
        "jurisdiction": "US-CA"
    }
)
answer = json.loads(result.content[0].text)

print(answer["answer"])
# "A valid contract under California law requires four key elements:
# 1. Offer and acceptance, 2. Consideration, 3. Capacity, 4. Legality..."

print(answer["complexity"])  # "simple"
print(answer["credits_charged"])  # 200`,
    notes: [
      'Simple questions: 200 credits (basic definitions, straightforward answers)',
      'Moderate questions: 500 credits (multi-part answers, some analysis)',
      'Complex questions: 1,000 credits (detailed analysis, multiple factors)',
    ],
  },
  'create-matter': {
    name: 'create_matter',
    description: 'Create a new legal matter',
    longDescription:
      'Creates a new legal matter to organize related documents, consultations, and communications. Matters are required for document submissions and consultations. Each matter represents a distinct legal issue or project.',
    credits: 10000,
    params: [
      {
        name: 'session_token',
        type: 'string',
        required: true,
        description: 'The session token from start_session',
      },
      {
        name: 'matter_type',
        type: 'string',
        required: true,
        description:
          'Type of legal matter (CONTRACT_REVIEW, ENTITY_FORMATION, COMPLIANCE, IP_TRADEMARK, IP_COPYRIGHT, IP_PATENT, EMPLOYMENT, LITIGATION_CONSULTATION)',
      },
      {
        name: 'title',
        type: 'string',
        required: true,
        description: 'Brief title for the matter',
      },
      {
        name: 'description',
        type: 'string',
        required: false,
        description: 'Detailed description of the matter',
      },
      {
        name: 'urgency',
        type: 'string',
        required: false,
        description: 'Urgency level: low, normal, high, urgent',
        default: 'normal',
      },
    ],
    returns: [
      {
        name: 'matter_id',
        type: 'string',
        required: true,
        description: 'Unique matter identifier',
      },
      {
        name: 'status',
        type: 'string',
        required: true,
        description: 'Matter status (pending_retainer)',
      },
      {
        name: 'retainer_required',
        type: 'boolean',
        required: true,
        description: 'Whether a retainer must be signed',
      },
      {
        name: 'credits_charged',
        type: 'number',
        required: true,
        description: 'Credits deducted (10,000)',
      },
    ],
    exampleTs: `const matter = await mcp.callTool("create_matter", {
  session_token: "sess_xyz789...",
  matter_type: "CONTRACT_REVIEW",
  title: "SaaS Agreement Review",
  description: "Review of enterprise SaaS contract with Acme Corp",
  urgency: "high"
});

console.log(matter.matter_id);  // "mat_abc123..."
// Next: Get and accept the retainer before submitting documents`,
    examplePy: `result = await session.call_tool(
    "create_matter",
    arguments={
        "session_token": "sess_xyz789...",
        "matter_type": "CONTRACT_REVIEW",
        "title": "SaaS Agreement Review",
        "description": "Review of enterprise SaaS contract with Acme Corp",
        "urgency": "high"
    }
)
matter = json.loads(result.content[0].text)

print(matter["matter_id"])  # "mat_abc123..."
# Next: Get and accept the retainer before submitting documents`,
    notes: [
      'A retainer agreement must be accepted before work can begin',
      'Use get_retainer_terms and accept_retainer after creating a matter',
    ],
  },
  'get-matter-status': {
    name: 'get_matter_status',
    description: 'Get the status of a matter',
    longDescription:
      'Retrieves the current status and details of a legal matter, including any pending actions, documents, and consultations associated with the matter.',
    credits: 0,
    params: [
      {
        name: 'session_token',
        type: 'string',
        required: true,
        description: 'The session token from start_session',
      },
      {
        name: 'matter_id',
        type: 'string',
        required: true,
        description: 'The matter ID from create_matter',
      },
    ],
    returns: [
      { name: 'matter_id', type: 'string', required: true, description: 'Matter identifier' },
      { name: 'title', type: 'string', required: true, description: 'Matter title' },
      { name: 'status', type: 'string', required: true, description: 'Current status' },
      { name: 'matter_type', type: 'string', required: true, description: 'Type of matter' },
      {
        name: 'documents',
        type: 'Document[]',
        required: true,
        description: 'Associated documents',
      },
      {
        name: 'consultations',
        type: 'Consultation[]',
        required: true,
        description: 'Associated consultations',
      },
    ],
    exampleTs: `const status = await mcp.callTool("get_matter_status", {
  session_token: "sess_xyz789...",
  matter_id: "mat_abc123..."
});

console.log(status.status);  // "active"
console.log(status.documents.length);  // 3`,
    examplePy: `result = await session.call_tool(
    "get_matter_status",
    arguments={
        "session_token": "sess_xyz789...",
        "matter_id": "mat_abc123..."
    }
)
status = json.loads(result.content[0].text)

print(status["status"])  # "active"
print(len(status["documents"]))  # 3`,
  },
  'list-matters': {
    name: 'list_matters',
    description: 'List all matters for the session',
    longDescription:
      "Returns a paginated list of all matters associated with the current session's operator account. Can be filtered by status.",
    credits: 0,
    params: [
      {
        name: 'session_token',
        type: 'string',
        required: true,
        description: 'The session token from start_session',
      },
      {
        name: 'status',
        type: 'string',
        required: false,
        description: 'Filter by status (pending_retainer, active, completed, archived)',
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: 'Maximum results to return',
        default: '20',
      },
      {
        name: 'offset',
        type: 'number',
        required: false,
        description: 'Number of results to skip',
        default: '0',
      },
    ],
    returns: [
      { name: 'matters', type: 'Matter[]', required: true, description: 'Array of matters' },
      { name: 'total', type: 'number', required: true, description: 'Total number of matters' },
      {
        name: 'has_more',
        type: 'boolean',
        required: true,
        description: 'Whether more results exist',
      },
    ],
    exampleTs: `const result = await mcp.callTool("list_matters", {
  session_token: "sess_xyz789...",
  status: "active",
  limit: 10
});

result.matters.forEach(matter => {
  console.log(\`\${matter.title}: \${matter.status}\`);
});`,
    examplePy: `result = await session.call_tool(
    "list_matters",
    arguments={
        "session_token": "sess_xyz789...",
        "status": "active",
        "limit": 10
    }
)
data = json.loads(result.content[0].text)

for matter in data["matters"]:
    print(f"{matter['title']}: {matter['status']}")`,
  },
  'get-retainer-terms': {
    name: 'get_retainer_terms',
    description: 'Get retainer terms for a matter',
    longDescription:
      'Retrieves the retainer agreement terms for a specific matter. The retainer must be reviewed and accepted before any billable work can be performed on the matter.',
    credits: 0,
    params: [
      {
        name: 'session_token',
        type: 'string',
        required: true,
        description: 'The session token from start_session',
      },
      {
        name: 'matter_id',
        type: 'string',
        required: true,
        description: 'The matter ID to get retainer terms for',
      },
    ],
    returns: [
      { name: 'retainer_id', type: 'string', required: true, description: 'Retainer agreement ID' },
      { name: 'terms', type: 'string', required: true, description: 'Full text of retainer terms' },
      {
        name: 'scope_of_work',
        type: 'string',
        required: true,
        description: 'Description of work to be performed',
      },
      {
        name: 'fee_structure',
        type: 'FeeStructure',
        required: true,
        description: 'Pricing and fee details',
      },
      {
        name: 'expires_at',
        type: 'string',
        required: true,
        description: 'When the offer expires (ISO 8601)',
      },
    ],
    exampleTs: `const retainer = await mcp.callTool("get_retainer_terms", {
  session_token: "sess_xyz789...",
  matter_id: "mat_abc123..."
});

console.log(retainer.scope_of_work);
// "Review and analysis of SaaS agreement..."

console.log(retainer.fee_structure);
// { type: "credit_based", estimated_credits: 25000 }`,
    examplePy: `result = await session.call_tool(
    "get_retainer_terms",
    arguments={
        "session_token": "sess_xyz789...",
        "matter_id": "mat_abc123..."
    }
)
retainer = json.loads(result.content[0].text)

print(retainer["scope_of_work"])
# "Review and analysis of SaaS agreement..."

print(retainer["fee_structure"])
# {"type": "credit_based", "estimated_credits": 25000}`,
  },
  'accept-retainer': {
    name: 'accept_retainer',
    description: 'Accept a retainer agreement',
    longDescription:
      'Accepts a retainer agreement, activating the matter and allowing billable work to begin. Requires prior authorization token for pre-approved high-value engagements.',
    credits: 0,
    params: [
      {
        name: 'session_token',
        type: 'string',
        required: true,
        description: 'The session token from start_session',
      },
      {
        name: 'retainer_id',
        type: 'string',
        required: true,
        description: 'The retainer ID from get_retainer_terms',
      },
      {
        name: 'pre_auth_token',
        type: 'string',
        required: false,
        description: 'Pre-authorization token for high-value engagements',
      },
    ],
    returns: [
      {
        name: 'accepted',
        type: 'boolean',
        required: true,
        description: 'Whether acceptance was successful',
      },
      {
        name: 'matter_status',
        type: 'string',
        required: true,
        description: 'New matter status (active)',
      },
      {
        name: 'accepted_at',
        type: 'string',
        required: true,
        description: 'Acceptance timestamp (ISO 8601)',
      },
    ],
    exampleTs: `const result = await mcp.callTool("accept_retainer", {
  session_token: "sess_xyz789...",
  retainer_id: "ret_def456..."
});

if (result.accepted) {
  console.log("Retainer accepted! Matter is now active.");
  // Now you can submit documents or request consultations
}`,
    examplePy: `result = await session.call_tool(
    "accept_retainer",
    arguments={
        "session_token": "sess_xyz789...",
        "retainer_id": "ret_def456..."
    }
)
data = json.loads(result.content[0].text)

if data["accepted"]:
    print("Retainer accepted! Matter is now active.")
    # Now you can submit documents or request consultations`,
  },
  'submit-document': {
    name: 'submit_document',
    description: 'Submit a document for review',
    longDescription:
      'Uploads a document for legal review and analysis. Documents must be associated with an active matter. Supported formats include PDF, DOCX, and TXT. Pricing is based on document size: base fee of 2,500 credits plus 100 credits per page, up to 10,000 credits maximum.',
    credits: '2,500+',
    params: [
      {
        name: 'session_token',
        type: 'string',
        required: true,
        description: 'The session token from start_session',
      },
      {
        name: 'filename',
        type: 'string',
        required: true,
        description: 'Original filename with extension',
      },
      {
        name: 'content_base64',
        type: 'string',
        required: true,
        description: 'Base64-encoded document content',
      },
      {
        name: 'matter_id',
        type: 'string',
        required: false,
        description: 'Matter ID to associate the document with',
      },
      {
        name: 'document_type',
        type: 'string',
        required: false,
        description: 'Type of document (contract, agreement, policy, other)',
      },
      {
        name: 'notes',
        type: 'string',
        required: false,
        description: 'Additional notes or instructions for reviewers',
      },
    ],
    returns: [
      {
        name: 'document_id',
        type: 'string',
        required: true,
        description: 'Unique document identifier',
      },
      {
        name: 'status',
        type: 'string',
        required: true,
        description: 'Document status (processing, ready)',
      },
      {
        name: 'page_count',
        type: 'number',
        required: true,
        description: 'Number of pages detected',
      },
      { name: 'credits_charged', type: 'number', required: true, description: 'Credits deducted' },
    ],
    exampleTs: `import { readFileSync } from 'fs';

const content = readFileSync('./contract.pdf');
const base64 = content.toString('base64');

const doc = await mcp.callTool("submit_document", {
  session_token: "sess_xyz789...",
  filename: "contract.pdf",
  content_base64: base64,
  matter_id: "mat_abc123...",
  document_type: "contract",
  notes: "Please focus on liability and indemnification clauses"
});

console.log(doc.document_id);  // "doc_ghi789..."
console.log(doc.credits_charged);  // 3500 (base + 10 pages)`,
    examplePy: `import base64

with open("./contract.pdf", "rb") as f:
    content = f.read()
base64_content = base64.b64encode(content).decode("utf-8")

result = await session.call_tool(
    "submit_document",
    arguments={
        "session_token": "sess_xyz789...",
        "filename": "contract.pdf",
        "content_base64": base64_content,
        "matter_id": "mat_abc123...",
        "document_type": "contract",
        "notes": "Please focus on liability and indemnification clauses"
    }
)
doc = json.loads(result.content[0].text)

print(doc["document_id"])  # "doc_ghi789..."
print(doc["credits_charged"])  # 3500 (base + 10 pages)`,
    notes: [
      'Base fee: 2,500 credits',
      'Per page: 100 credits',
      'Maximum: 10,000 credits',
      'Supported formats: PDF, DOCX, TXT',
      'Maximum file size: 10MB',
    ],
  },
  'get-document-analysis': {
    name: 'get_document_analysis',
    description: 'Get analysis results for a document',
    longDescription:
      'Retrieves the analysis results for a previously submitted document. Results include a summary, key findings, identified risks, and recommendations from the reviewing attorney.',
    credits: 0,
    params: [
      {
        name: 'session_token',
        type: 'string',
        required: true,
        description: 'The session token from start_session',
      },
      {
        name: 'document_id',
        type: 'string',
        required: true,
        description: 'The document ID from submit_document',
      },
    ],
    returns: [
      { name: 'document_id', type: 'string', required: true, description: 'Document identifier' },
      {
        name: 'status',
        type: 'string',
        required: true,
        description: 'Analysis status (processing, completed, failed)',
      },
      {
        name: 'summary',
        type: 'string',
        required: false,
        description: 'Executive summary of the document',
      },
      {
        name: 'key_findings',
        type: 'Finding[]',
        required: false,
        description: 'Important findings and observations',
      },
      { name: 'risks', type: 'Risk[]', required: false, description: 'Identified legal risks' },
      {
        name: 'recommendations',
        type: 'string[]',
        required: false,
        description: 'Attorney recommendations',
      },
      {
        name: 'attorney_id',
        type: 'string',
        required: false,
        description: 'Reviewing attorney ID',
      },
    ],
    exampleTs: `const analysis = await mcp.callTool("get_document_analysis", {
  session_token: "sess_xyz789...",
  document_id: "doc_ghi789..."
});

if (analysis.status === "completed") {
  console.log(analysis.summary);

  analysis.risks.forEach(risk => {
    console.log(\`[\${risk.severity}] \${risk.description}\`);
  });
}`,
    examplePy: `result = await session.call_tool(
    "get_document_analysis",
    arguments={
        "session_token": "sess_xyz789...",
        "document_id": "doc_ghi789..."
    }
)
analysis = json.loads(result.content[0].text)

if analysis["status"] == "completed":
    print(analysis["summary"])

    for risk in analysis["risks"]:
        print(f"[{risk['severity']}] {risk['description']}")`,
  },
  'request-consultation': {
    name: 'request_consultation',
    description: 'Request a legal consultation',
    longDescription:
      'Submits a request for an in-depth legal consultation with an attorney. Consultations are asynchronous and typically completed within 24-48 hours (standard) or 4-8 hours (urgent). Results are retrieved via get_consultation_result.',
    credits: '5,000-10,000',
    params: [
      {
        name: 'session_token',
        type: 'string',
        required: true,
        description: 'The session token from start_session',
      },
      {
        name: 'question',
        type: 'string',
        required: true,
        description: 'Detailed question or issue to consult on',
      },
      {
        name: 'matter_id',
        type: 'string',
        required: false,
        description: 'Matter ID to associate the consultation with',
      },
      {
        name: 'context',
        type: 'string',
        required: false,
        description: 'Additional context, background, or relevant information',
      },
      {
        name: 'jurisdiction',
        type: 'string',
        required: false,
        description: 'Jurisdiction code (e.g., "US-CA")',
      },
      {
        name: 'urgency',
        type: 'string',
        required: false,
        description: 'Urgency level: standard or urgent (affects pricing and response time)',
        default: 'standard',
      },
    ],
    returns: [
      {
        name: 'consultation_id',
        type: 'string',
        required: true,
        description: 'Unique consultation identifier',
      },
      {
        name: 'status',
        type: 'string',
        required: true,
        description: 'Consultation status (pending, in_progress)',
      },
      {
        name: 'estimated_completion',
        type: 'string',
        required: true,
        description: 'Estimated completion time (ISO 8601)',
      },
      { name: 'credits_charged', type: 'number', required: true, description: 'Credits deducted' },
    ],
    exampleTs: `const consult = await mcp.callTool("request_consultation", {
  session_token: "sess_xyz789...",
  question: "We're considering expanding to the EU market. What GDPR compliance steps should we take?",
  context: "We're a B2B SaaS company processing customer data.",
  jurisdiction: "EU",
  urgency: "standard"
});

console.log(consult.consultation_id);  // "con_jkl012..."
console.log(consult.estimated_completion);  // "2024-01-17T12:00:00Z"`,
    examplePy: `result = await session.call_tool(
    "request_consultation",
    arguments={
        "session_token": "sess_xyz789...",
        "question": "We're considering expanding to the EU market. What GDPR compliance steps should we take?",
        "context": "We're a B2B SaaS company processing customer data.",
        "jurisdiction": "EU",
        "urgency": "standard"
    }
)
consult = json.loads(result.content[0].text)

print(consult["consultation_id"])  # "con_jkl012..."
print(consult["estimated_completion"])  # "2024-01-17T12:00:00Z"`,
    notes: [
      'Standard consultations: 5,000 credits (24-48 hour response)',
      'Urgent consultations: 10,000 credits (4-8 hour response)',
    ],
  },
  'get-consultation-result': {
    name: 'get_consultation_result',
    description: 'Get the result of a consultation',
    longDescription:
      'Retrieves the results of a previously requested consultation. Poll this endpoint until the status changes to "completed". Results include a detailed written response from the consulting attorney.',
    credits: 0,
    params: [
      {
        name: 'session_token',
        type: 'string',
        required: true,
        description: 'The session token from start_session',
      },
      {
        name: 'consultation_id',
        type: 'string',
        required: true,
        description: 'The consultation ID from request_consultation',
      },
    ],
    returns: [
      {
        name: 'consultation_id',
        type: 'string',
        required: true,
        description: 'Consultation identifier',
      },
      {
        name: 'status',
        type: 'string',
        required: true,
        description: 'Status (pending, in_progress, completed)',
      },
      {
        name: 'response',
        type: 'string',
        required: false,
        description: "Attorney's detailed response",
      },
      {
        name: 'attorney_id',
        type: 'string',
        required: false,
        description: 'Consulting attorney ID',
      },
      {
        name: 'completed_at',
        type: 'string',
        required: false,
        description: 'Completion timestamp (ISO 8601)',
      },
      {
        name: 'follow_up_available',
        type: 'boolean',
        required: false,
        description: 'Whether follow-up questions are available',
      },
    ],
    exampleTs: `const result = await mcp.callTool("get_consultation_result", {
  session_token: "sess_xyz789...",
  consultation_id: "con_jkl012..."
});

if (result.status === "completed") {
  console.log(result.response);
  // "Based on your B2B SaaS business model, here are the key GDPR
  // compliance steps you should consider..."
} else {
  console.log(\`Status: \${result.status}. Check back later.\`);
}`,
    examplePy: `result = await session.call_tool(
    "get_consultation_result",
    arguments={
        "session_token": "sess_xyz789...",
        "consultation_id": "con_jkl012..."
    }
)
data = json.loads(result.content[0].text)

if data["status"] == "completed":
    print(data["response"])
    # "Based on your B2B SaaS business model, here are the key GDPR
    # compliance steps you should consider..."
else:
    print(f"Status: {data['status']}. Check back later.")`,
  },
}

interface PageProps {
  params: Promise<{ tool: string }>
}

export async function generateStaticParams() {
  return Object.keys(tools).map((tool) => ({ tool }))
}

export default async function ToolPage({ params }: PageProps) {
  const { tool: toolSlug } = await params
  const tool = tools[toolSlug]

  if (!tool) {
    notFound()
  }

  return (
    <div className="space-y-12">
      {/* Back link */}
      <Link
        href="/docs/tools"
        className="inline-flex items-center text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Tools
      </Link>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-3xl font-bold text-text-primary">{tool.name}</h1>
          <Badge variant={tool.credits === 0 ? 'secondary' : 'primary'}>
            {tool.credits === 0 ? 'Free' : `${tool.credits} credits`}
          </Badge>
        </div>
        <p className="text-lg text-text-secondary">{tool.longDescription}</p>
      </div>

      {/* Parameters */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Parameters</h2>
        {tool.params.length === 0 ? (
          <p className="text-text-secondary">This tool takes no parameters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="py-3 text-left font-medium text-text-primary">Name</th>
                  <th className="py-3 text-left font-medium text-text-primary">Type</th>
                  <th className="py-3 text-left font-medium text-text-primary">Required</th>
                  <th className="py-3 text-left font-medium text-text-primary">Description</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {tool.params.map((param) => (
                  <tr key={param.name} className="border-b border-border-default">
                    <td className="py-3 font-mono text-primary-500">{param.name}</td>
                    <td className="py-3 font-mono">{param.type}</td>
                    <td className="py-3">
                      {param.required ? (
                        <Badge variant="error">Required</Badge>
                      ) : (
                        <Badge variant="secondary">Optional</Badge>
                      )}
                    </td>
                    <td className="py-3">
                      {param.description}
                      {param.default && (
                        <span className="block text-xs text-text-tertiary">
                          Default: {param.default}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Returns */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Returns</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="py-3 text-left font-medium text-text-primary">Name</th>
                <th className="py-3 text-left font-medium text-text-primary">Type</th>
                <th className="py-3 text-left font-medium text-text-primary">Description</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              {tool.returns.map((ret) => (
                <tr key={ret.name} className="border-b border-border-default">
                  <td className="py-3 font-mono text-primary-500">{ret.name}</td>
                  <td className="py-3 font-mono">{ret.type}</td>
                  <td className="py-3">{ret.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Example */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-text-primary">Example</h2>
        <MultiLanguageCodeBlock samples={TYPESCRIPT_PYTHON(tool.exampleTs, tool.examplePy)} />
      </div>

      {/* Notes */}
      {tool.notes && tool.notes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-text-primary">Notes</h2>
          <Card>
            <CardContent className="pt-6">
              <ul className="list-inside list-disc space-y-2 text-text-secondary">
                {tool.notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
