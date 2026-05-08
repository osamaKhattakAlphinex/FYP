'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    MapPin,
    GraduationCap,
    MessageCircle,
    UserPlus,
    Briefcase,
    Sparkles,
    Linkedin,
    Github,
    Globe,
    Twitter,
} from 'lucide-react'
import AboutSection from '@/components/student/profile/AboutSection'
import SkillsSection from '@/components/student/profile/SkillsSection'
import EducationSection from '@/components/student/profile/EducationSection'
import ExperienceSection from '@/components/student/profile/ExperienceSection'
import ProjectsSection from '@/components/student/profile/ProjectsSection'
import CertificatesSection from '@/components/student/profile/CertificatesSection'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { StudentProfile } from '@/types/student.types'
import { studentService } from '@/services/studentService'
import { cn, getInitials } from '@/lib/utils'

export default function PublicProfilePage({
    params,
}: {
    params: { studentId: string }
}) {
    const router = useRouter()
    const [profile, setProfile] = useState<StudentProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const aiMatchScore = 87

    useEffect(() => {
        loadPublicProfile()
    }, [params.studentId])

    const loadPublicProfile = async () => {
        try {
            setLoading(true)
            const data = await studentService.getPublicProfile(params.studentId)
            const transformed: StudentProfile = {
                id: data._id,
                userId: data.userId || '',
                fullName: `${data.firstName} ${data.lastName}`,
                profilePicture: data.profilePicture || null,
                headline: data.headline || '',
                about: data.bio || '',
                university: data.education?.[0]?.institution || '',
                degree: data.education?.[0]?.degree || '',
                major: data.education?.[0]?.fieldOfStudy || '',
                graduationYear: data.education?.[0]?.endYear || new Date().getFullYear(),
                cgpa: data.education?.[0]?.grade
                    ? parseFloat(data.education[0].grade)
                    : null,
                city: data.location?.city || '',
                country: data.location?.country || '',
                profileCompletionScore: data.profileCompletion || 0,
                isAvailable: data.isProfilePublic,
                resumeUrl: null,
                skills:
                    data.skills?.map((s: any) => ({
                        id: s._id,
                        name: s.name,
                        level: s.level,
                    })) || [],
                education:
                    data.education?.map((e: any) => ({
                        id: e._id,
                        institution: e.institution,
                        degree: e.degree,
                        fieldOfStudy: e.fieldOfStudy || '',
                        startYear: e.startYear || 0,
                        endYear: e.endYear || null,
                        isCurrentlyStudying: e.isCurrentlyStudying || false,
                        grade: e.grade || null,
                        description: e.description || null,
                    })) || [],
                experience:
                    data.experience?.map((e: any) => ({
                        id: e._id,
                        title: e.title,
                        company: e.company || '',
                        employmentType: e.employmentType || 'Internship',
                        startDate: e.startDate || '',
                        endDate: e.endDate || null,
                        isCurrentlyWorking: e.isCurrentlyWorking || false,
                        description: e.description || '',
                        skills: e.skills || [],
                    })) || [],
                projects:
                    data.projects?.map((p: any) => ({
                        id: p._id,
                        title: p.title,
                        description: p.description || '',
                        techStack: p.techStack || [],
                        projectUrl: p.projectUrl || null,
                        githubUrl: p.githubUrl || null,
                        thumbnailUrl: p.thumbnailUrl || null,
                        startDate: p.startDate || '',
                        endDate: p.endDate || null,
                    })) || [],
                certificates:
                    data.certificates?.map((c: any) => ({
                        id: c._id,
                        title: c.title,
                        issuer: c.issuer || '',
                        issueDate: c.issueDate || '',
                        expiryDate: c.expiryDate || null,
                        credentialId: c.credentialId || null,
                        credentialUrl: c.credentialUrl || null,
                        certificateImage: c.certificateImage || null,
                        isNexInternCertificate: c.isNexInternCertificate || false,
                    })) || [],
                socialLinks: data.socialLinks || {
                    linkedin: null,
                    github: null,
                    portfolio: null,
                    twitter: null,
                },
                createdAt: data.createdAt,
                updatedAt: data.updatedAt,
            }
            setProfile(transformed)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load profile')
        } finally {
            setLoading(false)
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
            <div className="surface-canvas grid min-h-[calc(100vh-3.5rem)] place-items-center px-4">
                <Card className="w-full max-w-md p-8 text-center">
                    <p className="text-sm text-destructive">{error || 'Profile not found'}</p>
                    <Button onClick={() => router.back()} className="mt-4">
                        Go back
                    </Button>
                </Card>
            </div>
        )
    }

    const socials = [
        { icon: Linkedin, url: profile.socialLinks.linkedin, label: 'LinkedIn' },
        { icon: Github, url: profile.socialLinks.github, label: 'GitHub' },
        { icon: Globe, url: profile.socialLinks.portfolio, label: 'Portfolio' },
        { icon: Twitter, url: profile.socialLinks.twitter, label: 'Twitter' },
    ].filter((s) => s.url)

    return (
        <div className="surface-canvas min-h-[calc(100vh-3.5rem)]">
            <div className="mx-auto max-w-[1128px] px-4 py-6 lg:px-6">
                {/* Hero */}
                <Card className="overflow-hidden">
                    <div className="h-32 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 sm:h-40" />
                    <div className="px-6 pb-6">
                        <div className="-mt-12 flex items-end justify-between gap-3">
                            <Avatar className="h-24 w-24 ring-4 ring-card sm:h-28 sm:w-28">
                                {profile.profilePicture ? (
                                    <AvatarImage
                                        src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${profile.profilePicture}`}
                                        alt={profile.fullName}
                                    />
                                ) : null}
                                <AvatarFallback className="text-2xl">
                                    {getInitials(profile.fullName)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-2">
                                <Button size="sm">
                                    <UserPlus className="h-4 w-4" />
                                    Connect
                                </Button>
                                <Button variant="secondary" size="sm">
                                    <MessageCircle className="h-4 w-4" />
                                    Message
                                </Button>
                            </div>
                        </div>

                        <div className="mt-4">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                                {profile.fullName}
                            </h1>
                            {profile.headline && (
                                <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                                    {profile.headline}
                                </p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                {(profile.city || profile.country) && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {[profile.city, profile.country].filter(Boolean).join(', ')}
                                    </span>
                                )}
                                {profile.isAvailable && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                        Open to opportunities
                                    </span>
                                )}
                            </div>
                            {socials.length > 0 && (
                                <div className="mt-3 flex items-center gap-2">
                                    {socials.map(({ icon: Icon, url, label }) => (
                                        <a
                                            key={label}
                                            href={url!}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={label}
                                            className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <main className="space-y-3">
                        <AboutSection about={profile.about} />
                        <SkillsSection skills={profile.skills} />
                        <ExperienceSection experience={profile.experience} />
                        <EducationSection education={profile.education} />
                        <ProjectsSection projects={profile.projects} />
                        <CertificatesSection certificates={profile.certificates} />
                    </main>

                    <aside className="hidden lg:block">
                        <div className="sticky top-[4.5rem] space-y-3">
                            {/* Hire panel */}
                            <Card className="p-5">
                                <h3 className="text-sm font-semibold text-foreground">
                                    Hire {profile.fullName.split(' ')[0]}
                                </h3>
                                <div className="mt-4">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <Sparkles className="h-3 w-3" /> AI match
                                        </span>
                                        <span className="font-semibold text-brand-700">
                                            {aiMatchScore}%
                                        </span>
                                    </div>
                                    <Progress value={aiMatchScore} className="mt-1.5" />
                                </div>
                                <Separator className="my-4" />
                                <div className="space-y-2">
                                    <Button size="sm" className="w-full">
                                        <UserPlus className="h-4 w-4" /> Connect
                                    </Button>
                                    <Button variant="secondary" size="sm" className="w-full">
                                        <Briefcase className="h-4 w-4" /> Invite to task
                                    </Button>
                                </div>
                            </Card>

                            {/* Education snippet */}
                            {profile.university && (
                                <Card className="p-5">
                                    <div className="flex items-start gap-3">
                                        <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700">
                                            <GraduationCap className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-foreground">
                                                {profile.degree}
                                                {profile.major ? `, ${profile.major}` : ''}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {profile.university}
                                            </p>
                                            <p
                                                className={cn(
                                                    'mt-0.5 text-xs',
                                                    'text-muted-foreground'
                                                )}
                                            >
                                                Graduating {profile.graduationYear}
                                                {profile.cgpa
                                                    ? ` · CGPA ${profile.cgpa.toFixed(2)}`
                                                    : ''}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    )
}
