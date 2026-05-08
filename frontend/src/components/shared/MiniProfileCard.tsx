'use client'

import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn, getInitials } from '@/lib/utils'

interface MiniProfileCardProps {
    name: string
    headline?: string
    avatarUrl?: string
    coverGradient?: string
    href?: string
    metrics?: { label: string; value: string | number; href?: string }[]
    profileCompletion?: number
}

export default function MiniProfileCard({
    name,
    headline,
    avatarUrl,
    coverGradient,
    href = '#',
    metrics = [],
    profileCompletion,
}: MiniProfileCardProps) {
    return (
        <Card className="overflow-hidden">
            <div
                className={cn(
                    'h-14 w-full',
                    coverGradient ?? 'bg-gradient-to-r from-brand-500 to-brand-700'
                )}
            />
            <div className="px-4 pb-4">
                <div className="-mt-7">
                    <Link href={href}>
                        <Avatar className="h-14 w-14 ring-2 ring-card">
                            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
                            <AvatarFallback className="text-base">
                                {getInitials(name)}
                            </AvatarFallback>
                        </Avatar>
                    </Link>
                </div>
                <Link href={href}>
                    <h3 className="mt-2 text-sm font-semibold leading-tight text-foreground hover:underline">
                        {name}
                    </h3>
                </Link>
                {headline && (
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground line-clamp-2">
                        {headline}
                    </p>
                )}
            </div>

            {metrics.length > 0 && (
                <>
                    <Separator />
                    <div className="px-4 py-2.5 space-y-1">
                        {metrics.map((m) => (
                            <Link
                                key={m.label}
                                href={m.href ?? '#'}
                                className="-mx-2 flex items-center justify-between rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted"
                            >
                                <span className="text-muted-foreground">{m.label}</span>
                                <span className="font-semibold text-brand-700">{m.value}</span>
                            </Link>
                        ))}
                    </div>
                </>
            )}

            {profileCompletion !== undefined && profileCompletion < 100 && (
                <>
                    <Separator />
                    <Link
                        href="/student/profile"
                        className="block px-4 py-3 transition-colors hover:bg-muted"
                    >
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Profile completion</span>
                            <span className="font-semibold text-foreground">
                                {profileCompletion}%
                            </span>
                        </div>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full bg-accent-500 transition-all"
                                style={{ width: `${profileCompletion}%` }}
                            />
                        </div>
                        <p className="mt-1.5 text-xs font-medium text-brand-700 hover:underline">
                            Complete your profile →
                        </p>
                    </Link>
                </>
            )}
        </Card>
    )
}
