'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
    ArrowLeft,
    BarChart3,
    Building2,
    CalendarClock,
    CheckCircle2,
    Clock3,
    Flag,
    ListChecks,
    MessageSquare,
    Pause,
    Pencil,
    Play,
    Plus,
    Target,
    User2,
    XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ProgressRing from './ProgressRing'
import { HealthBadge, StatusBadge } from './ProgressBadges'
import MilestoneList from './MilestoneList'
import MilestoneFormModal from './MilestoneFormModal'
import SubmitMilestoneModal from './SubmitMilestoneModal'
import ReviewMilestoneModal from './ReviewMilestoneModal'
import BlockMilestoneModal from './BlockMilestoneModal'
import TimeLogPanel from './TimeLogPanel'
import ProgressUpdatesPanel from './ProgressUpdatesPanel'
import ProgressReportPanel from './ProgressReportPanel'
import EditPlanModal from './EditPlanModal'
import CompleteInternshipModal from './CompleteInternshipModal'
import { useAuth } from '@/contexts/AuthContext'
import { progressService } from '@/services/progressService'
import { apiErrorMessage } from '@/lib/apiError'
import type {
    InternshipProgress,
    ProgressMilestone,
    ProgressPerspective,
} from '@/types/progress.types'
import { cn } from '@/lib/utils'

type Tab = 'milestones' | 'time' | 'updates' | 'report'

const TABS: Array<{ value: Tab; label: string; icon: React.ElementType }> = [
    { value: 'milestones', label: 'Milestones', icon: ListChecks },
    { value: 'time', label: 'Time log', icon: Clock3 },
    { value: 'updates', label: 'Timeline', icon: MessageSquare },
    { value: 'report', label: 'Report', icon: BarChart3 },
]

const formatDate = (iso?: string | null) =>
    !iso
        ? '—'
        : new Date(iso).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
          })

interface ProgressWorkspaceProps {
    progressId: string
    perspective: ProgressPerspective
    /** Where the back link goes. */
    backHref: string
    backLabel: string
}

/**
 * The single internship workspace, shared by the student, company and mentor
 * routes. What each role can do comes from `progress.permissions`, which the
 * API computes — the component never re-derives authorisation, it only renders
 * the affordances the server says are available.
 */
