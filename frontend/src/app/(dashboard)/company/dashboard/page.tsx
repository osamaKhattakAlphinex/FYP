'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
    Activity,
    Award,
    ClipboardList,
    Inbox,
    Plus,
    UserCheck,
    Users,
} from 'lucide-react'
import AppShell from '@/components/shared/AppShell'
import CompanyMiniCard from '@/components/shared/CompanyMiniCard'
import StatStrip from '@/components/shared/StatStrip'
import ComingSoonCard from '@/components/shared/ComingSoonCard'
import CompanyWelcomeBanner from '@/components/company/dashboard/CompanyWelcomeBanner'
import ActiveTasksCard from '@/components/company/dashboard/ActiveTasksCard'
import UpcomingInterviewsCard from '@/components/company/dashboard/UpcomingInterviewsCard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { companyService } from '@/services/companyService'
import { taskService } from '@/services/taskService'
import { applicationService } from '@/services/applicationService'
import type { ApplicationStats } from '@/types/application.types'

export default function CompanyDashboard() {
    useRoleProtection({ allowedRoles: ['company'] })
    const { user } = useAuth()

    const [profile, setProfile] = useState<any>(null)
    const [profileLoading, setProfileLoading] = useState(true)
    const [activeTaskCount, setActiveTaskCount] = useState(0)
    const [tasksLoading, setTasksLoading] = useState(true)
    const [stats, setStats] = useState<ApplicationStats | null>(null)
    const [statsLoading, setStatsLoading] = useState(true)

    useEffect(() => {
        ;(async () => {
            try {
                const data = await companyService.getProfile()
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
                const res = await taskService.getMyTasks(1, 100, 'active')
                setActiveTaskCount(res.pagination?.totalTasks ?? res.tasks.length)
            } catch {
                // Non-critical
            } finally {
                setTasksLoading(false)
            }
        })()
    }, [])

    useEffect(() => {
        ;(async () => {
            try {
                const data = await applicationService.getStats()
                setStats(data)
            } catch {
                // Non-critical
            } finally {
                setStatsLoading(false)
            }
        })()
    }, [])

    const companyName =
        profile?.companyName || user?.companyName || 'your company'
    const industry = profile?.industry || 'Industry not set'
    const profileCompletion = profile?.profileCompletion ?? 0

    const totalApplications = useMemo(
        () =>
            stats
                ? Object.values(stats.statusCounts).reduce((a, b) => a + b, 0)
                : 0,
        [stats],
    )
    const newThisWeek = useMemo(
        () => (stats ? stats.dailyTrend.reduce((acc, d) => acc + d.count, 0) : 0),
        [stats],
    )
    const acceptedCount = stats?.statusCounts.accepted ?? 0

    const statStripData = [
        {
            label: 'Total applications',
            value: statsLoading ? '—' : String(totalApplications),
            icon: Inbox,
        },
        {
            label: 'Active tasks',
            value: tasksLoading ? '—' : String(activeTaskCount),
            icon: ClipboardList,
        },
        {
            label: 'New this week',
            value: statsLoading ? '—' : String(newThisWeek),
            icon: Activity,
        },
        {
            label: 'Hired',
            value: statsLoading ? '—' : String(acceptedCount),
            icon: UserCheck,
        },
    ]

    return (
        <AppShell
            leftRail={
                <>
                    <CompanyMiniCard
                        name={companyName}
                        industry={industry}
                        href="/company/profile"
                        isVerified={!!profile?.verification?.isVerified}
                        metrics={[
                            {
                                label: 'Active tasks',
                                value: activeTaskCount,
                                href: '/company/tasks',
                            },
                            {
                                label: 'Applications',
                                value: totalApplications,
                                href: '/company/candidates',
                            },
                            {
                                label: 'Hired',
                                value: acceptedCount,
                                href: '/company/candidates',
                            },
                        ]}
                    />
                    <Card className="p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Quick links
                        </p>
                        <nav className="mt-2 flex flex-col gap-0.5 text-sm">
                            <Link
                                href="/company/post-task"
                                className="-mx-2 rounded-md px-2 py-1.5 text-foreground hover:bg-muted"
                            >
                                Post a task
                            </Link>
                            <Link
                                href="/company/tasks"
                                className="-mx-2 rounded-md px-2 py-1.5 text-foreground hover:bg-muted"
                            >
                                Manage tasks
                            </Link>
                            <Link
                                href="/company/candidates"
                                className="-mx-2 rounded-md px-2 py-1.5 text-foreground hover:bg-muted"
                            >
                                Browse candidates
                            </Link>
                            <Link
                                href="/company/profile"
                                className="-mx-2 rounded-md px-2 py-1.5 text-foreground hover:bg-muted"
                            >
                                Edit profile
                            </Link>
                        </nav>
                    </Card>
                    {profileCompletion < 100 && !profileLoading && (
                        <Card className="p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Profile completion
                            </p>
                            <div className="mt-2 flex items-center justify-between text-sm">
                                <span className="font-semibold text-foreground">
                                    {profileCompletion}%
                                </span>
                                <Link
                                    href="/company/profile"
                                    className="text-xs font-semibold text-brand-700 hover:underline"
                                >
                                    Complete →
                                </Link>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full bg-accent-500 transition-all"
                                    style={{ width: `${profileCompletion}%` }}
                                />
                            </div>
                        </Card>
                    )}
                </>
            }
            rightRail={
                <>
                    <Card className="overflow-hidden">
                        <div className="bg-accent-500 px-4 py-3 text-accent-foreground">
                            <p className="text-xs font-semibold uppercase tracking-wider">
                                Post a task
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                                Reach qualified students fast
                            </p>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-muted-foreground">
                                Publishing more tasks expands your applicant pool and
                                shortens time-to-hire.
                            </p>
                            <Button
                                asChild
                                variant="accent"
                                size="sm"
                                className="mt-3 w-full"
                            >
                                <Link href="/company/post-task">
                                    <Plus className="h-3.5 w-3.5" /> New task
                                </Link>
                            </Button>
                        </div>
                    </Card>
                    <ComingSoonCard
                        title="Recent activity"
                        description="Status changes, interviews, and hires will show up here."
                        icon={Activity}
                    />
                </>
            }
        >
            <CompanyWelcomeBanner
                companyName={companyName}
                activeTasks={activeTaskCount}
            />
            <StatStrip stats={statStripData} />
            <ActiveTasksCard />

            {/* Module 6 placeholder */}
            <ComingSoonCard
                title="Top candidates"
                description="AI-ranked matches across all your tasks will appear here."
                icon={Users}
            />

            <UpcomingInterviewsCard />

            {/* Certificates placeholder */}
            <ComingSoonCard
                title="Hiring analytics"
                description="Trends, funnel metrics, and time-to-hire reports."
                icon={Award}
            />
        </AppShell>
    )
}
