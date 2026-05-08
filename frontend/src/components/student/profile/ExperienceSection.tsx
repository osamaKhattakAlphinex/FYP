'use client'

import { useState } from 'react'
import { Briefcase, Calendar, MoreVertical } from 'lucide-react'
import SectionCard from '@/components/shared/SectionCard'
import EmptyState from '@/components/shared/EmptyState'
import { Experience } from '@/types/student.types'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ExperienceSectionProps {
    experience: Experience[]
    isEditMode?: boolean
    onEdit?: (exp: Experience) => void
    onDelete?: (id: string) => void
    onAdd?: () => void
}

const employmentTypeVariant: Record<Experience['employmentType'], 'soft' | 'success' | 'accent' | 'muted'> = {
    Internship: 'soft',
    'Full-time': 'success',
    'Part-time': 'accent',
    Freelance: 'muted',
}

export default function ExperienceSection({
    experience,
    isEditMode = false,
    onEdit,
    onDelete,
    onAdd,
}: ExperienceSectionProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

    const formatDuration = (exp: Experience) => {
        const fmt = (d: string) =>
            new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        const start = fmt(exp.startDate)
        if (exp.isCurrentlyWorking) return `${start} – Present`
        return `${start} – ${exp.endDate ? fmt(exp.endDate) : 'Present'}`
    }

    const toggle = (id: string) => {
        const next = new Set(expandedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setExpandedIds(next)
    }

    return (
        <SectionCard
            title="Experience"
            icon={Briefcase}
            onEdit={isEditMode ? onAdd : undefined}
            isEmpty={experience.length === 0}
        >
            {experience.length > 0 ? (
                <ul className="divide-y divide-border">
                    {experience.map((exp) => {
                        const truncate = (exp.description || '').split('\n').length > 3
                        const expanded = expandedIds.has(exp.id)
                        const description =
                            expanded || !truncate
                                ? exp.description
                                : exp.description.split('\n').slice(0, 3).join('\n')

                        return (
                            <li key={exp.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                                <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700">
                                    <Briefcase className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-foreground">
                                                {exp.title}
                                            </p>
                                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                                                <span className="text-foreground/80">{exp.company}</span>
                                                <span className="text-muted-foreground">·</span>
                                                <Badge variant={employmentTypeVariant[exp.employmentType]}>
                                                    {exp.employmentType}
                                                </Badge>
                                            </div>
                                        </div>
                                        {isEditMode && (onEdit || onDelete) && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger
                                                    aria-label="Options"
                                                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {onEdit && (
                                                        <DropdownMenuItem onClick={() => onEdit(exp)}>
                                                            Edit
                                                        </DropdownMenuItem>
                                                    )}
                                                    {onDelete && (
                                                        <DropdownMenuItem
                                                            onClick={() => onDelete(exp.id)}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            Delete
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        {formatDuration(exp)}
                                    </p>
                                    {description && (
                                        <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">
                                            {description}
                                        </p>
                                    )}
                                    {truncate && (
                                        <button
                                            onClick={() => toggle(exp.id)}
                                            className="mt-1 text-xs font-medium text-brand-700 hover:underline"
                                        >
                                            {expanded ? '…show less' : '…show more'}
                                        </button>
                                    )}
                                    {exp.skills.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {exp.skills.map((s, i) => (
                                                <Badge key={i} variant="outline">
                                                    {s}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            ) : isEditMode ? (
                <EmptyState
                    icon={Briefcase}
                    title="Add experience"
                    description="Show internships, jobs, or freelance work and the achievements that go with them."
                    ctaLabel="Add experience"
                    onCtaClick={onAdd}
                />
            ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No experience listed.</p>
            )}
        </SectionCard>
    )
}
