'use client'

import { Task, taskService } from '@/services/taskService'
import { Bookmark, BadgeCheck, MapPin, Clock } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import MatchScoreBadge from '@/components/match/MatchScoreBadge'
import { cn, formatRelativeTime, getInitials } from '@/lib/utils'

interface TaskListItemProps {
    task: Task
    selected?: boolean
    onClick?: () => void
}

export default function TaskListItem({ task, selected, onClick }: TaskListItemProps) {
    const [isSaved, setIsSaved] = useState(false)
    const time = taskService.getTimeRemaining(task.applicationDeadline)
    const budget = taskService.formatBudget(task.budget)
    const company = task.companyId
    const location =
        task.workType === 'remote'
            ? 'Remote'
            : company?.location?.city
            ? `${company.location.city}${company.location.country ? `, ${company.location.country}` : ''}`
            : task.workType === 'hybrid'
            ? 'Hybrid'
            : 'On-site'

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'group relative w-full rounded-md border bg-card p-4 text-left transition-all',
                selected
                    ? 'border-brand-600 bg-brand-50/40 ring-1 ring-brand-600/20'
                    : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30'
            )}
        >
            <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-md border border-border bg-muted text-sm font-semibold text-foreground">
                    {company?.logo ? (
                        <img
                            src={company.logo}
                            alt={company.companyName}
                            className="h-full w-full rounded-md object-cover"
                        />
                    ) : (
                        getInitials(company?.companyName || 'CO')
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-base font-semibold text-foreground group-hover:text-brand-700">
                            {task.title}
                        </h3>
                        <div className="flex flex-shrink-0 items-center gap-1.5">
                            {typeof task.matchScore === 'number' && (
                                <MatchScoreBadge
                                    score={task.matchScore}
                                    reasons={task.matchReasons}
                                    size="sm"
                                />
                            )}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setIsSaved(!isSaved)
                                }}
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <Bookmark
                                    className={cn('h-4 w-4', isSaved && 'fill-foreground text-foreground')}
                                />
                            </button>
                        </div>
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{company?.companyName}</span>
                        {company?.isVerified && (
                            <BadgeCheck className="h-3.5 w-3.5 text-brand-600" />
                        )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {location}
                        </span>
                        <span>{budget}</span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {taskService.formatDuration(task.duration)}
                        </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {task.applicationCount > 0 && (
                            <span className="text-muted-foreground">
                                {task.applicationCount} applicant{task.applicationCount === 1 ? '' : 's'}
                            </span>
                        )}
                        {task.applicationCount > 0 && (
                            <span className="text-muted-foreground">·</span>
                        )}
                        <span className="text-muted-foreground">
                            Posted {formatRelativeTime(task.createdAt)}
                        </span>
                        {!time.expired && time.days <= 3 && (
                            <Badge variant="warning" className="ml-1">
                                {time.days === 0 ? `${time.hours}h left` : `${time.days}d left`}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>
        </button>
    )
}
