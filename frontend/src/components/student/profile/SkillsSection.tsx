'use client'

import { Zap } from 'lucide-react'
import SectionCard from '@/components/shared/SectionCard'
import EmptyState from '@/components/shared/EmptyState'
import { Skill } from '@/types/student.types'
import { cn } from '@/lib/utils'

interface SkillsSectionProps {
    skills: Skill[]
    isEditMode?: boolean
    onEdit?: () => void
}

const levelStyles: Record<Skill['level'], string> = {
    Expert: 'bg-brand-700 text-white',
    Advanced: 'bg-brand-600 text-white',
    Intermediate: 'bg-brand-50 text-brand-700 border border-brand-100',
    Beginner: 'bg-muted text-muted-foreground border border-border',
}

export default function SkillsSection({
    skills,
    isEditMode = false,
    onEdit,
}: SkillsSectionProps) {
    return (
        <SectionCard
            title="Skills"
            icon={Zap}
            onEdit={isEditMode ? onEdit : undefined}
            isEmpty={skills.length === 0}
        >
            {skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                        <span
                            key={skill.id}
                            className={cn(
                                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                                levelStyles[skill.level]
                            )}
                        >
                            {skill.name}
                        </span>
                    ))}
                </div>
            ) : isEditMode ? (
                <EmptyState
                    icon={Zap}
                    title="Add your skills"
                    description="Include technical skills, frameworks, and tools — we'll match you to relevant tasks."
                    ctaLabel="Add skills"
                    onCtaClick={onEdit}
                />
            ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                    No skills listed.
                </p>
            )}
        </SectionCard>
    )
}
