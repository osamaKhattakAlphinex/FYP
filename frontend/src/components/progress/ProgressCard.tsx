'use client'

import Link from 'next/link'
import { AlertOctagon, Building2, CalendarClock, Clock3, Flag, User2 } from 'lucide-react'

import { Card } from '@/components/ui/card'
import ProgressRing from './ProgressRing'
import { HealthBadge, StatusBadge } from './ProgressBadges'
import type { InternshipProgress, ProgressPerspective } from '@/types/progress.types'
import { cn } from '@/lib/utils'

const formatDate = (iso?: string | null) =>
    !iso
        ? null
        : new Date(iso).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
          })

/** A student looks at the company; everyone else looks at the student. */
const counterparty = (p: InternshipProgress, perspective: ProgressPerspective) => {
    if (perspective === 'student') {
        return {
            icon: Building2,
            label: p.company?.companyName || 'Company',
        }
    }
    return {
        icon: User2,
        label:
            [p.student?.firstName, p.student?.lastName].filter(Boolean).join(' ') ||
            'Student',
    }
}

interface ProgressCardProps {
    progress: InternshipProgress
    perspective: ProgressPerspective
    href: string
    actions?: React.ReactNode
}

export default function ProgressCard({
    progress,
    perspective,
    href,
    actions,
}: ProgressCardProps) {
    const other = counterparty(progress, perspective)
    const OtherIcon = other.icon
    const { metrics, schedule } = progress
    const live = progress.status === 'in_progress' || progress.status === 'not_started'

    const deadline =
        schedule.daysRemaining == null
            ? null
            : schedule.daysRemaining < 0
              ? `${Math.abs(schedule.daysRemaining)}d overdue`
              : `${schedule.daysRemaining}d left`

    return (
        <Link href={href} className="block">
            <Card className="p-4 transition-shadow hover:shadow-card-hover">
                <div className="flex items-start gap-4">
                    <ProgressRing
                        value={metrics.progressPercent}
                        size={58}
                        tone={live ? progress.healthStatus : 'brand'}
                    />

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-foreground">
                                {progress.task?.title || 'Untitled task'}
                            </h3>
                            <StatusBadge status={progress.status} />
                            <HealthBadge
                                health={progress.healthStatus}
                                status={progress.status}
                            />
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                                <OtherIcon className="h-3.5 w-3.5" />
                                {other.label}
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <Flag className="h-3.5 w-3.5" />
                                {metrics.completedMilestoneCount}/{metrics.milestoneCount}{' '}
                                milestones
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-3.5 w-3.5" />
                                {metrics.totalHoursLogged}h logged
                            </span>
                            {deadline && (
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1',
                                        live &&
                                            schedule.daysRemaining != null &&
                                            schedule.daysRemaining < 0 &&
                                            'font-semibold text-red-600',
                                    )}
                                >
                                    <CalendarClock className="h-3.5 w-3.5" />
                                    {deadline}
                                </span>
                            )}
                        </div>

                        {live && (metrics.openBlockerCount > 0 || metrics.overdueMilestoneCount > 0) && (
                            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                                <AlertOctagon className="h-3.5 w-3.5 shrink-0" />
                                {[
                                    metrics.openBlockerCount > 0 &&
                                        `${metrics.openBlockerCount} open blocker${metrics.openBlockerCount === 1 ? '' : 's'}`,
                                    metrics.overdueMilestoneCount > 0 &&
                                        `${metrics.overdueMilestoneCount} overdue milestone${metrics.overdueMilestoneCount === 1 ? '' : 's'}`,
                                ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </p>
                        )}

                        {progress.status === 'completed' && progress.completedAt && (
                            <p className="mt-2 text-xs text-muted-foreground">
                                Completed {formatDate(progress.completedAt)}
                                {progress.closedWithOutstandingWork &&
                                    ' · closed with work outstanding'}
                            </p>
                        )}

                        {progress.status === 'paused' && progress.statusReason && (
                            <p className="mt-2 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Paused:</span>{' '}
                                {progress.statusReason}
                            </p>
                        )}
                    </div>

                    {actions && <div className="flex shrink-0 flex-col gap-2">{actions}</div>}
                </div>
            </Card>
        </Link>
    )
}
