'use client'

import Link from 'next/link'
import { BadgeCheck, Building2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { getInitials } from '@/lib/utils'

interface CompanyMiniCardProps {
    name: string
    industry?: string
    logoUrl?: string
    isVerified?: boolean
    href?: string
    metrics?: { label: string; value: string | number; href?: string }[]
}

export default function CompanyMiniCard({
    name,
    industry,
    logoUrl,
    isVerified,
    href = '#',
    metrics = [],
}: CompanyMiniCardProps) {
    return (
        <Card className="overflow-hidden">
            <div className="h-12 w-full bg-gradient-to-r from-brand-700 to-brand-500" />
            <div className="px-4 pb-4">
                <div className="-mt-6">
                    <Link href={href}>
                        <Avatar className="h-12 w-12 ring-2 ring-card">
                            {logoUrl ? <AvatarImage src={logoUrl} alt={name} /> : null}
                            <AvatarFallback className="bg-brand-100 text-brand-700">
                                {getInitials(name)}
                            </AvatarFallback>
                        </Avatar>
                    </Link>
                </div>
                <div className="mt-2 flex items-center gap-1">
                    <Link
                        href={href}
                        className="text-sm font-semibold text-foreground hover:underline"
                    >
                        {name}
                    </Link>
                    {isVerified && <BadgeCheck className="h-3.5 w-3.5 text-brand-600" />}
                </div>
                {industry && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" /> {industry}
                    </p>
                )}
            </div>

            {metrics.length > 0 && (
                <>
                    <Separator />
                    <div className="space-y-1 px-4 py-2.5">
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
        </Card>
    )
}
