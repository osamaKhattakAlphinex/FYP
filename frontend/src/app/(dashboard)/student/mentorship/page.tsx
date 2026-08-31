'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Compass, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import AssignmentCard from '@/components/mentor/AssignmentCard'
import RateMentorModal from '@/components/mentor/RateMentorModal'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { mentorAssignmentService } from '@/services/mentorAssignmentService'
import type { AssignmentScope, MentorAssignment } from '@/types/mentor.types'
import { cn } from '@/lib/utils'

const TABS: Array<{ value: AssignmentScope; label: string }> = [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'all', label: 'All' },
]

const LIMIT = 10

export default function StudentMentorshipPage() {
    useRoleProtection({ allowedRoles: ['student'] })

    const [activeTab, setActiveTab] = useState<AssignmentScope>('active')
    const [assignments, setAssignments] = useState<MentorAssignment[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalAssignments, setTotalAssignments] = useState(0)
    const [rateTarget, setRateTarget] = useState<MentorAssignment | null>(null)

    const fetchAssignments = useCallback(async () => {
        try {
            setLoading(true)
            const res = await mentorAssignmentService.getStudentAssignments(
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

    const handleTabChange = (tab: AssignmentScope) => {
        setActiveTab(tab)
        setCurrentPage(1)
    }

    return (
        <AppShell
            rightRail={
                <Card className="overflow-hidden">
                    <div className="bg-accent-500 px-4 py-3 text-accent-foreground">
                        <p className="text-xs font-semibold uppercase tracking-wider">Tip</p>
                        <p className="mt-1 text-sm font-semibold">Ask early, ask often</p>
                    </div>
                    <div className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                            Your mentor is assigned to help you succeed on this task. Post
                            questions as soon as you hit a blocker instead of waiting.
                        </p>
                        <Button asChild variant="accent" size="sm" className="mt-3 w-full">
                            <Link href="/tasks">
                                <Sparkles className="h-3.5 w-3.5" /> Browse tasks
                            </Link>
                        </Button>
                    </div>
                </Card>
            }
        >
            <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    My mentorship
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Once a company assigns you a mentor for an accepted internship, it shows
                    up here.
                </p>
            </div>

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
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full" />
                    ))}
                </div>
            ) : assignments.length === 0 ? (
                <Card className="p-10 text-center">
                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
                        <Compass className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                        No mentorship yet
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Companies can assign a mentor once your application is accepted.
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {assignments.map((a) => (
                        <AssignmentCard
                            key={a.id}
                            assignment={a}
                            perspective="student"
                            href={`/student/mentorship/${a.id}`}
                            actions={
                                mentorAssignmentService.canStudentRate(a) ? (
                                    <Button
                                        size="sm"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            setRateTarget(a)
                                        }}
                                    >
                                        Rate mentor
                                    </Button>
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

            {rateTarget && (
                <RateMentorModal
                    assignment={rateTarget}
                    isOpen={!!rateTarget}
                    onClose={() => setRateTarget(null)}
                    onDone={(updated) =>
                        setAssignments((prev) =>
                            prev.map((a) => (a.id === updated.id ? updated : a)),
                        )
                    }
                />
            )}
        </AppShell>
    )
}
