'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Briefcase, Building2, ExternalLink, Star } from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import GuidanceNotesPanel from '@/components/mentor/GuidanceNotesPanel'
import RateMentorModal from '@/components/mentor/RateMentorModal'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { useAuth } from '@/contexts/AuthContext'
import { mentorAssignmentService } from '@/services/mentorAssignmentService'
import type { MentorAssignment } from '@/types/mentor.types'
import { cn, getInitials } from '@/lib/utils'

const apiRoot = () => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    return base.replace(/\/api\/?$/, '')
}
const resolveImage = (url?: string | null) =>
    !url ? undefined : url.startsWith('http') ? url : `${apiRoot()}${url}`

export default function StudentMentorshipDetailPage() {
    useRoleProtection({ allowedRoles: ['student'] })
    const params = useParams()
    const { user } = useAuth()
    const assignmentId = params.assignmentId as string

    const [assignment, setAssignment] = useState<MentorAssignment | null>(null)
    const [loading, setLoading] = useState(true)
    const [rateOpen, setRateOpen] = useState(false)

    const fetchAssignment = useCallback(async () => {
        try {
            setLoading(true)
            const a = await mentorAssignmentService.getAssignment(assignmentId)
            setAssignment(a)
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load this mentorship')
        } finally {
            setLoading(false)
        }
    }, [assignmentId])

    useEffect(() => {
        fetchAssignment()
    }, [fetchAssignment])

    if (loading) {
        return (
            <AppShell>
                <div className="space-y-4">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </AppShell>
        )
    }

    if (!assignment) {
        return (
            <AppShell>
                <Card className="p-10 text-center">
                    <p className="text-sm font-semibold text-foreground">
                        Mentorship not found
                    </p>
                    <Button asChild variant="secondary" size="sm" className="mt-3">
                        <Link href="/student/mentorship">Back to my mentorship</Link>
                    </Button>
                </Card>
            </AppShell>
        )
    }

    const mentor = assignment.mentor
    const mentorName = [mentor?.firstName, mentor?.lastName].filter(Boolean).join(' ')
    const canPostNotes = mentorAssignmentService.canExchangeNotes(assignment.status)
    const canRate = mentorAssignmentService.canStudentRate(assignment)

    return (
        <AppShell maxWidth="wide">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon-sm">
                    <Link href="/student/mentorship">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                        {mentorName || 'Your mentor'}
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {assignment.task?.title || 'Untitled task'}
                    </p>
                </div>
                <span
                    className={cn(
                        'ml-auto rounded-full px-2.5 py-1 text-xs font-semibold',
                        mentorAssignmentService.getStatusColor(assignment.status),
                    )}
                >
                    {mentorAssignmentService.getStatusLabel(assignment.status)}
                </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-1">
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                                <AvatarImage
                                    src={resolveImage(mentor?.profilePicture)}
                                    alt={mentorName}
                                />
                                <AvatarFallback>{getInitials(mentorName || '?')}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                    {mentorName || 'Unknown'}
                                </p>
                                {mentor?.headline && (
                                    <p className="truncate text-xs text-muted-foreground">
                                        {mentor.headline}
                                    </p>
                                )}
                            </div>
                        </div>
                        {mentor?.currentPosition && mentor?.currentCompany && (
                            <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Briefcase className="h-3.5 w-3.5" />
                                {mentor.currentPosition} at {mentor.currentCompany}
                            </p>
                        )}
                        {mentor?.bio && (
                            <p className="mt-2 text-xs text-muted-foreground">{mentor.bio}</p>
                        )}
                        {mentor?.expertise && mentor.expertise.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {mentor.expertise.map((e) => (
                                    <span
                                        key={e.id}
                                        className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                    >
                                        {e.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </Card>

                    <Card className="p-4">
                        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <Building2 className="h-4 w-4" /> Task
                        </h2>
                        <p className="mt-1.5 text-sm text-foreground">
                            {assignment.task?.title}
                        </p>
                        {assignment.company?.companyName && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                {assignment.company.companyName}
                            </p>
                        )}
                        <Button asChild variant="secondary" size="sm" className="mt-3 w-full">
                            <Link href={`/student/applications`}>
                                View application <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    </Card>

                    {canRate && (
                        <Button className="w-full" onClick={() => setRateOpen(true)}>
                            <Star className="h-4 w-4" /> Rate your mentor
                        </Button>
                    )}

                    {assignment.status === 'completed' && assignment.ratings?.student != null && (
                        <Card className="p-4">
                            <p className="text-xs text-muted-foreground">
                                You rated this mentorship {assignment.ratings.student}/5
                            </p>
                        </Card>
                    )}
                </div>

                <div className="lg:col-span-2">
                    {canPostNotes ? (
                        <GuidanceNotesPanel
                            assignmentId={assignment.id}
                            viewerRole="student"
                            viewerUserId={user?._id}
                            canPost={canPostNotes}
                        />
                    ) : (
                        <Card className="p-10 text-center">
                            <p className="text-sm text-muted-foreground">
                                Notes are read-only for closed mentorships.
                            </p>
                        </Card>
                    )}
                </div>
            </div>

            {rateOpen && (
                <RateMentorModal
                    assignment={assignment}
                    isOpen={rateOpen}
                    onClose={() => setRateOpen(false)}
                    onDone={(updated) => setAssignment(updated)}
                />
            )}
        </AppShell>
    )
}
