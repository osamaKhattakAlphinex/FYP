'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ListChecks } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ProgressRing from './ProgressRing'
import { HealthBadge, StatusBadge } from './ProgressBadges'
import { progressService } from '@/services/progressService'
import type { InternshipProgress, ProgressPerspective } from '@/types/progress.types'

interface InternshipProgressLinkProps {
    applicationId: string
    perspective: ProgressPerspective
    /** Only render for an accepted application — progress does not exist before that. */
    applicationStatus?: string
}

/**
 * Bridges an application to its Module 8 internship record.
 *
 * The progress row is created on acceptance, but this endpoint also back-fills
 * it, so an application accepted before Module 8 shipped still resolves. The
 * card stays silent on any failure rather than showing an error on a page whose
 * primary subject is the application, not the progress.
 */
export default function InternshipProgressLink({
    applicationId,
    perspective,
    applicationStatus,
}: InternshipProgressLinkProps) {
    const [progress, setProgress] = useState<InternshipProgress | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (applicationStatus && applicationStatus !== 'accepted') {
            setLoading(false)
            return
        }

        let cancelled = false
        progressService
            .getForApplication(applicationId)
            .then((p) => {
                if (!cancelled) setProgress(p)
            })
            .catch(() => {
                if (!cancelled) setProgress(null)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [applicationId, applicationStatus])

    if (applicationStatus && applicationStatus !== 'accepted') return null
    if (loading) return <Skeleton className="h-28 w-full" />
    if (!progress) return null

    const href =
        perspective === 'company'
            ? `/company/progress/${progress.id}`
            : perspective === 'mentor'
              ? `/mentor/progress/${progress.id}`
              : `/student/internships/${progress.id}`

    const live = progress.status === 'in_progress' || progress.status === 'not_started'

    return (
        <Card className="p-4">
            <div className="flex items-center gap-4">
                <ProgressRing
                    value={progress.metrics.progressPercent}
                    size={54}
                    tone={live ? progress.healthStatus : 'brand'}
                />

                <div className="min-w-0 flex-1">
                    <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <ListChecks className="h-4 w-4" /> Internship progress
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={progress.status} />
                        <HealthBadge
                            health={progress.healthStatus}
                            status={progress.status}
                        />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                        {progress.metrics.completedMilestoneCount} of{' '}
                        {progress.metrics.milestoneCount} milestones ·{' '}
                        {progress.metrics.totalHoursLogged}h logged
                    </p>
                </div>

                <Button asChild size="sm" variant="secondary">
                    <Link href={href}>
                        Open <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </div>
        </Card>
    )
}
