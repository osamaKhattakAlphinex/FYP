'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Loader2, Star } from 'lucide-react'
import toast from 'react-hot-toast'

import {
    Dialog,
    DialogBody,
    DialogCloseButton,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { progressService } from '@/services/progressService'
import { apiErrorMessage } from '@/lib/apiError'
import type {
    MilestoneSubmission,
    ProgressMilestone,
} from '@/types/progress.types'
import { cn } from '@/lib/utils'

interface ReviewMilestoneModalProps {
    progressId: string
    milestone: ProgressMilestone
    isOpen: boolean
    onClose: () => void
    onDone: (milestone: ProgressMilestone) => void
}

const LinkRow = ({ label, url }: { label: string; url?: string | null }) => {
    if (!url) return null
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
        >
            {label} <ExternalLink className="h-3 w-3" />
        </a>
    )
}

export default function ReviewMilestoneModal({
    progressId,
    milestone,
    isOpen,
    onClose,
    onDone,
}: ReviewMilestoneModalProps) {
    const [submission, setSubmission] = useState<MilestoneSubmission | null>(null)
    const [history, setHistory] = useState<MilestoneSubmission[]>([])
    const [loading, setLoading] = useState(true)
    const [note, setNote] = useState('')
    const [score, setScore] = useState<number | null>(null)
    const [action, setAction] = useState<'approve' | 'request_changes'>('approve')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            try {
                setLoading(true)
                const rows = await progressService.getMilestoneSubmissions(
                    progressId,
                    milestone.id,
                )
                if (cancelled) return
                setHistory(rows)
                setSubmission(rows.find((r) => r.status === 'pending_review') ?? rows[0] ?? null)
            } catch (err) {
                if (!cancelled) {
                    toast.error(apiErrorMessage(err, 'Could not load the submission'))
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        if (isOpen) load()
        return () => {
            cancelled = true
        }
    }, [isOpen, progressId, milestone.id])

    const handleSubmit = async () => {
        // Sending work back without saying why is the fastest route to a second
        // rejected attempt, so the note is required in that direction only.
        if (action === 'request_changes' && note.trim().length === 0) {
            toast.error('Tell the student what needs to change')
            return
        }

        try {
            setSubmitting(true)
            const result = await progressService.reviewMilestone(
                progressId,
                milestone.id,
                { action, note: note.trim() || undefined, score },
            )
            toast.success(action === 'approve' ? 'Milestone approved' : 'Changes requested')
            onDone(result.milestone)
            onClose()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not record your review'))
        } finally {
            setSubmitting(false)
        }
    }

    const previousAttempts = history.filter((h) => h.id !== submission?.id)

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open && !submitting) onClose()
            }}
        >
            <DialogContent size="lg">
                <DialogHeader>
                    <div>
                        <DialogTitle>Review submission</DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {milestone.title}
                            {submission && ` · attempt ${submission.attemptNumber}`}
                        </p>
                    </div>
                    <DialogCloseButton />
                </DialogHeader>

                <DialogBody className="max-h-[65vh] space-y-5">
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading the submission…
                        </div>
                    ) : !submission ? (
                        <p className="text-sm text-muted-foreground">
                            No submission was found for this milestone.
                        </p>
                    ) : (
                        <>
                            <div className="rounded-md border border-border bg-muted p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    What the student delivered
                                </p>
                                <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">
                                    {submission.summary}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                                    <LinkRow label="Repository" url={submission.repositoryUrl} />
                                    <LinkRow label="Deliverable" url={submission.deliverableUrl} />
                                    <LinkRow label="Live demo" url={submission.demoUrl} />
                                </div>

                                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                    <span>
                                        Submitted{' '}
                                        {new Date(submission.submittedAt).toLocaleString(undefined, {
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                    {submission.hoursSpent != null && (
                                        <span>{submission.hoursSpent}h on this attempt</span>
                                    )}
                                    {submission.wasLate && (
                                        <span className="font-semibold text-amber-700">
                                            Submitted late
                                        </span>
                                    )}
                                </div>
                            </div>

                            {previousAttempts.length > 0 && (
                                <details className="rounded-md border border-border px-3 py-2">
                                    <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                                        {previousAttempts.length} earlier attempt
                                        {previousAttempts.length === 1 ? '' : 's'}
                                    </summary>
                                    <ul className="mt-2 space-y-2">
                                        {previousAttempts.map((a) => (
                                            <li key={a.id} className="text-xs text-muted-foreground">
                                                <span className="font-medium text-foreground">
                                                    Attempt {a.attemptNumber}
                                                </span>{' '}
                                                — {progressService.getMilestoneLabel(
                                                    a.status === 'approved'
                                                        ? 'completed'
                                                        : 'changes_requested',
                                                )}
                                                {a.reviewNote && (
                                                    <span className="mt-0.5 block italic">
                                                        &ldquo;{a.reviewNote}&rdquo;
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            )}

                            <div>
                                <Label>Decision</Label>
                                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                                    {(
                                        [
                                            {
                                                value: 'approve' as const,
                                                title: 'Approve',
                                                blurb: 'Marks the milestone complete and counts its weight towards progress.',
                                            },
                                            {
                                                value: 'request_changes' as const,
                                                title: 'Request changes',
                                                blurb: 'Sends it back so the student can revise and resubmit.',
                                            },
                                        ]
                                    ).map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setAction(opt.value)}
                                            className={cn(
                                                'rounded-md border px-3 py-2.5 text-left transition-colors',
                                                action === opt.value
                                                    ? 'border-brand-600 bg-brand-50'
                                                    : 'border-border hover:bg-muted',
                                            )}
                                        >
                                            <span className="block text-sm font-semibold text-foreground">
                                                {opt.title}
                                            </span>
                                            <span className="mt-0.5 block text-xs text-muted-foreground">
                                                {opt.blurb}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="rev-note">
                                    Feedback
                                    {action === 'request_changes' ? (
                                        ''
                                    ) : (
                                        <span className="font-normal text-muted-foreground">
                                            {' '}
                                            (optional)
                                        </span>
                                    )}
                                </Label>
                                <Textarea
                                    id="rev-note"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    rows={4}
                                    maxLength={4000}
                                    placeholder={
                                        action === 'approve'
                                            ? 'What was strong about this work?'
                                            : 'Be specific about what needs to change and why.'
                                    }
                                    className="mt-1.5"
                                />
                            </div>

                            <div>
                                <Label>
                                    Quality score{' '}
                                    <span className="font-normal text-muted-foreground">
                                        (optional, feeds the performance report)
                                    </span>
                                </Label>
                                <div className="mt-1.5 flex items-center gap-1.5">
                                    {[1, 2, 3, 4, 5].map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setScore(score === n ? null : n)}
                                            aria-label={`${n} out of 5`}
                                            className="rounded p-0.5 transition-transform hover:scale-110"
                                        >
                                            <Star
                                                className={cn(
                                                    'h-6 w-6',
                                                    score != null && n <= score
                                                        ? 'fill-accent-500 text-accent-500'
                                                        : 'text-muted-foreground',
                                                )}
                                            />
                                        </button>
                                    ))}
                                    {score != null && (
                                        <button
                                            type="button"
                                            onClick={() => setScore(null)}
                                            className="ml-2 text-xs text-muted-foreground hover:underline"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogBody>

                <DialogFooter>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        variant={action === 'approve' ? 'default' : 'accent'}
                        onClick={handleSubmit}
                        disabled={submitting || loading || !submission}
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {submitting
                            ? 'Saving…'
                            : action === 'approve'
                              ? 'Approve milestone'
                              : 'Request changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
