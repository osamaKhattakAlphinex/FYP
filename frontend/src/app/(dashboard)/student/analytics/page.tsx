'use client'

import { useCallback, useEffect, useState } from 'react'
import { BookOpenCheck, Clock, GraduationCap, Send, Star, Timer } from 'lucide-react'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import AnalyticsCard from '@/components/analytics/AnalyticsCard'
import StatTile from '@/components/analytics/StatTile'
import MonthsToggle from '@/components/analytics/MonthsToggle'
import MonthlyBars from '@/components/analytics/MonthlyBars'
import BarList from '@/components/analytics/BarList'
import ScoreTrend from '@/components/analytics/ScoreTrend'
import InsightCard from '@/components/analytics/InsightCard'
import SkillGrowthTable from '@/components/analytics/SkillGrowthTable'
import PaymentsAnalyticsCard from '@/components/payments/PaymentsAnalyticsCard'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { analyticsService, METRIC_LABELS, percent } from '@/services/analyticsService'
import { applicationService } from '@/services/applicationService'
import { apiErrorMessage } from '@/lib/apiError'
import type { AnalyticsMonths, StudentAnalytics } from '@/types/analytics.types'
import type { ApplicationStatus } from '@/types/application.types'

export default function StudentAnalyticsPage() {
    useRoleProtection({ allowedRoles: ['student'] })
    const [months, setMonths] = useState<AnalyticsMonths>(12)
    const [data, setData] = useState<StudentAnalytics | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            setData(await analyticsService.getMine(months))
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not load your analytics'))
        } finally {
            setLoading(false)
        }
    }, [months])

    useEffect(() => {
        load()
    }, [load])

    return (
        <AppShell>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Performance analytics</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Your progress, scores, completed internships and how your skills have developed —
                        recomputed from your latest activity every time you open this page.
                    </p>
                </div>
                <MonthsToggle value={months} onChange={setMonths} />
            </div>

            {loading && !data ? (
                <LoadingState />
            ) : error && !data ? (
                <Card className="p-6 text-center text-sm">
                    <p className="text-destructive">{error}</p>
                    <Button className="mt-3" size="sm" variant="outline" onClick={load}>
                        Try again
                    </Button>
                </Card>
            ) : data ? (
                <StudentDashboard data={data} />
            ) : null}
        </AppShell>
    )
}

function LoadingState() {
    return (
        <div className="space-y-3" aria-busy="true" aria-label="Loading analytics">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                ))}
            </div>
            <Skeleton className="h-56" />
        </div>
    )
}

function StudentDashboard({ data }: { data: StudentAnalytics }) {
    const s = data.summary
    const hoursInWindow = data.hoursByMonth.reduce((sum, m) => sum + m.hours, 0)
    const statusItems = s.applications
        ? Object.entries(s.applications.byStatus)
              .filter(([, n]) => n > 0)
              .map(([status, n]) => ({ label: applicationService.getStatusLabel(status as ApplicationStatus), value: n }))
        : []

    return (
        <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <StatTile
                    label="Internships completed"
                    value={s.internships.completed}
                    hint={`${s.internships.active} in progress · ${s.internships.total} total`}
                    icon={BookOpenCheck}
                />
                <StatTile
                    label="Average evaluation"
                    value={s.averageEvaluationScore != null ? `${s.averageEvaluationScore}` : '—'}
                    hint={
                        s.finalizedEvaluations > 0
                            ? `${s.finalizedEvaluations} finalized · latest grade ${s.latestGrade ?? '—'}`
                            : 'No finalized evaluations yet'
                    }
                    icon={GraduationCap}
                />
                <StatTile label="Hours logged" value={s.hoursLogged} hint="All internships" icon={Clock} />
                <StatTile
                    label="Feedback rating"
                    value={s.feedback.averageOverall != null ? `${s.feedback.averageOverall}★` : '—'}
                    hint={
                        s.feedback.count > 0
                            ? `${s.feedback.count} review${s.feedback.count === 1 ? '' : 's'} · ${percent(s.feedback.recommendRate)} would recommend`
                            : 'No feedback yet'
                    }
                    icon={Star}
                />
                <StatTile
                    label="Acceptance rate"
                    value={percent(s.applications?.acceptanceRate)}
                    hint={`${s.applications?.total ?? 0} applications · ${s.interviews?.completed ?? 0} interviews done`}
                    icon={Send}
                />
                <StatTile
                    label="On-time submissions"
                    value={percent(s.onTimeSubmissionRate)}
                    hint="Milestone submissions before the due date"
                    icon={Timer}
                />
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
                <InsightCard insight={data.insight} aiGenerated={data.aiGenerated} />
                <AnalyticsCard
                    title="Evaluation scores over time"
                    description="Finalized evaluations of your completed internships, with grades."
                    empty={data.scoreHistory.length === 0}
                    emptyText="Your scores appear here once a completed internship's evaluation is finalized."
                >
                    <ScoreTrend points={data.scoreHistory} />
                </AnalyticsCard>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
                <AnalyticsCard
                    title="Hours logged per month"
                    description={`Last ${data.months} months · ${Math.round(hoursInWindow * 100) / 100} h`}
                    empty={hoursInWindow === 0}
                    emptyText="Time you log on an internship shows up here month by month."
                >
                    <MonthlyBars
                        data={data.hoursByMonth}
                        series={[{ key: 'hours', label: 'Hours', className: 'bg-brand-500' }]}
                        unit="h"
                    />
                </AnalyticsCard>
                <AnalyticsCard
                    title="Average score by criterion"
                    description="Across all your finalized evaluations (0–100)."
                    empty={data.criteriaAverages.length === 0}
                    emptyText="Once an evaluation is finalized you will see where you are strongest."
                >
                    <BarList
                        max={100}
                        items={data.criteriaAverages.map((c) => ({
                            label: METRIC_LABELS[c.metric] || c.metric,
                            value: c.average,
                            display: `${c.average} · ${c.samples}×`,
                            barClassName:
                                c.average >= 80 ? 'bg-emerald-500' : c.average < 60 ? 'bg-amber-500' : 'bg-brand-500',
                        }))}
                    />
                </AnalyticsCard>
            </div>

            <AnalyticsCard
                title="Skill development"
                description="Skills from your profile and from the tasks you completed, with the scores of the internships that used them."
                empty={data.skills.length === 0}
                emptyText="Add skills to your profile and complete internships to track how they develop."
            >
                <SkillGrowthTable skills={data.skills} />
            </AnalyticsCard>

            <AnalyticsCard
                title="Applications by status"
                empty={statusItems.length === 0}
                emptyText="You have not applied to any tasks yet."
            >
                <BarList items={statusItems} />
            </AnalyticsCard>
            {/* Module 12 — money */}
            {data.earnings && <PaymentsAnalyticsCard variant="student" data={data.earnings} />}
        </>
    )
}
