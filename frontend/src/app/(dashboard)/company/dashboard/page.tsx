'use client'

import Link from 'next/link'
import { Inbox, ClipboardList, UserCheck, Eye, Plus } from 'lucide-react'
import AppShell from '@/components/shared/AppShell'
import CompanyMiniCard from '@/components/shared/CompanyMiniCard'
import StatStrip from '@/components/shared/StatStrip'
import CompanyWelcomeBanner from '@/components/company/dashboard/CompanyWelcomeBanner'
import ActiveTasksCard from '@/components/company/dashboard/ActiveTasksCard'
import RecentApplicationsCard from '@/components/company/dashboard/RecentApplicationsCard'
import TopCandidatesCard from '@/components/company/dashboard/TopCandidatesCard'
import RecentActivityCard from '@/components/student/dashboard/RecentActivityCard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useRoleProtection } from '@/hooks/useRoleProtection'

export default function CompanyDashboard() {
    useRoleProtection({ allowedRoles: ['company'] })
    const { user } = useAuth()
    const companyName = user?.companyName || 'your company'

    const stats = [
        { label: 'Total applications', value: '48', change: '+12', trend: 'up' as const, icon: Inbox },
        { label: 'Active tasks', value: '5', change: '+2', trend: 'up' as const, icon: ClipboardList },
        { label: 'Successful hires', value: '23', change: '+5', trend: 'up' as const, icon: UserCheck },
        { label: 'Profile views', value: '892', change: '+45', trend: 'up' as const, icon: Eye },
    ]

    const recentApplications = [
        { id: '1', candidateName: 'Sarah Ahmed', candidateAvatar: 'SA', taskTitle: 'Frontend Developer', appliedDate: '2h ago', matchScore: 94, status: 'new' as const },
        { id: '2', candidateName: 'Muhammad Khan', candidateAvatar: 'MK', taskTitle: 'UI/UX Designer', appliedDate: '5h ago', matchScore: 89, status: 'reviewing' as const },
        { id: '3', candidateName: 'Fatima Hassan', candidateAvatar: 'FH', taskTitle: 'Content Writer', appliedDate: '1d ago', matchScore: 92, status: 'shortlisted' as const },
        { id: '4', candidateName: 'Ali Raza', candidateAvatar: 'AR', taskTitle: 'Frontend Developer', appliedDate: '2d ago', matchScore: 87, status: 'reviewing' as const },
    ]

    const topCandidates = [
        { id: '1', name: 'Zainab Ali', avatar: 'ZA', title: 'Full Stack Developer', location: 'Islamabad', experience: '3 yrs', skills: ['React', 'Node.js', 'MongoDB', 'TypeScript', 'AWS'], matchScore: 96 },
        { id: '2', name: 'Hassan Malik', avatar: 'HM', title: 'UI/UX Designer', location: 'Lahore', experience: '2 yrs', skills: ['Figma', 'Adobe XD', 'Prototyping', 'User Research'], matchScore: 93 },
        { id: '3', name: 'Ayesha Siddiqui', avatar: 'AS', title: 'Content Strategist', location: 'Karachi', experience: '4 yrs', skills: ['SEO', 'Content', 'Social', 'Analytics'], matchScore: 91 },
    ]

    const recentActivities = [
        { id: '1', type: 'application' as const, title: 'New application', description: 'Sarah Ahmed applied for Frontend Developer.', timestamp: '2h ago', icon: '' },
        { id: '2', type: 'hire' as const, title: 'Candidate hired', description: 'Hired Ali Raza for Backend Development.', timestamp: '1d ago', icon: '' },
        { id: '3', type: 'task_completed' as const, title: 'Task completed', description: 'Fatima Hassan delivered "Logo Design".', timestamp: '2d ago', icon: '' },
        { id: '4', type: 'interview' as const, title: 'Interview scheduled', description: 'Muhammad Khan, tomorrow at 2pm.', timestamp: '3d ago', icon: '' },
    ]

    return (
        <AppShell
            leftRail={
                <>
                    <CompanyMiniCard
                        name={companyName}
                        industry="Technology"
                        href="/company/profile"
                        isVerified
                        metrics={[
                            { label: 'Profile views', value: 892, href: '/company/analytics' },
                            { label: 'Active tasks', value: 5, href: '/company/tasks' },
                            { label: 'Hires this month', value: 5, href: '/company/candidates' },
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
                                href="/company/analytics"
                                className="-mx-2 rounded-md px-2 py-1.5 text-foreground hover:bg-muted"
                            >
                                Hiring analytics
                            </Link>
                        </nav>
                    </Card>
                </>
            }
            rightRail={
                <>
                    <Card className="overflow-hidden">
                        <div className="bg-accent-500 px-4 py-3 text-accent-foreground">
                            <p className="text-xs font-semibold uppercase tracking-wider">
                                Boost your post
                            </p>
                            <p className="mt-1 text-sm font-semibold">
                                Featured tasks get 3× more applicants
                            </p>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-muted-foreground">
                                Promote your best openings to the top of student feeds for 7 days.
                            </p>
                            <Button asChild variant="accent" size="sm" className="mt-3 w-full">
                                <Link href="/company/post-task">
                                    <Plus className="h-3.5 w-3.5" /> Try it free
                                </Link>
                            </Button>
                        </div>
                    </Card>
                    <RecentActivityCard activities={recentActivities} />
                </>
            }
        >
            <CompanyWelcomeBanner companyName={companyName} activeTasks={5} />
            <StatStrip stats={stats} />
            <ActiveTasksCard />
            <RecentApplicationsCard applications={recentApplications} />
            <TopCandidatesCard candidates={topCandidates} />
        </AppShell>
    )
}
