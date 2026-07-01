'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Users,
    Sparkles,
    CalendarDays,
    Star,
    CheckCircle2,
    UserCheck,
    Eye,
    ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import MatchScoreBadge from '@/components/match/MatchScoreBadge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { taskService } from '@/services/taskService'
import type { Task } from '@/services/taskService'
import { applicationService } from '@/services/applicationService'
import type {
    Application,
    ApplicationStats,
    ApplicationStatus,
} from '@/types/application.types'
import { cn } from '@/lib/utils'

const STATUS_FILTERS: Array<{ value: 'all' | ApplicationStatus; label: string }> = [
    { value: 'all', label: 'All statuses' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'interview_scheduled', label: 'Interview Scheduled' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'withdrawn', label: 'Withdrawn' },
]

type SortOption = 'newest' | 'oldest' | 'match'

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
    { value: 'match', label: '✨ Best match' },
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
]

const sortToApi = (sort: SortOption) => {
    if (sort === 'match') return { sortBy: 'matchScore', sortOrder: 'desc' as const }
    if (sort === 'oldest') return { sortBy: 'submittedAt', sortOrder: 'asc' as const }
    return { sortBy: 'submittedAt', sortOrder: 'desc' as const }
}

const daysAgo = (iso?: string) => {
    if (!iso) return ''
    const diff = Date.now() - new Date(iso).getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days <= 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        if (hours <= 0) return 'Just now'
        return `${hours}h ago`
    }
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
}

const initials = (first?: string, last?: string) =>
    `${(first || '').charAt(0)}${(last || '').charAt(0)}`.toUpperCase() || '?'

