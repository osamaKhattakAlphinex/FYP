'use client'

import { useState } from 'react'
import {
    AlertOctagon,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    Clock3,
    Flag,
    MoreHorizontal,
    Pencil,
    Play,
    Send,
    ShieldAlert,
    Trash2,
    Upload,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MilestoneBadge } from './ProgressBadges'
import { progressService } from '@/services/progressService'
import { apiErrorMessage } from '@/lib/apiError'
import type {
    InternshipProgress,
    ProgressMilestone,
    ProgressPerspective,
} from '@/types/progress.types'
import { cn } from '@/lib/utils'

const formatDue = (m: ProgressMilestone) => {
    if (!m.dueDate) return null
    const date = new Date(`${m.dueDate}T00:00:00`).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
    })
    if (m.status === 'completed' || m.status === 'cancelled') return `Due ${date}`
    if (m.isOverdue) {
        const late = m.daysUntilDue == null ? null : Math.abs(m.daysUntilDue)
        return late != null ? `${late}d overdue` : 'Overdue'
    }
    if (m.daysUntilDue != null && m.daysUntilDue <= 7) {
        return m.daysUntilDue === 0 ? 'Due today' : `Due in ${m.daysUntilDue}d`
    }
    return `Due ${date}`
}

interface MilestoneListProps {
    progress: InternshipProgress
    milestones: ProgressMilestone[]
    perspective: ProgressPerspective
    onChanged: (milestone: ProgressMilestone) => void
    onRefresh: () => void
    onEdit: (milestone: ProgressMilestone) => void
    onSubmit: (milestone: ProgressMilestone) => void
    onReview: (milestone: ProgressMilestone) => void
    onBlock: (milestone: ProgressMilestone, mode: 'block' | 'unblock') => void
}

