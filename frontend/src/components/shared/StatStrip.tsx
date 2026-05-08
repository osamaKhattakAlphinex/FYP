'use client'

import { ArrowUpRight, ArrowDownRight, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface Stat {
    label: string
    value: string | number
    change?: string
    trend?: 'up' | 'down'
    icon?: LucideIcon
}

interface StatStripProps {
    stats: Stat[]
}

export default function StatStrip({ stats }: StatStripProps) {
    return (
        <Card className="grid grid-cols-2 divide-y divide-border md:grid-cols-4 md:divide-x md:divide-y-0">
            {stats.map((s) => (
                <div key={s.label} className="px-5 py-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                            {s.label}
                        </span>
                        {s.icon && (
                            <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between gap-2">
                        <p className="text-2xl font-bold tracking-tight text-foreground">
                            {s.value}
                        </p>
                        {s.change && (
                            <span
                                className={cn(
                                    'inline-flex items-center gap-0.5 text-xs font-medium',
                                    s.trend === 'down' ? 'text-destructive' : 'text-success'
                                )}
                            >
                                {s.trend === 'down' ? (
                                    <ArrowDownRight className="h-3 w-3" />
                                ) : (
                                    <ArrowUpRight className="h-3 w-3" />
                                )}
                                {s.change}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </Card>
    )
}
