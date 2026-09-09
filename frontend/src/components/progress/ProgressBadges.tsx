'use client'

import { AlertTriangle, CircleDot, Clock, ShieldCheck } from 'lucide-react'

import { progressService } from '@/services/progressService'
import type {
    HealthStatus,
    MilestoneStatus,
    ProgressStatus,
} from '@/types/progress.types'
import { cn } from '@/lib/utils'

const chip =
    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold'

export function StatusBadge({
    status,
    className,
}: {
    status: ProgressStatus
    className?: string
}) {
    return (
        <span className={cn(chip, progressService.getStatusColor(status), className)}>
            <CircleDot className="h-3 w-3" />
            {progressService.getStatusLabel(status)}
        </span>
    )
}

/**
 * Health is only meaningful while an internship is running — a completed one
 * always derives to on_track server-side, and showing that would be noise.
 */
export function HealthBadge({
    health,
    status,
    className,
}: {
    health: HealthStatus
    status?: ProgressStatus
    className?: string
}) {
    if (status === 'completed' || status === 'abandoned') return null

    const Icon =
        health === 'overdue' ? AlertTriangle : health === 'at_risk' ? Clock : ShieldCheck

    return (
        <span className={cn(chip, progressService.getHealthColor(health), className)}>
            <Icon className="h-3 w-3" />
            {progressService.getHealthLabel(health)}
        </span>
    )
}

export function MilestoneBadge({
    status,
    className,
}: {
    status: MilestoneStatus
    className?: string
}) {
    return (
        <span className={cn(chip, progressService.getMilestoneColor(status), className)}>
            {progressService.getMilestoneLabel(status)}
        </span>
    )
}

export function RiskBadge({
    level,
    score,
    className,
}: {
    level: string
    score?: number
    className?: string
}) {
    return (
        <span className={cn(chip, progressService.getRiskColor(level), className)}>
            {level === 'low' ? 'Low risk' : level === 'medium' ? 'Medium risk' : 'High risk'}
            {score != null && <span className="opacity-70">· {score}</span>}
        </span>
    )
}
