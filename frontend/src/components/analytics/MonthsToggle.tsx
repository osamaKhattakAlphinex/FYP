'use client'

import { ANALYTICS_MONTHS } from '@/services/analyticsService'
import type { AnalyticsMonths } from '@/types/analytics.types'
import { cn } from '@/lib/utils'

interface MonthsToggleProps {
    value: AnalyticsMonths
    onChange: (months: AnalyticsMonths) => void
}

/** 6 / 12 month window for the time series. */
export default function MonthsToggle({ value, onChange }: MonthsToggleProps) {
    return (
        <div
            role="group"
            aria-label="Time range"
            className="inline-flex rounded-md border border-border bg-card p-0.5"
        >
            {ANALYTICS_MONTHS.map((m) => (
                <button
                    key={m}
                    type="button"
                    aria-pressed={value === m}
                    onClick={() => onChange(m)}
                    className={cn(
                        'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                        value === m
                            ? 'bg-brand-600 text-white'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {m} months
                </button>
            ))}
        </div>
    )
}
