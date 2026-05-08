'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                default:
                    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
                accent:
                    'bg-accent-500 text-accent-foreground hover:bg-accent-600 active:bg-accent-700',
                outline:
                    'border border-brand-600 bg-transparent text-brand-600 hover:bg-brand-50 active:bg-brand-100',
                soft:
                    'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200',
                ghost:
                    'text-foreground hover:bg-muted active:bg-secondary',
                link:
                    'text-brand-600 underline-offset-4 hover:underline rounded-none',
                destructive:
                    'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                secondary:
                    'border border-border bg-card text-foreground hover:bg-muted',
            },
            size: {
                xs: 'h-7 px-3 text-xs [&_svg]:size-3.5',
                sm: 'h-8 px-3.5 text-sm [&_svg]:size-4',
                md: 'h-10 px-5 text-sm [&_svg]:size-4',
                lg: 'h-12 px-6 text-base [&_svg]:size-5',
                icon: 'h-10 w-10 [&_svg]:size-4',
                'icon-sm': 'h-8 w-8 [&_svg]:size-4',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'md',
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button'
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
