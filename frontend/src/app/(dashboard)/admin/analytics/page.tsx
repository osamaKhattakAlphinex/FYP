'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, Briefcase, Building2, GraduationCap, Send, Users } from 'lucide-react'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import AnalyticsCard from '@/components/analytics/AnalyticsCard'
import PaymentsAnalyticsCard from '@/components/payments/PaymentsAnalyticsCard'
import StatTile from '@/components/analytics/StatTile'
import MonthsToggle from '@/components/analytics/MonthsToggle'
import MonthlyBars from '@/components/analytics/MonthlyBars'
import BarList from '@/components/analytics/BarList'
import DistributionBar from '@/components/analytics/DistributionBar'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { analyticsService, percent } from '@/services/analyticsService'
import { applicationService } from '@/services/applicationService'
import { progressService } from '@/services/progressService'
import { apiErrorMessage } from '@/lib/apiError'
import type { AdminAnalytics, AnalyticsMonths } from '@/types/analytics.types'
import type { ApplicationStatus } from '@/types/application.types'
import type { HealthStatus, ProgressStatus } from '@/types/progress.types'
import { cn } from '@/lib/utils'

const label = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
const entries = (counts: Record<string, number>, name: (k: string) => string = label) =>
    Object.entries(counts).map(([k, v]) => ({ label: name(k), value: v }))

export default function AdminAnalyticsPage() {
    useRoleProtection({ allowedRoles: ['admin'] })
    const [months, setMonths] = useState<AnalyticsMonths>(12)
    const [data, setData] = useState<AdminAnalytics | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            setData(await analyticsService.getAdmin(months))
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not load platform analytics'))
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
                    <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Platform analytics</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Growth and overall system health, computed live from platform records.
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
                <AdminDashboard data={data} />
            ) : null}
        </AppShell>
    )
}

