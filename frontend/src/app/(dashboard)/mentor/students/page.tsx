'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
    Users,
    Clock,
    CheckCircle2,
    Star,
    ShieldAlert,
    Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import AssignmentCard from '@/components/mentor/AssignmentCard'
import RespondToAssignmentModal from '@/components/mentor/RespondToAssignmentModal'
import ActiveInternshipsCard from '@/components/progress/ActiveInternshipsCard'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { mentorAssignmentService } from '@/services/mentorAssignmentService'
import { mentorService } from '@/services/mentorService'
import type {
    AssignmentScope,
    MentorAssignment,
    MentorStats,
} from '@/types/mentor.types'
import { cn } from '@/lib/utils'

const TABS: Array<{ value: AssignmentScope; label: string }> = [
    { value: 'pending', label: 'Requests' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'all', label: 'All' },
]

const LIMIT = 10

export default function MentorStudentsPage() {
    useRoleProtection({ allowedRoles: ['mentor'] })

    const [activeTab, setActiveTab] = useState<AssignmentScope>('pending')
    const [assignments, setAssignments] = useState<MentorAssignment[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalAssignments, setTotalAssignments] = useState(0)

    const [stats, setStats] = useState<MentorStats | null>(null)
    const [statsLoading, setStatsLoading] = useState(true)

    const [respondTarget, setRespondTarget] = useState<{
        assignment: MentorAssignment
        action: 'accept' | 'decline'
    } | null>(null)

    const fetchAssignments = useCallback(async () => {
        try {
            setLoading(true)
            const res = await mentorAssignmentService.getMyAssignments(
                activeTab,
                currentPage,
                LIMIT,
            )
            setAssignments(res.assignments)
            setTotalPages(res.pagination.totalPages)
            setTotalAssignments(res.pagination.totalAssignments)
        } catch {
            toast.error('Failed to load your mentorships')
        } finally {
            setLoading(false)
        }
    }, [activeTab, currentPage])

    useEffect(() => {
        fetchAssignments()
    }, [fetchAssignments])

    useEffect(() => {
        ;(async () => {
            try {
                const s = await mentorService.getMyStats()
                setStats(s)
            } catch {
                // Stats are non-critical for this page.
            } finally {
                setStatsLoading(false)
            }
        })()
    }, [])

    const handleTabChange = (tab: AssignmentScope) => {
        setActiveTab(tab)
        setCurrentPage(1)
    }

    const handleResponded = (updated: MentorAssignment) => {
        setAssignments((prev) =>
            activeTab === 'pending'
                ? prev.filter((a) => a.id !== updated.id)
                : prev.map((a) => (a.id === updated.id ? updated : a)),
        )
        mentorService.getMyStats().then(setStats).catch(() => {})
    }

    const pendingCount = stats?.statusCounts?.pending ?? 0
    const isRejectedOrPending = stats && stats.verificationStatus !== 'approved'

    return (
        <AppShell
            rightRail={
                <Card className="overflow-hidden">
                    <div className="bg-accent-500 px-4 py-3 text-accent-foreground">
                        <p className="text-xs font-semibold uppercase tracking-wider">Tip</p>
                        <p className="mt-1 text-sm font-semibold">Respond quickly</p>
                    </div>
                    <div className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                            Companies see how responsive mentors are. Accepting or declining
                            requests within a day keeps you at the top of future suggestions.
                        </p>
                        <Button asChild variant="accent" size="sm" className="mt-3 w-full">
                            <Link href="/mentor/profile">
                                <Sparkles className="h-3.5 w-3.5" /> Update your profile
                            </Link>
                        </Button>
                    </div>
                </Card>
            }
        >
            <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    My mentees
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Manage mentorship requests and guide your active mentees.
                </p>
            </div>

            <ActiveInternshipsCard perspective="mentor" />

            {isRejectedOrPending && (
                <Card className="flex items-start gap-3 border-amber-200 bg-amber-50 p-4">
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                        <p className="text-sm font-semibold text-foreground">
                            {stats?.verificationStatus === 'rejected'
                                ? 'Your mentor account was not approved'
                                : 'Your mentor account is awaiting verification'}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {stats?.verificationStatus === 'rejected'
                                ? 'Update your profile and an administrator will review it again.'
                                : 'You will start receiving mentorship requests once an administrator approves your profile.'}
                        </p>
                    </div>
                </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {statsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))
                ) : (
                    <>
                        <Card className="p-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span className="text-xs font-medium">Pending</span>
                            </div>
                            <p className="mt-1 text-xl font-bold text-foreground">
                                {stats?.statusCounts?.pending ?? 0}
                            </p>
                        </Card>
                        <Card className="p-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Users className="h-4 w-4" />
                                <span className="text-xs font-medium">Active mentees</span>
                            </div>
                            <p className="mt-1 text-xl font-bold text-foreground">
                                {stats?.activeMentees ?? 0}
                                <span className="ml-1 text-sm font-normal text-muted-foreground">
                                    / {stats?.capacity.max ?? '—'}
                                </span>
                            </p>
                        </Card>
                        <Card className="p-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-xs font-medium">Completed</span>
                            </div>
                            <p className="mt-1 text-xl font-bold text-foreground">
                                {stats?.statusCounts?.completed ?? 0}
                            </p>
                        </Card>
                        <Card className="p-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Star className="h-4 w-4" />
                                <span className="text-xs font-medium">Avg. rating</span>
                            </div>
                            <p className="mt-1 text-xl font-bold text-foreground">
                                {stats?.totalRatings ? stats.averageRating.toFixed(1) : '—'}
                            </p>
                        </Card>
                    </>
                )}
            </div>

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
                            {tab.value === 'pending' && pendingCount > 0 && (
                                <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    {pendingCount}
                                </span>
                            )}
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
                        {activeTab === 'pending'
                            ? 'No pending requests'
                            : 'Nothing here yet'}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {activeTab === 'pending'
                            ? 'Companies will send mentorship requests once they accept an applicant.'
                            : 'Mentorships you accept or complete will show up here.'}
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {assignments.map((a) => (
                        <AssignmentCard
                            key={a.id}
                            assignment={a}
                            perspective="mentor"
                            href={
                                mentorAssignmentService.canExchangeNotes(a.status)
                                    ? `/mentor/students/${a.id}`
                                    : undefined
                            }
                            actions={
                                mentorAssignmentService.canMentorRespond(a.status) ? (
                                    <>
                                        <Button
                                            size="sm"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                setRespondTarget({ assignment: a, action: 'accept' })
                                            }}
                                        >
                                            Accept
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                setRespondTarget({ assignment: a, action: 'decline' })
                                            }}
                                        >
                                            Decline
                                        </Button>
                                    </>
                                ) : undefined
                            }
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

            {respondTarget && (
                <RespondToAssignmentModal
                    assignment={respondTarget.assignment}
                    action={respondTarget.action}
                    isOpen={!!respondTarget}
                    onClose={() => setRespondTarget(null)}
                    onDone={handleResponded}
                />
            )}
        </AppShell>
    )
}
