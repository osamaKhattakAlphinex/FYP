'use client'

import { useCallback, useEffect, useState } from 'react'
import { Briefcase, CalendarCheck, GraduationCap, Hourglass, Send, Trophy, WifiOff } from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import AnalyticsCard from '@/components/analytics/AnalyticsCard'
import StatTile from '@/components/analytics/StatTile'
import MonthsToggle from '@/components/analytics/MonthsToggle'
import MonthlyBars from '@/components/analytics/MonthlyBars'
import BarList from '@/components/analytics/BarList'
import Funnel from '@/components/analytics/Funnel'
import DistributionBar from '@/components/analytics/DistributionBar'
import TopPerformersTable from '@/components/analytics/TopPerformersTable'
import PaymentsAnalyticsCard from '@/components/payments/PaymentsAnalyticsCard'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { analyticsService, percent } from '@/services/analyticsService'
import { progressService } from '@/services/progressService'
import { apiErrorMessage } from '@/lib/apiError'
import type {
    AnalyticsMonths,
    CompanyAnalytics,
    TopPerformerScope,
    TopPerformersResponse,
} from '@/types/analytics.types'
import type { HealthStatus } from '@/types/progress.types'
import { cn } from '@/lib/utils'

const HEALTH_BAR: Record<string, string> = {
    on_track: 'bg-emerald-500',
    at_risk: 'bg-amber-500',
    overdue: 'bg-red-500',
}

export default function CompanyAnalyticsPage() {
    useRoleProtection({ allowedRoles: ['company'] })
    const [months, setMonths] = useState<AnalyticsMonths>(12)
    const [data, setData] = useState<CompanyAnalytics | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            setData(await analyticsService.getCompany(months))
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not load analytics'))
        } finally {
            setLoading(false)
        }
    }, [months])

    useEffect(() => {
        load()
    }, [load])

    return (
        <AppShell maxWidth="wide">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Analytics</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Your hiring pipeline, how your interns performed, and who the proven performers are.
                    </p>
                </div>
                <MonthsToggle value={months} onChange={setMonths} />
            </div>

            {loading && !data ? (
                <div className="space-y-3" aria-busy="true" aria-label="Loading analytics">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-20" />
                        ))}
                    </div>
                    <Skeleton className="h-64" />
                </div>
            ) : error && !data ? (
                <Card className="p-6 text-center text-sm">
                    <p className="text-destructive">{error}</p>
                    <Button className="mt-3" size="sm" variant="outline" onClick={load}>
                        Try again
                    </Button>
                </Card>
            ) : data ? (
                <CompanyDashboard data={data} />
            ) : null}
        </AppShell>
    )
}

