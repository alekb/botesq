# Phase 7 Reference Documentation

Quick reference for Phase 7 (Web Application Foundation) technologies, pulled from Context7.

---

## Next.js 14 App Router

### Server vs Client Components

- Components are **Server Components by default**
- Add `'use client'` directive for interactive components
- **Cannot import Server Components into Client Components** — pass as `children` prop instead

```tsx
// layout.tsx - Server Component
import { ClientComponent } from './client-component'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav>
        <ClientComponent />
      </nav>
      <main>{children}</main>
    </>
  )
}
```

### Layout Pattern

- Keep layouts as Server Components
- Import Client Components for interactivity (search bars, dropdowns, etc.)

---

## Tailwind CSS — Custom Design Tokens

Define tokens in `tailwind.config.ts` under `theme.colors` or `theme.extend.colors`.

### CSS Variables Pattern (for dynamic theming)

```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    colors: {
      primary: 'rgb(var(--color-primary))',
      background: {
        primary: '#0a0a0a',
        secondary: '#141414',
      },
    },
    extend: {
      spacing: { '128': '32rem' },
      borderRadius: { '4xl': '2rem' },
    },
  },
}
```

### Static Colors (from DESIGN_SYSTEM.md)

```typescript
module.exports = {
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#0a0a0a',
          secondary: '#141414',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a1a1a1',
        },
        primary: {
          500: '#3b82f6',
        },
        success: { 500: '#22c55e' },
        warning: { 500: '#f59e0b' },
        error: { 500: '#ef4444' },
      },
    },
  },
}
```

---

## Radix UI Primitives

### Data Attributes for Styling

- `[data-disabled]` — disabled state
- `[data-placeholder]` — placeholder shown
- `[data-state="open"]` / `[data-state="closed"]` — open/close state

### CSS Variables Exposed

- `--radix-dropdown-menu-content-transform-origin`
- `--radix-dropdown-menu-content-available-width`
- `--radix-dropdown-menu-content-available-height`
- `--radix-dropdown-menu-trigger-width`

### Abstraction Pattern

Wrap primitives in custom components:

```tsx
// components/ui/dialog.tsx
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Cross1Icon } from '@radix-ui/react-icons'

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay />
    <DialogPrimitive.Content {...props} ref={ref}>
      {children}
      <DialogPrimitive.Close aria-label="Close">
        <Cross1Icon />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
```

---

## TanStack Query (React Query) + Next.js

### Setup Pattern for App Router

Create `providers.tsx` as Client Component:

```tsx
// app/providers.tsx
'use client'

import { isServer, QueryClient, QueryClientProvider } from '@tanstack/react-query'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Avoid refetch immediately on client after SSR
        staleTime: 60 * 1000,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: reuse client to avoid re-creation during suspense
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

### Usage in Layout

```tsx
// app/layout.tsx
import Providers from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Query & Mutation Example

```tsx
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

function Todos() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: getTodos,
  })

  const mutation = useMutation({
    mutationFn: postTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })

  // ...
}
```

---

## Zustand — State Management

### Basic Store with TypeScript

```typescript
import { create } from 'zustand'

interface BearState {
  bears: number
  increase: (by: number) => void
}

export const useBearStore = create<BearState>()((set) => ({
  bears: 0,
  increase: (by) => set((state) => ({ bears: state.bears + by })),
}))
```

### With Persist + Devtools Middleware

```typescript
import { create } from 'zustand'
import { persist, devtools, createJSONStorage } from 'zustand/middleware'

interface AuthState {
  token: string | null
  setToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        token: null,
        setToken: (token) => set({ token }),
        logout: () => set({ token: null }),
      }),
      {
        name: 'auth-storage',
        storage: createJSONStorage(() => localStorage),
      }
    )
  )
)
```

### Usage in Components

```tsx
function Profile() {
  const token = useAuthStore((state) => state.token)
  const logout = useAuthStore((state) => state.logout)
  // ...
}
```

---

## shadcn/ui Components

### Installation (via CLI)

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card input dialog
```

### Component Pattern

Components are copied into `components/ui/` and are fully customizable.

```tsx
import { Button } from '@/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginCard() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Enter your credentials</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="m@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Sign In</Button>
      </CardFooter>
    </Card>
  )
}
```

### Dialog Example

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'

export function ConfirmDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Library IDs for Context7

For future lookups:

| Library           | Context7 ID                         |
| ----------------- | ----------------------------------- |
| Next.js 14        | `/vercel/next.js/v14.3.0-canary.87` |
| Radix Primitives  | `/websites/radix-ui-primitives`     |
| Tailwind CSS v3   | `/websites/v3_tailwindcss`          |
| TanStack Query v5 | `/tanstack/query/v5.60.5`           |
| Zustand           | `/websites/zustand_pmnd_rs`         |
| shadcn/ui         | `/websites/ui_shadcn`               |
