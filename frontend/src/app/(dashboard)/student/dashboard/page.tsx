'use client'

import Link from 'next/link'
import { ClipboardList, CheckCircle2, Award, Eye, Send, Bell } from 'lucide-react'
import AppShell from '@/components/shared/AppShell'
import MiniProfileCard from '@/components/shared/MiniProfileCard'
import StatStrip from '@/components/shared/StatStrip'
import WelcomeBanner from '@/components/student/dashboard/WelcomeBanner'
import UpcomingDeadlinesCard from '@/components/student/dashboard/UpcomingDeadlinesCard'
import RecentActivityCard from '@/components/student/dashboard/RecentActivityCard'
import RecommendedTasksCard from '@/components/student/dashboard/RecommendedTasksCard'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useRoleProtection } from '@/hooks/useRoleProtection'

export default function StudentDashboard() {
    useRoleProtection({ allowedRoles: ['student'] })
    const { user } = useAuth()

    const userName =
        user?.firstName && user?.lastName
            ? `${user.firstName} ${user.lastName}`
            : user?.firstName || user?.email?.split('@')[0] || 'Student'

    const stats = [
        { label: 'Active tasks', value: '3', change: '+2', trend: 'up' as const, icon: ClipboardList },
        { label: 'Completed', value: '12', change: '+3', trend: 'up' as const, icon: CheckCircle2 },
        { label: 'Certificates', value: '8', change: '+1', trend: 'up' as const, icon: Award },
        { label: 'Profile views', value: '156', change: '+12', trend: 'up' as const, icon: Eye },
    ]

    const upcomingDeadlines = [
        {
            id: '1',
            taskTitle: 'UI/UX Design for Mobile App',
            companyName: 'TechCorp Inc.',
            dueDate: 'Dec 28, 2024',
            priority: 'high' as const,
            progress: 65,
        },
        {
            id: '2',
            taskTitle: 'API Integration Documentation',
            companyName: 'StartupXYZ',
            dueDate: 'Jan 5, 2025',
            priority: 'medium' as const,
            progress: 40,
        },
        {
            id: '3',
            taskTitle: 'Social Media Content Strategy',
            companyName: 'Marketing Pro',
            dueDate: 'Jan 10, 2025',
            priority: 'low' as const,
            progress: 20,
        },
    ]

    const recentActivities = [
        {
            id: '1',
            type: 'application' as const,
            title: 'Application submitted',
            description: 'You applied for "Frontend Developer" at WebDev Co.',
            timestamp: '2 hours ago',
            icon: '',
        },
        {
            id: '2',
            type: 'task_completed' as const,
            title: 'Task completed',
            description: 'Successfully delivered "Logo Design" for Creative Studio.',
            timestamp: '1 day ago',
            icon: '',
        },
        {
            id: '3',
            type: 'certificate' as const,
            title: 'Certificate earned',
            description: 'Verified credential for "React Development Basics".',
            timestamp: '2 days ago',
            icon: '',
        },
        {
            id: '4',
            type: 'message' as const,
            title: 'New message',
            description: 'TechCorp messaged you about your application.',
            timestamp: '3 days ago',
            icon: '',
        },
    ]

    return (
        <AppShell
            leftRail={
                <>
                    <MiniProfileCard
                        name={userName}
                        headline="CS Student · open to micro-internships"
                        href="/student/profile"
                        profileCompletion={75}
                        metrics={[
                            { label: 'Profile views', value: 156, href: '/student/analytics' },
                            { label: 'Saved tasks', value: 9, href: '/tasks' },
                            { label: 'Applications', value: 7, href: '/student/applications' },
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
                                href="/student/certificates"
                                className="-mx-2 rounded-md px-2 py-1.5 text-foreground hover:bg-muted"
                            >
                                My certificates
                            </Link>
                            <Link
                                href="/student/analytics"
                                className="-mx-2 rounded-md px-2 py-1.5 text-foreground hover:bg-muted"
                            >
                                Skill analytics
                            </Link>
                        </nav>
                    </Card>
                </>
            }
            rightRail={
                <>
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-foreground">News for you</h3>
                            <Bell className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <ul className="mt-3 space-y-3 text-sm">
                            {[
                                {
                                    title: 'Top 5 skills employers look for in 2026',
                                    meta: '4h ago · 1,243 readers',
                                },
                                {
                                    title: 'Building a portfolio that actually gets hired',
                                    meta: '1d ago · 892 readers',
                                },
                                {
                                    title: 'How AI is reshaping internship matching',
                                    meta: '2d ago · 612 readers',
                                },
                            ].map((n) => (
                                <li key={n.title}>
                                    <Link href="#" className="block group">
                                        <p className="text-sm font-medium text-foreground group-hover:text-brand-700 line-clamp-2">
                                            {n.title}
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {n.meta}
                                        </p>
                                    </Link>
                                </li>
                            ))}
                        </ul>
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
                                Students who apply to 3+ tasks per week are 2× more likely to get
                                hired within 30 days.
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
            <WelcomeBanner userName={userName.split(' ')[0]} profileCompletion={75} />
            <StatStrip stats={stats} />
            <RecommendedTasksCard />
            <UpcomingDeadlinesCard deadlines={upcomingDeadlines} />
            <RecentActivityCard activities={recentActivities} />
        </AppShell>
    )
}
