'use client'

import { cn } from '@/lib/utils'

interface ProgressRingProps {
    /** 0-100. */
    value: number
    size?: number
    strokeWidth?: number
    /** Tints the ring by health rather than by value. */
    tone?: 'brand' | 'on_track' | 'at_risk' | 'overdue'
    label?: string
    className?: string
}

const TONE_STROKE: Record<string, string> = {
    brand: '#0a66c2',
    on_track: '#059669',
    at_risk: '#d97706',
    overdue: '#dc2626',
}

/**
 * Circular completion indicator. Used at three sizes: in a list row, in the
 * workspace header, and in the report. Purely presentational.
 */
export default function ProgressRing({
    value,
    size = 64,
    strokeWidth = 6,
    tone = 'brand',
    label,
    className,
}: ProgressRingProps) {
    const clamped = Math.max(0, Math.min(100, Math.round(value)))
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const dash = (clamped / 100) * circumference
    const stroke = TONE_STROKE[tone] || TONE_STROKE.brand

    return (
        <div
            className={cn('relative shrink-0', className)}
            style={{ width: size, height: size }}
            role="img"
            aria-label={`${clamped}% complete${label ? ` — ${label}` : ''}`}
        >
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    className="stroke-secondary"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={strokeWidth}
                    stroke={stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    className="transition-all duration-500"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                    className="font-bold leading-none text-foreground"
                    style={{ fontSize: Math.max(11, size * 0.26) }}
                >
                    {clamped}
                    <span style={{ fontSize: Math.max(8, size * 0.16) }}>%</span>
                </span>
            </div>
        </div>
    )
}
