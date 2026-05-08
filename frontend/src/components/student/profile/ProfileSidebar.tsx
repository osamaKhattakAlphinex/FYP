'use client'

import { GraduationCap, Linkedin, Github, Globe, Twitter } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SocialLinks } from '@/types/student.types'
import { cn } from '@/lib/utils'

interface ProfileSidebarProps {
    fullName: string
    headline: string
    city: string
    country: string
    profilePicture: string | null
    isAvailable: boolean
    university: string
    degree: string
    major: string
    graduationYear: number
    cgpa: number | null
    profileViews: number
    tasksApplied: number
    tasksCompleted: number
    socialLinks: SocialLinks
    studentId: string
    onToggleAvailability: () => void
    onUpdateAvatar: (file: File) => void
    onEditHeadline: () => void
    onEditProfile: () => void
    onEditSocialLinks: () => void
}

export default function ProfileSidebar({
    university,
    degree,
    major,
    graduationYear,
    cgpa,
    profileViews,
    tasksApplied,
    tasksCompleted,
    socialLinks,
    onEditSocialLinks,
}: ProfileSidebarProps) {
    const socials = [
        { icon: Linkedin, url: socialLinks.linkedin, name: 'LinkedIn' },
        { icon: Github, url: socialLinks.github, name: 'GitHub' },
        { icon: Globe, url: socialLinks.portfolio, name: 'Portfolio' },
        { icon: Twitter, url: socialLinks.twitter, name: 'Twitter' },
    ]

    return (
        <div className="space-y-3">
            {university && (
                <Card className="p-5">
                    <div className="flex items-start gap-3">
                        <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700">
                            <GraduationCap className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                                {degree}{major ? `, ${major}` : ''}
                            </p>
                            <p className="text-xs text-muted-foreground">{university}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Graduating {graduationYear}
                                {cgpa ? ` · CGPA ${cgpa.toFixed(2)}` : ''}
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            <Card className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Profile stats
                </h3>
                <ul className="mt-3 space-y-1">
                    {[
                        ['Profile views', profileViews],
                        ['Tasks applied', tasksApplied],
                        ['Tasks completed', tasksCompleted],
                    ].map(([label, value]) => (
                        <li
                            key={label as string}
                            className="flex items-center justify-between py-1 text-sm"
                        >
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-semibold text-brand-700">{value}</span>
                        </li>
                    ))}
                </ul>
            </Card>

            <Card className="p-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Connect
                    </h3>
                    <button
                        onClick={onEditSocialLinks}
                        className="text-xs font-medium text-brand-700 hover:underline"
                    >
                        Edit
                    </button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                    {socials.map(({ icon: Icon, url, name }) => (
                        <button
                            key={name}
                            onClick={() => (url ? window.open(url, '_blank') : onEditSocialLinks())}
                            className={cn(
                                'grid h-9 w-9 place-items-center rounded-full border border-border bg-card transition-colors',
                                url
                                    ? 'text-foreground hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700'
                                    : 'text-muted-foreground/40 hover:bg-muted hover:text-muted-foreground'
                            )}
                            aria-label={url ? `Visit ${name}` : `Add ${name}`}
                            title={url ? `Visit ${name}` : `Add ${name}`}
                        >
                            <Icon className="h-4 w-4" />
                        </button>
                    ))}
                </div>
            </Card>
        </div>
    )
}
