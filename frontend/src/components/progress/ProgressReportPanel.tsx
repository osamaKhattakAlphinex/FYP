'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    AlertTriangle,
    Info,
    Lightbulb,
    AlertOctagon,
    RefreshCw,
    Sparkles,
    WifiOff,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ProgressRing from './ProgressRing'
import { RiskBadge } from './ProgressBadges'
import { progressService } from '@/services/progressService'
import { apiErrorMessage } from '@/lib/apiError'
import type { ProgressReport, SignalSeverity } from '@/types/progress.types'
import { cn } from '@/lib/utils'

const SEVERITY_STYLE: Record<
    SignalSeverity,
    { row: string; icon: React.ElementType; iconClass: string }
> = {
    critical: {
        row: 'border-red-200 bg-red-50',
        icon: AlertOctagon,
        iconClass: 'text-red-600',
    },
    warning: {
        row: 'border-amber-200 bg-amber-50',
        icon: AlertTriangle,
        iconClass: 'text-amber-600',
    },
    info: { row: 'border-border bg-muted', icon: Info, iconClass: 'text-muted-foreground' },
}

// The indicator keys the AI service and the fallback both emit, with the
// labels and units they should be rendered under.
const INDICATOR_LABELS: Array<{ key: string; label: string; suffix?: string }> = [
    { key: 'weighted_completion', label: 'Weighted completion', suffix: '%' },
    { key: 'completion_rate', label: 'Milestones complete', suffix: '%' },
    { key: 'hours_logged', label: 'Hours logged', suffix: 'h' },
    { key: 'estimated_hours', label: 'Hours estimated', suffix: 'h' },
    { key: 'on_time_submission_rate', label: 'On-time submissions', suffix: '%' },
    { key: 'rework_rate', label: 'Sent back for rework', suffix: '%' },
    { key: 'average_review_score', label: 'Avg. review score', suffix: '/5' },
    { key: 'open_blockers', label: 'Open blockers' },
    { key: 'overdue_milestones', label: 'Overdue milestones' },
]

