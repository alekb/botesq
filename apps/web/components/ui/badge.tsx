import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-background-tertiary text-text-secondary',
        primary: 'bg-primary-500/20 text-primary-400',
        secondary: 'bg-background-elevated text-text-secondary',
        success: 'bg-success-500/20 text-success-500',
        warning: 'bg-warning-500/20 text-warning-500',
        error: 'bg-error-500/20 text-error-500',
        outline: 'border border-border-default text-text-secondary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
