'use client'

import type { Grade } from '@/types/analytics.types'
import { cn } from '@/lib/utils'

export const GRADE_STYLE: Record<Grade, string> = {
    A: 'bg-emerald-600',
    B: 'bg-brand-500',
    C: 'bg-amber-400',
    D: 'bg-orange-500',
    F: 'bg-red-500',
}
const GRADES: Grade[] = ['A', 'B', 'C', 'D', 'F']

interface DistributionBarProps {
    distribution: Record<Grade, number>
}

/** A..F grade distribution as one segmented bar with a counted legend. */
export default function DistributionBar({ distribution }: DistributionBarProps) {
    const total = GRADES.reduce((sum, g) => sum + (distribution[g] || 0), 0)
    const summary = GRADES.map((g) => `${g}: ${distribution[g] || 0}`).join(', ')
    return (
        <div>
            <div
                className="flex h-3 w-full overflow-hidden rounded-full bg-secondary"
                role="img"
                aria-label={`Grade distribution — ${summary}`}
            >
                {total > 0 &&
                    GRADES.filter((g) => (distribution[g] || 0) > 0).map((g) => (
                        <div
                            key={g}
                            className={cn('h-full', GRADE_STYLE[g])}
                            style={{ width: `${(distribution[g] / total) * 100}%` }}
                        />
                    ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground" aria-hidden>
                {GRADES.map((g) => (
                    <li key={g} className="inline-flex items-center gap-1">
                        <span className={cn('h-2 w-2 rounded-sm', GRADE_STYLE[g])} />
                        {g}
                        <span className="font-semibold text-foreground">{distribution[g] || 0}</span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
