'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { progressService } from '@/services/progressService'
import { apiErrorMessage } from '@/lib/apiError'
import type { ProgressMilestone } from '@/types/progress.types'

interface SubmitMilestoneModalProps {
    progressId: string
    milestone: ProgressMilestone
    isOpen: boolean
    onClose: () => void
    onDone: (milestone: ProgressMilestone) => void
}

export default function SubmitMilestoneModal({
    progressId,
    milestone,
    isOpen,
    onClose,
    onDone,
}: SubmitMilestoneModalProps) {
    const [summary, setSummary] = useState('')
    const [repositoryUrl, setRepositoryUrl] = useState('')
    const [deliverableUrl, setDeliverableUrl] = useState('')
    const [demoUrl, setDemoUrl] = useState('')
    const [hoursSpent, setHoursSpent] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const resubmitting = milestone.submissionCount > 0

    const handleSubmit = async () => {
        if (summary.trim().length < 10) {
            toast.error('Describe what you delivered in at least 10 characters')
            return
        }

        try {
            setSubmitting(true)
            const result = await progressService.submitMilestone(
                progressId,
                milestone.id,
                {
                    summary: summary.trim(),
                    repositoryUrl: repositoryUrl.trim() || undefined,
                    deliverableUrl: deliverableUrl.trim() || undefined,
                    demoUrl: demoUrl.trim() || undefined,
                    hoursSpent: hoursSpent === '' ? null : Number(hoursSpent),
                },
            )
            toast.success('Submitted for review')
            onDone(result.milestone)
            onClose()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not submit this milestone'))
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
                        <DialogTitle>
                            {resubmitting ? 'Resubmit for review' : 'Submit for review'}
                        </DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {milestone.title}
                            {resubmitting && ` · attempt ${milestone.submissionCount + 1}`}
                        </p>
                    </div>
                    <DialogCloseButton />
                </DialogHeader>

                <DialogBody className="max-h-[65vh] space-y-4">
                    {milestone.isOverdue && (
                        <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            This milestone is past its due date. It will be recorded as a late
                            submission — mention any reason in your summary.
                        </p>
                    )}

                    {milestone.status === 'changes_requested' && milestone.reviewNote && (
                        <div className="rounded-md border border-border bg-muted px-3 py-2.5">
                            <p className="text-xs font-semibold text-foreground">
                                What your reviewer asked for
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                                {milestone.reviewNote}
                            </p>
                        </div>
                    )}

                    <div>
                        <Label htmlFor="sub-summary">What did you deliver?</Label>
                        <Textarea
                            id="sub-summary"
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            rows={5}
                            maxLength={5000}
                            placeholder="Explain what you built, any decisions you made, and anything you are unsure about."
                            className="mt-1.5"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            {summary.trim().length}/5000 — minimum 10 characters.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="sub-repo">
                                Repository{' '}
                                <span className="font-normal text-muted-foreground">(optional)</span>
                            </Label>
                            <Input
                                id="sub-repo"
                                value={repositoryUrl}
                                onChange={(e) => setRepositoryUrl(e.target.value)}
                                maxLength={500}
                                placeholder="https://github.com/…"
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="sub-deliverable">
                                Deliverable{' '}
                                <span className="font-normal text-muted-foreground">(optional)</span>
                            </Label>
                            <Input
                                id="sub-deliverable"
                                value={deliverableUrl}
                                onChange={(e) => setDeliverableUrl(e.target.value)}
                                maxLength={500}
                                placeholder="Link to the file or document"
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="sub-demo">
                                Live demo{' '}
                                <span className="font-normal text-muted-foreground">(optional)</span>
                            </Label>
                            <Input
                                id="sub-demo"
                                value={demoUrl}
                                onChange={(e) => setDemoUrl(e.target.value)}
                                maxLength={500}
                                placeholder="https://…"
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="sub-hours">
                                Hours on this attempt{' '}
                                <span className="font-normal text-muted-foreground">(optional)</span>
                            </Label>
                            <Input
                                id="sub-hours"
                                type="number"
                                min={0}
                                max={500}
                                step="0.25"
                                value={hoursSpent}
                                onChange={(e) => setHoursSpent(e.target.value)}
                                className="mt-1.5"
                            />
                        </div>
                    </div>
                </DialogBody>

                <DialogFooter>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {submitting ? 'Submitting…' : 'Submit for review'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