export default function MilestoneList({
    progress,
    milestones,
    perspective,
    onChanged,
    onRefresh,
    onEdit,
    onSubmit,
    onReview,
    onBlock,
}: MilestoneListProps) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})
    const [busy, setBusy] = useState<string | null>(null)
    const [menuFor, setMenuFor] = useState<string | null>(null)

    const permissions = progress.permissions
    const canWork = !!permissions?.canWork
    const canSupervise = !!permissions?.canSupervise
    const canEditPlan = !!permissions?.canEditPlan

    const toggle = (id: string) =>
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

    const handleStart = async (m: ProgressMilestone) => {
        try {
            setBusy(m.id)
            const updated = await progressService.startMilestone(progress.id, m.id)
            toast.success('Milestone started')
            onChanged(updated)
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not start this milestone'))
        } finally {
            setBusy(null)
        }
    }

    const handleStatus = async (
        m: ProgressMilestone,
        status: 'cancelled' | 'pending' | 'in_progress',
        confirmText?: string,
    ) => {
        if (confirmText && !window.confirm(confirmText)) return
        try {
            setBusy(m.id)
            const updated = await progressService.setMilestoneStatus(progress.id, m.id, {
                status,
            })
            toast.success('Milestone updated')
            onChanged(updated)
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not update this milestone'))
        } finally {
            setBusy(null)
            setMenuFor(null)
        }
    }

    const handleDelete = async (m: ProgressMilestone) => {
        if (!window.confirm(`Delete "${m.title}"? This cannot be undone.`)) return
        try {
            setBusy(m.id)
            await progressService.deleteMilestone(progress.id, m.id)
            toast.success('Milestone deleted')
            onRefresh()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not delete this milestone'))
        } finally {
            setBusy(null)
            setMenuFor(null)
        }
    }

    if (milestones.length === 0) {
        return (
            <Card className="p-8 text-center">
                <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
                    <Flag className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">
                    No milestones yet
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                    {canEditPlan
                        ? 'Break the task into a few weighted milestones so progress can be measured objectively.'
                        : 'Your supervisor has not broken this internship into milestones yet.'}
                </p>
            </Card>
        )
    }

    return (
        <div className="space-y-2.5">
            {milestones.map((m) => {
                const open = !!expanded[m.id]
                const due = formatDue(m)
                const isBusy = busy === m.id

                return (
                    <Card
                        key={m.id}
                        className={cn(
                            'overflow-hidden',
                            m.status === 'blocked' && 'border-red-200',
                            m.isOverdue && m.status !== 'blocked' && 'border-amber-200',
                        )}
                    >
                        <div className="flex items-start gap-3 p-4">
                            <button
                                type="button"
                                onClick={() => toggle(m.id)}
                                aria-expanded={open}
                                aria-label={open ? 'Collapse milestone' : 'Expand milestone'}
                                className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground transition-transform hover:text-foreground"
                            >
                                <ChevronDown
                                    className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
                                />
                            </button>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h4
                                        className={cn(
                                            'text-sm font-semibold text-foreground',
                                            m.status === 'cancelled' && 'line-through opacity-60',
                                        )}
                                    >
                                        {m.title}
                                    </h4>
                                    <MilestoneBadge status={m.status} />
                                    {!m.isRequired && (
                                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                                            Optional
                                        </span>
                                    )}
                                </div>

                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                        <Flag className="h-3.5 w-3.5" />
                                        Weight {m.weight}
                                    </span>
                                    {due && (
                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-1',
                                                m.isOverdue && 'font-semibold text-red-600',
                                            )}
                                        >
                                            <CalendarDays className="h-3.5 w-3.5" />
                                            {due}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1">
                                        <Clock3 className="h-3.5 w-3.5" />
                                        {m.actualHours}h
                                        {m.estimatedHours != null && ` of ~${m.estimatedHours}h`}
                                    </span>
                                    {m.submissionCount > 0 && (
                                        <span className="inline-flex items-center gap-1">
                                            <Upload className="h-3.5 w-3.5" />
                                            {m.submissionCount} attempt
                                            {m.submissionCount === 1 ? '' : 's'}
                                        </span>
                                    )}
                                </div>

                                {m.status === 'blocked' && m.blockedReason && (
                                    <p className="mt-2 flex items-start gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                                        <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        <span>
                                            <span className="font-semibold">Blocked:</span>{' '}
                                            {m.blockedReason}
                                        </span>
                                    </p>
                                )}

                                {m.status === 'changes_requested' && m.reviewNote && (
                                    <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        <span>
                                            <span className="font-semibold">Changes requested:</span>{' '}
                                            {m.reviewNote}
                                        </span>
                                    </p>
                                )}

                                {open && (
                                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                                        {m.description ? (
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Acceptance criteria
                                                </p>
                                                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                                                    {m.description}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                No description was added for this milestone.
                                            </p>
                                        )}

                                        {m.status === 'completed' && m.reviewNote && (
                                            <div className="rounded-md bg-emerald-50 px-2.5 py-2">
                                                <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Reviewer feedback
                                                </p>
                                                <p className="mt-1 text-sm text-emerald-900">
                                                    {m.reviewNote}
                                                </p>
                                            </div>
                                        )}

                                        {m.submissions && m.submissions.length > 0 && (
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Submission history
                                                </p>
                                                <ul className="mt-1.5 space-y-1.5">
                                                    {m.submissions.map((s) => (
                                                        <li
                                                            key={s.id}
                                                            className="rounded-md border border-border px-2.5 py-1.5 text-xs"
                                                        >
                                                            <span className="font-medium text-foreground">
                                                                Attempt {s.attemptNumber}
                                                            </span>{' '}
                                                            <span className="text-muted-foreground">
                                                                ·{' '}
                                                                {new Date(
                                                                    s.submittedAt,
                                                                ).toLocaleDateString(undefined, {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                })}
                                                                {s.wasLate && ' · late'}
                                                                {s.status === 'approved' && ' · approved'}
                                                                {s.status === 'changes_requested' &&
                                                                    ' · changes requested'}
                                                                {s.status === 'pending_review' &&
                                                                    ' · awaiting review'}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Actions ------------------------------------------------ */}
                            <div className="flex shrink-0 items-center gap-1.5">
                                {canWork && progressService.canStartMilestone(m) && (
                                    <Button
                                        size="xs"
                                        variant="secondary"
                                        disabled={isBusy}
                                        onClick={() => handleStart(m)}
                                    >
                                        <Play className="h-3.5 w-3.5" /> Start
                                    </Button>
                                )}
                                {canWork && progressService.canSubmitMilestone(m) && (
                                    <Button size="xs" disabled={isBusy} onClick={() => onSubmit(m)}>
                                        <Send className="h-3.5 w-3.5" />
                                        {m.submissionCount > 0 ? 'Resubmit' : 'Submit'}
                                    </Button>
                                )}
                                {canWork && m.status === 'blocked' && (
                                    <Button
                                        size="xs"
                                        variant="secondary"
                                        disabled={isBusy}
                                        onClick={() => onBlock(m, 'unblock')}
                                    >
                                        Unblock
                                    </Button>
                                )}
                                {canSupervise && progressService.canReviewMilestone(m) && (
                                    <Button size="xs" disabled={isBusy} onClick={() => onReview(m)}>
                                        Review
                                    </Button>
                                )}

                                {(canEditPlan || (canWork && progressService.canBlockMilestone(m))) && (
                                    <div className="relative">
                                        <Button
                                            size="icon-sm"
                                            variant="ghost"
                                            aria-label="More actions"
                                            disabled={isBusy}
                                            onClick={() =>
                                                setMenuFor(menuFor === m.id ? null : m.id)
                                            }
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>

                                        {menuFor === m.id && (
                                            <>
                                                {/* Click-away layer, so the menu closes without
                                                    a document listener. */}
                                                <button
                                                    type="button"
                                                    aria-hidden
                                                    tabIndex={-1}
                                                    className="fixed inset-0 z-40 cursor-default"
                                                    onClick={() => setMenuFor(null)}
                                                />
                                                <div className="absolute right-0 z-50 mt-1 w-52 overflow-hidden rounded-md border border-border bg-card py-1 shadow-lg">
                                                    {canWork && m.status !== 'blocked' && (
                                                        <button
                                                            type="button"
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                                                            onClick={() => {
                                                                setMenuFor(null)
                                                                onBlock(m, 'block')
                                                            }}
                                                        >
                                                            <AlertOctagon className="h-4 w-4" />
                                                            Raise a blocker
                                                        </button>
                                                    )}
                                                    {canEditPlan && (
                                                        <button
                                                            type="button"
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                                                            onClick={() => {
                                                                setMenuFor(null)
                                                                onEdit(m)
                                                            }}
                                                        >
                                                            <Pencil className="h-4 w-4" /> Edit
                                                        </button>
                                                    )}
                                                    {canSupervise && m.status === 'completed' && (
                                                        <button
                                                            type="button"
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                                                            onClick={() =>
                                                                handleStatus(
                                                                    m,
                                                                    'in_progress',
                                                                    'Reopen this approved milestone? Its weight will stop counting towards the completion percentage.',
                                                                )
                                                            }
                                                        >
                                                            <Play className="h-4 w-4" /> Reopen
                                                        </button>
                                                    )}
                                                    {canEditPlan && m.status !== 'cancelled' && (
                                                        <button
                                                            type="button"
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                                                            onClick={() =>
                                                                handleStatus(
                                                                    m,
                                                                    'cancelled',
                                                                    'Cancel this milestone? It drops out of the completion percentage but its history is kept.',
                                                                )
                                                            }
                                                        >
                                                            <ShieldAlert className="h-4 w-4" /> Cancel
                                                        </button>
                                                    )}
                                                    {canEditPlan && m.status === 'cancelled' && (
                                                        <button
                                                            type="button"
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                                                            onClick={() => handleStatus(m, 'pending')}
                                                        >
                                                            <Play className="h-4 w-4" /> Restore
                                                        </button>
                                                    )}
                                                    {canEditPlan && m.submissionCount === 0 && (
                                                        <button
                                                            type="button"
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                                                            onClick={() => handleDelete(m)}
                                                        >
                                                            <Trash2 className="h-4 w-4" /> Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                )
            })}
        </div>
    )
}
