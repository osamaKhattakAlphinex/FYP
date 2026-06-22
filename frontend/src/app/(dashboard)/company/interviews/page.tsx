'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
    CalendarClock,
    CalendarDays,
    CheckCircle2,
    XCircle,
    Star,
    ArrowRight,
    Video,
} from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { interviewService } from '@/services/interviewService'
import type {
    Interview,
    InterviewScope,
    InterviewStats,
} from '@/types/interview.types'
import { cn, getInitials } from '@/lib/utils'

const TABS: Array<{ value: InterviewScope; label: string }> = [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
    { value: 'all', label: 'All' },
]

const LIMIT = 10

const resolveFileUrl = (url?: string | null) => {
    if (!url) return undefined
    if (/^https?:\/\//i.test(url)) return url
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    const root = apiBase.replace(/\/api\/?$/, '')
    return `${root}${url.startsWith('/') ? '' : '/'}${url}`
}

// "Join" link is shown from 15 min before start until the interview ends
const isJoinable = (interview: Interview) => {
    if (!['scheduled', 'rescheduled'].includes(interview.status)) return false
    if (!interview.meeting?.link) return false
    const start = new Date(interview.scheduledAt).getTime()
    const end = start + (interview.durationMinutes || 30) * 60 * 1000
    const now = Date.now()
    return now >= start - 15 * 60 * 1000 && now <= end
}

export default function CompanyInterviewsPage() {
    useRoleProtection({ allowedRoles: ['company'] })

    const [scope, setScope] = useState<InterviewScope>('upcoming')
    const [interviews, setInterviews] = useState<Interview[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalInterviews, setTotalInterviews] = useState(0)

    const [stats, setStats] = useState<InterviewStats | null>(null)
    const [statsLoading, setStatsLoading] = useState(true)

    useEffect(() => {
        ;(async () => {
            try {
                setStatsLoading(true)
                const data = await interviewService.getCompanyStats()
                setStats(data)
            } catch {
                // Stats are non-critical
            } finally {
                setStatsLoading(false)
            }
        })()
    }, [])

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

    const handleTabChange = (value: InterviewScope) => {
        setScope(value)
        setCurrentPage(1)
    }

    const statCards = [
        {
            label: 'Upcoming this week',
            value: stats?.upcomingThisWeek ?? 0,
            icon: CalendarDays,
            tint: 'bg-brand-50 text-brand-700',
        },
        {
            label: 'Scheduled',
            value: stats?.statusCounts.scheduled ?? 0,
            icon: CalendarClock,
            tint: 'bg-blue-50 text-blue-700',
        },
        {
            label: 'Completed',
            value: stats?.statusCounts.completed ?? 0,
            icon: CheckCircle2,
            tint: 'bg-green-50 text-green-700',
        },
        {
            label: 'Cancelled',
            value: stats?.statusCounts.cancelled ?? 0,
            icon: XCircle,
            tint: 'bg-red-50 text-red-700',
        },
        {
            label: 'Avg student rating',
            value: stats?.averageStudentRating
                ? stats.averageStudentRating.toFixed(1)
                : '—',
            icon: Star,
            tint: 'bg-amber-50 text-amber-700',
        },
    ]

    return (
        <AppShell
            rightRail={
                <Card className="overflow-hidden">
                    <div className="bg-accent-500 px-4 py-3 text-accent-foreground">
                        <p className="text-xs font-semibold uppercase tracking-wider">
                            Tip
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                            Confirm a day ahead
                        </p>
                    </div>
                    <div className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                            Sending a reminder the day before an interview reduces
                            no-shows significantly.
                        </p>
                    </div>
                </Card>
            }
        >
            <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    Interviews
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Every interview scheduled across your tasks.
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {statCards.map((s) => {
                    const Icon = s.icon
                    return (
                        <Card key={s.label} className="p-3">
                            <div
                                className={cn(
                                    'mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md',
                                    s.tint,
                                )}
                            >
                                <Icon className="h-4 w-4" />
                            </div>
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                            {statsLoading ? (
                                <Skeleton className="mt-1 h-6 w-12" />
                            ) : (
                                <p className="mt-0.5 text-lg font-semibold text-foreground">
                                    {s.value}
                                </p>
                            )}
                        </Card>
                    )
                })}
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
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full" />
                    ))}
                </div>
            ) : interviews.length === 0 ? (
                <Card className="p-10 text-center">
                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
                        <CalendarClock className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                        No {scope === 'all' ? '' : scope} interviews
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Schedule interviews from a candidate's profile in Candidates.
                    </p>
                    <Button asChild size="sm" className="mt-4">
                        <Link href="/company/candidates">Go to candidates</Link>
                    </Button>
                </Card>
            ) : (
                <div className="space-y-3">
                    {interviews.map((interview) => {
                        const student = interview.student
                        const ModeIcon = interviewService.getModeIcon(interview.mode)
                        const detailHref = `/company/candidates/${interview.applicationId}?tab=interview`
                        return (
                            <Card
                                key={interview._id}
                                className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center"
                            >
                                <Avatar className="h-12 w-12">
                                    {student?.profilePicture && (
                                        <AvatarImage
                                            src={resolveFileUrl(student.profilePicture)}
                                            alt=""
                                        />
                                    )}
                                    <AvatarFallback>
                                        {getInitials(
                                            `${student?.firstName || ''} ${student?.lastName || ''}`.trim() ||
                                                'NA',
                                        )}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="min-w-0 flex-1">
                                    <Link
                                        href={detailHref}
                                        className="line-clamp-1 text-sm font-semibold text-foreground hover:text-brand-700"
                                    >
                                        {student?.firstName} {student?.lastName}
                                    </Link>
                                    <p className="line-clamp-1 text-xs text-muted-foreground">
                                        {interview.task?.title || 'Task'}
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <CalendarClock className="h-3.5 w-3.5" />
                                            {interviewService.formatScheduledAt(
                                                interview.scheduledAt,
                                                interview.timezone,
                                            )}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ModeIcon className="h-3.5 w-3.5" />
                                            {interviewService.getModeLabel(
                                                interview.mode,
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={cn(
                                            'rounded-full px-2 py-0.5 text-xs font-medium',
                                            interviewService.getStatusColor(
                                                interview.status,
                                            ),
                                        )}
                                    >
                                        {interviewService.getStatusLabel(
                                            interview.status,
                                        )}
                                    </span>
                                    {isJoinable(interview) && (
                                        <Button asChild size="sm" variant="secondary">
                                            <a
                                                href={interview.meeting.link}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <Video className="h-3.5 w-3.5" /> Join
                                            </a>
                                        </Button>
                                    )}
                                    <Button asChild size="sm">
                                        <Link href={detailHref}>
                                            Manage <ArrowRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </Button>
                                </div>
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
        </AppShell>
    )
}
