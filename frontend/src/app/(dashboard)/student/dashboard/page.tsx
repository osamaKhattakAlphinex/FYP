'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
    Activity,
    Award,
    Bell,
    CheckCircle2,
    FileText,
    Newspaper,
    Send,
    UserCheck,
} from 'lucide-react'
import AppShell from '@/components/shared/AppShell'
import MiniProfileCard from '@/components/shared/MiniProfileCard'
import StatStrip from '@/components/shared/StatStrip'
import ComingSoonCard from '@/components/shared/ComingSoonCard'
import WelcomeBanner from '@/components/student/dashboard/WelcomeBanner'
import RecommendedTasksCard from '@/components/student/dashboard/RecommendedTasksCard'
import UpcomingInterviewsCard from '@/components/student/dashboard/UpcomingInterviewsCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { studentService } from '@/services/studentService'
import { applicationService } from '@/services/applicationService'
import type { Application } from '@/types/application.types'
import { cn, getInitials } from '@/lib/utils'

const ACTIVE_STATUSES = [
    'submitted',
    'under_review',
    'shortlisted',
    'interview_scheduled',
] as const

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

export default function StudentDashboard() {
    useRoleProtection({ allowedRoles: ['student'] })
    const { user } = useAuth()

    const [profile, setProfile] = useState<any>(null)
    const [profileLoading, setProfileLoading] = useState(true)
    const [applications, setApplications] = useState<Application[]>([])
    const [appsLoading, setAppsLoading] = useState(true)
    const [totalApplications, setTotalApplications] = useState(0)

    useEffect(() => {
        ;(async () => {
            try {
                const data = await studentService.getProfile()
                setProfile(data)
            } catch {
                // Non-critical
            } finally {
                setProfileLoading(false)
            }
        })()
    }, [])

    useEffect(() => {
        ;(async () => {
            try {
                const res = await applicationService.getMyApplications(1, 50, 'all')
                setApplications(res.applications)
                setTotalApplications(res.pagination.totalApplications)
            } catch {
                // Non-critical
            } finally {
                setAppsLoading(false)
            }
        })()
    }, [])

    const userName = useMemo(() => {
        if (profile?.firstName) {
            return [profile.firstName, profile.lastName].filter(Boolean).join(' ')
        }
        if (user?.firstName && user?.lastName) {
            return `${user.firstName} ${user.lastName}`
        }
        return user?.firstName || user?.email?.split('@')[0] || 'Student'
    }, [profile, user])

    const firstName = userName.split(' ')[0]
    const profileCompletion = profile?.profileCompletion ?? 0
    const headline = profile?.headline || 'Add a headline to your profile'

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        applications.forEach((a) => {
            counts[a.status] = (counts[a.status] || 0) + 1
        })
        return counts
    }, [applications])

    const activeCount = ACTIVE_STATUSES.reduce(
        (sum, s) => sum + (statusCounts[s] || 0),
        0,
    )
    const acceptedCount = statusCounts['accepted'] || 0

    const stats = [
        {
            label: 'Total applications',
            value: appsLoading ? '—' : String(totalApplications),
            icon: Send,
        },
        {
            label: 'Active',
            value: appsLoading ? '—' : String(activeCount),
            icon: Activity,
        },
        {
            label: 'Accepted',
            value: appsLoading ? '—' : String(acceptedCount),
            icon: CheckCircle2,
        },
        {
            label: 'Profile completion',
            value: profileLoading ? '—' : `${profileCompletion}%`,
            icon: UserCheck,
        },
    ]

    const recentApplications = applications.slice(0, 4)

    return (
        <AppShell
            leftRail={
                <>
                    <MiniProfileCard
                        name={userName}
                        headline={headline}
                        avatarUrl={profile?.profilePicture}
                        href="/student/profile"
                        profileCompletion={profileCompletion}
                        metrics={[
                            {
                                label: 'Applications',
                                value: totalApplications,
                                href: '/student/applications',
                            },
                            {
                                label: 'Active',
                                value: activeCount,
                                href: '/student/applications',
                            },
                            {
                                label: 'Accepted',
                                value: acceptedCount,
                                href: '/student/applications',
                            },
                        ]}
                    />
                    <Card className="p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Quick links
                        </p>
                        <nav className="mt-2 flex flex-col gap-0.5 text-sm">
                            <Link
                                href="/student/applications"
                                className="-mx-2 rounded-md px-2 py-1.5 text-foreground hover:bg-muted"
                            >
                                My applications
                            </Link>
                            <Link
                                href="/tasks"
                                className="-mx-2 rounded-md px-2 py-1.5 text-foreground hover:bg-muted"
                            >
                                Browse tasks
                            </Link>
                            <Link
                                href="/student/profile"
                                className="-mx-2 rounded-md px-2 py-1.5 text-foreground hover:bg-muted"
                            >
                                Edit profile
                            </Link>
                        </nav>
                    </Card>
                </>
            }
            rightRail={
                <>
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-foreground">
                                Updates
                            </h3>
                            <Bell className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="mt-3 grid place-items-center rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-center">
                            <p className="text-sm font-medium text-foreground">
                                Coming soon
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Notifications and platform news.
                            </p>
                        </div>
                    </Card>
                    <Card className="overflow-hidden">
                        <div className="bg-brand-700 px-4 py-3 text-white">
                            <p className="text-xs font-semibold uppercase tracking-wider text-brand-100">
                                Tip
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                                Apply to 3 tasks this week
                            </p>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-muted-foreground">
                                Students who apply to 3+ tasks per week are 2× more likely
                                to get hired within 30 days.
                            </p>
                            <Button asChild size="sm" className="mt-3 w-full">
                                <Link href="/tasks">
                                    <Send className="h-3.5 w-3.5" /> Find tasks
                                </Link>
                            </Button>
                        </div>
                    </Card>
                </>
            }
        >
            <WelcomeBanner userName={firstName} profileCompletion={profileCompletion} />
            <StatStrip stats={stats} />
            <RecommendedTasksCard />

            {/* Recent applications — real data */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base">Recent applications</CardTitle>
                    <Link
                        href="/student/applications"
                        className="text-xs font-semibold text-brand-700 hover:underline"
                    >
                        View all
                    </Link>
                </CardHeader>
                <CardContent className="p-0">
                    {appsLoading ? (
                        <div className="space-y-2 px-6 pb-6">
                            <Skeleton className="h-16" />
                            <Skeleton className="h-16" />
                            <Skeleton className="h-16" />
                        </div>
                    ) : recentApplications.length === 0 ? (
                        <div className="px-6 pb-6 text-center">
                            <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                                <FileText className="h-4 w-4" />
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">
                                You haven't applied to any tasks yet.
                            </p>
                            <Button asChild size="sm" className="mt-3">
                                <Link href="/tasks">Browse tasks</Link>
                            </Button>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border">
                            {recentApplications.map((app) => {
                                const task = app.task
                                const company = task?.company
                                return (
                                    <li key={app._id}>
                                        <Link
                                            href={`/student/applications/${app._id}`}
                                            className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-muted/40"
                                        >
                                            <Avatar className="h-10 w-10 rounded-md">
                                                {company?.logo && (
                                                    <AvatarImage
                                                        src={company.logo}
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
                                                    {task?.title || 'Task'}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {company?.companyName || '—'} ·{' '}
                                                    {daysAgo(app.submittedAt)}
                                                </p>
                                            </div>
                                            <span
                                                className={cn(
                                                    'rounded-full px-2 py-0.5 text-xs font-medium',
                                                    applicationService.getStatusColor(
                                                        app.status,
                                                    ),
                                                )}
                                            >
                                                {applicationService.getStatusLabel(
                                                    app.status,
                                                )}
                                            </span>
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <UpcomingInterviewsCard />

            {/* Module 6 / certificates placeholder */}
            <ComingSoonCard
                title="Certificates & achievements"
                description="Earn verified credentials after completing tasks."
                icon={Award}
            />

            {/* News placeholder */}
            <ComingSoonCard
                title="News & guides"
                description="Career tips, success stories, and platform updates."
                icon={Newspaper}
            />
        </AppShell>
    )
}
