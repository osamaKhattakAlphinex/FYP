'use client'

import { useState } from 'react'
import { Loader2, Star } from 'lucide-react'
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
import { cn } from '@/lib/utils'

interface CompleteMentorshipModalProps {
    assignment: MentorAssignment
    isOpen: boolean
    onClose: () => void
    onDone: (updated: MentorAssignment) => void
}

export default function CompleteMentorshipModal({
    assignment,
    isOpen,
    onClose,
    onDone,
}: CompleteMentorshipModalProps) {
    const [rating, setRating] = useState<number>(0)
    const [feedback, setFeedback] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const studentName = [assignment.student?.firstName, assignment.student?.lastName]
        .filter(Boolean)
        .join(' ')

    const handleSubmit = async () => {
        try {
            setSubmitting(true)
            const updated = await mentorAssignmentService.complete(assignment.id, {
                mentorRating: rating > 0 ? rating : undefined,
                mentorFeedback: feedback.trim() || undefined,
            })
            toast.success('Mentorship marked complete')
            onDone(updated)
            onClose()
        } catch (err: any) {
            const message =
                err?.response?.data?.errors?.[0]?.message ||
                err?.response?.data?.message ||
                'Could not complete the mentorship'
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
            <DialogContent size="md">
                <DialogHeader>
                    <div>
                        <DialogTitle>Complete this mentorship</DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {studentName || 'Your mentee'} &middot;{' '}
                            {assignment.task?.title || 'Untitled task'}
                        </p>
                    </div>
                    <DialogCloseButton />
                </DialogHeader>

                <DialogBody className="space-y-5">
                    <div>
                        <Label>
                            How did your mentee do?{' '}
                            <span className="font-normal text-muted-foreground">(optional)</span>
                        </Label>
                        <div className="mt-2 flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    aria-label={`${n} out of 5`}
                                    onClick={() => setRating(n === rating ? 0 : n)}
                                    className="rounded p-1 transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={cn(
                                            'h-6 w-6',
                                            n <= rating
                                                ? 'fill-accent-500 text-accent-500'
                                                : 'text-muted-foreground',
                                        )}
                                    />
                                </button>
                            ))}
                            {rating > 0 && (
                                <span className="ml-2 text-sm text-muted-foreground">
                                    {rating}/5
                                </span>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="mentorFeedback">
                            Closing feedback{' '}
                            <span className="font-normal text-muted-foreground">(optional)</span>
                        </Label>
                        <Textarea
                            id="mentorFeedback"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            rows={4}
                            maxLength={2000}
                            placeholder="What went well, and what should they work on next?"
                            className="mt-1.5"
                        />
                    </div>

                    <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                        Completing frees up one of your mentee slots. Your mentee will be able
                        to rate the mentorship afterwards.
                    </p>
                </DialogBody>

                <DialogFooter>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {submitting ? 'Completing…' : 'Mark complete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
