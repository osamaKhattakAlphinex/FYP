'use client'

import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react'
import { TREND_LABELS } from '@/services/analyticsService'
import type { PerformanceTrend } from '@/types/analytics.types'
import { cn } from '@/lib/utils'

const STYLE: Record<PerformanceTrend, { icon: React.ElementType; className: string }> = {
    improving: { icon: ArrowUpRight, className: 'bg-emerald-50 text-emerald-700' },
    stable: { icon: ArrowRight, className: 'bg-secondary text-foreground' },
    declining: { icon: ArrowDownRight, className: 'bg-red-50 text-red-700' },
    insufficient_data: { icon: Minus, className: 'bg-muted text-muted-foreground' },
}

interface TrendBadgeProps {
    trend: PerformanceTrend
    /** e.g. "+15 pts" — shown after the label. */
    detail?: string
    className?: string
}

export default function TrendBadge({ trend, detail, className }: TrendBadgeProps) {
    const s = STYLE[trend] || STYLE.insufficient_data
    const Icon = s.icon
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium',
                s.className,
                className,
            )}
        >
            <Icon className="h-3 w-3" aria-hidden />
            {TREND_LABELS[trend] || trend}
            {detail && <span className="tabular-nums opacity-80">{detail}</span>}
        </span>
    )
}
