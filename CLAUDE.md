# BotEsq AI Agent Instructions

## Project Overview

**Project:** BotEsq — Neutral AI dispute resolution service for AI agents
**Stack:** Node.js 20.x, Next.js 14.2.x, React 18.2.x, TypeScript 5.4.x, PostgreSQL 16.x, Tailwind CSS 3.4.x

---

## Canonical Documentation

These documents are law. Reference them for all decisions.

| Document               | Purpose                                             | Location                    |
| ---------------------- | --------------------------------------------------- | --------------------------- |
| PRD.md                 | Product requirements, features, acceptance criteria | docs/PRD.md                 |
| APP_FLOW.md            | User journeys, screens, interactions                | docs/APP_FLOW.md            |
| TECH_STACK.md          | Exact versions, dependencies, infrastructure        | docs/TECH_STACK.md          |
| DESIGN_SYSTEM.md       | Colors, typography, spacing, visual tokens          | docs/DESIGN_SYSTEM.md       |
| FRONTEND_GUIDELINES.md | Component architecture, engineering rules           | docs/FRONTEND_GUIDELINES.md |
| BACKEND_STRUCTURE.md   | Database schema, API contracts, auth logic          | docs/BACKEND_STRUCTURE.md   |
| IMPLEMENTATION_PLAN.md | Master build blueprint with phases (immutable)      | docs/IMPLEMENTATION_PLAN.md |
| PROGRESS.md            | Current state, active tasks, session log            | PROGRESS.md                 |

---

## Session Startup Sequence

At the start of every session, read these files in this order:

1. **CLAUDE.md** (this file) — Your rules and constraints
2. **PROGRESS.md** — Current state, active tasks, what's next
3. **IMPLEMENTATION_PLAN.md** — Which phase/step to work on
4. **LESSONS.md** — Mistakes to avoid, patterns discovered
5. **Verify plan with user** — Get approval before executing

---

## Workflow Orchestration

### 0. Git Worktrees

Use git worktrees for all feature work:

```bash
# Create a worktree for a new feature/phase
git worktree add ../botesq-phase-0 -b phase-0

# List active worktrees
git worktree list

# Remove when done (after merging)
git worktree remove ../botesq-phase-0
```

**Rules:**

- Never work directly on `main` — always use a worktree branch
- Name worktrees descriptively: `botesq-phase-X`, `botesq-feat-XXX`, `botesq-fix-XXX`
- Keep worktrees in parent directory (`../`) to avoid nesting
- Remove worktrees after merging to keep things clean

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update LESSONS.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Protection Rules

### No Regressions

- Before modifying any existing file, diff what exists against what you're changing
- Never break working functionality to implement new functionality
- If a change touches more than one system, verify each system still works after
- When in doubt, ask before overwriting

### No File Overwrites

- Never overwrite existing documentation files
- Create new timestamped versions when documentation needs updating
- Canonical docs maintain history — the AI never destroys previous versions

### No Assumptions

- If you encounter anything not explicitly covered by documentation, STOP and ask
- Do not infer. Do not guess. Do not fill gaps with "reasonable defaults"
- Every undocumented decision gets escalated to the user before implementation
- Silence is not permission

### Design System Enforcement

- Before creating ANY component, check DESIGN_SYSTEM.md first
- Never invent colors, spacing values, border radii, shadows, or tokens not in the file
- If a design need arises that isn't covered, flag it and wait for the user to update DESIGN_SYSTEM.md
- Consistency is non-negotiable. Every pixel references the system.

### Mobile-First Mandate

- Every component starts as a mobile layout
- Desktop is the enhancement, not the default
- Breakpoint behavior is defined in DESIGN_SYSTEM.md — follow it exactly
- Test mental model: "Does this work on a phone first?"

---

## Task Management

1. **Plan First:** Add tasks to "Active Tasks" section in PROGRESS.md
2. **Verify Plan:** Check in with user before starting implementation
3. **Track Progress:** Mark items complete as you go in PROGRESS.md
4. **Explain Changes:** High-level summary at each step
5. **Update State:** Move completed items to "Completed" section, update "Current" phase/step
6. **Capture Lessons:** Update LESSONS.md after corrections

---

## Core Principles

### Simplicity First

Make every change as simple as possible. Impact minimal code.

### No Laziness

Find root causes. No temporary fixes. Senior developer standards.

### Minimal Impact

Changes should only touch what's necessary. Avoid introducing bugs.

---

## Tech Stack Quick Reference

### Frontend

```
next: 14.2.3
react: 18.2.0
typescript: 5.4.5
tailwindcss: 3.4.3
zustand: 4.5.2
@tanstack/react-query: 5.37.1
react-hook-form: 7.51.4
zod: 3.23.8
```

### Backend

```
node: 20.11.1
@modelcontextprotocol/sdk: 1.0.4
fastify: 4.27.0
prisma: 5.14.0
openai: 4.47.1
stripe: 15.7.0
```

