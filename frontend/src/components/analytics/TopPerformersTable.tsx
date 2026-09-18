'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import TrendBadge from './TrendBadge'
import { BAND_STYLE } from './InsightCard'
import { BAND_LABELS } from '@/services/analyticsService'
import type { TopPerformer } from '@/types/analytics.types'
import { cn, getInitials } from '@/lib/utils'

interface TopPerformersTableProps {
    rows: TopPerformer[]
}

const name = (r: TopPerformer) => [r.student.firstName, r.student.lastName].filter(Boolean).join(' ') || 'Student'

/**
 * Ranked students with the evidence behind each rank. On a phone it becomes
 * a stacked list (the table would need eight columns).
 */
export default function TopPerformersTable({ rows }: TopPerformersTableProps) {
    return (
        <ol className="divide-y divide-border">
            {rows.map((r) => (
                <li key={r.student.id} className="flex flex-wrap items-center gap-3 py-2.5 sm:flex-nowrap">
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-muted-foreground">{r.rank}</span>
                    <Avatar className="h-8 w-8 shrink-0">
                        {r.student.profilePicture && <AvatarImage src={r.student.profilePicture} alt="" />}
                        <AvatarFallback className="text-[11px]">{getInitials(name(r))}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{name(r)}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                            {r.evaluationCount} evaluation{r.evaluationCount === 1 ? '' : 's'}
                            {r.averageEvaluationScore != null && ` · avg ${r.averageEvaluationScore}`}
                            {r.feedbackAverage != null && ` · ${r.feedbackAverage}★ feedback`}
                            {` · ${r.completedInternships} completed`}
                        </p>
                        {r.strengths.length > 0 && (
                            <p className="truncate text-[11px] text-emerald-700">{r.strengths.join(' · ')}</p>
                        )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2 pl-8 sm:pl-0">
                        <TrendBadge trend={r.trend} />
                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', BAND_STYLE[r.band].badge)}>
                            {BAND_LABELS[r.band]}
                        </span>
                        <span
                            className="w-10 text-right text-base font-bold tabular-nums text-foreground"
                            aria-label={`Performance index ${r.performanceIndex}`}
                        >
                            {Math.round(r.performanceIndex)}
                        </span>
                    </div>
                </li>
            ))}
        </ol>
    )
}
