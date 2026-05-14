'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CompanyProfileCompletionBanner from '@/components/company/profile/CompanyProfileCompletionBanner'
import CompanyProfileHeader from '@/components/company/profile/CompanyProfileHeader'
import AboutSection from '@/components/company/profile/AboutSection'
import CompanyInfoSection from '@/components/company/profile/CompanyInfoSection'
import CompanyCultureSection from '@/components/company/profile/CompanyCultureSection'
import CompanyTeamSection from '@/components/company/profile/CompanyTeamSection'
import CompanySidebar from '@/components/company/profile/CompanySidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type {
    CompanyProfile,
    CompanySocialLinks,
    TeamMember,
    CompanyTask,
} from '@/types/company.types'
import { companyService } from '@/services/companyService'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { toast } from 'react-hot-toast'

const mockTasks: CompanyTask[] = [
    {
        id: '1',
        title: 'Build a React Dashboard Component',
        skills: ['React', 'TypeScript'],
        applicants: 12,
        deadline: '2026-04-15T00:00:00Z',
        status: 'Active',
    },
    {
        id: '2',
        title: 'API Integration for Mobile App',
        skills: ['Node.js', 'Express'],
        applicants: 8,
        deadline: '2026-04-10T00:00:00Z',
        status: 'Active',
    },
    {
        id: '3',
        title: 'Database Schema Design',
        skills: ['PostgreSQL', 'SQL'],
        applicants: 5,
        deadline: '2026-04-02T00:00:00Z',
        status: 'Active',
    },
]

