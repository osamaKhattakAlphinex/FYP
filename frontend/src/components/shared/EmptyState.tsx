'use client'

import { LucideIcon, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    ctaLabel?: string
    onCtaClick?: () => void
}

export default function EmptyState({
    icon: Icon,
    title,
    description,
    ctaLabel,
    onCtaClick,
}: EmptyStateProps) {
    return (
        <div className="py-10 px-6 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-border bg-muted text-muted-foreground">
                <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
            <p className="mx-auto mt-1.5 max-w-[280px] text-xs text-muted-foreground">
                {description}
            </p>
            {ctaLabel && onCtaClick && (
                <Button onClick={onCtaClick} variant="soft" size="sm" className="mt-4">
                    <Plus className="h-3.5 w-3.5" />
                    {ctaLabel}
                </Button>
            )}
        </div>
    )
}