function WeeklyHours({ weeks }: { weeks: Array<{ weekStart: string; hours: number }> }) {
    if (weeks.length === 0) return null
    const max = Math.max(...weeks.map((w) => w.hours), 1)

    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Effort by week
            </p>
            <div className="mt-2 space-y-1.5">
                {weeks.map((w) => (
                    <div key={w.weekStart} className="flex items-center gap-2">
                        <span className="w-16 shrink-0 text-xs text-muted-foreground">
                            {new Date(`${w.weekStart}T00:00:00`).toLocaleDateString(undefined, {
                                day: 'numeric',
                                month: 'short',
                            })}
                        </span>
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
                            <div
                                className="h-full rounded-full bg-brand-500"
                                style={{ width: `${(w.hours / max) * 100}%` }}
                            />
                        </div>
                        <span className="w-12 shrink-0 text-right text-xs font-semibold text-foreground">
                            {w.hours}h
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

interface ProgressReportPanelProps {
    progressId: string
    /** Bumped by the workspace whenever something changes, to force a refetch. */
    refreshKey?: number
}

export default function ProgressReportPanel({
    progressId,
    refreshKey = 0,
}: ProgressReportPanelProps) {
    const [report, setReport] = useState<ProgressReport | null>(null)
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            setReport(await progressService.getReport(progressId))
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not load the progress report'))
        } finally {
            setLoading(false)
        }
    }, [progressId])

    useEffect(() => {
        load()
    }, [load, refreshKey])

    if (loading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
        )
    }

    if (!report) {
        return (
            <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">
                    The report could not be loaded.
                </p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={load}>
                    <RefreshCw className="h-4 w-4" /> Try again
                </Button>
            </Card>
        )
    }

    const { insight, indicators, weeklyHours, aiGenerated, progress } = report
    const variance = insight.schedule_variance

    return (
        <div className="space-y-3">
            {/* Risk assessment ------------------------------------------------ */}
            <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-brand-600" />
                        <h3 className="text-sm font-semibold text-foreground">
                            Risk assessment
                        </h3>
                        <RiskBadge level={insight.risk_level} score={insight.risk_score} />
                    </div>
                    <Button size="xs" variant="ghost" onClick={load} aria-label="Refresh report">
                        <RefreshCw className="h-3.5 w-3.5" /> Refresh
                    </Button>
                </div>

                {!aiGenerated && (
                    <p className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        The AI service is unreachable, so this assessment was produced by the
                        platform&rsquo;s own rules. The numbers below are unaffected — they are
                        computed from your data either way.
                    </p>
                )}

                <p className="mt-3 text-sm text-foreground">{insight.summary}</p>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div className="flex items-center gap-3">
                        <ProgressRing
                            value={progress.metrics.progressPercent}
                            size={52}
                            tone={progress.healthStatus}
                        />
                        <div>
                            <p className="text-xs text-muted-foreground">Complete now</p>
                            <p className="text-sm font-semibold text-foreground">
                                {progress.metrics.completedMilestoneCount} of{' '}
                                {progress.metrics.milestoneCount} milestones
                            </p>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground">
                            Projected by the deadline
                        </p>
                        <p className="text-2xl font-bold leading-tight text-foreground">
                            {insight.projected_completion_percent}%
                        </p>
                        <p className="text-xs text-muted-foreground">at the current pace</p>
                    </div>

                    <div>
                        <p className="text-xs text-muted-foreground">Against the schedule</p>
                        <p
                            className={cn(
                                'text-2xl font-bold leading-tight',
                                variance < -10
                                    ? 'text-red-600'
                                    : variance > 10
                                      ? 'text-emerald-600'
                                      : 'text-foreground',
                            )}
                        >
                            {variance > 0 ? '+' : ''}
                            {Math.round(variance)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {variance < -10
                                ? 'points behind'
                                : variance > 10
                                  ? 'points ahead'
                                  : 'points — broadly on plan'}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Signals -------------------------------------------------------- */}
            {insight.signals.length > 0 && (
                <Card className="p-5">
                    <h3 className="text-sm font-semibold text-foreground">
                        What is driving the risk
                    </h3>
                    <ul className="mt-3 space-y-2">
                        {insight.signals.map((s) => {
                            const style = SEVERITY_STYLE[s.severity] ?? SEVERITY_STYLE.info
                            const Icon = style.icon
                            return (
                                <li
                                    key={s.code}
                                    className={cn(
                                        'flex items-start gap-2.5 rounded-md border px-3 py-2.5',
                                        style.row,
                                    )}
                                >
                                    <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', style.iconClass)} />
                                    <span className="text-sm text-foreground">{s.message}</span>
                                </li>
                            )
                        })}
                    </ul>
                </Card>
            )}

            {/* Recommendations ------------------------------------------------ */}
            {insight.recommendations.length > 0 && (
                <Card className="p-5">
                    <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Lightbulb className="h-4 w-4 text-accent-500" />
                        Suggested next steps
                    </h3>
                    <ul className="mt-3 space-y-1.5">
                        {insight.recommendations.map((r) => (
                            <li
                                key={r}
                                className="flex items-start gap-2 text-sm text-muted-foreground"
                            >
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                                {r}
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {/* Indicators ----------------------------------------------------- */}
            <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground">
                    Performance indicators
                </h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                    {INDICATOR_LABELS.filter((i) => indicators[i.key] !== undefined).map((i) => (
                        <div key={i.key}>
                            <dt className="text-xs text-muted-foreground">{i.label}</dt>
                            <dd className="text-lg font-bold leading-tight text-foreground">
                                {indicators[i.key]}
                                <span className="text-xs font-normal text-muted-foreground">
                                    {i.suffix}
                                </span>
                            </dd>
                        </div>
                    ))}
                </dl>

                {indicators.estimated_hours > 0 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                        Effort variance: {indicators.effort_variance > 0 ? '+' : ''}
                        {indicators.effort_variance}h against the estimate.
                    </p>
                )}
            </Card>

            {/* Effort chart --------------------------------------------------- */}
            {weeklyHours.length > 0 && (
                <Card className="p-5">
                    <WeeklyHours weeks={weeklyHours} />
                </Card>
            )}
        </div>
    )
}
