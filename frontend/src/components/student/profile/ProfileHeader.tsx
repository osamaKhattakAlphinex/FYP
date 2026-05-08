'use client'

import { useState } from 'react'
import { Camera, MapPin, Pencil, Globe } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import AvatarUpload from '@/components/shared/AvatarUpload'
import { cn, getInitials } from '@/lib/utils'

interface ProfileHeaderProps {
    fullName: string
    headline: string
    city: string
    country: string
    profilePicture: string | null
    isAvailable: boolean
    onToggleAvailability: () => void
    onUpdateAvatar: (file: File) => void
    onEditHeadline: () => void
    onEditProfile?: () => void
    studentId?: string
}

export default function ProfileHeader({
    fullName,
    headline,
    city,
    country,
    profilePicture,
    isAvailable,
    onToggleAvailability,
    onUpdateAvatar,
    onEditHeadline,
    onEditProfile,
    studentId,
}: ProfileHeaderProps) {
    const [showAvatarUpload, setShowAvatarUpload] = useState(false)

    return (
        <>
            <Card className="overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 sm:h-40" />

                <div className="px-6 pb-6">
                    <div className="-mt-12 flex items-end justify-between gap-3">
                        <div className="relative">
                            <Avatar className="h-24 w-24 ring-4 ring-card sm:h-28 sm:w-28">
                                {profilePicture ? (
                                    <AvatarImage
                                        src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${profilePicture}`}
                                        alt={fullName}
                                    />
                                ) : null}
                                <AvatarFallback className="text-2xl">
                                    {getInitials(fullName)}
                                </AvatarFallback>
                            </Avatar>
                            <button
                                onClick={() => setShowAvatarUpload(true)}
                                className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-brand-600 text-white transition-colors hover:bg-brand-700"
                                aria-label="Change profile picture"
                            >
                                <Camera className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            {studentId && (
                                <Button asChild variant="secondary" size="sm">
                                    <a
                                        href={`/profile/${studentId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Globe className="h-4 w-4" />
                                        Public view
                                    </a>
                                </Button>
                            )}
                            <Button onClick={onEditProfile} size="sm">
                                <Pencil className="h-4 w-4" />
                                Edit profile
                            </Button>
                        </div>
                    </div>

                    <div className="mt-4">
                        <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
                            {fullName}
                        </h1>
                        <div className="mt-1 flex items-start justify-between gap-3">
                            <p className="text-sm leading-snug text-foreground/80">
                                {headline || (
                                    <button
                                        onClick={onEditHeadline}
                                        className="text-brand-700 hover:underline"
                                    >
                                        + Add a headline
                                    </button>
                                )}
                            </p>
                            {headline && (
                                <button
                                    onClick={onEditHeadline}
                                    aria-label="Edit headline"
                                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            {(city || country) && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {[city, country].filter(Boolean).join(', ')}
                                </span>
                            )}
                            <button
                                onClick={onToggleAvailability}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                                    isAvailable
                                        ? 'bg-success/10 text-success hover:bg-success/15'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                )}
                            >
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {isAvailable ? 'Open to opportunities' : 'Not currently available'}
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            {showAvatarUpload && (
                <AvatarUpload
                    currentImage={profilePicture}
                    initials={getInitials(fullName)}
                    onUpload={onUpdateAvatar}
                    onClose={() => setShowAvatarUpload(false)}
                />
            )}
        </>
    )
}
