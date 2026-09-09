'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft,
    Briefcase,
    Building2,
    CheckCircle2,
    ExternalLink,
    Loader2,
    MapPin,
    Star,
} from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import GuidanceNotesPanel from '@/components/mentor/GuidanceNotesPanel'
import CompleteMentorshipModal from '@/components/mentor/CompleteMentorshipModal'
import InternshipProgressLink from '@/components/progress/InternshipProgressLink'
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

export default function MentorMenteeDetailPage() {
    useRoleProtection({ allowedRoles: ['mentor'] })
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const assignmentId = params.assignmentId as string

    const [assignment, setAssignment] = useState<MentorAssignment | null>(null)
    const [loading, setLoading] = useState(true)
    const [completeOpen, setCompleteOpen] = useState(false)

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
                        <Link href="/mentor/students">Back to my mentees</Link>
                    </Button>
                </Card>
            </AppShell>
        )
    }

    const student = assignment.student
    const studentName = [student?.firstName, student?.lastName].filter(Boolean).join(' ')
    const canPostNotes = mentorAssignmentService.canExchangeNotes(assignment.status)
    const canComplete = mentorAssignmentService.canMentorComplete(assignment.status)

    return (
        <AppShell maxWidth="wide">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon-sm">
                    <Link href="/mentor/students">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                        {studentName || 'Mentee'}
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
                {/* Left: student + task summary */}
                <div className="space-y-4 lg:col-span-1">
                    <Card className="p-4">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                                <AvatarImage
                                    src={resolveImage(student?.profilePicture)}
                                    alt={studentName}
                                />
                                <AvatarFallback>{getInitials(studentName || '?')}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                    {studentName || 'Unknown'}
                                </p>
                                {student?.headline && (
                                    <p className="truncate text-xs text-muted-foreground">
                                        {student.headline}
                                    </p>
                                )}
                            </div>
                        </div>
                        {(student?.locationCity || student?.locationCountry) && (
                            <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />
                                {[student.locationCity, student.locationCountry]
                                    .filter(Boolean)
                                    .join(', ')}
                            </p>
                        )}
                        <Button asChild variant="secondary" size="sm" className="mt-3 w-full">
                            <Link href={`/profile/${assignment.studentId}`}>
                                View full profile <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    </Card>

                    <Card className="p-4">
                        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <Briefcase className="h-4 w-4" /> Task
                        </h2>
                        <p className="mt-1.5 text-sm text-foreground">
                            {assignment.task?.title}
                        </p>
                        {assignment.company?.companyName && (
                            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Building2 className="h-3.5 w-3.5" />
                                {assignment.company.companyName}
                            </p>
                        )}
                        {assignment.assignmentNote && (
                            <div className="mt-3 rounded-md bg-muted px-3 py-2">
                                <p className="text-[11px] font-semibold text-foreground">
                                    Note from the company
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {assignment.assignmentNote}
                                </p>
                            </div>
                        )}
                    </Card>

                    {assignment.status === 'completed' && (
                        <Card className="p-4">
                            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                <Star className="h-4 w-4" /> Outcome
                            </h2>
                            {assignment.ratings?.mentor != null && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                    You rated this mentee {assignment.ratings.mentor}/5
                                </p>
                            )}
                            {assignment.ratings?.student != null ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    They rated you {assignment.ratings.student}/5
                                </p>
                            ) : (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Waiting for the student to rate this mentorship.
                                </p>
                            )}
                        </Card>
                    )}

                    {canComplete && (
                        <Button className="w-full" onClick={() => setCompleteOpen(true)}>
                            <CheckCircle2 className="h-4 w-4" /> Mark mentorship complete
                        </Button>
                    )}
                </div>

                {/* Right: internship progress, then guidance notes */}
                <div className="space-y-3 lg:col-span-2">
                    {assignment.applicationId && (
                        <InternshipProgressLink
                            applicationId={String(assignment.applicationId)}
                            perspective="mentor"
                            applicationStatus={assignment.application?.status}
                        />
                    )}
                    {canPostNotes || assignment.status === 'declined' ? (
                        <GuidanceNotesPanel
                            assignmentId={assignment.id}
                            viewerRole="mentor"
                            viewerUserId={user?._id}
                            canPost={canPostNotes}
                        />
                    ) : (
                        <Card className="p-10 text-center">
                            <p className="text-sm text-muted-foreground">
                                Notes open once the mentorship is active.
                            </p>
                        </Card>
                    )}
                </div>
            </div>

            {completeOpen && (
                <CompleteMentorshipModal
                    assignment={assignment}
                    isOpen={completeOpen}
                    onClose={() => setCompleteOpen(false)}
                    onDone={(updated) => setAssignment(updated)}
                />
            )}
        </AppShell>
    )
}
