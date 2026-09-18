'use client'

import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface StatTileProps {
    label: string
    value: string | number
    hint?: string
    icon?: LucideIcon
    className?: string
}

/** One headline number. The pages lay these out in a responsive grid. */
export default function StatTile({ label, value, hint, icon: Icon, className }: StatTileProps) {
    return (
        <Card className={cn('p-3', className)}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />}
            </div>
            <p className="mt-1 text-xl font-bold tracking-tight text-foreground">{value}</p>
            {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
        </Card>
    )
}
