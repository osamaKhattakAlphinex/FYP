'use client'

import Link from 'next/link'
import { Star, MapPin, Briefcase } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Candidate {
    id: string
    name: string
    avatar: string
    title: string
    location: string
    experience: string
    skills: string[]
    matchScore: number
}

interface TopCandidatesCardProps {
    candidates: Candidate[]
}

export default function TopCandidatesCard({ candidates }: TopCandidatesCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-accent-500 fill-current" />
                    <CardTitle className="text-base">Top candidates</CardTitle>
                </div>
                <Link
                    href="/company/candidates"
                    className="text-xs font-semibold text-brand-700 hover:underline"
                >
                    View all
                </Link>
            </CardHeader>
            <CardContent className="p-0">
                <ul className="divide-y divide-border">
                    {candidates.map((c) => (
                        <li key={c.id}>
                            <Link
                                href={`/profile/${c.id}`}
                                className="block px-6 py-4 transition-colors hover:bg-muted/40"
                            >
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-11 w-11">
                                        <AvatarFallback className="bg-brand-100 text-brand-700">
                                            {c.avatar}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-semibold text-foreground">
                                                {c.name}
                                            </p>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-bold text-accent-700">
                                                <Star className="h-3 w-3 fill-current" />
                                                {c.matchScore}%
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-foreground/80">{c.title}</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" /> {c.location}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Briefcase className="h-3 w-3" /> {c.experience}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {c.skills.slice(0, 4).map((s, i) => (
                                                <Badge key={i} variant="soft">
                                                    {s}
                                                </Badge>
                                            ))}
                                            {c.skills.length > 4 && (
                                                <Badge variant="muted">
                                                    +{c.skills.length - 4}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}
