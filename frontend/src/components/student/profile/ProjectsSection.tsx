'use client'

import { useState } from 'react'
import { Code2, Github, Globe, MoreVertical } from 'lucide-react'
import SectionCard from '@/components/shared/SectionCard'
import EmptyState from '@/components/shared/EmptyState'
import { Project } from '@/types/student.types'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ProjectsSectionProps {
    projects: Project[]
    isEditMode?: boolean
    onEdit?: (project: Project) => void
    onDelete?: (id: string) => void
    onAdd?: () => void
}

export default function ProjectsSection({
    projects,
    isEditMode = false,
    onEdit,
    onDelete,
    onAdd,
}: ProjectsSectionProps) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const toggle = (id: string) => {
        const next = new Set(expanded)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setExpanded(next)
    }

    return (
        <SectionCard
            title="Projects"
            icon={Code2}
            onEdit={isEditMode ? onAdd : undefined}
            isEmpty={projects.length === 0}
        >
            {projects.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {projects.map((project) => {
                        const truncate = (project.description || '').split('\n').length > 2
                        const isOpen = expanded.has(project.id)
                        const display =
                            isOpen || !truncate
                                ? project.description
                                : project.description.split('\n').slice(0, 2).join('\n')
                        return (
                            <div
                                key={project.id}
                                className="relative rounded-md border border-border bg-muted/40 p-4"
                            >
                                {isEditMode && (onEdit || onDelete) && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            aria-label="Options"
                                            className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {onEdit && (
                                                <DropdownMenuItem onClick={() => onEdit(project)}>
                                                    Edit
                                                </DropdownMenuItem>
                                            )}
                                            {onDelete && (
                                                <DropdownMenuItem
                                                    onClick={() => onDelete(project.id)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    Delete
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}

                                {project.thumbnailUrl ? (
                                    <img
                                        src={project.thumbnailUrl}
                                        alt={project.title}
                                        className="mb-3 h-28 w-full rounded-md object-cover"
                                    />
                                ) : (
                                    <div className="mb-3 grid h-20 w-full place-items-center rounded-md bg-brand-50 text-brand-300">
                                        <Code2 className="h-7 w-7" />
                                    </div>
                                )}

                                <h3 className="pr-7 text-sm font-semibold text-foreground">
                                    {project.title}
                                </h3>
                                {project.description && (
                                    <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground/85">
                                        {display}
                                    </p>
                                )}
                                {truncate && (
                                    <button
                                        onClick={() => toggle(project.id)}
                                        className="mt-1 text-xs font-medium text-brand-700 hover:underline"
                                    >
                                        {isOpen ? '…show less' : '…show more'}
                                    </button>
                                )}

                                {project.techStack.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {project.techStack.slice(0, 4).map((t, i) => (
                                            <Badge key={i} variant="soft">
                                                {t}
                                            </Badge>
                                        ))}
                                        {project.techStack.length > 4 && (
                                            <Badge variant="muted">
                                                +{project.techStack.length - 4}
                                            </Badge>
                                        )}
                                    </div>
                                )}

                                {(project.githubUrl || project.projectUrl) && (
                                    <div className="mt-3 flex items-center gap-3 text-xs">
                                        {project.githubUrl && (
                                            <a
                                                href={project.githubUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-foreground/80 hover:text-foreground"
                                            >
                                                <Github className="h-3.5 w-3.5" /> GitHub
                                            </a>
                                        )}
                                        {project.projectUrl && (
                                            <a
                                                href={project.projectUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                                            >
                                                <Globe className="h-3.5 w-3.5" /> Live demo
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            ) : isEditMode ? (
                <EmptyState
                    icon={Code2}
                    title="Showcase your projects"
                    description="Personal projects, hackathons, and open-source — proof of work matters more than CVs."
                    ctaLabel="Add project"
                    onCtaClick={onAdd}
                />
            ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No projects yet.</p>
            )}
        </SectionCard>
    )
}
