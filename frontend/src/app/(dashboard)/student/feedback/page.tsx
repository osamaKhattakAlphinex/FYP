'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessagesSquare, Star, ThumbsUp } from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import FeedbackCard from '@/components/feedback/FeedbackCard'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { FEEDBACK_DIMENSIONS, feedbackService } from '@/services/feedbackService'
import { studentService } from '@/services/studentService'
import { apiErrorMessage } from '@/lib/apiError'
import type { Feedback, FeedbackContext, FeedbackSummary } from '@/types/feedback.types'
import { cn } from '@/lib/utils'

type Filter = 'all' | FeedbackContext

const FILTERS: Array<{ value: Filter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'internship', label: 'Internships' },
    { value: 'interview', label: 'Interviews' },
]

function StudentFeedbackContent() {
    useRoleProtection({ allowedRoles: ['student'] })
    const searchParams = useSearchParams()
    const initial = searchParams.get('context')

    const [filter, setFilter] = useState<Filter>(
        initial === 'internship' || initial === 'interview' ? initial : 'all',
    )
    const [records, setRecords] = useState<Feedback[]>([])
    const [summary, setSummary] = useState<FeedbackSummary | null>(null)
    const [loading, setLoading] = useState(true)

    const loadSummary = useCallback(async () => {
        try {
            const profile = await studentService.getProfile()
            const id = profile?.id ?? profile?._id
            if (id) setSummary(await feedbackService.getSummary(String(id)))
        } catch {
            // The list still works without the header numbers.
            setSummary(null)
        }
    }, [])

    const loadList = useCallback(async () => {
        try {
            setLoading(true)
            const res = await feedbackService.getReceived(filter === 'all' ? undefined : filter, 1, 50)
            setRecords(res.records)
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not load your feedback'))
        } finally {
            setLoading(false)
        }
    }, [filter])

    useEffect(() => {
        loadSummary()
    }, [loadSummary])

    useEffect(() => {
        loadList()
    }, [loadList])

    const handleChanged = (updated: Feedback | null) => {
        if (updated) setRecords((list) => list.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)))
        else loadList()
    }

    const rated = summary
        ? FEEDBACK_DIMENSIONS.filter((d) => summary.averageByDimension[d] != null)
        : []

    return (
        <AppShell>
            <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Feedback</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    What companies and mentors said about your interviews and internships: your
                    strengths, what to develop, and specific next steps.
                </p>
            </div>

            {summary && summary.count > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Card className="p-3">
                        <p className="text-xs font-medium text-muted-foreground">Feedback received</p>
                        <p className="mt-1 text-xl font-bold text-foreground">{summary.count}</p>
                    </Card>
                    <Card className="p-3">
                        <p className="text-xs font-medium text-muted-foreground">Average rating</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xl font-bold text-foreground">
                            {summary.averageOverall?.toFixed(1) ?? '—'}
                            <Star className="h-4 w-4 fill-accent-500 text-accent-500" />
                        </p>
                    </Card>
                    <Card className="p-3">
                        <p className="text-xs font-medium text-muted-foreground">Would recommend</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xl font-bold text-foreground">
                            {summary.recommendRate != null ? `${Math.round(summary.recommendRate * 100)}%` : '—'}
                            {summary.recommendRate != null && <ThumbsUp className="h-4 w-4 text-emerald-600" />}
                        </p>
                    </Card>
                    <Card className="p-3">
                        <p className="text-xs font-medium text-muted-foreground">By type</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                            {summary.byContext.internship} internship · {summary.byContext.interview} interview
                        </p>
                    </Card>
                </div>
            )}

            {summary && rated.length > 0 && (
                <Card className="p-4">
                    <h2 className="text-sm font-semibold text-foreground">Average by area</h2>
                    <div className="mt-3 space-y-2">
                        {rated.map((d) => {
                            const value = summary.averageByDimension[d] ?? 0
                            return (
                                <div key={d} className="flex items-center gap-3 text-sm">
                                    <span className="w-36 shrink-0 text-muted-foreground">
                                        {feedbackService.getDimensionLabel(d)}
                                    </span>
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                                        <div
                                            className="h-full rounded-full bg-accent-500"
                                            style={{ width: `${(value / 5) * 100}%` }}
                                        />
                                    </div>
                                    <span className="w-10 text-right font-semibold text-foreground">
                                        {value.toFixed(1)}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </Card>
            )}

            <div className="flex gap-1.5 border-b border-border pb-1">
                {FILTERS.map((f) => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={cn(
                            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                            filter === f.value
                                ? 'bg-brand-50 text-brand-700'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-40 w-full" />
                    ))}
                </div>
            ) : records.length === 0 ? (
                <Card className="p-10 text-center">
                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
                        <MessagesSquare className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">No feedback yet</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Companies can leave feedback after an interview, and companies and mentors after
                        an internship is completed. You will be emailed when they do.
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {records.map((fb) => (
                        <FeedbackCard
                            key={`${fb.id}-${fb.updatedAt}-${fb.studentAcknowledgedAt}`}
                            feedback={fb}
                            showTask
                            onChanged={handleChanged}
                        />
                    ))}
                </div>
            )}
        </AppShell>
    )
}

export default function StudentFeedbackPage() {
    return (
        <Suspense fallback={null}>
            <StudentFeedbackContent />
        </Suspense>
    )
}
