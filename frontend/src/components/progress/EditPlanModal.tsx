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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { progressService } from '@/services/progressService'
import { apiErrorMessage } from '@/lib/apiError'
import type { InternshipProgress } from '@/types/progress.types'

interface EditPlanModalProps {
    progress: InternshipProgress
    isOpen: boolean
    onClose: () => void
    onDone: (progress: InternshipProgress) => void
}

export default function EditPlanModal({
    progress,
    isOpen,
    onClose,
    onDone,
}: EditPlanModalProps) {
    const [startDate, setStartDate] = useState(progress.schedule.startDate?.slice(0, 10) ?? '')
    const [targetEndDate, setTargetEndDate] = useState(
        progress.schedule.targetEndDate?.slice(0, 10) ?? '',
    )
    const [objective, setObjective] = useState(progress.objective ?? '')
    const [expectedHoursPerWeek, setExpectedHoursPerWeek] = useState(
        progress.expectedHoursPerWeek != null ? String(progress.expectedHoursPerWeek) : '',
    )
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (startDate && targetEndDate && targetEndDate < startDate) {
            toast.error('The target end date cannot be before the start date')
            return
        }

        try {
            setSubmitting(true)
            const updated = await progressService.updatePlan(progress.id, {
                startDate: startDate || null,
                targetEndDate: targetEndDate || null,
                objective: objective.trim() || null,
                expectedHoursPerWeek:
                    expectedHoursPerWeek === '' ? null : Number(expectedHoursPerWeek),
            })
            toast.success('Plan updated')
            onDone(updated)
            onClose()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not update the plan'))
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
                        <DialogTitle>Edit the internship plan</DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            The dates drive the schedule warnings, so keep them realistic.
                        </p>
                    </div>
                    <DialogCloseButton />
                </DialogHeader>

                <DialogBody className="max-h-[65vh] space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <Label htmlFor="plan-start">Start date</Label>
                            <Input
                                id="plan-start"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="plan-end">Target end date</Label>
                            <Input
                                id="plan-end"
                                type="date"
                                value={targetEndDate}
                                onChange={(e) => setTargetEndDate(e.target.value)}
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="plan-hours">Hours per week</Label>
                            <Input
                                id="plan-hours"
                                type="number"
                                min={1}
                                max={80}
                                value={expectedHoursPerWeek}
                                onChange={(e) => setExpectedHoursPerWeek(e.target.value)}
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="plan-objective">
                            Objective{' '}
                            <span className="font-normal text-muted-foreground">(optional)</span>
                        </Label>
                        <Textarea
                            id="plan-objective"
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            rows={4}
                            maxLength={4000}
                            placeholder="What should this internship achieve overall?"
                            className="mt-1.5"
                        />
                    </div>

                    <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                        Progress is flagged <span className="font-semibold">at risk</span> when it
                        falls more than 15 points behind the elapsed schedule, when a blocker is
                        open, or after a week without activity — and{' '}
                        <span className="font-semibold">overdue</span> once the target end date or
                        a milestone due date passes.
                    </p>
                </DialogBody>

                <DialogFooter>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {submitting ? 'Saving…' : 'Save plan'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
