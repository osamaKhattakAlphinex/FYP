'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, ListChecks } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ProgressRing from './ProgressRing'
import { HealthBadge } from './ProgressBadges'
import { progressService } from '@/services/progressService'
import type { InternshipProgress, ProgressPerspective } from '@/types/progress.types'
import { cn } from '@/lib/utils'

interface ActiveInternshipsCardProps {
    perspective: Exclude<ProgressPerspective, 'admin'>
    limit?: number
}

/**
 * Dashboard card for live internships. Because the list endpoint already sorts
 * overdue first, then at-risk, the top few rows here are exactly the ones that
 * need someone to act — which is the point of the module.
 */
export default function ActiveInternshipsCard({
    perspective,
    limit = 3,
}: ActiveInternshipsCardProps) {
    const [records, setRecords] = useState<InternshipProgress[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)

    const listHref =
        perspective === 'company'
            ? '/company/progress'
            : perspective === 'mentor'
              ? '/mentor/progress'
              : '/student/internships'

    const detailHref = (p: InternshipProgress) =>
        perspective === 'company'
            ? `/company/progress/${p.id}`
            : perspective === 'mentor'
              ? `/mentor/progress/${p.id}`
              : `/student/internships/${p.id}`

    useEffect(() => {
        const fetcher =
            perspective === 'company'
                ? progressService.getCompanyProgress
                : perspective === 'mentor'
                  ? progressService.getMentorProgress
                  : progressService.getStudentProgress

        let cancelled = false
        fetcher('active', 1, limit)
            .then((res) => {
                if (cancelled) return
                setRecords(res.records)
                setTotal(res.pagination.totalRecords)
            })
            // A dashboard card must never break the dashboard.
            .catch(() => {
                if (!cancelled) setRecords([])
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [perspective, limit])

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Internships in progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (records.length === 0) return null

    const needsAttention = records.filter((r) => r.healthStatus !== 'on_track').length

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="inline-flex items-center gap-2 text-base">
                    <ListChecks className="h-4 w-4 text-brand-600" />
                    {perspective === 'student'
                        ? 'My internships'
                        : perspective === 'mentor'
                          ? 'Mentee progress'
                          : 'Internships in progress'}
                </CardTitle>
                <Button asChild variant="ghost" size="xs">
                    <Link href={listHref}>
                        View all{total > records.length ? ` (${total})` : ''}
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </CardHeader>

            <CardContent className="space-y-2">
                {needsAttention > 0 && (
                    <p className="flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        {needsAttention} of these need attention.
                    </p>
                )}

                {records.map((r) => (
                    <Link
                        key={r.id}
                        href={detailHref(r)}
                        className="flex items-center gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted"
                    >
                        <ProgressRing value={r.metrics.progressPercent} size={42} tone={r.healthStatus} />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                                {r.task?.title || 'Untitled task'}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <HealthBadge health={r.healthStatus} status={r.status} />
                                <span
                                    className={cn(
                                        'text-xs',
                                        r.schedule.daysRemaining != null &&
                                            r.schedule.daysRemaining < 0
                                            ? 'font-semibold text-red-600'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {r.schedule.daysRemaining == null
                                        ? `${r.metrics.completedMilestoneCount}/${r.metrics.milestoneCount} milestones`
                                        : r.schedule.daysRemaining < 0
                                          ? `${Math.abs(r.schedule.daysRemaining)}d overdue`
                                          : `${r.schedule.daysRemaining}d left`}
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </CardContent>
        </Card>
    )
}
