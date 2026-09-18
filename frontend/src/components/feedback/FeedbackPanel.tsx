'use client'

import { useCallback, useEffect, useState } from 'react'
import { Lock, MessagesSquare, Plus, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import FeedbackCard from './FeedbackCard'
import FeedbackFormModal from './FeedbackFormModal'
import { feedbackService } from '@/services/feedbackService'
import { apiErrorMessage } from '@/lib/apiError'
import type { Feedback, FeedbackThread } from '@/types/feedback.types'
import type { InternshipProgress, ProgressPerspective } from '@/types/progress.types'

interface FeedbackPanelProps {
    progress: InternshipProgress
    perspective: ProgressPerspective
    /** Bumped by the workspace whenever something changes, to force a refetch. */
    refreshKey?: number
}

/**
 * The Feedback tab of the internship workspace (Module 10). Structured
 * feedback from the company and the mentor, stored against this task. What
 * each viewer can do comes from the API's `permissions`, like the rest of the
 * workspace.
 */
export default function FeedbackPanel({ progress, perspective, refreshKey = 0 }: FeedbackPanelProps) {
    const [thread, setThread] = useState<FeedbackThread | null>(null)
    const [loading, setLoading] = useState(true)
    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<Feedback | null>(null)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            setThread(await feedbackService.getForProgress(progress.id))
        } catch (err) {
            setThread(null)
            toast.error(apiErrorMessage(err, 'Could not load feedback'))
        } finally {
            setLoading(false)
        }
    }, [progress.id])

    useEffect(() => {
        load()
    }, [load, refreshKey])

    if (loading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        )
    }

    if (!thread) {
        return (
            <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Feedback could not be loaded.</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={load}>
                    <RefreshCw className="h-4 w-4" /> Try again
                </Button>
            </Card>
        )
    }

    const { records, permissions } = thread
    const canGiveNow = permissions.canGive && !permissions.hasGiven
    const waitingForClose = permissions.isAuthorRole && !permissions.canGive
    const studentName = [progress.student?.firstName, progress.student?.lastName].filter(Boolean).join(' ')

    return (
        <div className="space-y-3">
            <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <MessagesSquare className="h-4 w-4 text-brand-600" /> Feedback
                        </h3>
                        <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
                            {perspective === 'student'
                                ? 'Written feedback from your company and mentor: what went well, what to develop and what to try next. It becomes part of your performance record.'
                                : 'Structured feedback for the student: ratings, strengths, areas to develop and specific suggestions. It is stored against this task as part of their performance record.'}
                        </p>
                    </div>
                    {canGiveNow && (
                        <Button size="sm" onClick={() => setFormOpen(true)}>
                            <Plus className="h-4 w-4" /> Give feedback
                        </Button>
                    )}
                </div>

                {waitingForClose && (
                    <p className="mt-3 inline-flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Feedback opens once the internship is completed or closed, so it reflects the
                        whole piece of work.
                    </p>
                )}
            </Card>

            {records.length === 0 ? (
                <Card className="p-8 text-center">
                    <MessagesSquare className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm font-semibold text-foreground">No feedback yet</p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                        {perspective === 'student'
                            ? 'You will be emailed when your company or mentor leaves feedback on this internship.'
                            : canGiveNow
                              ? 'Be the first to share feedback on this internship.'
                              : 'Nothing has been written about this internship yet.'}
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {records.map((fb) => (
                        <FeedbackCard
                            key={`${fb.id}-${fb.updatedAt}`}
                            feedback={fb}
                            onEdit={setEditing}
                            onChanged={() => load()}
                        />
                    ))}
                </div>
            )}

            {(formOpen || editing) && (
                <FeedbackFormModal
                    isOpen
                    context="internship"
                    targetId={progress.id}
                    existing={editing}
                    // The company's own private closing rating is a sensible
                    // starting point for its shared rating; a mentor starts blank.
                    defaultOverallRating={perspective === 'company' ? progress.performanceRating ?? null : null}
                    studentName={studentName || undefined}
                    taskTitle={progress.task?.title}
                    onClose={() => {
                        setFormOpen(false)
                        setEditing(null)
                    }}
                    onSaved={() => load()}
                />
            )}
        </div>
    )
}
