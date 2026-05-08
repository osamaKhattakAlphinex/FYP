'use client'

import {
    FileText,
    CheckCircle2,
    Award,
    MessageSquare,
    Calendar,
    UserCheck,
    type LucideIcon,
} from 'lucide-react'
import { RecentActivity } from '@/types/dashboard.types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface RecentActivityCardProps {
    activities: RecentActivity[]
}

const activityIcons: Record<string, LucideIcon> = {
    application: FileText,
    task_completed: CheckCircle2,
    certificate: Award,
    message: MessageSquare,
    interview: Calendar,
    hire: UserCheck,
}

const activityColor: Record<string, string> = {
    application: 'bg-brand-50 text-brand-700',
    task_completed: 'bg-success/10 text-success',
    certificate: 'bg-accent-100 text-accent-700',
    message: 'bg-muted text-muted-foreground',
    interview: 'bg-brand-50 text-brand-700',
    hire: 'bg-success/10 text-success',
}

export default function RecentActivityCard({ activities }: RecentActivityCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Recent activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ul className="divide-y divide-border">
                    {activities.map((activity) => {
                        const Icon = activityIcons[activity.type] || FileText
                        return (
                            <li
                                key={activity.id}
                                className="flex gap-3 px-6 py-3.5 transition-colors hover:bg-muted/40"
                            >
                                <div
                                    className={cn(
                                        'mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-md',
                                        activityColor[activity.type] ?? 'bg-muted text-muted-foreground'
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium leading-tight text-foreground">
                                        {activity.title}
                                    </p>
                                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                        {activity.description}
                                    </p>
                                    <p className="mt-1 text-[11px] text-muted-foreground/80">
                                        {activity.timestamp}
                                    </p>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </CardContent>
        </Card>
    )
}