### Database

```
postgresql: 16.2
```

---

## File Naming Conventions

### Files & Folders

- Folders: `kebab-case` (e.g., `matter-card/`, `api-keys/`)
- Component files: `kebab-case.tsx` (e.g., `button.tsx`, `matter-card.tsx`)
- Utility files: `kebab-case.ts` (e.g., `format-date.ts`)
- Test files: `*.test.ts` or `*.test.tsx`

### Components

- Component names: `PascalCase` (e.g., `Button`, `MatterCard`)
- Props interfaces: `PascalCase` + `Props` suffix (e.g., `ButtonProps`)

### Variables & Functions

- Variables: `camelCase`
- Functions: `camelCase` with verb prefix (e.g., `getMatter`, `handleSubmit`)
- Constants: `SCREAMING_SNAKE_CASE`

---

## Feature IDs Reference

| ID       | Feature                         | Priority |
| -------- | ------------------------------- | -------- |
| FEAT-001 | MCP Server Core                 | P0       |
| FEAT-002 | Agent Authentication & Sessions | P0       |
| FEAT-003 | Token-Based Pricing System      | P0       |
| FEAT-004 | Dispute Management              | P0       |
| FEAT-005 | Submission System               | P0       |
| FEAT-006 | AI Decision Engine              | P0       |
| FEAT-007 | Decision Acceptance Flow        | P0       |
| FEAT-008 | Escalation System               | P0       |
| FEAT-009 | Evidence Processing             | P1       |
| FEAT-010 | Arbitrator Dashboard            | P0       |
| FEAT-011 | Operator Portal                 | P1       |
| FEAT-012 | Admin Dashboard                 | P0       |
| FEAT-013 | Billing & Invoicing             | P1       |
| FEAT-014 | Marketing Website               | P1       |
| FEAT-015 | API Documentation               | P0       |

---

## MCP Tools Reference

```
Session:        start_session, get_session_info

Disputes:       file_dispute, join_dispute, get_dispute_status, list_disputes

Submissions:    submit_position, submit_evidence, mark_submission_complete, get_submissions

Decisions:      get_decision, accept_decision, reject_decision

Escalation:     request_escalation, get_escalation_status

Tokens:         check_token_usage, get_token_estimate

Info:           list_services, get_dispute_terms
```

---

## Design Tokens Quick Reference

### Colors

```
background-primary: #0a0a0a
background-secondary: #141414
text-primary: #ffffff
text-secondary: #a1a1a1
primary-500: #3b82f6 (blue)
success-500: #22c55e (green)
warning-500: #f59e0b (amber)
error-500: #ef4444 (red)
```

### Spacing (base: 4px)

```
space-1: 4px    space-4: 16px   space-8: 32px
space-2: 8px    space-6: 24px   space-12: 48px
```

### Border Radius

```
rounded-md: 6px (buttons, inputs)
rounded-lg: 8px (cards)
rounded-xl: 12px (modals)
```

---

## Forbidden Actions

- Never commit directly to `main` — use worktree branches
- Never use colors not in DESIGN_SYSTEM.md
- Never skip focus states on interactive elements
- Never use desktop-first responsive design
- Never push to main without tests passing
- Never store secrets in code
- Never use `any` type in TypeScript
- Never create components without checking existing primitives
- Never modify IMPLEMENTATION_PLAN.md during execution

---

## Allowed Actions (Pre-Authorized)

- Run `pnpm install` and `pnpm add` for dependencies
- Run `pnpm dev`, `pnpm build`, `pnpm test`
- Run Prisma commands: `migrate`, `generate`, `studio`
- Create new files following naming conventions
- Edit existing code files (not documentation)
- Run git commands: `status`, `diff`, `add`, `commit`, `worktree add/list/remove`, `checkout -b`, `merge`

---

## Production Access

```bash
# SSH into production server
ssh -i ~/.ssh/botesq-key.pem ec2-user@botesq.com
```

---

## Questions to Ask Before Implementing

1. Is this covered in the documentation?
2. Does this follow the design system?
3. Is there an existing component I should use?
4. Will this work on mobile first?
5. Are there edge cases I need to handle?
6. What tests should I write?
7. Is this the simplest solution?

---

## Error Handling Patterns

### API Errors

```typescript
throw new ApiError('ERROR_CODE', 'Human readable message', statusCode)
```

### Form Validation

```typescript
const schema = z.object({...})
// Use zod with react-hook-form
```

### Component Errors

```typescript
// Use error boundaries at route level
// Show Alert component for recoverable errors
```

---

## Commit Message Format

```
<type>: <short description>

<body explaining why, not what>

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

---

## Current Project State

See `PROGRESS.md` for:

- Current phase
- What's built
- What's in progress
- What's blocked
- What's next
