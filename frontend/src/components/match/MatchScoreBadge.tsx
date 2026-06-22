'use client'

import { Star } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface MatchScoreBadgeProps {
    score: number
    reasons?: string[]
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const tierClasses = (score: number) => {
    if (score >= 80) return 'bg-success/15 text-success'
    if (score >= 60) return 'bg-emerald-100 text-emerald-700'
    if (score >= 40) return 'bg-amber-100 text-amber-700'
    if (score >= 1) return 'bg-destructive/10 text-destructive'
    return 'bg-muted text-muted-foreground'
}

const sizeClasses = (size: 'sm' | 'md' | 'lg') => {
    if (size === 'sm') return 'px-1.5 py-0.5 text-[10px]'
    if (size === 'lg') return 'px-2.5 py-1 text-sm'
    return 'px-2 py-0.5 text-xs'
}

const iconSize = (size: 'sm' | 'md' | 'lg') => {
    if (size === 'sm') return 'h-2.5 w-2.5'
    if (size === 'lg') return 'h-4 w-4'
    return 'h-3 w-3'
}

export default function MatchScoreBadge({
    score,
    reasons,
    size = 'md',
    className,
}: MatchScoreBadgeProps) {
    const clamped = Math.max(0, Math.min(100, Math.round(score)))
    const topReasons = (reasons ?? []).slice(0, 3)

    const badge = (
        <span
            role="img"
            aria-label={`AI match score ${clamped} out of 100`}
            className={cn(
                'inline-flex items-center gap-1 rounded-full font-semibold',
                tierClasses(clamped),
                sizeClasses(size),
                className,
            )}
        >
            <Star className={cn('fill-current', iconSize(size))} aria-hidden="true" />
            <span>{clamped}</span>
        </span>
    )

    if (topReasons.length === 0) {
        return badge
    }

    return (
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>
                    {/* Wrapping button keeps the badge keyboard-focusable for tooltip on focus */}
                    <button
                        type="button"
                        aria-label={`AI match score ${clamped} out of 100. ${topReasons.length} reason${topReasons.length === 1 ? '' : 's'}.`}
                        className="inline-flex appearance-none rounded-full bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {badge}
                    </button>
                </TooltipTrigger>
                <TooltipContent sideOffset={6} className="max-w-xs">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider opacity-70">
                        Why this match
                    </p>
                    <ul className="space-y-0.5 text-xs">
                        {topReasons.map((reason, i) => (
                            <li key={i} className="flex gap-1">
                                <span className="opacity-70">•</span>
                                <span>{reason}</span>
                            </li>
                        ))}
                    </ul>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
