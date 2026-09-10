import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
    {
        variants: {
            variant: {
                default:
                    'border-transparent bg-brand-600 text-white',
                accent:
                    'border-transparent bg-accent-500 text-accent-foreground',
                soft:
                    'border-transparent bg-brand-50 text-brand-700',
                outline:
                    'border-border text-foreground',
                muted:
                    'border-transparent bg-muted text-muted-foreground',
                success:
                    'border-transparent bg-success/10 text-success',
                warning:
                    'border-transparent bg-warning/10 text-warning',
                destructive:
                    'border-transparent bg-destructive/10 text-destructive',
            },
        },
        defaultVariants: { variant: 'default' },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
        VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