export default function CompanyProfilePage() {
    useRoleProtection({ allowedRoles: ['company'] })
    const router = useRouter()
    const [profile, setProfile] = useState<CompanyProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            setLoading(true)
            const data = await companyService.getProfile()
            const transformed: CompanyProfile = {
                id: data._id,
                userId: data.userId,
                companyName: data.companyName,
                logo: data.logo || null,
                coverImage: data.coverImage || null,
                tagline: data.description?.substring(0, 100) || '',
                about: data.description || '',
                industry: data.industry,
                companySize: data.companySize,
                founded: data.foundedYear || null,
                headquarters:
                    data.location?.city && data.location?.country
                        ? `${data.location.city}, ${data.location.country}`
                        : '',
                website: data.website || null,
                email: data.contactInfo?.email || '',
                phone: data.contactInfo?.phone || null,
                isVerified: data.verification?.isVerified || false,
                verificationDate: data.verification?.verifiedAt || null,
                profileCompletionScore: data.profileCompletion || 0,
                status: 'Active',
                techStack: ((): string[] => {
                    const v = data.culture?.values
                    if (Array.isArray(v)) return v
                    if (typeof v === 'string') {
                        try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] }
                    }
                    return []
                })(),
                perks: ((): string[] => {
                    const v = data.culture?.benefits
                    if (Array.isArray(v)) return v
                    if (typeof v === 'string') {
                        try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] }
                    }
                    return []
                })(),
                socialLinks: {
                    linkedin: data.socialLinks?.linkedin || null,
                    twitter: data.socialLinks?.twitter || null,
                    github: null,
                    facebook: data.socialLinks?.facebook || null,
                },
                teamMembers:
                    data.team?.map((m: any) => ({
                        id: m._id,
                        name: m.name,
                        role: m.designation,
                        avatar: m.avatar || null,
                        linkedinUrl: m.linkedIn || null,
                    })) || [],
                activeTasks: data.stats?.activeTasks || 0,
                totalTasksPosted: data.stats?.completedTasks || 0,
                totalInterns: data.stats?.hiredCandidates || 0,
                avgRating: data.stats?.averageRating || 0,
                totalReviews: data.stats?.totalRatings || 0,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
            }
            setProfile(transformed)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load profile')
            if (err.response?.status === 401) router.push('/login')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateProfile = async (updates: Partial<CompanyProfile>) => {
        try {
            const backendData: any = {}
            if (updates.companyName) backendData.companyName = updates.companyName
            if (updates.companySize) backendData.companySize = updates.companySize
            if (updates.industry) backendData.industry = updates.industry
            if (updates.founded) backendData.foundedYear = updates.founded
            if (updates.website) backendData.website = updates.website
            if (updates.about) backendData.description = updates.about
            if (updates.headquarters) {
                const [city, country] = updates.headquarters.split(', ')
                backendData.location = { city, country }
            }
            await companyService.updateBasicInfo(backendData)
            await loadProfile()
            toast.success('Profile updated')
        } catch {
            toast.error('Failed to update')
        }
    }

    const handleUpdateAbout = async (data: { about: string; tagline: string }) => {
        try {
            await companyService.updateBasicInfo({ description: data.about })
            await loadProfile()
            toast.success('About updated')
        } catch {
            toast.error('Failed to update about')
        }
    }

    const handleUpdateTechStack = async (techStack: string[]) => {
        try {
            await companyService.updateCulture({ values: techStack })
            await loadProfile()
            toast.success('Tech stack updated')
        } catch {
            toast.error('Failed to update')
        }
    }

    const handleUpdatePerks = async (perks: string[]) => {
        try {
            await companyService.updateCulture({ benefits: perks })
            await loadProfile()
            toast.success('Perks updated')
        } catch {
            toast.error('Failed to update')
        }
    }

    const handleUpdateTeam = async (
        teamMembers: TeamMember[],
        avatarFile?: File | null
    ) => {
        if (!profile) return
        try {
            let avatarUrl: string | null = null
            if (avatarFile) {
                const result = await companyService.uploadTeamMemberAvatar(avatarFile)
                avatarUrl = result.data.avatar
            }
            const updated = teamMembers.map((m) =>
                m.avatar === 'uploading' && avatarUrl ? { ...m, avatar: avatarUrl } : m
            )
            const currentIds = profile.teamMembers.map((m) => m.id)
            const newIds = updated.map((m) => m.id)
            const added = updated.filter(
                (m) => !currentIds.includes(m.id) || m.id.length > 20
            )
            const deletedIds = currentIds.filter((id) => !newIds.includes(id))
            const updatedList = updated.filter((m) => {
                const orig = profile.teamMembers.find((om) => om.id === m.id)
                return (
                    orig &&
                    (orig.name !== m.name ||
                        orig.role !== m.role ||
                        orig.avatar !== m.avatar ||
                        orig.linkedinUrl !== m.linkedinUrl)
                )
            })
            for (const id of deletedIds) await companyService.deleteTeamMember(id)
            for (const m of added)
                await companyService.addTeamMember({
                    name: m.name,
                    role: m.role,
                    avatar: m.avatar,
                    linkedinUrl: m.linkedinUrl,
                })
            for (const m of updatedList)
                await companyService.updateTeamMember(m.id, {
                    name: m.name,
                    role: m.role,
                    avatar: m.avatar,
                    linkedinUrl: m.linkedinUrl,
                })
            await loadProfile()
            toast.success('Team updated')
        } catch {
            toast.error('Failed to update team')
        }
    }

    const handleUpdateSocial = async (links: CompanySocialLinks) => {
        try {
            await companyService.updateSocialLinks(links)
            await loadProfile()
            toast.success('Links updated')
        } catch {
            toast.error('Failed to update links')
        }
    }

    const handleUpdateLogo = async (file: File) => {
        try {
            await companyService.uploadLogo(file)
            await loadProfile()
            toast.success('Logo updated')
        } catch {
            toast.error('Logo upload failed')
        }
    }

    const handleUpdateCover = async (file: File) => {
        try {
            await companyService.uploadCoverImage(file)
            await loadProfile()
            toast.success('Cover updated')
        } catch {
            toast.error('Cover upload failed')
        }
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
            <div className="surface-canvas min-h-[calc(100vh-3.5rem)] grid place-items-center px-4">
                <Card className="w-full max-w-md p-8 text-center">
                    <p className="text-sm text-destructive">{error || 'Profile not found'}</p>
                    <Button onClick={loadProfile} className="mt-4">
                        Retry
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="surface-canvas min-h-[calc(100vh-3.5rem)]">
            <div className="mx-auto max-w-[1128px] space-y-3 px-4 py-6 lg:px-6">
                <CompanyProfileCompletionBanner
                    score={profile.profileCompletionScore}
                    onComplete={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                />

                <CompanyProfileHeader
                    profile={profile}
                    isEditMode
                    onEditCover={handleUpdateCover}
                    onEditLogo={handleUpdateLogo}
                    onEditInfo={() => {}}
                />

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <main className="space-y-3">
                        <AboutSection
                            about={profile.about}
                            tagline={profile.tagline}
                            techStack={profile.techStack}
                            isEditMode
                            onUpdateAbout={handleUpdateAbout}
                            onUpdateTechStack={handleUpdateTechStack}
                        />
                        <CompanyInfoSection
                            profile={profile}
                            isEditMode
                            onUpdate={handleUpdateProfile}
                        />
                        <CompanyCultureSection
                            perks={profile.perks}
                            isEditMode
                            onUpdate={handleUpdatePerks}
                        />
                        <CompanyTeamSection
                            teamMembers={profile.teamMembers}
                            isEditMode
                            onUpdate={handleUpdateTeam}
                        />
                    </main>

                    <aside className="hidden lg:block">
                        <div className="sticky top-[4.5rem]">
                            <CompanySidebar
                                profile={profile}
                                tasks={mockTasks}
                                isEditMode
                                onUpdateSocial={handleUpdateSocial}
                                onRequestVerification={() =>
                                    toast.success('Verification request submitted')
                                }
                            />
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    )
}
