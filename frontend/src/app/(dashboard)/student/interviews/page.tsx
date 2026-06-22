'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
    CalendarClock,
    Building2,
    Video,
    MessageSquarePlus,
    Loader2,
    Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogCloseButton,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { interviewService } from '@/services/interviewService'
import type { Interview, InterviewScope } from '@/types/interview.types'
import { cn, getInitials } from '@/lib/utils'

const TABS: Array<{ value: Extract<InterviewScope, 'upcoming' | 'past'>; label: string }> = [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
]

const LIMIT = 10

const resolveFileUrl = (url?: string | null) => {
    if (!url) return undefined
    if (/^https?:\/\//i.test(url)) return url
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    const root = apiBase.replace(/\/api\/?$/, '')
    return `${root}${url.startsWith('/') ? '' : '/'}${url}`
}

// "in 2 days, 4 hours" / "in 35 minutes" / "Started" / "Passed"
const countdown = (iso: string) => {
    const diff = new Date(iso).getTime() - Date.now()
    if (diff <= 0) return 'Started'
    const mins = Math.floor(diff / 60000)
    const days = Math.floor(mins / (60 * 24))
    const hours = Math.floor((mins % (60 * 24)) / 60)
    const minutes = mins % 60
    const parts: string[] = []
    if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`)
    if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`)
    if (days === 0 && hours === 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`)
    return `in ${parts.join(', ')}`
}

// Join link shows from 15 min before start until the interview ends
const isJoinable = (interview: Interview) => {
    if (!['scheduled', 'rescheduled'].includes(interview.status)) return false
    if (!interview.meeting?.link) return false
    const start = new Date(interview.scheduledAt).getTime()
    const end = start + (interview.durationMinutes || 30) * 60 * 1000
    const now = Date.now()
    return now >= start - 15 * 60 * 1000 && now <= end
}

export default function StudentInterviewsPage() {
    useRoleProtection({ allowedRoles: ['student'] })

    const [scope, setScope] = useState<'upcoming' | 'past'>('upcoming')
    const [interviews, setInterviews] = useState<Interview[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalInterviews, setTotalInterviews] = useState(0)

    // Feedback modal
    const [feedbackFor, setFeedbackFor] = useState<Interview | null>(null)
    const [feedbackText, setFeedbackText] = useState('')
    const [feedbackRating, setFeedbackRating] = useState('')
    const [submittingFeedback, setSubmittingFeedback] = useState(false)

    const fetchInterviews = useCallback(async () => {
        try {
            setLoading(true)
            const res = await interviewService.getMyInterviews(
                scope,
                currentPage,
                LIMIT,
            )
            setInterviews(res.interviews)
            setTotalPages(res.pagination.totalPages)
            setTotalInterviews(res.pagination.totalInterviews)
        } catch {
            toast.error('Failed to load interviews')
        } finally {
            setLoading(false)
        }
    }, [scope, currentPage])

    useEffect(() => {
        fetchInterviews()
    }, [fetchInterviews])

    const handleTabChange = (value: 'upcoming' | 'past') => {
        setScope(value)
        setCurrentPage(1)
    }

    const openFeedback = (interview: Interview) => {
        setFeedbackFor(interview)
        setFeedbackText(interview.studentFeedback ?? '')
        setFeedbackRating(
            interview.ratings?.student != null
                ? String(interview.ratings.student)
                : '',
        )
    }

    const submitFeedback = async () => {
        if (!feedbackFor) return
        try {
            setSubmittingFeedback(true)
            const updated = await interviewService.submitStudentFeedback(
                feedbackFor._id,
                {
                    studentFeedback: feedbackText.trim() || undefined,
                    studentRating: feedbackRating
                        ? Number(feedbackRating)
                        : undefined,
                },
            )
            setInterviews((prev) =>
                prev.map((i) => (i._id === updated._id ? updated : i)),
            )
            toast.success('Feedback submitted')
            setFeedbackFor(null)
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message || 'Failed to submit feedback',
            )
        } finally {
            setSubmittingFeedback(false)
        }
    }

    return (
        <AppShell
            rightRail={
                <Card className="overflow-hidden">
                    <div className="bg-brand-700 px-4 py-3 text-white">
                        <p className="text-xs font-semibold uppercase tracking-wider text-brand-100">
                            Tip
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                            Prepare with the agenda
                        </p>
                    </div>
                    <div className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                            Open an interview to read the agenda the company shared and
                            come prepared.
                        </p>
                        <Button asChild size="sm" className="mt-3 w-full">
                            <Link href="/student/applications">
                                <Sparkles className="h-3.5 w-3.5" /> My applications
                            </Link>
                        </Button>
                    </div>
                </Card>
            }
        >
            <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    My interviews
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Interviews scheduled with you by companies.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 border-b border-border pb-1">
                {TABS.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => handleTabChange(tab.value)}
                        className={cn(
                            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                            scope === tab.value
                                ? 'bg-brand-50 text-brand-700'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <p className="text-xs text-muted-foreground">
                {loading
                    ? 'Loading…'
                    : `${totalInterviews.toLocaleString()} interview${totalInterviews === 1 ? '' : 's'}`}
            </p>

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full" />
                    ))}
                </div>
            ) : interviews.length === 0 ? (
                <Card className="p-10 text-center">
                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
                        <CalendarClock className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                        No {scope} interviews
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {scope === 'upcoming'
                            ? 'When a company schedules an interview, it will appear here.'
                            : 'Past interviews will be listed here once they are done.'}
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {interviews.map((interview) => {
                        const company = interview.company
                        const ModeIcon = interviewService.getModeIcon(interview.mode)
                        const joinable = isJoinable(interview)
                        const showCountdown =
                            scope === 'upcoming' &&
                            ['scheduled', 'rescheduled'].includes(interview.status)
                        return (
                            <Card key={interview._id} className="flex flex-col gap-3 p-4">
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-12 w-12 rounded-md">
                                        {company?.logo && (
                                            <AvatarImage
                                                src={resolveFileUrl(company.logo)}
                                                alt={company.companyName}
                                                className="rounded-md object-cover"
                                            />
                                        )}
                                        <AvatarFallback className="rounded-md">
                                            {getInitials(company?.companyName || 'CO')}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                                            {interview.task?.title || 'Task'}
                                        </p>
                                        <p className="line-clamp-1 text-xs text-muted-foreground">
                                            <Building2 className="mr-1 inline h-3 w-3" />
                                            {company?.companyName || '—'}
                                        </p>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <CalendarClock className="h-3.5 w-3.5" />
                                                {interviewService.formatScheduledAt(
                                                    interview.scheduledAt,
                                                    interview.timezone,
                                                )}
                                            </span>
                                            {showCountdown && (
                                                <span className="font-medium text-brand-700">
                                                    {countdown(interview.scheduledAt)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <span
                                        className={cn(
                                            'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                                            interviewService.getStatusColor(
                                                interview.status,
                                            ),
                                        )}
                                    >
                                        {interviewService.getStatusLabel(
                                            interview.status,
                                        )}
                                    </span>
                                </div>

                                {interview.agenda && (
                                    <p className="whitespace-pre-wrap break-words rounded-md border border-border bg-muted/30 p-2.5 text-xs leading-relaxed text-foreground/80">
                                        {interview.agenda}
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Badge variant="muted" className="gap-1">
                                        <ModeIcon className="h-3 w-3" />
                                        {interviewService.getModeLabel(interview.mode)}
                                        {interview.mode === 'phone' &&
                                        interview.meeting.phoneNumber
                                            ? ` · ${interview.meeting.phoneNumber}`
                                            : ''}
                                        {interview.mode === 'onsite' &&
                                        interview.meeting.location
                                            ? ` · ${interview.meeting.location}`
                                            : ''}
                                    </Badge>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {joinable && (
                                            <Button
                                                asChild
                                                size="sm"
                                                variant="secondary"
                                            >
                                                <a
                                                    href={interview.meeting.link}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <Video className="h-3.5 w-3.5" />{' '}
                                                    Join meeting
                                                </a>
                                            </Button>
                                        )}
                                        {interview.status === 'completed' && (
                                            <Button
                                                size="sm"
                                                onClick={() => openFeedback(interview)}
                                            >
                                                <MessageSquarePlus className="h-3.5 w-3.5" />
                                                {interview.studentFeedback ||
                                                interview.ratings?.student != null
                                                    ? 'Edit feedback'
                                                    : 'Leave feedback'}
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {interview.status === 'cancelled' &&
                                    interview.cancellationReason && (
                                        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                                            <strong>Cancelled: </strong>
                                            {interview.cancellationReason}
                                        </div>
                                    )}
                            </Card>
                        )
                    })}
                </div>
            )}

            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2 text-sm">
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                        Previous
                    </Button>
                    <span className="text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Feedback modal */}
            <Dialog
                open={!!feedbackFor}
                onOpenChange={(open) => {
                    if (!open && !submittingFeedback) setFeedbackFor(null)
                }}
            >
                <DialogContent size="sm">
                    <DialogHeader>
                        <div>
                            <DialogTitle>Interview feedback</DialogTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {feedbackFor?.company?.companyName
                                    ? `Share how it went with ${feedbackFor.company.companyName}.`
                                    : 'Share how the interview went.'}
                            </p>
                        </div>
                        <DialogCloseButton />
                    </DialogHeader>
                    <DialogBody className="space-y-3">
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-muted-foreground">
                                Your feedback (optional)
                            </span>
                            <Textarea
                                rows={4}
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="What went well? Anything you'd note for next time?"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-muted-foreground">
                                Rating (optional)
                            </span>
                            <Select
                                value={feedbackRating}
                                onValueChange={setFeedbackRating}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="No rating" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5].map((r) => (
                                        <SelectItem key={r} value={String(r)}>
                                            {r} / 5
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </label>
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() => setFeedbackFor(null)}
                            disabled={submittingFeedback}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={submitFeedback}
                            disabled={submittingFeedback}
                        >
                            {submittingFeedback ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                                </>
                            ) : (
                                'Submit feedback'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppShell>
    )
}
