'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Heart, Briefcase, Star, ArrowRight } from 'lucide-react'
import { companyService } from '@/services/companyService'
import CompanyProfileHeader from '@/components/company/profile/CompanyProfileHeader'
import AboutSection from '@/components/company/profile/AboutSection'
import CompanyInfoSection from '@/components/company/profile/CompanyInfoSection'
import CompanyCultureSection from '@/components/company/profile/CompanyCultureSection'
import CompanyTeamSection from '@/components/company/profile/CompanyTeamSection'
import CompanyStatsPanel from '@/components/company/profile/CompanyStatsPanel'
import ActiveTasksPreview from '@/components/company/profile/ActiveTasksPreview'
import SectionCard from '@/components/shared/SectionCard'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import type {
    CompanyProfile,
    CompanyReview,
    CompanyTask,
} from '@/types/company.types'
import { cn, getInitials } from '@/lib/utils'

const transformCompanyData = (backendData: any): CompanyProfile => ({
    id: backendData._id,
    userId: backendData.userId,
    companyName: backendData.companyName,
    logo: backendData.logo,
    coverImage: backendData.coverImage,
    tagline:
        backendData.culture?.workEnvironment || backendData.companyName || '',
    about: backendData.description || '',
    industry: backendData.industry,
    companySize: backendData.companySize,
    founded: backendData.foundedYear,
    headquarters: backendData.location
        ? `${backendData.location.city || ''}${
              backendData.location.city && backendData.location.country ? ', ' : ''
          }${backendData.location.country || ''}`.trim() || 'Not specified'
        : 'Not specified',
    website: backendData.website,
    email: backendData.contactInfo?.email || '',
    phone: backendData.contactInfo?.phone || '',
    isVerified: backendData.verification?.isVerified || false,
    verificationDate: backendData.verification?.verifiedAt || null,
    profileCompletionScore: backendData.profileCompletion || 0,
    status: 'Active' as const,
    techStack: backendData.culture?.values || [],
    perks: backendData.culture?.benefits || [],
    socialLinks: {
        linkedin: backendData.socialLinks?.linkedin || null,
        twitter: backendData.socialLinks?.twitter || null,
        github: null,
        facebook: backendData.socialLinks?.facebook || null,
    },
    teamMembers: (backendData.team || []).map((m: any, i: number) => ({
        id: m._id || i.toString(),
        name: m.name || 'Team Member',
        role: m.designation || 'Team Member',
        avatar: m.avatar,
        linkedinUrl: m.linkedIn,
    })),
    activeTasks: backendData.stats?.activeTasks || 0,
    totalTasksPosted:
        (backendData.stats?.completedTasks || 0) +
        (backendData.stats?.activeTasks || 0),
    totalInterns: backendData.stats?.hiredCandidates || 0,
    avgRating: backendData.stats?.averageRating || 0,
    totalReviews: backendData.stats?.totalRatings || 0,
    createdAt: backendData.createdAt,
    updatedAt: backendData.updatedAt,
})

const mockTasks: CompanyTask[] = [
    { id: '1', title: 'Build a React Dashboard Component', skills: ['React', 'TypeScript'], applicants: 12, deadline: '2026-04-15T00:00:00Z', status: 'Active' },
    { id: '2', title: 'API Integration for Mobile App', skills: ['Node.js', 'Express'], applicants: 8, deadline: '2026-04-10T00:00:00Z', status: 'Active' },
    { id: '3', title: 'Database Schema Design', skills: ['PostgreSQL', 'SQL'], applicants: 5, deadline: '2026-04-02T00:00:00Z', status: 'Active' },
    { id: '4', title: 'UI/UX Design for Landing Page', skills: ['Figma', 'Design'], applicants: 15, deadline: '2026-04-20T00:00:00Z', status: 'Active' },
    { id: '5', title: 'Write Technical Documentation', skills: ['Technical Writing'], applicants: 6, deadline: '2026-04-18T00:00:00Z', status: 'Active' },
]

