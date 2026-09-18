'use client'

import { useEffect, useState } from 'react'
import { BarChart3, WifiOff } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import TrendBadge from './TrendBadge'
import { BAND_STYLE, IndexRing } from './InsightCard'
import { analyticsService, BAND_LABELS } from '@/services/analyticsService'
import type { StudentAnalytics } from '@/types/analytics.types'
import { cn } from '@/lib/utils'

interface CandidatePerformanceCardProps {
    studentId: string
}

type State =
    | { kind: 'loading' }
    | { kind: 'ready'; data: StudentAnalytics }
    | { kind: 'hidden' }

/**
 * Module 11 — the candidate's proven track record (finalized evaluations,
 * feedback, completed internships) on the company's candidate page. Rendered
 * inside the student snapshot card. If the viewer may not see it (403) or the
 * request fails, the section simply does not appear: it is extra context, never
 * a blocker for reviewing the application.
 */
export default function CandidatePerformanceCard({ studentId }: CandidatePerformanceCardProps) {
    const [state, setState] = useState<State>({ kind: 'loading' })

    useEffect(() => {
        let cancelled = false
        analyticsService
            .getStudent(studentId, 6)
            .then((data) => !cancelled && setState({ kind: 'ready', data }))
            .catch(() => !cancelled && setState({ kind: 'hidden' }))
        return () => {
            cancelled = true
        }
    }, [studentId])

    if (state.kind === 'hidden') return null

    return (
        <>
            <Separator className="my-3" />
            <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" aria-hidden /> Track record
            </p>
            {state.kind === 'loading' ? (
                <Skeleton className="h-20 w-full" />
            ) : (
                <CandidateSummary data={state.data} />
            )}
        </>
    )
}

function CandidateSummary({ data }: { data: StudentAnalytics }) {
    const { summary, insight } = data
    if (!insight || insight.band === 'insufficient_data') {
        return (
            <p className="text-xs text-muted-foreground">
                No finalized evaluations or feedback on the platform yet
                {summary.internships.completed > 0
                    ? ` · ${summary.internships.completed} completed internship${summary.internships.completed === 1 ? '' : 's'}`
                    : ''}
                .
            </p>
        )
    }
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                <IndexRing value={insight.performance_index} band={insight.band} size={56} />
                <div className="min-w-0 space-y-1">
                    <span className={cn('inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold', BAND_STYLE[insight.band].badge)}>
                        {BAND_LABELS[insight.band]}
                    </span>
                    <div>
                        <TrendBadge trend={insight.trend} />
                    </div>
                </div>
            </div>
            <dl className="grid grid-cols-3 gap-1 text-center text-[11px]">
                <div className="rounded bg-muted/40 p-1.5">
                    <dt className="text-muted-foreground">Eval avg</dt>
                    <dd className="font-semibold text-foreground">{summary.averageEvaluationScore ?? '—'}</dd>
                </div>
                <div className="rounded bg-muted/40 p-1.5">
                    <dt className="text-muted-foreground">Feedback</dt>
                    <dd className="font-semibold text-foreground">
                        {summary.feedback.averageOverall != null ? `${summary.feedback.averageOverall}★` : '—'}
                    </dd>
                </div>
                <div className="rounded bg-muted/40 p-1.5">
                    <dt className="text-muted-foreground">Completed</dt>
                    <dd className="font-semibold text-foreground">{summary.internships.completed}</dd>
                </div>
            </dl>
            {insight.insights[0] && <p className="text-[11px] text-muted-foreground">{insight.insights[0]}</p>}
            {!data.aiGenerated && (
                <p className="flex items-center gap-1 text-[10px] text-amber-700">
                    <WifiOff className="h-3 w-3" aria-hidden /> Computed by the platform&rsquo;s own rules (AI unreachable)
                </p>
            )}
        </div>
    )
}
