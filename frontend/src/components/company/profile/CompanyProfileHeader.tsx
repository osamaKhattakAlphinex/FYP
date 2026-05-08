'use client'

import { useState } from 'react'
import {
    Camera,
    MapPin,
    Building2,
    Users,
    Calendar,
    Globe,
    ExternalLink,
} from 'lucide-react'
import VerificationBadge from './VerificationBadge'
import AvatarUpload from '@/components/shared/AvatarUpload'
import type { CompanyProfile } from '@/types/company.types'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getInitials } from '@/lib/utils'

interface CompanyProfileHeaderProps {
    profile: CompanyProfile
    isEditMode?: boolean
    onEditCover?: (file: File) => void
    onEditLogo?: (file: File) => void
    onEditInfo?: () => void
}

export default function CompanyProfileHeader({
    profile,
    isEditMode = false,
    onEditCover,
    onEditLogo,
    onEditInfo,
}: CompanyProfileHeaderProps) {
    const [showLogoUpload, setShowLogoUpload] = useState(false)

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file && onEditCover) onEditCover(file)
    }

    return (
        <>
            <Card className="overflow-hidden">
                <div className="relative h-40 w-full sm:h-48">
                    {profile.coverImage ? (
                        <img
                            src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${profile.coverImage}`}
                            alt={`${profile.companyName} cover`}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="h-full w-full bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500" />
                    )}
                    {isEditMode && onEditCover && (
                        <>
                            <input
                                type="file"
                                id="cover-upload"
                                accept="image/*"
                                onChange={handleCoverChange}
                                className="hidden"
                            />
                            <label
                                htmlFor="cover-upload"
                                className="absolute right-3 top-3 inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/50"
                            >
                                <Camera className="h-3.5 w-3.5" />
                                Edit cover
                            </label>
                        </>
                    )}
                </div>

                <div className="px-6 pb-6">
                    <div className="-mt-12 flex items-end justify-between gap-3">
                        <div className="relative">
                            <Avatar className="h-24 w-24 rounded-lg ring-4 ring-card sm:h-28 sm:w-28">
                                {profile.logo ? (
                                    <AvatarImage
                                        src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${profile.logo}`}
                                        alt={profile.companyName}
                                    />
                                ) : null}
                                <AvatarFallback className="rounded-lg bg-brand-100 text-3xl font-bold text-brand-700">
                                    {getInitials(profile.companyName)}
                                </AvatarFallback>
                            </Avatar>
                            {isEditMode && onEditLogo && (
                                <button
                                    onClick={() => setShowLogoUpload(true)}
                                    className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-brand-600 text-white transition-colors hover:bg-brand-700"
                                    aria-label="Edit logo"
                                >
                                    <Camera className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {isEditMode && onEditInfo && (
                                <Button onClick={onEditInfo} size="sm">
                                    <Camera className="h-4 w-4" />
                                    Edit info
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[26px]">
                                {profile.companyName}
                            </h1>
                            <VerificationBadge isVerified={profile.isVerified} size="md" />
                        </div>

                        {profile.tagline && (
                            <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                                {profile.tagline}
                            </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {profile.headquarters && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" /> {profile.headquarters}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" /> {profile.industry}
                            </span>
                            <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" /> {profile.companySize} employees
                            </span>
                            {profile.founded && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" /> Founded {profile.founded}
                                </span>
                            )}
                            {profile.website && (
                                <a
                                    href={profile.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                                >
                                    <Globe className="h-3.5 w-3.5" />
                                    {(() => {
                                        try {
                                            return new URL(profile.website).hostname
                                        } catch {
                                            return profile.website
                                        }
                                    })()}
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {showLogoUpload && onEditLogo && (
                <AvatarUpload
                    currentImage={profile.logo}
                    initials={getInitials(profile.companyName)}
                    onUpload={(file) => {
                        onEditLogo(file)
                        setShowLogoUpload(false)
                    }}
                    onClose={() => setShowLogoUpload(false)}
                />
            )}
        </>
    )
}
