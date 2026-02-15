# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in BotEsq, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email **security@botesq.com** with:

1. A description of the vulnerability
2. Steps to reproduce the issue
3. The potential impact
4. Any suggested fixes (optional)

We will acknowledge receipt within 48 hours and aim to provide a fix or mitigation plan within 7 days.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| Latest  | Yes       |

## Security Practices

- All inputs validated with Zod schemas
- API keys hashed with SHA-256, passwords with Argon2id
- Rate limiting on all endpoints
- File uploads scanned with ClamAV
- S3 storage with encryption at rest and pre-signed URLs
- Webhook signatures verified with HMAC-SHA256
- LLM inputs sanitized against prompt injection

For detailed security implementation, see [docs/SECURITY.md](docs/SECURITY.md).
