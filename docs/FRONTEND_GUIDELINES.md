# MoltLaw Frontend Guidelines

## Overview

This document defines the engineering rules, patterns, and conventions for building the MoltLaw frontend. It covers component architecture, file organization, state management, and development practices.

**Stack:** Next.js 14.2.3 + React 18.2.0 + TypeScript 5.4.5 + Tailwind CSS 3.4.3

---

## File Structure

```
apps/web/
├── app/                        # Next.js App Router
│   ├── (marketing)/           # Public marketing pages
│   │   ├── page.tsx           # Landing page
│   │   ├── features/
│   │   ├── pricing/
│   │   └── layout.tsx
│   ├── (auth)/                # Authentication pages
│   │   ├── login/
│   │   ├── signup/
│   │   └── layout.tsx
│   ├── portal/                # Operator portal (protected)
│   │   ├── page.tsx           # Dashboard
│   │   ├── matters/
│   │   ├── billing/
│   │   ├── settings/
│   │   └── layout.tsx
│   ├── attorney/              # Attorney dashboard (protected)
│   │   ├── page.tsx           # Queue
│   │   ├── matter/[id]/
│   │   └── layout.tsx
│   ├── admin/                 # Admin dashboard (protected)
│   │   └── ...
│   ├── api/                   # API routes
│   │   └── ...
│   ├── layout.tsx             # Root layout
│   └── globals.css
├── components/
│   ├── ui/                    # Primitive UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── common/                # Shared composite components
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   ├── footer.tsx
│   │   └── ...
│   ├── portal/                # Portal-specific components
│   │   ├── matter-card.tsx
│   │   ├── credit-display.tsx
│   │   └── ...
│   ├── attorney/              # Attorney-specific components
│   │   ├── queue-item.tsx
│   │   ├── response-editor.tsx
│   │   └── ...
│   └── marketing/             # Marketing-specific components
│       ├── hero.tsx
│       ├── feature-grid.tsx
│       └── ...
├── lib/
│   ├── api/                   # API client functions
│   │   ├── client.ts
│   │   ├── matters.ts
│   │   ├── credits.ts
│   │   └── ...
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-auth.ts
│   │   ├── use-matters.ts
│   │   └── ...
│   ├── stores/                # Zustand stores
│   │   ├── auth-store.ts
│   │   ├── ui-store.ts
│   │   └── ...
│   ├── utils/                 # Utility functions
│   │   ├── cn.ts
│   │   ├── format.ts
│   │   └── ...
│   └── validations/           # Zod schemas
│       ├── auth.ts
│       ├── matter.ts
│       └── ...
├── types/                     # TypeScript type definitions
│   ├── api.ts
│   ├── matter.ts
│   ├── user.ts
│   └── ...
├── public/                    # Static assets
│   ├── images/
│   └── fonts/
├── tailwind.config.ts
├── next.config.js
└── package.json
```

---

## Naming Conventions

### Files & Folders

```yaml
# Folders: kebab-case
components/
matter-card/
api-keys/

# Component files: kebab-case
button.tsx
matter-card.tsx
credit-display.tsx

# Utility files: kebab-case
format-date.ts
use-auth.ts

# Type files: kebab-case
matter.ts
api-response.ts
```

### Components

```yaml
# Component names: PascalCase
export function Button() {}
export function MatterCard() {}
export function CreditDisplay() {}

# Component props: PascalCase + Props suffix
interface ButtonProps {}
interface MatterCardProps {}
```

### Variables & Functions

```yaml
# Variables: camelCase
const matterList = []
const isLoading = false

# Functions: camelCase, verb prefix
function getMatter() {}
function handleSubmit() {}
function formatCurrency() {}

# Constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_COUNT = 3
const API_BASE_URL = ''
```

### CSS Classes

```yaml
# Tailwind utility classes only
# No custom CSS classes unless absolutely necessary
# Use cn() utility for conditional classes
```

---

## Component Architecture

### Component Hierarchy

```
1. Pages (app/ routes)
   └── Layouts (shared layouts)
       └── Composite Components (components/{feature}/)
           └── UI Components (components/ui/)
```

### UI Components (Primitives)

Location: `components/ui/`

These are the atomic building blocks. They:
- Have no business logic
- Accept styling via className prop
- Use design system tokens exclusively
- Are fully accessible
- Handle their own states (hover, focus, disabled)

Example:
```tsx
// components/ui/button.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600',
        secondary: 'bg-background-tertiary text-text-primary hover:bg-background-elevated',
        outline: 'border border-border-default bg-transparent hover:bg-background-secondary',
        ghost: 'hover:bg-background-secondary',
        danger: 'bg-error-500 text-white hover:bg-error-600',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
}

export function Button({
  className,
  variant,
  size,
  isLoading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
      {children}
    </button>
  )
}
```

### Composite Components

Location: `components/{feature}/`

These combine UI components with business logic. They:
- Compose UI primitives
- May have internal state
- May fetch data
- Are feature-specific

