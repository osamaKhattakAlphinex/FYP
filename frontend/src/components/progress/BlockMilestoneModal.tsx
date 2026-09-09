'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import type { ProgressMilestone } from '@/types/progress.types'

interface BlockMilestoneModalProps {
    progressId: string
    milestone: ProgressMilestone
    /** 'block' raises a blocker; 'unblock' clears it and resumes the work. */
    mode: 'block' | 'unblock'
    isOpen: boolean
    onClose: () => void
    onDone: (milestone: ProgressMilestone) => void
}

export default function BlockMilestoneModal({
    progressId,
    milestone,
    mode,
    isOpen,
    onClose,
    onDone,
}: BlockMilestoneModalProps) {
    const [reason, setReason] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const blocking = mode === 'block'

    const handleSubmit = async () => {
        if (blocking && reason.trim().length === 0) {
            toast.error('Describe what is blocking you')
            return
        }

        try {
            setSubmitting(true)
            const updated = await progressService.setMilestoneStatus(
                progressId,
                milestone.id,
                {
                    status: blocking ? 'blocked' : 'in_progress',
                    reason: reason.trim() || undefined,
                },
            )
            toast.success(blocking ? 'Blocker raised' : 'Blocker cleared')
            onDone(updated)
            onClose()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not update the milestone'))
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
            <DialogContent size="sm">
                <DialogHeader>
                    <div>
                        <DialogTitle>
                            {blocking ? 'Raise a blocker' : 'Clear this blocker'}
                        </DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">{milestone.title}</p>
                    </div>
                    <DialogCloseButton />
                </DialogHeader>

                <DialogBody className="space-y-4">
                    {blocking ? (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Your mentor and the company are notified straight away. Raising
                                a blocker early is the fastest way to get unstuck — it is not a
                                mark against you.
                            </p>
                            <div>
                                <Label htmlFor="block-reason">What is blocking you?</Label>
                                <Textarea
                                    id="block-reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={4}
                                    maxLength={500}
                                    placeholder="e.g. I do not have access to the staging database, so I cannot test the queries."
                                    className="mt-1.5"
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {milestone.blockedReason && (
                                <div className="rounded-md bg-muted px-3 py-2">
                                    <p className="text-xs font-semibold text-foreground">
                                        The blocker you raised
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {milestone.blockedReason}
                                    </p>
                                </div>
                            )}
                            <div>
                                <Label htmlFor="unblock-reason">
                                    How was it resolved?{' '}
                                    <span className="font-normal text-muted-foreground">
                                        (optional)
                                    </span>
                                </Label>
                                <Textarea
                                    id="unblock-reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                    maxLength={500}
                                    placeholder="e.g. Access granted, resuming work."
                                    className="mt-1.5"
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    The milestone goes back to in progress.
                                </p>
                            </div>
                        </>
                    )}
                </DialogBody>

                <DialogFooter>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        variant={blocking ? 'destructive' : 'default'}
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {submitting
                            ? 'Saving…'
                            : blocking
                              ? 'Raise blocker'
                              : 'Clear blocker'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
