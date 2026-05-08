'use client'

import Link from 'next/link'
import { Star, Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Application {
    id: string
    candidateName: string
    candidateAvatar: string
    taskTitle: string
    appliedDate: string
    matchScore: number
    status: 'new' | 'reviewing' | 'shortlisted' | 'rejected'
}

interface RecentApplicationsCardProps {
    applications: Application[]
}

const statusVariant: Record<Application['status'], 'soft' | 'warning' | 'success' | 'muted'> = {
    new: 'soft',
    reviewing: 'warning',
    shortlisted: 'success',
    rejected: 'muted',
}

export default function RecentApplicationsCard({ applications }: RecentApplicationsCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recent applications</CardTitle>
                <Link
                    href="/company/candidates"
                    className="text-xs font-semibold text-brand-700 hover:underline"
                >
                    View all
                </Link>
            </CardHeader>
            <CardContent className="p-0">
                <ul className="divide-y divide-border">
                    {applications.map((app) => (
                        <li key={app.id}>
                            <Link
                                href={`/profile/${app.id}`}
                                className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-muted/40"
                            >
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-brand-100 text-brand-700">
                                        {app.candidateAvatar}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                        {app.candidateName}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        Applied for {app.taskTitle}
                                    </p>
                                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/80">
                                        <Clock className="h-3 w-3" /> {app.appliedDate}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-bold text-accent-700">
                                        <Star className="h-3 w-3 fill-current" />
                                        {app.matchScore}%
                                    </span>
                                    <Badge variant={statusVariant[app.status]}>
                                        {app.status}
                                    </Badge>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}
