'use client'

import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { UpcomingDeadline } from '@/types/dashboard.types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

interface UpcomingDeadlinesCardProps {
    deadlines: UpcomingDeadline[]
}

const priorityVariant = {
    high: 'destructive',
    medium: 'warning',
    low: 'soft',
} as const

export default function UpcomingDeadlinesCard({ deadlines }: UpcomingDeadlinesCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Upcoming deadlines</CardTitle>
                <Link
                    href="/student/applications"
                    className="text-xs font-semibold text-brand-700 hover:underline"
                >
                    View all
                </Link>
            </CardHeader>
            <CardContent className="p-0">
                <ul className="divide-y divide-border">
                    {deadlines.map((d) => (
                        <li key={d.id} className="px-6 py-4 transition-colors hover:bg-muted/40">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="line-clamp-1 text-sm font-semibold text-foreground">
                                        {d.taskTitle}
                                    </p>
                                    {d.companyName && (
                                        <p className="text-xs text-muted-foreground">
                                            {d.companyName}
                                        </p>
                                    )}
                                </div>
                                <Badge variant={priorityVariant[d.priority]}>
                                    {d.priority}
                                </Badge>
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                Due {d.dueDate}
                            </div>
                            <div className="mt-2.5 flex items-center gap-2">
                                <Progress value={d.progress} className="flex-1" />
                                <span className="text-xs font-semibold tabular-nums text-foreground">
                                    {d.progress}%
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}