export default function CompanyCandidatesPage() {
    useRoleProtection({ allowedRoles: ['company'] })
    const router = useRouter()
    const searchParams = useSearchParams()
    const taskIdParam = searchParams.get('taskId')

    const [tasks, setTasks] = useState<Task[]>([])
    const [tasksLoading, setTasksLoading] = useState(true)
    const [selectedTaskId, setSelectedTaskId] = useState<string>(taskIdParam || 'all')
    const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all')
    const [sort, setSort] = useState<SortOption>('match')

    const [stats, setStats] = useState<ApplicationStats | null>(null)
    const [statsLoading, setStatsLoading] = useState(true)

    const [applications, setApplications] = useState<Application[]>([])
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalApplications, setTotalApplications] = useState(0)

    const limit = 12

    useEffect(() => {
        ;(async () => {
            try {
                setTasksLoading(true)
                const res = await taskService.getMyTasks(1, 100, 'all', 'createdAt', 'desc')
                setTasks(res.tasks)
                if (!taskIdParam && res.tasks.length > 0) {
                    setSelectedTaskId(res.tasks[0]._id)
                }
            } catch {
                toast.error('Failed to load your tasks')
            } finally {
                setTasksLoading(false)
            }
        })()
    }, [taskIdParam])

    useEffect(() => {
        ;(async () => {
            try {
                setStatsLoading(true)
                const data = await applicationService.getStats()
                setStats(data)
            } catch {
                // Stats are non-critical
            } finally {
                setStatsLoading(false)
            }
        })()
    }, [])

    const fetchApplications = useCallback(async () => {
        if (!selectedTaskId || selectedTaskId === 'all') {
            setApplications([])
            setTotalApplications(0)
            setTotalPages(1)
            return
        }
        try {
            setLoading(true)
            const { sortBy, sortOrder } = sortToApi(sort)
            const res = await applicationService.getApplicationsForTask(
                selectedTaskId,
                currentPage,
                limit,
                statusFilter,
                sortBy,
                sortOrder,
            )
            setApplications(res.applications)
            setTotalPages(res.pagination.totalPages)
            setTotalApplications(res.pagination.totalApplications)
        } catch {
            toast.error('Failed to load applications')
        } finally {
            setLoading(false)
        }
    }, [selectedTaskId, statusFilter, sort, currentPage])

    useEffect(() => {
        fetchApplications()
    }, [fetchApplications])

    const newThisWeek = useMemo(
        () => (stats ? stats.dailyTrend.reduce((acc, d) => acc + d.count, 0) : 0),
        [stats],
    )

    const handleTaskChange = (value: string) => {
        setSelectedTaskId(value)
        setCurrentPage(1)
        if (value === 'all') {
            router.replace('/company/candidates')
        } else {
            router.replace(`/company/candidates?taskId=${value}`)
        }
    }

    const selectedTask = tasks.find((t) => t._id === selectedTaskId)

    const statCards = [
        {
            label: 'Total applications',
            value: stats
                ? Object.values(stats.statusCounts).reduce((a, b) => a + b, 0)
                : 0,
            icon: Users,
            tint: 'bg-brand-50 text-brand-700',
        },
        {
            label: 'New this week',
            value: newThisWeek,
            icon: CalendarDays,
            tint: 'bg-blue-50 text-blue-700',
        },
        {
            label: 'Shortlisted',
            value: stats?.statusCounts.shortlisted ?? 0,
            icon: Star,
            tint: 'bg-indigo-50 text-indigo-700',
        },
        {
            label: 'Interview',
            value: stats?.statusCounts.interview_scheduled ?? 0,
            icon: UserCheck,
            tint: 'bg-purple-50 text-purple-700',
        },
        {
            label: 'Accepted',
            value: stats?.statusCounts.accepted ?? 0,
            icon: CheckCircle2,
            tint: 'bg-green-50 text-green-700',
        },
    ]

    return (
        <AppShell
            rightRail={
                <Card className="overflow-hidden">
                    <div className="bg-accent-500 px-4 py-3 text-accent-foreground">
                        <p className="text-xs font-semibold uppercase tracking-wider">Tip</p>
                        <p className="mt-1 text-sm font-semibold">
                            Reply within 48 hours
                        </p>
                    </div>
                    <div className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                            Candidates who hear back within two days are 3× more likely to
                            accept an offer.
                        </p>
                        <Button asChild variant="accent" size="sm" className="mt-3 w-full">
                            <Link href="/company/tasks">
                                <Sparkles className="h-3.5 w-3.5" /> Manage tasks
                            </Link>
                        </Button>
                    </div>
                </Card>
            }
        >
            <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    Candidates
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Review applicants across all of your tasks
                </p>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {statCards.map((s) => {
                    const Icon = s.icon
                    return (
                        <Card key={s.label} className="p-3">
                            <div className={cn('mb-2 inline-flex h-8 w-8 items-center justify-center rounded-md', s.tint)}>
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

            {/* Filter bar */}
            <Card className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                    <Select value={selectedTaskId} onValueChange={handleTaskChange}>
                        <SelectTrigger className="h-9">
                            <SelectValue
                                placeholder={tasksLoading ? 'Loading tasks…' : 'Select a task'}
                            />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">— Choose a task —</SelectItem>
                            {tasks.map((t) => (
                                <SelectItem key={t._id} value={t._id}>
                                    {t.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2 sm:w-auto">
                    <Select
                        value={statusFilter}
                        onValueChange={(v) => {
                            setStatusFilter(v as 'all' | ApplicationStatus)
                            setCurrentPage(1)
                        }}
                    >
                        <SelectTrigger className="h-9 sm:w-44">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_FILTERS.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={sort}
                        onValueChange={(v) => {
                            setSort(v as SortOption)
                            setCurrentPage(1)
                        }}
                    >
                        <SelectTrigger className="h-9 sm:w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SORT_OPTIONS.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            <p className="text-xs text-muted-foreground">
                {selectedTaskId === 'all'
                    ? 'Pick a task above to view its applicants.'
                    : loading
                      ? 'Loading…'
                      : `${totalApplications.toLocaleString()} applicant${totalApplications === 1 ? '' : 's'}` +
                        (selectedTask ? ` for "${selectedTask.title}"` : '')}
            </p>

            {/* Results */}
            {loading ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-36 w-full" />
                    ))}
                </div>
            ) : selectedTaskId === 'all' ? (
                <Card className="p-10 text-center">
                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
                        <Users className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                        Select a task to begin
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Use the dropdown above to load candidates for a specific task.
                    </p>
                </Card>
            ) : applications.length === 0 ? (
                <Card className="p-10 text-center">
                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
                        <Users className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                        No applicants yet
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {statusFilter !== 'all'
                            ? 'Try clearing the status filter.'
                            : 'New candidates will show up here as soon as students apply.'}
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {applications.map((app) => {
                        const s = app.student
                        const unread = !app.viewedByCompanyAt
                        return (
                            <Card
                                key={app._id}
                                className="relative flex flex-col gap-3 p-4 transition-colors hover:bg-muted/30"
                            >
                                {unread && (
                                    <span
                                        aria-label="New application"
                                        title="Not viewed yet"
                                        className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-brand-600"
                                    />
                                )}
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-12 w-12">
                                        {s?.profilePicture && (
                                            <AvatarImage src={s.profilePicture} alt="" />
                                        )}
                                        <AvatarFallback>
                                            {initials(s?.firstName, s?.lastName)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                                            {s?.firstName} {s?.lastName}
                                        </p>
                                        {s?.headline && (
                                            <p className="line-clamp-1 text-xs text-muted-foreground">
                                                {s.headline}
                                            </p>
                                        )}
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {[s?.locationCity, s?.locationCountry]
                                                .filter(Boolean)
                                                .join(', ') || '—'}
                                            <span className="mx-1.5">·</span>
                                            Applied {daysAgo(app.submittedAt)}
                                        </p>
                                    </div>
                                    {app.matchScore != null && (
                                        <div className="flex-shrink-0">
                                            <MatchScoreBadge
                                                score={app.matchScore}
                                                size="md"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="soft">{selectedTask?.title ?? 'Task'}</Badge>
                                    <span
                                        className={cn(
                                            'rounded-full px-2 py-0.5 text-xs font-medium',
                                            applicationService.getStatusColor(app.status),
                                        )}
                                    >
                                        {applicationService.getStatusLabel(app.status)}
                                    </span>
                                </div>

                                <div className="flex justify-end">
                                    <Button asChild size="sm" variant="secondary">
                                        <Link href={`/company/candidates/${app._id}`}>
                                            <Eye className="h-3.5 w-3.5" /> View
                                            <ArrowRight className="h-3.5 w-3.5" />
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
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </Button>
                </div>
            )}
        </AppShell>
    )
}
