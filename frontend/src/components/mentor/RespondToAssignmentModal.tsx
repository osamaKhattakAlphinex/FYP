'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogTitle,
    DialogCloseButton,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { mentorAssignmentService } from '@/services/mentorAssignmentService'
import type { MentorAssignment } from '@/types/mentor.types'

interface RespondToAssignmentModalProps {
    assignment: MentorAssignment
    action: 'accept' | 'decline'
    isOpen: boolean
    onClose: () => void
    onDone: (updated: MentorAssignment) => void
}

export default function RespondToAssignmentModal({
    assignment,
    action,
    isOpen,
    onClose,
    onDone,
}: RespondToAssignmentModalProps) {
    const [reason, setReason] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const accepting = action === 'accept'
    const studentName = [assignment.student?.firstName, assignment.student?.lastName]
        .filter(Boolean)
        .join(' ')

    const handleSubmit = async () => {
        try {
            setSubmitting(true)
            const updated = await mentorAssignmentService.respond(assignment.id, {
                action,
                reason: reason.trim() || undefined,
            })
            toast.success(accepting ? 'Mentorship accepted' : 'Request declined')
            onDone(updated)
            onClose()
        } catch (err: any) {
            const message =
                err?.response?.data?.errors?.[0]?.message ||
                err?.response?.data?.message ||
                'Could not submit your response'
            toast.error(message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    if (submitting) return
                    onClose()
                }
            }}
        >
            <DialogContent size="sm">
                <DialogHeader>
                    <div>
                        <DialogTitle>
                            {accepting ? 'Accept this mentorship?' : 'Decline this request?'}
                        </DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {studentName || 'A student'} &middot;{' '}
                            {assignment.task?.title || 'Untitled task'}
                        </p>
                    </div>
                    <DialogCloseButton />
                </DialogHeader>

                <DialogBody className="space-y-4">
                    {accepting ? (
                        <p className="text-sm text-muted-foreground">
                            You will be able to exchange guidance notes with your mentee and
                            mark the mentorship complete when the task is finished. This uses
                            one of your active mentee slots.
                        </p>
                    ) : (
                        <div>
                            <Label htmlFor="reason">
                                Reason{' '}
                                <span className="font-normal text-muted-foreground">
                                    (optional, shared with the company)
                                </span>
                            </Label>
                            <Textarea
                                id="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                                maxLength={500}
                                placeholder="e.g. Fully booked this month — happy to help next cycle."
                                className="mt-1.5"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                The company can assign a different mentor afterwards.
                            </p>
                        </div>
                    )}
                </DialogBody>

                <DialogFooter>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        variant={accepting ? 'default' : 'destructive'}
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {submitting
                            ? 'Submitting…'
                            : accepting
                              ? 'Accept mentorship'
                              : 'Decline request'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