function AdminDashboard({ data }: { data: AdminAnalytics }) {
    const newUsers = data.users.newByMonth.reduce((a, m) => a + m.users, 0)
    const monthlyApps = data.applications.monthly.reduce((a, m) => a + m.applications + m.acceptances + m.completions, 0)
    const liveTotal = Object.values(data.internships.byHealth).reduce((a, b) => a + b, 0)
    const ai = data.aiHealth

    return (
        <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <StatTile label="Users" value={data.users.total} hint={`${newUsers} joined in ${data.months} months`} icon={Users} />
                <StatTile label="Companies" value={data.companies.total} icon={Building2} />
                <StatTile label="Tasks" value={data.tasks.total} hint={`${data.tasks.byStatus.active ?? 0} active`} icon={Briefcase} />
                <StatTile
                    label="Applications"
                    value={data.applications.total}
                    hint={`${data.applications.byStatus.accepted ?? 0} accepted`}
                    icon={Send}
                />
                <StatTile
                    label="Internships completed"
                    value={data.internships.byStatus.completed ?? 0}
                    hint={`${data.internships.totalHoursLogged} h logged`}
                    icon={GraduationCap}
                />
                <StatTile
                    label="Average evaluation"
                    value={data.evaluations.averageScore ?? '—'}
                    hint={`${data.evaluations.finalized} finalized of ${data.evaluations.total}`}
                    icon={Activity}
                />
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
                <AnalyticsCard
                    title="New users per month"
                    empty={newUsers === 0}
                    emptyText={`No sign-ups in the last ${data.months} months.`}
                >
                    <MonthlyBars data={data.users.newByMonth} series={[{ key: 'users', label: 'New users', className: 'bg-brand-500' }]} />
                </AnalyticsCard>
                <AnalyticsCard
                    title="Marketplace activity per month"
                    empty={monthlyApps === 0}
                    emptyText={`No applications in the last ${data.months} months.`}
                >
                    <MonthlyBars
                        data={data.applications.monthly}
                        series={[
                            { key: 'applications', label: 'Applications', className: 'bg-brand-300' },
                            { key: 'acceptances', label: 'Accepted', className: 'bg-brand-600' },
                            { key: 'completions', label: 'Completed', className: 'bg-emerald-500' },
                        ]}
                    />
                </AnalyticsCard>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <AnalyticsCard title="Users by role" empty={data.users.total === 0} emptyText="No users yet.">
                    <BarList items={entries(data.users.byRole)} />
                    <p className="mt-3 text-[11px] text-muted-foreground">
                        Mentors: {data.mentors.byVerificationStatus.approved ?? 0} approved ·{' '}
                        {data.mentors.byVerificationStatus.pending ?? 0} pending ·{' '}
                        {data.mentors.byVerificationStatus.rejected ?? 0} rejected
                    </p>
                </AnalyticsCard>
                <AnalyticsCard title="Tasks by category" description="Top 8" empty={data.tasks.byCategory.length === 0} emptyText="No tasks posted yet.">
                    <BarList items={data.tasks.byCategory.map((c) => ({ label: c.category, value: c.count }))} />
                </AnalyticsCard>
                <AnalyticsCard title="Applications by status" empty={data.applications.total === 0} emptyText="No applications yet.">
                    <BarList
                        items={entries(data.applications.byStatus, (k) => applicationService.getStatusLabel(k as ApplicationStatus))}
                    />
                </AnalyticsCard>
                <AnalyticsCard
                    title="Internships"
                    description={
                        data.internships.averageProgress != null
                            ? `Live internships average ${data.internships.averageProgress}% complete`
                            : undefined
                    }
                    empty={Object.values(data.internships.byStatus).every((n) => n === 0)}
                    emptyText="No internships have started yet."
                >
                    <BarList
                        items={entries(data.internships.byStatus, (k) => progressService.getStatusLabel(k as ProgressStatus))}
                    />
                    {liveTotal > 0 && (
                        <p className="mt-3 text-[11px] text-muted-foreground">
                            Health of live internships:{' '}
                            {Object.entries(data.internships.byHealth)
                                .map(([k, n]) => `${progressService.getHealthLabel(k as HealthStatus)} ${n}`)
                                .join(' · ')}
                        </p>
                    )}
                </AnalyticsCard>
                <AnalyticsCard
                    title="Evaluations"
                    description={`${percent(data.evaluations.aiGeneratedShare)} scored by the AI service (the rest by fallback rules)`}
                    empty={data.evaluations.finalized === 0}
                    emptyText="No evaluations have been finalized yet."
                >
                    <DistributionBar distribution={data.evaluations.gradeDistribution} />
                    <p className="mt-3 text-[11px] text-muted-foreground">
                        Feedback: {data.feedback.total} records ({data.feedback.byContext.internship ?? 0} internship ·{' '}
                        {data.feedback.byContext.interview ?? 0} interview)
                        {data.feedback.averageOverall != null && ` · average ${data.feedback.averageOverall}★`}
                    </p>
                </AnalyticsCard>
                <AnalyticsCard
                    title="Top companies"
                    description="By internships completed"
                    empty={data.topCompanies.length === 0}
                    emptyText="No internships have been completed yet."
                >
                    <BarList
                        items={data.topCompanies.map((c) => ({
                            label: c.companyName || `Company #${c.companyId}`,
                            value: c.completedInternships,
                        }))}
                    />
                </AnalyticsCard>
            </div>

            <AnalyticsCard title="AI service health" description="From the backend's recent calls to the AI service.">
                {ai ? (
                    <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                        <div>
                            <dt className="text-muted-foreground">Status</dt>
                            <dd className={cn('font-semibold', ai.reachable ? 'text-emerald-700' : 'text-amber-700')}>
                                {ai.reachable ? 'Reachable' : 'Not reached recently'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">p95 latency (1 min)</dt>
                            <dd className="font-semibold text-foreground">{ai.p95LatencyMs} ms</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Errors (1 min)</dt>
                            <dd className="font-semibold text-foreground">{ai.errorRatePerMin}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">Last success</dt>
                            <dd className="font-semibold text-foreground">
                                {ai.lastSuccessAt ? new Date(ai.lastSuccessAt).toLocaleString() : '—'}
                            </dd>
                        </div>
                    </dl>
                ) : (
                    <p className="text-xs text-muted-foreground">No AI calls recorded since the server started.</p>
                )}
            </AnalyticsCard>
            {/* Module 12 — money */}
            {data.payments && <PaymentsAnalyticsCard variant="admin" data={data.payments} />}
        </>
    )
}