export default function ProgressWorkspace({
    progressId,
    perspective,
    backHref,
    backLabel,
}: ProgressWorkspaceProps) {
    const { user } = useAuth()

    const [progress, setProgress] = useState<InternshipProgress | null>(null)
    const [milestones, setMilestones] = useState<ProgressMilestone[]>([])
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [tab, setTab] = useState<Tab>('milestones')
    const [reportKey, setReportKey] = useState(0)

    const [editingMilestone, setEditingMilestone] = useState<ProgressMilestone | null>(null)
    const [creatingMilestone, setCreatingMilestone] = useState(false)
    const [submitTarget, setSubmitTarget] = useState<ProgressMilestone | null>(null)
    const [reviewTarget, setReviewTarget] = useState<ProgressMilestone | null>(null)
    const [blockTarget, setBlockTarget] = useState<{
        milestone: ProgressMilestone
        mode: 'block' | 'unblock'
    } | null>(null)
    const [editingPlan, setEditingPlan] = useState(false)
    const [completing, setCompleting] = useState(false)
    const [busyStatus, setBusyStatus] = useState(false)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            const record = await progressService.getProgress(progressId)
            setProgress(record)
            setMilestones(record.milestones ?? [])
            setNotFound(false)
        } catch (err) {
            setNotFound(true)
            toast.error(apiErrorMessage(err, 'Could not load this internship'))
        } finally {
            setLoading(false)
        }
    }, [progressId])

    useEffect(() => {
        load()
    }, [load])

    // Any mutation can move the percentage, the health and the report, so the
    // whole record is refetched rather than patched locally.
    const refreshAll = useCallback(async () => {
        await load()
        setReportKey((k) => k + 1)
    }, [load])

    const handleMilestoneChanged = useCallback(() => {
        refreshAll()
    }, [refreshAll])

    const handleStatusChange = async (
        status: 'paused' | 'in_progress' | 'abandoned',
    ) => {
        let reason: string | undefined
        if (status === 'paused') {
            reason = window.prompt('Why is this internship being paused? (optional)') ?? undefined
        }
        if (status === 'abandoned') {
            const entered = window.prompt(
                'Closing this internship early is permanent. Why is it being closed?',
            )
            if (!entered || entered.trim().length === 0) {
                if (entered !== null) toast.error('A reason is required to close early')
                return
            }
            reason = entered.trim()
        }

        try {
            setBusyStatus(true)
            await progressService.changeStatus(progressId, { status, reason })
            toast.success(
                status === 'paused'
                    ? 'Internship paused'
                    : status === 'in_progress'
                      ? 'Internship resumed'
                      : 'Internship closed',
            )
            await refreshAll()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not change the status'))
        } finally {
            setBusyStatus(false)
        }
    }

    if (loading) {
        return (
            <AppShell>
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-44 w-full" />
                <Skeleton className="h-64 w-full" />
            </AppShell>
        )
    }

    if (notFound || !progress) {
        return (
            <AppShell>
                <Card className="p-10 text-center">
                    <h1 className="text-lg font-semibold text-foreground">
                        Internship not found
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        It may have been removed, or you may not have access to it.
                    </p>
                    <Button asChild variant="secondary" size="sm" className="mt-4">
                        <Link href={backHref}>
                            <ArrowLeft className="h-4 w-4" /> {backLabel}
                        </Link>
                    </Button>
                </Card>
            </AppShell>
        )
    }

    const { metrics, schedule, permissions } = progress
    const live = progress.status === 'in_progress' || progress.status === 'not_started'
    const canEditPlan = !!permissions?.canEditPlan
    const canChangeStatus = !!permissions?.canChangeStatus
    const canClose = !!permissions?.canClose

    const counterpartName =
        perspective === 'student'
            ? progress.company?.companyName
            : [progress.student?.firstName, progress.student?.lastName]
                  .filter(Boolean)
                  .join(' ')

    const pendingReview = milestones.filter((m) => m.status === 'submitted').length

    return (
        <AppShell
            rightRail={
                <>
                    <Card className="p-4">
                        <h3 className="text-sm font-semibold text-foreground">At a glance</h3>
                        <dl className="mt-3 space-y-2.5 text-sm">
                            <div className="flex items-center justify-between gap-2">
                                <dt className="text-muted-foreground">Started</dt>
                                <dd className="font-medium text-foreground">
                                    {formatDate(schedule.startDate)}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <dt className="text-muted-foreground">Target end</dt>
                                <dd className="font-medium text-foreground">
                                    {formatDate(schedule.targetEndDate)}
                                </dd>
                            </div>
                            {schedule.actualEndDate && (
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-muted-foreground">Actually ended</dt>
                                    <dd className="font-medium text-foreground">
                                        {formatDate(schedule.actualEndDate)}
                                    </dd>
                                </div>
                            )}
                            <div className="flex items-center justify-between gap-2">
                                <dt className="text-muted-foreground">Hours logged</dt>
                                <dd className="font-medium text-foreground">
                                    {metrics.totalHoursLogged}h
                                    {progress.expectedHoursPerWeek
                                        ? ` (${progress.expectedHoursPerWeek}/wk target)`
                                        : ''}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <dt className="text-muted-foreground">Milestones</dt>
                                <dd className="font-medium text-foreground">
                                    {metrics.completedMilestoneCount}/{metrics.milestoneCount}
                                </dd>
                            </div>
                            {live && metrics.openBlockerCount > 0 && (
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-muted-foreground">Open blockers</dt>
                                    <dd className="font-semibold text-red-600">
                                        {metrics.openBlockerCount}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </Card>

                    {progress.mentor && (
                        <Card className="p-4">
                            <h3 className="text-sm font-semibold text-foreground">Mentor</h3>
                            <p className="mt-1.5 text-sm text-foreground">
                                {[progress.mentor.firstName, progress.mentor.lastName]
                                    .filter(Boolean)
                                    .join(' ')}
                            </p>
                            {progress.mentor.headline && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {progress.mentor.headline}
                                </p>
                            )}
                        </Card>
                    )}

                    {progress.objective && (
                        <Card className="p-4">
                            <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                <Target className="h-4 w-4" /> Objective
                            </h3>
                            <p className="mt-1.5 whitespace-pre-wrap text-xs text-muted-foreground">
                                {progress.objective}
                            </p>
                        </Card>
                    )}
                </>
            }
        >
            <div className="flex items-center justify-between gap-3">
                <Button asChild variant="ghost" size="sm">
                    <Link href={backHref}>
                        <ArrowLeft className="h-4 w-4" /> {backLabel}
                    </Link>
                </Button>
            </div>

            {/* Header ---------------------------------------------------------- */}
            <Card className="p-5">
                <div className="flex flex-wrap items-start gap-5">
                    <ProgressRing
                        value={metrics.progressPercent}
                        size={92}
                        strokeWidth={8}
                        tone={live ? progress.healthStatus : 'brand'}
                    />

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                                {progress.task?.title || 'Untitled task'}
                            </h1>
                            <StatusBadge status={progress.status} />
                            <HealthBadge
                                health={progress.healthStatus}
                                status={progress.status}
                            />
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                                {perspective === 'student' ? (
                                    <Building2 className="h-4 w-4" />
                                ) : (
                                    <User2 className="h-4 w-4" />
                                )}
                                {counterpartName || '—'}
                            </span>
                            {schedule.daysRemaining != null && live && (
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1',
                                        schedule.daysRemaining < 0 && 'font-semibold text-red-600',
                                    )}
                                >
                                    <CalendarClock className="h-4 w-4" />
                                    {schedule.daysRemaining < 0
                                        ? `${Math.abs(schedule.daysRemaining)} days overdue`
                                        : `${schedule.daysRemaining} days left`}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                                <Flag className="h-4 w-4" />
                                {metrics.completedMilestoneCount}/{metrics.milestoneCount} done
                            </span>
                        </div>

                        {progress.status === 'paused' && (
                            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                <span className="font-semibold">Paused.</span>{' '}
                                {progress.statusReason ||
                                    'No work can be logged until it is resumed.'}
                            </p>
                        )}

                        {progress.status === 'abandoned' && (
                            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-900">
                                <span className="font-semibold">Closed early.</span>{' '}
                                {progress.statusReason}
                            </p>
                        )}

                        {progress.status === 'completed' && (
                            <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2.5">
                                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Completed {formatDate(progress.completedAt)}
                                </p>
                                {progress.completionNote && (
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">
                                        {progress.completionNote}
                                    </p>
                                )}
                                {progress.closedWithOutstandingWork && (
                                    <p className="mt-1.5 text-xs text-emerald-800">
                                        Closed with required milestones still outstanding.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Supervisor actions ------------------------------- */}
                        {(canEditPlan || canChangeStatus || canClose) && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {canEditPlan && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setEditingPlan(true)}
                                    >
                                        <Pencil className="h-4 w-4" /> Edit plan
                                    </Button>
                                )}
                                {canChangeStatus && progress.status === 'in_progress' && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        disabled={busyStatus}
                                        onClick={() => handleStatusChange('paused')}
                                    >
                                        <Pause className="h-4 w-4" /> Pause
                                    </Button>
                                )}
                                {canChangeStatus && progress.status === 'paused' && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        disabled={busyStatus}
                                        onClick={() => handleStatusChange('in_progress')}
                                    >
                                        <Play className="h-4 w-4" /> Resume
                                    </Button>
                                )}
                                {canClose && (
                                    <Button size="sm" onClick={() => setCompleting(true)}>
                                        <CheckCircle2 className="h-4 w-4" /> Mark complete
                                    </Button>
                                )}
                                {canChangeStatus && live && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={busyStatus}
                                        onClick={() => handleStatusChange('abandoned')}
                                    >
                                        <XCircle className="h-4 w-4" /> Close early
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Tabs ------------------------------------------------------------ */}
            <div className="overflow-x-auto">
                <div className="flex gap-1.5 border-b border-border pb-1">
                    {TABS.map((t) => {
                        const Icon = t.icon
                        return (
                            <button
                                key={t.value}
                                onClick={() => setTab(t.value)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                                    tab === t.value
                                        ? 'bg-brand-50 text-brand-700'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {t.label}
                                {t.value === 'milestones' && pendingReview > 0 && (
                                    <span className="rounded-full bg-blue-100 px-1.5 text-xs font-semibold text-blue-800">
                                        {pendingReview}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {tab === 'milestones' && (
                <>
                    {canEditPlan && (
                        <div className="flex justify-end">
                            <Button size="sm" onClick={() => setCreatingMilestone(true)}>
                                <Plus className="h-4 w-4" /> Add milestone
                            </Button>
                        </div>
                    )}
                    <MilestoneList
                        progress={progress}
                        milestones={milestones}
                        perspective={perspective}
                        onChanged={handleMilestoneChanged}
                        onRefresh={refreshAll}
                        onEdit={setEditingMilestone}
                        onSubmit={setSubmitTarget}
                        onReview={setReviewTarget}
                        onBlock={(milestone, mode) => setBlockTarget({ milestone, mode })}
                    />
                </>
            )}

            {tab === 'time' && (
                <TimeLogPanel
                    progress={progress}
                    milestones={milestones}
                    onLogged={refreshAll}
                />
            )}

            {tab === 'updates' && (
                <ProgressUpdatesPanel
                    progress={progress}
                    currentUserId={user?._id}
                    onChanged={refreshAll}
                />
            )}

            {tab === 'report' && (
                <ProgressReportPanel progressId={progressId} refreshKey={reportKey} />
            )}

            {/* Modals ---------------------------------------------------------- */}
            {(creatingMilestone || editingMilestone) && (
                <MilestoneFormModal
                    progressId={progressId}
                    milestone={editingMilestone}
                    isOpen
                    onClose={() => {
                        setCreatingMilestone(false)
                        setEditingMilestone(null)
                    }}
                    onDone={refreshAll}
                />
            )}

            {submitTarget && (
                <SubmitMilestoneModal
                    progressId={progressId}
                    milestone={submitTarget}
                    isOpen
                    onClose={() => setSubmitTarget(null)}
                    onDone={refreshAll}
                />
            )}

            {reviewTarget && (
                <ReviewMilestoneModal
                    progressId={progressId}
                    milestone={reviewTarget}
                    isOpen
                    onClose={() => setReviewTarget(null)}
                    onDone={refreshAll}
                />
            )}

            {blockTarget && (
                <BlockMilestoneModal
                    progressId={progressId}
                    milestone={blockTarget.milestone}
                    mode={blockTarget.mode}
                    isOpen
                    onClose={() => setBlockTarget(null)}
                    onDone={refreshAll}
                />
            )}

            {editingPlan && (
                <EditPlanModal
                    progress={progress}
                    isOpen
                    onClose={() => setEditingPlan(false)}
                    onDone={refreshAll}
                />
            )}

            {completing && (
                <CompleteInternshipModal
                    progress={progress}
                    milestones={milestones}
                    isOpen
                    onClose={() => setCompleting(false)}
                    onDone={refreshAll}
                />
            )}
        </AppShell>
    )
}