Example:
```tsx
// components/portal/matter-card.tsx
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils/format'
import type { Matter } from '@/types/matter'

interface MatterCardProps {
  matter: Matter
  onView: (id: string) => void
}

export function MatterCard({ matter, onView }: MatterCardProps) {
  const statusColors = {
    active: 'primary',
    pending_retainer: 'warning',
    resolved: 'success',
    closed: 'default',
  } as const

  return (
    <Card className="hover:border-primary-500 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <p className="text-xs text-text-muted">{matter.id}</p>
          <h3 className="font-semibold">{matter.title}</h3>
        </div>
        <Badge variant={statusColors[matter.status]}>
          {matter.status.replace('_', ' ')}
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-text-secondary mb-4">
          Created {formatDate(matter.createdAt)}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onView(matter.id)}
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  )
}
```

### Page Components

Location: `app/` routes

Pages are thin wrappers that:
- Fetch initial data (Server Components)
- Set up layout
- Compose composite components
- Handle route-level concerns

Example:
```tsx
// app/portal/matters/page.tsx
import { getMattersList } from '@/lib/api/matters'
import { MattersList } from '@/components/portal/matters-list'

export default async function MattersPage() {
  const matters = await getMattersList()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Matters</h1>
      </div>
      <MattersList initialMatters={matters} />
    </div>
  )
}
```

---

## State Management

### Server State (React Query)

Use TanStack Query for all server data:

```tsx
// lib/hooks/use-matters.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMatters, createMatter } from '@/lib/api/matters'

export function useMatters() {
  return useQuery({
    queryKey: ['matters'],
    queryFn: getMatters,
  })
}

export function useCreateMatter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createMatter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matters'] })
    },
  })
}
```

### Client State (Zustand)

Use Zustand for UI state and client-only state:

```tsx
// lib/stores/ui-store.ts
import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
```

### Auth State

```tsx
// lib/stores/auth-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
)
```

### State Selection Rules

| State Type | Solution |
|------------|----------|
| Server data | React Query |
| Form state | react-hook-form |
| URL state | Next.js params/searchParams |
| UI state (global) | Zustand |
| UI state (local) | useState/useReducer |
| Auth state | Zustand + persist |

---

## API Integration

### API Client

```tsx
// lib/api/client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL

interface FetchOptions extends RequestInit {
  token?: string
}

export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new ApiError(error.message, response.status, error.code)
  }

  return response.json()
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
  }
}
```

### API Functions

```tsx
// lib/api/matters.ts
import { apiClient } from './client'
import type { Matter, CreateMatterInput } from '@/types/matter'

export async function getMatters(token: string): Promise<Matter[]> {
  return apiClient<Matter[]>('/matters', { token })
}

export async function getMatter(id: string, token: string): Promise<Matter> {
  return apiClient<Matter>(`/matters/${id}`, { token })
}

export async function createMatter(
  input: CreateMatterInput,
  token: string
): Promise<Matter> {
  return apiClient<Matter>('/matters', {
    method: 'POST',
    body: JSON.stringify(input),
    token,
  })
}
```

---

## Form Handling

### Form Pattern

```tsx
// components/portal/create-matter-form.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useCreateMatter } from '@/lib/hooks/use-matters'

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  type: z.enum(['contract_review', 'entity_formation', 'compliance']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
})

type FormData = z.infer<typeof schema>

export function CreateMatterForm({ onSuccess }: { onSuccess: () => void }) {
  const { mutate, isPending } = useCreateMatter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data: FormData) => {
    mutate(data, {
      onSuccess,
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <Input
          id="title"
          {...register('title')}
          error={errors.title?.message}
        />
      </div>

      <div>
        <label htmlFor="type" className="text-sm font-medium">
          Type
        </label>
        <Select {...register('type')}>
          <option value="contract_review">Contract Review</option>
          <option value="entity_formation">Entity Formation</option>
          <option value="compliance">Compliance</option>
        </Select>
        {errors.type && (
          <p className="text-sm text-error-500">{errors.type.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <Textarea
          id="description"
          {...register('description')}
          error={errors.description?.message}
        />
      </div>

      <Button type="submit" isLoading={isPending}>
        Create Matter
      </Button>
    </form>
  )
}
```

---

## Error Handling

### Error Boundary

```tsx
// components/common/error-boundary.tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  error: Error & { digest?: string }
  reset: () => void
}

export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-text-secondary mb-4">
        {error.message || 'An unexpected error occurred'}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
```

### API Error Handling

```tsx
// components/portal/matters-list.tsx
import { useMatters } from '@/lib/hooks/use-matters'
import { MatterCard } from './matter-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert } from '@/components/ui/alert'

export function MattersList() {
  const { data, isLoading, error } = useMatters()

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="error">
        Failed to load matters: {error.message}
      </Alert>
    )
  }

  if (!data?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">No matters yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.map((matter) => (
        <MatterCard key={matter.id} matter={matter} />
      ))}
    </div>
  )
}
```

---

## Responsive Design

### Mobile-First Approach

Always start with mobile styles, then add breakpoints:

```tsx
// Correct: mobile-first
<div className="px-4 md:px-6 lg:px-8">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
<div className="flex flex-col md:flex-row">

// Incorrect: desktop-first
<div className="px-8 md:px-6 sm:px-4">  // Don't do this
```

