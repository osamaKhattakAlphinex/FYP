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

interface RateMentorModalProps {
    assignment: MentorAssignment
    isOpen: boolean
    onClose: () => void
    onDone: (updated: MentorAssignment) => void
}

export default function RateMentorModal({
    assignment,
    isOpen,
    onClose,
    onDone,
}: RateMentorModalProps) {
    const [rating, setRating] = useState<number>(0)
    const [feedback, setFeedback] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const mentorName = [assignment.mentor?.firstName, assignment.mentor?.lastName]
        .filter(Boolean)
        .join(' ')

    const handleSubmit = async () => {
        if (rating < 1) {
            toast.error('Pick a rating from 1 to 5')
            return
        }
        try {
            setSubmitting(true)
            const updated = await mentorAssignmentService.rateMentor(assignment.id, {
                studentRating: rating,
                studentFeedback: feedback.trim() || undefined,
            })
            toast.success('Thanks for rating your mentor')
            onDone(updated)
            onClose()
        } catch (err: any) {
            const message =
                err?.response?.data?.errors?.[0]?.message ||
                err?.response?.data?.message ||
                'Could not submit your rating'
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
                        <DialogTitle>Rate your mentor</DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {mentorName || 'Your mentor'} &middot;{' '}
                            {assignment.task?.title || 'Untitled task'}
                        </p>
                    </div>
                    <DialogCloseButton />
                </DialogHeader>

                <DialogBody className="space-y-5">
                    <div>
                        <Label>How helpful was the mentorship?</Label>
                        <div className="mt-2 flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    aria-label={`${n} out of 5`}
                                    onClick={() => setRating(n)}
                                    className="rounded p-1 transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={cn(
                                            'h-7 w-7',
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
                        <Label htmlFor="studentFeedback">
                            Feedback{' '}
                            <span className="font-normal text-muted-foreground">(optional)</span>
                        </Label>
                        <Textarea
                            id="studentFeedback"
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            rows={4}
                            maxLength={2000}
                            placeholder="What did your mentor do that helped you most?"
                            className="mt-1.5"
                        />
                    </div>

                    <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                        Ratings feed the mentor&apos;s public average and can only be submitted
                        once.
                    </p>
                </DialogBody>

                <DialogFooter>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || rating < 1}>
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {submitting ? 'Submitting…' : 'Submit rating'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
