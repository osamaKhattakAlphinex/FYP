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
import type { ProgressMilestone } from '@/types/progress.types'

interface MilestoneFormModalProps {
    progressId: string
    /** Omit to create a new milestone. */
    milestone?: ProgressMilestone | null
    isOpen: boolean
    onClose: () => void
    onDone: (milestone: ProgressMilestone) => void
}

export default function MilestoneFormModal({
    progressId,
    milestone,
    isOpen,
    onClose,
    onDone,
}: MilestoneFormModalProps) {
    const editing = !!milestone

    const [title, setTitle] = useState(milestone?.title ?? '')
    const [description, setDescription] = useState(milestone?.description ?? '')
    const [dueDate, setDueDate] = useState(milestone?.dueDate?.slice(0, 10) ?? '')
    const [weight, setWeight] = useState(String(milestone?.weight ?? 1))
    const [estimatedHours, setEstimatedHours] = useState(
        milestone?.estimatedHours != null ? String(milestone.estimatedHours) : '',
    )
    const [isRequired, setIsRequired] = useState(milestone?.isRequired ?? true)
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (title.trim().length < 3) {
            toast.error('Give the milestone a title of at least 3 characters')
            return
        }

        try {
            setSubmitting(true)
            const payload = {
                title: title.trim(),
                description: description.trim() || undefined,
                dueDate: dueDate || null,
                weight: Number(weight) || 1,
                estimatedHours: estimatedHours === '' ? null : Number(estimatedHours),
                isRequired,
            }

            const saved = editing
                ? await progressService.updateMilestone(progressId, milestone!.id, payload)
                : await progressService.createMilestone(progressId, payload)

            toast.success(editing ? 'Milestone updated' : 'Milestone added')
            onDone(saved)
            onClose()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not save the milestone'))
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
                            {editing ? 'Edit milestone' : 'Add a milestone'}
                        </DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Milestones are how progress is measured. Weight them by how much
                            of the work each one represents.
                        </p>
                    </div>
                    <DialogCloseButton />
                </DialogHeader>

                <DialogBody className="max-h-[65vh] space-y-4">
                    <div>
                        <Label htmlFor="ms-title">Title</Label>
                        <Input
                            id="ms-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={200}
                            placeholder="e.g. Build the dashboard data layer"
                            className="mt-1.5"
                        />
                    </div>

                    <div>
                        <Label htmlFor="ms-desc">
                            What does &ldquo;done&rdquo; look like?{' '}
                            <span className="font-normal text-muted-foreground">(optional)</span>
                        </Label>
                        <Textarea
                            id="ms-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={4}
                            maxLength={4000}
                            placeholder="Spell out the acceptance criteria so the student knows exactly what to deliver."
                            className="mt-1.5"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            Clear criteria here are the single best way to avoid rework later.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                            <Label htmlFor="ms-due">Due date</Label>
                            <Input
                                id="ms-due"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="ms-weight">Weight (1-10)</Label>
                            <Input
                                id="ms-weight"
                                type="number"
                                min={1}
                                max={10}
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                className="mt-1.5"
                            />
                        </div>
                        <div>
                            <Label htmlFor="ms-hours">Est. hours</Label>
                            <Input
                                id="ms-hours"
                                type="number"
                                min={0}
                                max={500}
                                step="0.5"
                                value={estimatedHours}
                                onChange={(e) => setEstimatedHours(e.target.value)}
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                    <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border p-3">
                        <input
                            type="checkbox"
                            checked={isRequired}
                            onChange={(e) => setIsRequired(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-border accent-brand-600"
                        />
                        <span className="text-sm">
                            <span className="font-medium text-foreground">Required</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                                Required milestones must be finished (or cancelled) before the
                                internship can be closed out normally.
                            </span>
                        </span>
                    </label>
                </DialogBody>

                <DialogFooter>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add milestone'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