const mockReviews: CompanyReview[] = [
    {
        id: '1',
        studentName: 'Ali Hassan',
        studentAvatar: null,
        taskTitle: 'React Dashboard Component',
        rating: 5,
        comment:
            'Excellent mentorship and clear requirements. The team was very supportive throughout the project. I learned a lot about React best practices.',
        createdAt: '2024-03-10T00:00:00Z',
    },
    {
        id: '2',
        studentName: 'Fatima Ahmed',
        studentAvatar: null,
        taskTitle: 'API Integration',
        rating: 4,
        comment:
            'Great experience. The project was challenging but rewarding. Would recommend to other students.',
        createdAt: '2024-03-05T00:00:00Z',
    },
    {
        id: '3',
        studentName: 'Usman Khan',
        studentAvatar: null,
        taskTitle: 'Database Design',
        rating: 5,
        comment:
            'Professional environment and real-world project experience. The feedback was constructive and helped me improve significantly.',
        createdAt: '2024-02-28T00:00:00Z',
    },
]

export default function PublicCompanyProfilePage() {
    const params = useParams()
    const [isFollowing, setIsFollowing] = useState(false)
    const [profile, setProfile] = useState<CompanyProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!params.companyId) return
        ;(async () => {
            try {
                setLoading(true)
                setError(null)
                const data = await companyService.getPublicProfile(
                    params.companyId as string
                )
                setProfile(transformCompanyData(data))
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load company profile')
            } finally {
                setLoading(false)
            }
        })()
    }, [params.companyId])

    const scrollToTasks = () =>
        document.getElementById('active-tasks')?.scrollIntoView({ behavior: 'smooth' })

    const getRatingBreakdown = () => {
        if (!profile || profile.totalReviews === 0)
            return [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0, percentage: 0 }))
        const total = profile.totalReviews
        const avg = profile.avgRating
        const five = Math.round(total * (avg >= 4.5 ? 0.7 : avg >= 4 ? 0.5 : 0.3))
        const four = Math.round(total * (avg >= 4 ? 0.3 : 0.4))
        const three = Math.round(total * 0.15)
        const two = Math.round(total * 0.05)
        const one = total - five - four - three - two
        return [
            { stars: 5, count: five, percentage: (five / total) * 100 },
            { stars: 4, count: four, percentage: (four / total) * 100 },
            { stars: 3, count: three, percentage: (three / total) * 100 },
            { stars: 2, count: two, percentage: (two / total) * 100 },
            { stars: 1, count: one, percentage: (one / total) * 100 },
        ]
    }

    if (loading) {
        return (
            <div className="surface-canvas min-h-[calc(100vh-3.5rem)]">
                <div className="mx-auto max-w-[1128px] space-y-3 px-4 py-6 lg:px-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </div>
        )
    }

    if (error || !profile) {
        return (
            <div className="surface-canvas grid min-h-[calc(100vh-3.5rem)] place-items-center px-4">
                <Card className="w-full max-w-md p-8 text-center">
                    <p className="text-sm text-destructive">
                        {error || 'Company not found'}
                    </p>
                    <Button onClick={() => window.history.back()} className="mt-4">
                        Go back
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="surface-canvas min-h-[calc(100vh-3.5rem)]">
            <div className="mx-auto max-w-[1128px] space-y-3 px-4 py-6 lg:px-6">
                <CompanyProfileHeader profile={profile} isEditMode={false} />

                <Card className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-medium text-foreground">
                            Interested in {profile.companyName}?
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {profile.activeTasks} active task{profile.activeTasks === 1 ? '' : 's'} ·{' '}
                            {profile.totalInterns} students hired
                        </p>
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                        <Button
                            variant={isFollowing ? 'soft' : 'secondary'}
                            size="sm"
                            onClick={() => setIsFollowing(!isFollowing)}
                            className={cn(isFollowing && 'text-brand-700')}
                        >
                            <Heart
                                className={cn(
                                    'h-4 w-4',
                                    isFollowing && 'fill-current text-brand-700'
                                )}
                            />
                            {isFollowing ? 'Following' : 'Follow'}
                        </Button>
                        <Button size="sm" onClick={scrollToTasks}>
                            <Briefcase className="h-4 w-4" />
                            View open tasks
                        </Button>
                    </div>
                </Card>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <main className="space-y-3">
                        <AboutSection
                            about={profile.about || ''}
                            tagline={profile.tagline}
                            techStack={profile.techStack}
                            isEditMode={false}
                        />
                        <CompanyInfoSection profile={profile} isEditMode={false} />
                        <CompanyCultureSection
                            perks={profile.perks || []}
                            isEditMode={false}
                        />
                        <CompanyTeamSection
                            teamMembers={profile.teamMembers || []}
                            isEditMode={false}
                        />

                        {profile.totalReviews > 0 && (
                            <SectionCard icon={Star} title="What students say">
                                <div className="space-y-5">
                                    <div className="flex flex-col gap-5 border-b border-border pb-5 md:flex-row">
                                        <div className="text-center md:text-left">
                                            <div className="text-4xl font-bold tracking-tight text-foreground">
                                                {profile.avgRating.toFixed(1)}
                                            </div>
                                            <div className="mt-1 flex items-center justify-center gap-0.5 md:justify-start">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={cn(
                                                            'h-4 w-4',
                                                            star <= Math.round(profile.avgRating)
                                                                ? 'fill-accent-500 text-accent-500'
                                                                : 'text-muted-foreground/30'
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Based on {profile.totalReviews} review
                                                {profile.totalReviews === 1 ? '' : 's'}
                                            </p>
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            {getRatingBreakdown().map((item) => (
                                                <div
                                                    key={item.stars}
                                                    className="flex items-center gap-3"
                                                >
                                                    <span className="w-7 text-xs text-muted-foreground">
                                                        {item.stars} ★
                                                    </span>
                                                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className="h-full bg-accent-500"
                                                            style={{ width: `${item.percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-8 text-right text-xs text-muted-foreground">
                                                        {item.count}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {mockReviews.map((review) => (
                                            <div
                                                key={review.id}
                                                className="rounded-md border border-border bg-muted/40 p-4"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar className="h-9 w-9">
                                                            <AvatarFallback className="text-xs">
                                                                {getInitials(review.studentName)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="text-sm font-semibold text-foreground">
                                                                {review.studentName}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                for {review.taskTitle}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground/80">
                                                        {new Date(review.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex items-center gap-0.5">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star
                                                            key={star}
                                                            className={cn(
                                                                'h-3 w-3',
                                                                star <= review.rating
                                                                    ? 'fill-accent-500 text-accent-500'
                                                                    : 'text-muted-foreground/30'
                                                            )}
                                                        />
                                                    ))}
                                                </div>
                                                <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                                                    {review.comment}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <button className="mx-auto flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
                                        See all reviews <ArrowRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </SectionCard>
                        )}
                    </main>

                    <aside className="hidden lg:block">
                        <div className="sticky top-[4.5rem] space-y-3">
                            <Card className="p-5">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10 rounded-md">
                                        {profile.logo ? (
                                            <AvatarImage src={profile.logo} alt={profile.companyName} />
                                        ) : null}
                                        <AvatarFallback className="rounded-md bg-brand-100 text-brand-700">
                                            {getInitials(profile.companyName)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                            {profile.companyName}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {profile.industry}
                                        </p>
                                    </div>
                                </div>
                                <Separator className="my-4" />
                                <dl className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <dt className="text-muted-foreground">Size</dt>
                                        <dd className="font-medium text-foreground">
                                            {profile.companySize} employees
                                        </dd>
                                    </div>
                                    {profile.website && (
                                        <div className="flex items-center justify-between">
                                            <dt className="text-muted-foreground">Website</dt>
                                            <a
                                                href={profile.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium text-brand-700 hover:underline"
                                            >
                                                Visit
                                            </a>
                                        </div>
                                    )}
                                </dl>
                                <Button onClick={scrollToTasks} className="mt-4 w-full" size="sm">
                                    View open tasks
                                </Button>
                            </Card>

                            <CompanyStatsPanel
                                totalTasksPosted={profile.totalTasksPosted}
                                totalInterns={profile.totalInterns}
                                activeTasks={profile.activeTasks}
                                avgRating={profile.avgRating}
                                isEditMode={false}
                            />

                            <div id="active-tasks">
                                <ActiveTasksPreview
                                    tasks={mockTasks}
                                    activeTasks={profile.activeTasks}
                                    isEditMode={false}
                                />
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    )
}
