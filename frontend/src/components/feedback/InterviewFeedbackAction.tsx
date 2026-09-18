'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, MessagesSquare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import FeedbackCard from './FeedbackCard'
import FeedbackFormModal from './FeedbackFormModal'
import { feedbackService } from '@/services/feedbackService'
import type { Feedback, FeedbackThread } from '@/types/feedback.types'

interface InterviewFeedbackActionProps {
    interviewId: string
    studentName?: string
    taskTitle?: string
}

/**
 * Module 10 entry point on the company's candidate page: once an interview is
 * completed, the company can leave structured feedback (US-14), or view and
 * edit what it already left. Self-contained so the Module 5 page only mounts it.
 */
export default function InterviewFeedbackAction({
    interviewId,
    studentName,
    taskTitle,
}: InterviewFeedbackActionProps) {
    const [thread, setThread] = useState<FeedbackThread | null>(null)
    const [open, setOpen] = useState(false)
    const [formOpen, setFormOpen] = useState(false)
    const [editing, setEditing] = useState<Feedback | null>(null)

    const load = useCallback(async () => {
        try {
            setThread(await feedbackService.getForInterview(interviewId))
        } catch {
            // The quick Module 5 note above still works; this block just hides.
            setThread(null)
        }
    }, [interviewId])

    useEffect(() => {
        load()
    }, [load])

    if (!thread) return null
    const { records, permissions } = thread
    if (!permissions.canGive && records.length === 0) return null

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                {permissions.canGive && !permissions.hasGiven && (
                    <Button size="sm" onClick={() => setFormOpen(true)}>
                        <MessagesSquare className="h-3.5 w-3.5" /> Give structured feedback
                    </Button>
                )}
                {records.length > 0 && (
                    <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
                        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {open ? 'Hide feedback' : 'View feedback'}
                    </Button>
                )}
            </div>

            {open &&
                records.map((fb) => (
                    <FeedbackCard
                        key={`${fb.id}-${fb.updatedAt}`}
                        feedback={fb}
                        onEdit={setEditing}
                        onChanged={() => load()}
                    />
                ))}

            {(formOpen || editing) && (
                <FeedbackFormModal
                    isOpen
                    context="interview"
                    targetId={interviewId}
                    existing={editing}
                    studentName={studentName}
                    taskTitle={taskTitle}
                    onClose={() => {
                        setFormOpen(false)
                        setEditing(null)
                    }}
                    onSaved={() => {
                        setOpen(true)
                        load()
                    }}
                />
            )}
        </div>
    )
}