function CompanyDashboard({ data }: { data: CompanyAnalytics }) {
    const s = data.summary
    const live = s.internships.byHealth
    const liveTotal = Object.values(live).reduce((a, b) => a + b, 0)
    const monthlyTotal = data.monthly.reduce((sum, m) => sum + m.applications + m.acceptances + m.completions, 0)

    return (
        <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <StatTile
                    label="Active tasks"
                    value={s.tasks.byStatus.active ?? 0}
                    hint={`${s.tasks.total} tasks in total`}
                    icon={Briefcase}
                />
                <StatTile label="Applications" value={s.applications.total} icon={Send} />
                <StatTile
                    label="Conversion"
                    value={percent(s.conversionRate)}
                    hint="Applications accepted"
                    icon={Trophy}
                />
                <StatTile
                    label="Days to decision"
                    value={s.avgDaysToDecision ?? '—'}
                    hint="Average, accept or reject"
                    icon={Hourglass}
                />
                <StatTile
                    label="Internships completed"
                    value={s.internships.byStatus.completed ?? 0}
                    hint={`${liveTotal} live now`}
                    icon={CalendarCheck}
                />
                <StatTile
                    label="Average evaluation"
                    value={s.evaluations.averageScore ?? '—'}
                    hint={`${s.evaluations.finalized} finalized · ${s.evaluations.drafts} draft`}
                    icon={GraduationCap}
                />
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
                <AnalyticsCard
                    title="Hiring funnel"
                    description="Applications that reached each stage, and their share of all applications."
                    empty={s.applications.total === 0}
                    emptyText="Once students apply to your tasks, the pipeline appears here."
                >
                    <Funnel stages={s.funnel} />
                    <p className="mt-3 text-[11px] text-muted-foreground">
                        Interviews: {s.interviews.total} scheduled · {s.interviews.completed} completed ·{' '}
                        {s.interviews.no_show} no-show
                    </p>
                </AnalyticsCard>
                <AnalyticsCard
                    title="Activity by month"
                    description={`Last ${data.months} months`}
                    empty={monthlyTotal === 0}
                    emptyText="Applications, acceptances and completed internships will be charted here."
                >
                    <MonthlyBars
                        data={data.monthly}
                        series={[
                            { key: 'applications', label: 'Applications', className: 'bg-brand-300' },
                            { key: 'acceptances', label: 'Accepted', className: 'bg-brand-600' },
                            { key: 'completions', label: 'Completed', className: 'bg-emerald-500' },
                        ]}
                    />
                </AnalyticsCard>
            </div>

            <TopPerformersCard initial={data.topPerformers} aiGenerated={data.aiGenerated} />

            <div className="grid gap-3 lg:grid-cols-2">
                <AnalyticsCard
                    title="Live internships"
                    description={
                        s.internships.averageProgress != null
                            ? `Average completion ${s.internships.averageProgress}%`
                            : 'Health of the internships still under way'
                    }
                    empty={liveTotal === 0}
                    emptyText="No internships are running right now."
                >
                    <BarList
                        max={liveTotal}
                        items={Object.entries(live).map(([health, n]) => ({
                            label: progressService.getHealthLabel(health as HealthStatus),
                            value: n,
                            barClassName: HEALTH_BAR[health],
                        }))}
                    />
                </AnalyticsCard>
                <AnalyticsCard
                    title="Evaluation grades"
                    description={
                        s.feedbackGiven.count > 0
                            ? `You have given ${s.feedbackGiven.count} feedback record${s.feedbackGiven.count === 1 ? '' : 's'} · average ${s.feedbackGiven.averageOverall}★`
                            : 'Finalized evaluations of your interns'
                    }
                    empty={s.evaluations.finalized === 0}
                    emptyText="Grades appear once you finalize the evaluation of a completed internship."
                >
                    <DistributionBar distribution={s.evaluations.gradeDistribution} />
                </AnalyticsCard>
            </div>

            <AnalyticsCard
                title="By task"
                empty={data.tasks.length === 0}
                emptyText="Post a task to start collecting analytics."
            >
                <div className="-mx-4 overflow-x-auto px-4">
                    <table className="w-full min-w-[520px] text-left text-xs">
                        <thead>
                            <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                                <th scope="col" className="py-2 pr-2 font-semibold">Task</th>
                                <th scope="col" className="py-2 pr-2 font-semibold">Status</th>
                                <th scope="col" className="py-2 pr-2 text-right font-semibold">Applications</th>
                                <th scope="col" className="py-2 pr-2 text-right font-semibold">Accepted</th>
                                <th scope="col" className="py-2 pr-2 text-right font-semibold">Completed</th>
                                <th scope="col" className="py-2 text-right font-semibold">Avg score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.tasks.map((t) => (
                                <tr key={t.taskId} className="border-b border-border/60 last:border-0">
                                    <th scope="row" className="max-w-[220px] truncate py-2 pr-2 font-medium text-foreground">
                                        {t.title}
                                    </th>
                                    <td className="py-2 pr-2 capitalize text-muted-foreground">{t.status}</td>
                                    <td className="py-2 pr-2 text-right tabular-nums">{t.applications}</td>
                                    <td className="py-2 pr-2 text-right tabular-nums">{t.accepted}</td>
                                    <td className="py-2 pr-2 text-right tabular-nums">{t.completedInternships}</td>
                                    <td className="py-2 text-right tabular-nums">{t.averageEvaluationScore ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </AnalyticsCard>
            {/* Module 12 — money */}
            {data.spend && <PaymentsAnalyticsCard variant="company" data={data.spend} />}
        </>
    )
}

const SCOPES: Array<{ value: TopPerformerScope; label: string; hint: string }> = [
    { value: 'interns', label: 'Your interns', hint: 'Ranked on their record with you' },
    { value: 'applicants', label: 'Applicants', hint: 'Ranked on their record across the platform' },
]

function TopPerformersCard({
    initial,
    aiGenerated,
}: {
    initial: CompanyAnalytics['topPerformers']
    aiGenerated: boolean
}) {
    const [scope, setScope] = useState<TopPerformerScope>('interns')
    const [result, setResult] = useState<TopPerformersResponse | null>(null)
    const [loading, setLoading] = useState(false)

    const choose = async (next: TopPerformerScope) => {
        setScope(next)
        try {
            setLoading(true)
            setResult(await analyticsService.getTopPerformers(next, 10))
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not load the ranking'))
        } finally {
            setLoading(false)
        }
    }

    const rows = result ? result.rankings : initial
    const ai = result ? result.aiGenerated : aiGenerated
    const hint = SCOPES.find((x) => x.value === scope)?.hint

    return (
        <AnalyticsCard
            title="Top performers"
            description={`${hint}. Only finalized evaluations and feedback count.${result && result.unrated > 0 ? ` ${result.unrated} without enough data are not ranked.` : ''}`}
            action={
                <div role="group" aria-label="Who to rank" className="inline-flex shrink-0 rounded-md border border-border p-0.5">
                    {SCOPES.map((x) => (
                        <button
                            key={x.value}
                            type="button"
                            aria-pressed={scope === x.value}
                            onClick={() => choose(x.value)}
                            className={cn(
                                'rounded px-2 py-1 text-[11px] font-medium',
                                scope === x.value ? 'bg-brand-600 text-white' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {x.label}
                        </button>
                    ))}
                </div>
            }
        >
            {loading ? (
                <Skeleton className="h-32" />
            ) : rows.length === 0 ? (
                <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
                    {scope === 'interns'
                        ? 'Rankings appear once an intern has a finalized evaluation or feedback from you.'
                        : 'None of your applicants has a finalized evaluation or feedback on the platform yet.'}
                </p>
            ) : (
                <TopPerformersTable rows={rows} />
            )}
            {!ai && rows.length > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700">
                    <WifiOff className="h-3 w-3" aria-hidden /> The AI service is unreachable, so the platform&rsquo;s
                    own rules ranked these students. The ranking is the same either way.
                </p>
            )}
        </AnalyticsCard>
    )
}