### Breakpoint Usage

```tsx
// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="md:hidden">Mobile only</div>

// Different layouts
<div className="flex flex-col md:flex-row">
  <aside className="w-full md:w-64">Sidebar</aside>
  <main className="flex-1">Content</main>
</div>
```

### Touch Targets

Ensure touch targets are at least 44x44px on mobile:

```tsx
// Correct: adequate touch target
<Button size="md">Click me</Button>  // h-10 = 40px, but padding adds more

// For icon buttons
<button className="p-3">  // 12px padding × 2 + 20px icon = 44px
  <Icon className="h-5 w-5" />
</button>
```

---

## Accessibility

### Keyboard Navigation

All interactive elements must be keyboard accessible:

```tsx
// Use native elements when possible
<button>Click me</button>  // Correct
<div onClick={...}>Click me</div>  // Avoid

// Add tabIndex for custom focusable elements
<div tabIndex={0} onKeyDown={handleKeyDown} role="button">
  Custom button
</div>
```

### ARIA Labels

```tsx
// Provide labels for icon-only buttons
<button aria-label="Close dialog">
  <XIcon />
</button>

// Use aria-describedby for additional context
<input
  aria-describedby="email-hint"
  aria-invalid={!!error}
/>
<p id="email-hint">We'll never share your email</p>
```

### Focus Management

```tsx
// Trap focus in modals
import { FocusTrap } from '@/components/ui/focus-trap'

<Dialog>
  <FocusTrap>
    <DialogContent>...</DialogContent>
  </FocusTrap>
</Dialog>

// Return focus after modal closes
const triggerRef = useRef<HTMLButtonElement>(null)

const handleClose = () => {
  setOpen(false)
  triggerRef.current?.focus()
}
```

---

## Performance

### Image Optimization

```tsx
import Image from 'next/image'

// Always use next/image
<Image
  src="/images/hero.png"
  alt="MoltLaw hero"
  width={800}
  height={400}
  priority  // For above-the-fold images
/>

// For responsive images
<Image
  src="/images/hero.png"
  alt="MoltLaw hero"
  fill
  sizes="(max-width: 768px) 100vw, 50vw"
  className="object-cover"
/>
```

### Code Splitting

```tsx
// Lazy load heavy components
import dynamic from 'next/dynamic'

const ResponseEditor = dynamic(
  () => import('@/components/attorney/response-editor'),
  {
    loading: () => <Skeleton className="h-64" />,
    ssr: false  // If editor doesn't work with SSR
  }
)
```

### Memoization

```tsx
// Memoize expensive computations
const expensiveValue = useMemo(
  () => computeExpensiveThing(data),
  [data]
)

// Memoize callbacks passed to children
const handleClick = useCallback(
  () => doSomething(id),
  [id]
)

// Memoize components that receive stable props
const MemoizedCard = memo(MatterCard)
```

---

## Testing

### Component Tests

```tsx
// components/ui/__tests__/button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByText('Click'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    render(<Button isLoading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### Integration Tests

```tsx
// app/portal/matters/__tests__/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { server } from '@/mocks/server'
import { rest } from 'msw'
import MattersPage from '../page'

const queryClient = new QueryClient()

function Wrapper({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('MattersPage', () => {
  it('displays matters list', async () => {
    render(<MattersPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText('Contract Review')).toBeInTheDocument()
    })
  })

  it('handles error state', async () => {
    server.use(
      rest.get('/api/matters', (req, res, ctx) => {
        return res(ctx.status(500))
      })
    )

    render(<MattersPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })
})
```

---

## Code Quality Rules

### TypeScript

```yaml
# tsconfig.json strict mode enabled
strict: true
noImplicitAny: true
strictNullChecks: true

# Avoid 'any' type
# Use 'unknown' for truly unknown types
# Define explicit return types for exported functions
```

### ESLint Rules

```yaml
# Key rules enforced
react-hooks/rules-of-hooks: error
react-hooks/exhaustive-deps: warn
@typescript-eslint/no-unused-vars: error
@typescript-eslint/no-explicit-any: warn
import/order: error
```

### Prettier

```yaml
# .prettierrc
semi: false
singleQuote: true
tabWidth: 2
trailingComma: es5
printWidth: 80
```

---

## Import Order

Imports should follow this order:
1. React/Next.js
2. Third-party libraries
3. Internal modules (lib/, types/)
4. Components
5. Styles

```tsx
// Correct import order
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

import { cn } from '@/lib/utils/cn'
import type { Matter } from '@/types/matter'

import { Button } from '@/components/ui/button'
import { MatterCard } from '@/components/portal/matter-card'
```

---

## Component Checklist

Before submitting a component, verify:

- [ ] Uses design system tokens (no hardcoded colors/spacing)
- [ ] Mobile-first responsive design
- [ ] Keyboard accessible
- [ ] Has appropriate ARIA attributes
- [ ] Handles loading state
- [ ] Handles error state
- [ ] Handles empty state
- [ ] Has TypeScript types
- [ ] Has unit tests (for UI components)
- [ ] Follows naming conventions
