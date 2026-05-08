'use client'

import { ArrowUpRight, ArrowDownRight, type LucideIcon } from 'lucide-react'
import { DashboardStats } from '@/types/dashboard.types'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsCardProps {
    stat: DashboardStats
    icon: LucideIcon
}

export default function StatsCard({ stat, icon: Icon }: StatsCardProps) {
    return (
        <Card className="p-5">
            <div className="flex items-start justify-between">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-brand-50 text-brand-700">
                    <Icon className="h-4 w-4" />
                </div>
                {stat.change && (
                    <span
                        className={cn(
                            'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                            stat.trend === 'up'
                                ? 'bg-success/10 text-success'
                                : 'bg-destructive/10 text-destructive'
                        )}
                    >
                        {stat.trend === 'up' ? (
                            <ArrowUpRight className="h-3 w-3" />
                        ) : (
                            <ArrowDownRight className="h-3 w-3" />
                        )}
                        {stat.change}
                    </span>
                )}
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                {stat.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
        </Card>
    )
}
