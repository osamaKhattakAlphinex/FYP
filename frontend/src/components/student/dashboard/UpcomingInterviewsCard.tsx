'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, ClipboardList, Building2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { interviewService } from '@/services/interviewService'
import type { Interview } from '@/types/interview.types'
import { cn, getInitials } from '@/lib/utils'

const resolveFileUrl = (url?: string | null) => {
    if (!url) return undefined
    if (/^https?:\/\//i.test(url)) return url
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    const root = apiBase.replace(/\/api\/?$/, '')
    return `${root}${url.startsWith('/') ? '' : '/'}${url}`
}

// "in 2 days" / "in 4 hours" / "in 35 minutes" / "Started"
const countdown = (iso: string) => {
    const diff = new Date(iso).getTime() - Date.now()
    if (diff <= 0) return 'Started'
    const mins = Math.floor(diff / 60000)
    const days = Math.floor(mins / (60 * 24))
    const hours = Math.floor((mins % (60 * 24)) / 60)
    const minutes = mins % 60
    if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`
    if (hours > 0) return `in ${hours} hour${hours === 1 ? '' : 's'}`
    return `in ${minutes} minute${minutes === 1 ? '' : 's'}`
}

export default function UpcomingInterviewsCard() {
    const [interviews, setInterviews] = useState<Interview[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        ;(async () => {
            try {
                const res = await interviewService.getMyInterviews('upcoming', 1, 3)
                setInterviews(res.interviews)
            } catch {
                // Non-critical — dashboard widget
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Upcoming interviews</CardTitle>
                <Link
                    href="/student/interviews"
                    className="text-xs font-semibold text-brand-700 hover:underline"
                >
                    View all
                </Link>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="space-y-2 px-6 pb-6">
                        <Skeleton className="h-16" />
                        <Skeleton className="h-16" />
                        <Skeleton className="h-16" />
                    </div>
                ) : interviews.length === 0 ? (
                    <div className="px-6 pb-6 text-center">
                        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
                            <ClipboardList className="h-5 w-5" />
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                            No upcoming interviews
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Once you're shortlisted, scheduled interviews will appear
                            here.
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {interviews.map((interview) => {
                            const company = interview.company
                            const ModeIcon = interviewService.getModeIcon(
                                interview.mode,
                            )
                            return (
                                <li key={interview._id}>
                                    <Link
                                        href="/student/interviews"
                                        className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-muted/40"
                                    >
                                        <Avatar className="h-10 w-10 rounded-md">
                                            {company?.logo && (
                                                <AvatarImage
                                                    src={resolveFileUrl(company.logo)}
                                                    alt={company.companyName}
                                                    className="rounded-md object-cover"
                                                />
                                            )}
                                            <AvatarFallback className="rounded-md">
                                                {getInitials(
                                                    company?.companyName || 'CO',
                                                )}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-foreground">
                                                {interview.task?.title || 'Task'}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                <Building2 className="mr-1 inline h-3 w-3" />
                                                {company?.companyName || '—'}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <CalendarClock className="h-3 w-3" />
                                                    {interviewService.formatScheduledAt(
                                                        interview.scheduledAt,
                                                        interview.timezone,
                                                    )}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <ModeIcon className="h-3 w-3" />
                                                    {interviewService.getModeLabel(
                                                        interview.mode,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                        <span
                                            className={cn(
                                                'shrink-0 font-medium text-brand-700',
                                                'text-xs',
                                            )}
                                        >
                                            {countdown(interview.scheduledAt)}
                                        </span>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    )
}
