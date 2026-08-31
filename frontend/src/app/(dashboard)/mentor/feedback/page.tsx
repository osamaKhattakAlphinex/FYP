'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageSquare, Star } from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { mentorAssignmentService } from '@/services/mentorAssignmentService'
import type { MentorAssignment } from '@/types/mentor.types'
import { cn, getInitials } from '@/lib/utils'

const apiRoot = () => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    return base.replace(/\/api\/?$/, '')
}
const resolveImage = (url?: string | null) =>
    !url ? undefined : url.startsWith('http') ? url : `${apiRoot()}${url}`

const Stars = ({ value }: { value?: number }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
            <Star
                key={n}
                className={cn(
                    'h-3.5 w-3.5',
                    value != null && n <= value
                        ? 'fill-accent-500 text-accent-500'
                        : 'text-muted-foreground/40',
                )}
            />
        ))}
    </div>
)

export default function MentorFeedbackPage() {
    useRoleProtection({ allowedRoles: ['mentor'] })

    const [assignments, setAssignments] = useState<MentorAssignment[]>([])
    const [loading, setLoading] = useState(true)

    const fetchCompleted = useCallback(async () => {
        try {
            setLoading(true)
            const res = await mentorAssignmentService.getMyAssignments('completed', 1, 50)
            setAssignments(res.assignments)
        } catch {
            toast.error('Failed to load feedback')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchCompleted()
    }, [fetchCompleted])

    const rated = assignments.filter((a) => a.ratings?.student != null)
    const avg = rated.length
        ? rated.reduce((sum, a) => sum + (a.ratings.student || 0), 0) / rated.length
        : 0

    return (
        <AppShell>
            <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    Feedback
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    What your mentees said after completed mentorships, and how you rated them.
                </p>
            </div>

            {!loading && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Card className="p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                            Completed mentorships
                        </p>
                        <p className="mt-1 text-xl font-bold text-foreground">
                            {assignments.length}
                        </p>
                    </Card>
                    <Card className="p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                            Average rating
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xl font-bold text-foreground">
                            {rated.length ? avg.toFixed(1) : '—'}
                            {rated.length > 0 && (
                                <Star className="h-4 w-4 fill-accent-500 text-accent-500" />
                            )}
                        </p>
                    </Card>
                    <Card className="p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                            Ratings received
                        </p>
                        <p className="mt-1 text-xl font-bold text-foreground">{rated.length}</p>
                    </Card>
                </div>
            )}

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full" />
                    ))}
                </div>
            ) : assignments.length === 0 ? (
                <Card className="p-10 text-center">
                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                        No completed mentorships yet
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Feedback appears here once you and your mentee complete a mentorship.
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {assignments.map((a) => {
                        const studentName = [a.student?.firstName, a.student?.lastName]
                            .filter(Boolean)
                            .join(' ')
                        return (
                            <Card key={a.id} className="p-4">
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-10 w-10 shrink-0">
                                        <AvatarImage
                                            src={resolveImage(a.student?.profilePicture)}
                                            alt={studentName}
                                        />
                                        <AvatarFallback>
                                            {getInitials(studentName || '?')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <Link
                                                href={`/mentor/students/${a.id}`}
                                                className="text-sm font-semibold text-foreground hover:underline"
                                            >
                                                {studentName || 'Unknown'}
                                            </Link>
                                            <span className="text-xs text-muted-foreground">
                                                {a.task?.title}
                                            </span>
                                        </div>

                                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                                            <div className="rounded-md bg-muted px-3 py-2">
                                                <p className="text-[11px] font-semibold text-foreground">
                                                    Their rating of you
                                                </p>
                                                {a.ratings?.student != null ? (
                                                    <>
                                                        <Stars value={a.ratings.student} />
                                                        {a.feedback?.student && (
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                &ldquo;{a.feedback.student}&rdquo;
                                                            </p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground">
                                                        Not rated yet
                                                    </p>
                                                )}
                                            </div>
                                            <div className="rounded-md bg-muted px-3 py-2">
                                                <p className="text-[11px] font-semibold text-foreground">
                                                    Your rating of them
                                                </p>
                                                {a.ratings?.mentor != null ? (
                                                    <>
                                                        <Stars value={a.ratings.mentor} />
                                                        {a.feedback?.mentor && (
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                &ldquo;{a.feedback.mentor}&rdquo;
                                                            </p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground">
                                                        You didn&apos;t leave feedback
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}
        </AppShell>
    )
}
