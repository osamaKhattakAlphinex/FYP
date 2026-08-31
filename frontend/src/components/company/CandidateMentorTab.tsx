'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ExternalLink, Star, UserPlus, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import AssignMentorModal from '@/components/company/AssignMentorModal'
import { mentorAssignmentService } from '@/services/mentorAssignmentService'
import type { MentorAssignment } from '@/types/mentor.types'
import { cn, getInitials } from '@/lib/utils'

const apiRoot = () => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    return base.replace(/\/api\/?$/, '')
}
const resolveImage = (url?: string | null) =>
    !url ? undefined : url.startsWith('http') ? url : `${apiRoot()}${url}`

interface CandidateMentorTabProps {
    applicationId: string
    applicationStatus: string
    studentName?: string
}

export default function CandidateMentorTab({
    applicationId,
    applicationStatus,
    studentName,
}: CandidateMentorTabProps) {
    const [assignments, setAssignments] = useState<MentorAssignment[]>([])
    const [loading, setLoading] = useState(true)
    const [assignOpen, setAssignOpen] = useState(false)
    const [cancelling, setCancelling] = useState(false)

    const fetchAssignments = useCallback(async () => {
        try {
            setLoading(true)
            const rows = await mentorAssignmentService.getForApplication(applicationId)
            setAssignments(rows)
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to load mentor assignment')
        } finally {
            setLoading(false)
        }
    }, [applicationId])

    useEffect(() => {
        fetchAssignments()
    }, [fetchAssignments])

    const current = assignments.find((a) => a.status === 'pending' || a.status === 'active')
    const history = assignments.filter((a) => a.id !== current?.id)

    const handleCancel = async () => {
        if (!current) return
        if (!window.confirm('Cancel this mentor assignment?')) return
        try {
            setCancelling(true)
            const updated = await mentorAssignmentService.cancel(current.id)
            setAssignments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
            toast.success('Mentor assignment cancelled')
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not cancel this assignment')
        } finally {
            setCancelling(false)
        }
    }

    if (loading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
            </div>
        )
    }

    if (applicationStatus !== 'accepted' && !current) {
        return (
            <Card className="border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                    A mentor can be assigned once this candidate&apos;s application is{' '}
                    <span className="font-medium text-foreground">accepted</span>.
                </p>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {current ? (
                <Card className="p-4">
                    <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11 shrink-0">
                            <AvatarImage
                                src={resolveImage(current.mentor?.profilePicture)}
                                alt={mentorFullName(current)}
                            />
                            <AvatarFallback>
                                {getInitials(mentorFullName(current) || '?')}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">
                                    {mentorFullName(current)}
                                </p>
                                <span
                                    className={cn(
                                        'rounded-full px-2 py-0.5 text-xs font-semibold',
                                        mentorAssignmentService.getStatusColor(current.status),
                                    )}
                                >
                                    {mentorAssignmentService.getStatusLabel(current.status)}
                                </span>
                                {current.matchScore != null && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                                        <Star className="h-3 w-3" /> {current.matchScore}
                                    </span>
                                )}
                            </div>
                            {current.mentor?.headline && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {current.mentor.headline}
                                </p>
                            )}
                            {current.assignmentNote && (
                                <p className="mt-2 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                        Your note:
                                    </span>{' '}
                                    {current.assignmentNote}
                                </p>
                            )}
                            <div className="mt-3 flex gap-2">
                                <Button asChild size="sm" variant="secondary">
                                    <Link href={`/company/mentors`}>
                                        View mentorship <ExternalLink className="h-3.5 w-3.5" />
                                    </Link>
                                </Button>
                                {mentorAssignmentService.canCompanyCancel(current.status) && (
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={handleCancel}
                                        disabled={cancelling}
                                    >
                                        <XCircle className="h-3.5 w-3.5" />
                                        {cancelling ? 'Cancelling…' : 'Cancel'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>
            ) : (
                <Card className="p-6 text-center">
                    <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                        <UserPlus className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">
                        No mentor assigned yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Assign a verified mentor to guide this student through the task.
                    </p>
                    <Button size="sm" className="mt-3" onClick={() => setAssignOpen(true)}>
                        <UserPlus className="h-3.5 w-3.5" /> Assign mentor
                    </Button>
                </Card>
            )}

            {history.length > 0 && (
                <div>
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">
                        Previous requests
                    </p>
                    <div className="space-y-2">
                        {history.map((a) => (
                            <div
                                key={a.id}
                                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                            >
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-7 w-7">
                                        <AvatarImage
                                            src={resolveImage(a.mentor?.profilePicture)}
                                            alt={mentorFullName(a)}
                                        />
                                        <AvatarFallback className="text-[10px]">
                                            {getInitials(mentorFullName(a) || '?')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium text-foreground">
                                        {mentorFullName(a)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={cn(
                                            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                            mentorAssignmentService.getStatusColor(a.status),
                                        )}
                                    >
                                        {mentorAssignmentService.getStatusLabel(a.status)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {assignOpen && (
                <AssignMentorModal
                    applicationId={applicationId}
                    studentName={studentName}
                    isOpen={assignOpen}
                    onClose={() => setAssignOpen(false)}
                    onAssigned={(assignment) => {
                        setAssignments((prev) => [assignment, ...prev])
                    }}
                />
            )}
        </div>
    )
}

function mentorFullName(assignment: MentorAssignment) {
    return [assignment.mentor?.firstName, assignment.mentor?.lastName]
        .filter(Boolean)
        .join(' ')
}
