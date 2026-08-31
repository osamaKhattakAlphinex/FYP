'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Users, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import AssignmentCard from '@/components/mentor/AssignmentCard'
import AssignMentorModal from '@/components/company/AssignMentorModal'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { mentorAssignmentService } from '@/services/mentorAssignmentService'
import type {
    AssignmentScope,
    MentorAssignment,
    UnassignedInternship,
} from '@/types/mentor.types'
import { cn, getInitials } from '@/lib/utils'

const apiRoot = () => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    return base.replace(/\/api\/?$/, '')
}
const resolveImage = (url?: string | null) =>
    !url ? undefined : url.startsWith('http') ? url : `${apiRoot()}${url}`

const TABS: Array<{ value: AssignmentScope; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' },
]

const LIMIT = 10

export default function CompanyMentorsPage() {
    useRoleProtection({ allowedRoles: ['company'] })

    const [activeTab, setActiveTab] = useState<AssignmentScope>('all')
    const [assignments, setAssignments] = useState<MentorAssignment[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalAssignments, setTotalAssignments] = useState(0)

    const [unassigned, setUnassigned] = useState<UnassignedInternship[]>([])
    const [unassignedLoading, setUnassignedLoading] = useState(true)
    const [assignTarget, setAssignTarget] = useState<UnassignedInternship | null>(null)

    const fetchAssignments = useCallback(async () => {
        try {
            setLoading(true)
            const res = await mentorAssignmentService.getCompanyAssignments(
                currentPage,
                LIMIT,
                activeTab,
            )
            setAssignments(res.assignments)
            setTotalPages(res.pagination.totalPages)
            setTotalAssignments(res.pagination.totalAssignments)
        } catch {
            toast.error('Failed to load mentor assignments')
        } finally {
            setLoading(false)
        }
    }, [activeTab, currentPage])

    const fetchUnassigned = useCallback(async () => {
        try {
            setUnassignedLoading(true)
            const res = await mentorAssignmentService.getUnassignedInternships()
            setUnassigned(res.applications)
        } catch {
            // Non-critical — the page still works without this list.
        } finally {
            setUnassignedLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAssignments()
    }, [fetchAssignments])

    useEffect(() => {
        fetchUnassigned()
    }, [fetchUnassigned])

    const handleTabChange = (tab: AssignmentScope) => {
        setActiveTab(tab)
        setCurrentPage(1)
    }

    const handleAssigned = (assignment: MentorAssignment) => {
        setUnassigned((prev) =>
            prev.filter((u) => String(u.applicationId) !== String(assignment.applicationId)),
        )
        setAssignments((prev) => [assignment, ...prev])
        setTotalAssignments((n) => n + 1)
    }

    return (
        <AppShell
            rightRail={
                <Card className="overflow-hidden">
                    <div className="bg-accent-500 px-4 py-3 text-accent-foreground">
                        <p className="text-xs font-semibold uppercase tracking-wider">
                            Why mentorship
                        </p>
                        <p className="mt-1 text-sm font-semibold">Better outcomes</p>
                    </div>
                    <div className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                            Assigning a verified mentor to an accepted intern gives them
                            structured guidance and improves the quality of the delivered
                            work.
                        </p>
                    </div>
                </Card>
            }
        >
            <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    Mentors
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Assign mentors to accepted interns and track ongoing mentorships.
                </p>
            </div>

            {/* Unassigned internships needing a mentor */}
            {!unassignedLoading && unassigned.length > 0 && (
                <Card className="border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <h2 className="text-sm font-semibold text-foreground">
                            {unassigned.length} accepted intern
                            {unassigned.length === 1 ? '' : 's'} without a mentor
                        </h2>
                    </div>
                    <div className="mt-3 space-y-2">
                        {unassigned.map((u) => {
                            const studentName = [u.student?.firstName, u.student?.lastName]
                                .filter(Boolean)
                                .join(' ')
                            return (
                                <div
                                    key={u.applicationId}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-card px-3 py-2"
                                >
                                    <div className="flex min-w-0 items-center gap-2">
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarImage
                                                src={resolveImage(u.student?.profilePicture)}
                                                alt={studentName}
                                            />
                                            <AvatarFallback className="text-[10px]">
                                                {getInitials(studentName || '?')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-semibold text-foreground">
                                                {studentName || 'Unknown'}
                                            </p>
                                            <p className="truncate text-[11px] text-muted-foreground">
                                                {u.task?.title}
                                            </p>
                                        </div>
                                    </div>
                                    <Button size="sm" onClick={() => setAssignTarget(u)}>
                                        <UserPlus className="h-3.5 w-3.5" /> Assign mentor
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                </Card>
            )}

            {/* Tabs */}
            <div className="overflow-x-auto">
                <div className="flex gap-1.5 border-b border-border pb-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => handleTabChange(tab.value)}
                            className={cn(
                                'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                                activeTab === tab.value
                                    ? 'bg-brand-50 text-brand-700'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                {loading
                    ? 'Loading…'
                    : `${totalAssignments.toLocaleString()} mentorship${totalAssignments === 1 ? '' : 's'}`}
            </p>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full" />
                    ))}
                </div>
            ) : assignments.length === 0 ? (
                <Card className="p-10 text-center">
                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
                        <Users className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                        No mentorships yet
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Assign a mentor from an accepted candidate&apos;s page, or from the list
                        above.
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {assignments.map((a) => (
                        <AssignmentCard
                            key={a.id}
                            assignment={a}
                            perspective="company"
                            href={`/company/candidates/${a.applicationId}?tab=mentor`}
                        />
                    ))}
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
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </Button>
                </div>
            )}

            {assignTarget && (
                <AssignMentorModal
                    applicationId={assignTarget.applicationId}
                    studentName={[assignTarget.student?.firstName, assignTarget.student?.lastName]
                        .filter(Boolean)
                        .join(' ')}
                    isOpen={!!assignTarget}
                    onClose={() => setAssignTarget(null)}
                    onAssigned={handleAssigned}
                />
            )}
        </AppShell>
    )
}
