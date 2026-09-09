'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, Star } from 'lucide-react'
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
import type { InternshipProgress, ProgressMilestone } from '@/types/progress.types'
import { cn } from '@/lib/utils'

interface CompleteInternshipModalProps {
    progress: InternshipProgress
    milestones: ProgressMilestone[]
    isOpen: boolean
    onClose: () => void
    onDone: (progress: InternshipProgress) => void
}

const OUTSTANDING = [
    'pending',
    'in_progress',
    'submitted',
    'changes_requested',
    'blocked',
]

export default function CompleteInternshipModal({
    progress,
    milestones,
    isOpen,
    onClose,
    onDone,
}: CompleteInternshipModalProps) {
    const [completionNote, setCompletionNote] = useState('')
    const [performanceRating, setPerformanceRating] = useState<number | null>(null)
    const [acknowledge, setAcknowledge] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // The server checks this too and rejects without the acknowledgement — this
    // is only so the reviewer sees what they are about to sign off on.
    const outstanding = milestones.filter(
        (m) => m.isRequired && OUTSTANDING.includes(m.status),
    )

    const handleSubmit = async () => {
        if (outstanding.length > 0 && !acknowledge) {
            toast.error('Confirm you are closing this with work outstanding')
            return
        }

        try {
            setSubmitting(true)
            const updated = await progressService.complete(progress.id, {
                completionNote: completionNote.trim() || undefined,
                performanceRating,
                acknowledgeIncomplete: outstanding.length > 0 ? true : undefined,
            })
            toast.success('Internship marked complete')
            onDone(updated)
            onClose()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not close this internship'))
        } finally {
            setSubmitting(false)
        }
    }

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
                        <DialogTitle>Close this internship out</DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {progress.task?.title || 'Untitled task'} ·{' '}
                            {progress.metrics.progressPercent}% complete ·{' '}
                            {progress.metrics.totalHoursLogged}h logged
                        </p>
                    </div>
                    <DialogCloseButton />
                </DialogHeader>

                <DialogBody className="max-h-[65vh] space-y-4">
                    {outstanding.length > 0 && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                            <p className="flex items-start gap-2 text-sm font-semibold text-amber-900">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                {outstanding.length} required milestone
                                {outstanding.length === 1 ? ' is' : 's are'} still open
                            </p>
                            <ul className="mt-2 space-y-1 pl-6">
                                {outstanding.map((m) => (
                                    <li key={m.id} className="list-disc text-xs text-amber-800">
                                        {m.title} — {progressService.getMilestoneLabel(m.status)}
                                    </li>
                                ))}
                            </ul>
                            <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-amber-900">
                                <input
                                    type="checkbox"
                                    checked={acknowledge}
                                    onChange={(e) => setAcknowledge(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-amber-300 accent-amber-600"
                                />
                                Close anyway. This is recorded on the internship so the final
                                report shows it was closed with work outstanding.
                            </label>
                        </div>
                    )}

                    <div>
                        <Label htmlFor="close-note">
                            Closing note{' '}
                            <span className="font-normal text-muted-foreground">
                                (shared with the student)
                            </span>
                        </Label>
                        <Textarea
                            id="close-note"
                            value={completionNote}
                            onChange={(e) => setCompletionNote(e.target.value)}
                            rows={5}
                            maxLength={4000}
                            placeholder="Summarise how the internship went and what the student did well."
                            className="mt-1.5"
                        />
                    </div>

                    <div>
                        <Label>
                            Overall performance{' '}
                            <span className="font-normal text-muted-foreground">
                                (optional, not shown to the student here)
                            </span>
                        </Label>
                        <div className="mt-1.5 flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() =>
                                        setPerformanceRating(performanceRating === n ? null : n)
                                    }
                                    aria-label={`${n} out of 5`}
                                    className="rounded p-0.5 transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={cn(
                                            'h-7 w-7',
                                            performanceRating != null && n <= performanceRating
                                                ? 'fill-accent-500 text-accent-500'
                                                : 'text-muted-foreground',
                                        )}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                        Closing freezes the plan and the time log. The record stays readable to
                        everyone who was on it.
                    </p>
                </DialogBody>

                <DialogFooter>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {submitting ? 'Closing…' : 'Mark complete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
