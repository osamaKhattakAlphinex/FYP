'use client'

import { Sparkles, type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ComingSoonCardProps {
    title: string
    description?: string
    icon?: LucideIcon
    note?: string
}

export default function ComingSoonCard({
    title,
    description,
    icon: Icon = Sparkles,
    note = 'Coming soon',
}: ComingSoonCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{title}</CardTitle>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {note}
                </span>
            </CardHeader>
            <CardContent>
                <div className="grid place-items-center rounded-md border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-foreground">
                        {note}
                    </p>
                    {description && (
                        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
