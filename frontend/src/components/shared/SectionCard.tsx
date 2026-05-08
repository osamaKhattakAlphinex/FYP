'use client'

import { LucideIcon, Pencil, Plus } from 'lucide-react'
import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

interface SectionCardProps {
    title: string
    icon: LucideIcon
    onEdit?: () => void
    isEmpty?: boolean
    action?: ReactNode
    children: ReactNode
}

export default function SectionCard({
    title,
    icon: Icon,
    onEdit,
    isEmpty = false,
    action,
    children,
}: SectionCardProps) {
    return (
        <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-brand-600" />
                    <h2 className="text-base font-semibold text-foreground">{title}</h2>
                </div>
                {action ||
                    (onEdit && (
                        <button
                            onClick={onEdit}
                            aria-label={isEmpty ? `Add ${title}` : `Edit ${title}`}
                            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {isEmpty ? <Plus className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                        </button>
                    ))}
            </div>
            {children}
        </Card>
    )
}
