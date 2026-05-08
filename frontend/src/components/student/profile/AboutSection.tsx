'use client'

import { useState } from 'react'
import { User } from 'lucide-react'
import SectionCard from '@/components/shared/SectionCard'
import EmptyState from '@/components/shared/EmptyState'

interface AboutSectionProps {
    about: string
    isEditMode?: boolean
    onEdit?: () => void
}

export default function AboutSection({ about, isEditMode = false, onEdit }: AboutSectionProps) {
    const [expanded, setExpanded] = useState(false)
    const lines = about.split('\n')
    const truncate = lines.length > 4
    const display = expanded || !truncate ? about : lines.slice(0, 4).join('\n')

    return (
        <SectionCard
            title="About"
            icon={User}
            onEdit={isEditMode ? onEdit : undefined}
            isEmpty={!about}
        >
            {about ? (
                <div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                        {display}
                    </p>
                    {truncate && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="mt-2 text-sm font-medium text-brand-700 hover:underline"
                        >
                            {expanded ? '…show less' : '…show more'}
                        </button>
                    )}
                </div>
            ) : isEditMode ? (
                <EmptyState
                    icon={User}
                    title="Tell companies about yourself"
                    description="Share your background, interests, and what you're looking to build."
                    ctaLabel="Add bio"
                    onCtaClick={onEdit}
                />
            ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No bio yet.</p>
            )}
        </SectionCard>
    )
}
