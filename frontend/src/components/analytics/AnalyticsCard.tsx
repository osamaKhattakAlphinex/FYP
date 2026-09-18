'use client'

import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface AnalyticsCardProps {
    title: string
    description?: string
    action?: ReactNode
    /** When true the children are replaced by `emptyText`. */
    empty?: boolean
    emptyText?: string
    className?: string
    children?: ReactNode
}

/**
 * The frame every analytics chart sits in. The empty state is part of the
 * frame so a brand-new account still sees a deliberate layout with a sentence
 * explaining what will appear, rather than a blank box.
 */
export default function AnalyticsCard({
    title,
    description,
    action,
    empty = false,
    emptyText = 'Nothing recorded yet.',
    className,
    children,
}: AnalyticsCardProps) {
    return (
        <Card className={cn('p-4', className)}>
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                    {description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                    )}
                </div>
                {action}
            </div>
            {empty ? (
                <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
                    {emptyText}
                </p>
            ) : (
                children
            )}
        </Card>
    )
}
