'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MessagesSquare } from 'lucide-react'
import toast from 'react-hot-toast'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import FeedbackCard from './FeedbackCard'
import FeedbackFormModal from './FeedbackFormModal'
import { feedbackService } from '@/services/feedbackService'
import { apiErrorMessage } from '@/lib/apiError'
import type { Feedback } from '@/types/feedback.types'

interface GivenFeedbackSectionProps {
    /** Base of the internship workspace link for this role. */
    workspaceBase: '/mentor/progress' | '/company/progress'
}

/**
 * "Feedback you've given" (Module 10): the structured feedback this user has
 * written about students, with edit/delete while it is still unacknowledged.
 */
export default function GivenFeedbackSection({ workspaceBase }: GivenFeedbackSectionProps) {
    const [records, setRecords] = useState<Feedback[]>([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState<Feedback | null>(null)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            const res = await feedbackService.getGiven(undefined, 1, 50)
            setRecords(res.records)
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not load the feedback you have given'))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    return (
        <section className="space-y-3">
            <div>
                <h2 className="inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
                    <MessagesSquare className="h-4 w-4 text-brand-600" /> Feedback you&apos;ve given
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Structured feedback you wrote for students once their internships closed. You can
                    edit it until the student acknowledges it.
                </p>
            </div>

            {loading ? (
                <Skeleton className="h-32 w-full" />
            ) : records.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                    You haven&apos;t written any feedback yet. Open a completed internship and use its
                    Feedback tab.
                </Card>
            ) : (
                records.map((fb) => (
                    <div key={`${fb.id}-${fb.updatedAt}`} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span>
                                For{' '}
                                <span className="font-medium text-foreground">
                                    {[fb.student?.firstName, fb.student?.lastName].filter(Boolean).join(' ') ||
                                        'a student'}
                                </span>
                            </span>
                            {fb.progressId && (
                                <Link
                                    href={`${workspaceBase}/${fb.progressId}`}
                                    className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                                >
                                    Open internship <ArrowRight className="h-3 w-3" />
                                </Link>
                            )}
                        </div>
                        <FeedbackCard feedback={fb} showTask onEdit={setEditing} onChanged={() => load()} />
                    </div>
                ))
            )}

            {editing && (
                <FeedbackFormModal
                    isOpen
                    context={editing.context}
                    targetId={(editing.context === 'interview' ? editing.interviewId : editing.progressId) ?? ''}
                    existing={editing}
                    taskTitle={editing.task?.title}
                    onClose={() => setEditing(null)}
                    onSaved={() => load()}
                />
            )}
        </section>
    )
}
