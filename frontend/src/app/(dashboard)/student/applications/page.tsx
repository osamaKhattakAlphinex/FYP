'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
    ArrowRight,
    Briefcase,
    Building2,
    CalendarDays,
    Sparkles,
    Star,
} from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { applicationService } from '@/services/applicationService'
import { taskService } from '@/services/taskService'
import type { Application, ApplicationStatus } from '@/types/application.types'
import { cn, getInitials } from '@/lib/utils'

const TABS: Array<{ value: 'all' | ApplicationStatus; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'interview_scheduled', label: 'Interview' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'withdrawn', label: 'Withdrawn' },
]

const LIMIT = 10

const matchScoreColor = (score?: number | null) => {
    if (score == null) return 'text-muted-foreground'
    if (score >= 80) return 'text-success'
    if (score >= 50) return 'text-warning'
    return 'text-destructive'
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

export default function StudentApplicationsPage() {
    useRoleProtection({ allowedRoles: ['student'] })

    const [activeTab, setActiveTab] = useState<'all' | ApplicationStatus>('all')
    const [applications, setApplications] = useState<Application[]>([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalApplications, setTotalApplications] = useState(0)

    const fetchApplications = useCallback(async () => {
        try {
            setLoading(true)
            const res = await applicationService.getMyApplications(
                currentPage,
                LIMIT,
                activeTab,
            )
            setApplications(res.applications)
            setTotalPages(res.pagination.totalPages)
            setTotalApplications(res.pagination.totalApplications)
        } catch {
            toast.error('Failed to load your applications')
        } finally {
            setLoading(false)
        }
    }, [activeTab, currentPage])

    useEffect(() => {
        fetchApplications()
    }, [fetchApplications])

    const handleTabChange = (value: 'all' | ApplicationStatus) => {
        setActiveTab(value)
        setCurrentPage(1)
    }

    return (
        <AppShell
            rightRail={
                <Card className="overflow-hidden">
                    <div className="bg-accent-500 px-4 py-3 text-accent-foreground">
                        <p className="text-xs font-semibold uppercase tracking-wider">
                            Tip
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                            Follow up early
                        </p>
                    </div>
                    <div className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                            Applications viewed within 48 hours are 3× more likely to
                            move forward. Keep your profile up to date.
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
                    My applications
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Track every application you have submitted.
                </p>
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
                        </button>
                    ))}
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                {loading
                    ? 'Loading…'
                    : `${totalApplications.toLocaleString()} application${totalApplications === 1 ? '' : 's'}`}
            </p>

            {/* Results */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full" />
                    ))}
                </div>
            ) : applications.length === 0 ? (
                <Card className="p-10 text-center">
                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
                        <Briefcase className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                        {activeTab === 'all'
                            ? 'No applications yet'
                            : 'No applications in this status'}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Browse open tasks and apply to ones that match your skills.
                    </p>
                    <Button asChild size="sm" className="mt-4">
                        <Link href="/tasks">
                            <Sparkles className="h-3.5 w-3.5" /> Browse tasks
                        </Link>
                    </Button>
                </Card>
            ) : (
                <div className="space-y-3">
                    {applications.map((app) => {
                        const task = app.task
                        const company = task?.company
                        const time = task?.applicationDeadline
                            ? taskService.getTimeRemaining(task.applicationDeadline)
                            : null
                        return (
                            <Card
                                key={app._id}
                                className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/30"
                            >
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-12 w-12 rounded-md">
                                        {company?.logo && (
                                            <AvatarImage
                                                src={company.logo}
                                                alt={company.companyName}
                                                className="rounded-md object-cover"
                                            />
                                        )}
                                        <AvatarFallback className="rounded-md">
                                            {getInitials(company?.companyName || 'CO')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <Link
                                            href={`/student/applications/${app._id}`}
                                            className="line-clamp-1 text-sm font-semibold text-foreground hover:text-brand-700"
                                        >
                                            {task?.title || 'Task'}
                                        </Link>
                                        <p className="line-clamp-1 text-xs text-muted-foreground">
                                            <Building2 className="mr-1 inline h-3 w-3" />
                                            {company?.companyName || '—'}
                                            {company?.industry && (
                                                <span className="ml-1">· {company.industry}</span>
                                            )}
                                        </p>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <CalendarDays className="h-3 w-3" />
                                                Applied {daysAgo(app.submittedAt)}
                                            </span>
                                            {time && !time.expired && (
                                                <span>
                                                    Closes in {time.days}d {time.hours}h
                                                </span>
                                            )}
                                            {time?.expired && <span>Closed</span>}
                                        </div>
                                    </div>

                                    {app.matchScore != null && (
                                        <div className="text-right">
                                            <p
                                                className={cn(
                                                    'flex items-center gap-1 text-sm font-bold',
                                                    matchScoreColor(app.matchScore),
                                                )}
                                            >
                                                <Star className="h-3.5 w-3.5" />
                                                {app.matchScore}%
                                            </p>
                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                match
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={cn(
                                                'rounded-full px-2 py-0.5 text-xs font-medium',
                                                applicationService.getStatusColor(app.status),
                                            )}
                                        >
                                            {applicationService.getStatusLabel(app.status)}
                                        </span>
                                        {task?.workType && (
                                            <Badge variant="muted" className="capitalize">
                                                {task.workType}
                                            </Badge>
                                        )}
                                        {task?.budgetDisplay && (
                                            <Badge variant="muted">{task.budgetDisplay}</Badge>
                                        )}
                                    </div>
                                    <Button asChild size="sm" variant="secondary">
                                        <Link href={`/student/applications/${app._id}`}>
                                            View <ArrowRight className="h-3.5 w-3.5" />
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
