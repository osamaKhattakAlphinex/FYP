'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MessagesSquare } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Stars } from './FeedbackStars'
import { feedbackService } from '@/services/feedbackService'
import type { Feedback } from '@/types/feedback.types'

/**
 * Student dashboard rail card (Module 10): the newest feedback and how much of
 * it is still unread, linking to /student/feedback.
 */
export default function RecentFeedbackCard({ limit = 3 }: { limit?: number }) {
    const [records, setRecords] = useState<Feedback[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false
        feedbackService
            .getReceived(undefined, 1, limit)
            .then((res) => {
                if (cancelled) return
                setRecords(res.records)
                setTotal(res.pagination.totalRecords)
            })
            // A dashboard card must never break the dashboard.
            .catch(() => {
                if (!cancelled) setRecords([])
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [limit])

    const unread = records.filter((r) => !r.studentAcknowledgedAt).length

    return (
        <Card className="p-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Recent feedback</h3>
                <MessagesSquare className="h-4 w-4 text-muted-foreground" />
            </div>

            {loading ? (
                <div className="mt-3 space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : records.length === 0 ? (
                <p className="mt-3 rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
                    Feedback from companies and mentors appears here after interviews and completed
                    internships.
                </p>
            ) : (
                <>
                    {unread > 0 && (
                        <p className="mt-2 text-xs font-medium text-brand-700">
                            {unread} new {unread === 1 ? 'item' : 'items'} to read
                        </p>
                    )}
                    <ul className="mt-2 space-y-2.5">
                        {records.map((r) => (
                            <li key={r.id} className="text-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="truncate font-medium text-foreground">
                                        {r.authorName || 'Former user'}
                                    </span>
                                    <Stars value={r.overallRating} />
                                </div>
                                <p className="truncate text-xs text-muted-foreground">
                                    {feedbackService.getContextLabel(r.context)} · {r.task?.title || 'Task'}
                                    {!r.studentAcknowledgedAt && (
                                        <span className="ml-1.5 rounded bg-brand-50 px-1 font-semibold text-brand-700">
                                            new
                                        </span>
                                    )}
                                </p>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            <Link
                href="/student/feedback"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
            >
                {total > 0 ? `View all ${total}` : 'Open feedback'} <ArrowRight className="h-3 w-3" />
            </Link>
        </Card>
    )
}
