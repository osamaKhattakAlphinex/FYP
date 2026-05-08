'use client'

import { Task, taskService } from '@/services/taskService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
    BadgeCheck,
    Bookmark,
    MapPin,
    Clock,
    DollarSign,
    Users,
    Eye,
    Calendar,
    Send,
    Building2,
} from 'lucide-react'
import Link from 'next/link'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import { getTextPreview } from '@/utils/textUtils'

interface TaskDetailPaneProps {
    task: Task | null
    onApply?: () => void
}

export default function TaskDetailPane({ task, onApply }: TaskDetailPaneProps) {
    if (!task) {
        return (
            <div className="grid place-items-center rounded-md border border-dashed border-border bg-card/40 p-12 text-center text-sm text-muted-foreground">
                Select a task on the left to see details here.
            </div>
        )
    }

    const time = taskService.getTimeRemaining(task.applicationDeadline)
    const company = task.companyId

    return (
        <div className="rounded-md border border-border bg-card">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
                <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-md border border-border bg-muted text-base font-semibold">
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
                        <h2 className="text-xl font-semibold leading-tight text-foreground">
                            {task.title}
                        </h2>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
                            <Link
                                href={`/company/${company?._id}`}
                                className="font-medium text-brand-700 hover:underline"
                            >
                                {company?.companyName}
                            </Link>
                            {company?.isVerified && (
                                <BadgeCheck className="h-4 w-4 text-brand-600" />
                            )}
                            <span className="text-muted-foreground">
                                · {company?.industry}
                            </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {task.workType === 'remote'
                                    ? 'Remote'
                                    : `${task.workType.charAt(0).toUpperCase()}${task.workType.slice(1)} · ${
                                          company?.location?.city || '—'
                                      }`}
                            </span>
                            <span>Posted {formatRelativeTime(task.createdAt)}</span>
                            <span className="flex items-center gap-1">
                                <Eye className="h-3.5 w-3.5" /> {task.views} views
                            </span>
                            <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" /> {task.applicationCount} applicants
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                    <Button onClick={onApply} className="min-w-[120px]">
                        <Send className="h-4 w-4" />
                        Apply
                    </Button>
                    <Button variant="secondary" size="md">
                        <Bookmark className="h-4 w-4" />
                        Save
                    </Button>
                    <Button asChild variant="ghost" size="md">
                        <Link href={`/tasks/${task._id}`}>Open full view</Link>
                    </Button>
                    {!time.expired && (
                        <span className="ml-auto text-xs text-muted-foreground">
                            <Calendar className="mr-1 inline h-3.5 w-3.5" />
                            Apply by{' '}
                            <span className="font-medium text-foreground">
                                {time.days}d {time.hours}h
                            </span>
                        </span>
                    )}
                </div>
            </div>

            <Separator />

            <div className="grid gap-4 px-6 py-5 sm:grid-cols-3">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Compensation
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <DollarSign className="h-4 w-4 text-success" />
                        {taskService.formatBudget(task.budget)}
                    </p>
                </div>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Duration
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Clock className="h-4 w-4 text-brand-600" />
                        {taskService.formatDuration(task.duration)}
                    </p>
                </div>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Experience
                    </p>
                    <p className="mt-1 text-sm font-semibold capitalize text-foreground">
                        {task.experienceLevel}
                    </p>
                </div>
            </div>

            <Separator />

            <div className="px-6 py-5">
                <h3 className="text-sm font-semibold text-foreground">About the role</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {getTextPreview(task.description, 600)}
                </p>
            </div>

            {task.skillsRequired.length > 0 && (
                <>
                    <Separator />
                    <div className="px-6 py-5">
                        <h3 className="text-sm font-semibold text-foreground">Skills</h3>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {task.skillsRequired.map((s, i) => (
                                <Badge key={i} variant={s.required ? 'soft' : 'muted'}>
                                    {s.name}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {task.deliverables.length > 0 && (
                <>
                    <Separator />
                    <div className="px-6 py-5">
                        <h3 className="text-sm font-semibold text-foreground">Deliverables</h3>
                        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                            {task.deliverables.map((d, i) => (
                                <li key={i} className="flex gap-2">
                                    <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground" />
                                    {d}
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            )}

            <Separator />
            <div className="flex items-center gap-3 px-6 py-5 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Link
                    href={`/company/${company?._id}`}
                    className="font-medium text-brand-700 hover:underline"
                >
                    See company profile
                </Link>
            </div>
        </div>
    )
}
