'use client'

import { FUNNEL_LABELS, percent } from '@/services/analyticsService'
import type { FunnelStage } from '@/types/analytics.types'

interface FunnelProps {
    stages: FunnelStage[]
}

/**
 * Hiring funnel: how many applications reached each stage. The bars are
 * centred and shrink with the count, so the drop-off reads at a glance; the
 * count and share of all applications are text beside each bar.
 */
export default function Funnel({ stages }: FunnelProps) {
    const top = stages[0]?.count || 0
    return (
        <ol className="space-y-1.5">
            {stages.map((s) => {
                const width = top > 0 ? Math.max(4, (s.count / top) * 100) : 4
                return (
                    <li
                        key={s.stage}
                        className="grid grid-cols-[84px_minmax(0,1fr)_68px] items-center gap-2 text-xs sm:grid-cols-[110px_minmax(0,1fr)_76px]"
                    >
                        <span className="truncate text-muted-foreground">
                            {FUNNEL_LABELS[s.stage] || s.stage}
                        </span>
                        <div className="flex h-6 justify-center rounded bg-secondary/60" aria-hidden>
                            <div
                                className="h-full rounded bg-brand-500 transition-all duration-500"
                                style={{ width: `${width}%` }}
                            />
                        </div>
                        <span className="text-right tabular-nums">
                            <span className="font-semibold text-foreground">{s.count}</span>{' '}
                            <span className="text-muted-foreground">{percent(s.rate)}</span>
                        </span>
                    </li>
                )
            })}
        </ol>
    )
}
