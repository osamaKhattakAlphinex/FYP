'use client'

import { useState } from 'react'
import { Building2, Calendar, GraduationCap, MoreVertical } from 'lucide-react'
import SectionCard from '@/components/shared/SectionCard'
import EmptyState from '@/components/shared/EmptyState'
import { Education } from '@/types/student.types'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface EducationSectionProps {
    education: Education[]
    isEditMode?: boolean
    onEdit?: (edu: Education) => void
    onDelete?: (id: string) => void
    onAdd?: () => void
}

export default function EducationSection({
    education,
    isEditMode = false,
    onEdit,
    onDelete,
    onAdd,
}: EducationSectionProps) {
    const formatRange = (edu: Education) =>
        edu.isCurrentlyStudying ? `${edu.startYear} – Present` : `${edu.startYear} – ${edu.endYear}`

    return (
        <SectionCard
            title="Education"
            icon={GraduationCap}
            onEdit={isEditMode ? onAdd : undefined}
            isEmpty={education.length === 0}
        >
            {education.length > 0 ? (
                <ul className="divide-y divide-border">
                    {education.map((edu) => (
                        <li key={edu.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700">
                                <Building2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-foreground">
                                            {edu.degree}
                                            {edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}
                                        </p>
                                        <p className="text-xs text-foreground/80">{edu.institution}</p>
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
                                                    <DropdownMenuItem onClick={() => onEdit(edu)}>
                                                        Edit
                                                    </DropdownMenuItem>
                                                )}
                                                {onDelete && (
                                                    <DropdownMenuItem
                                                        onClick={() => onDelete(edu.id)}
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
                                    {formatRange(edu)}
                                </p>
                                {edu.grade && (
                                    <Badge variant="success" className="mt-2">
                                        CGPA: {edu.grade}
                                    </Badge>
                                )}
                                {edu.description && (
                                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                        {edu.description}
                                    </p>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : isEditMode ? (
                <EmptyState
                    icon={GraduationCap}
                    title="Add your education"
                    description="Include your degree, university, and academic achievements."
                    ctaLabel="Add education"
                    onCtaClick={onAdd}
                />
            ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No education listed.</p>
            )}
        </SectionCard>
    )
}
