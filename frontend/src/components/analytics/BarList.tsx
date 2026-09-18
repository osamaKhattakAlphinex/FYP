'use client'

import { cn } from '@/lib/utils'

export interface BarListItem {
    label: string
    value: number
    /** Text shown at the end of the row; defaults to the value. */
    display?: string
    /** Tailwind background class for this bar. */
    barClassName?: string
}

interface BarListProps {
    items: BarListItem[]
    /** The value of a full-width bar; defaults to the largest value. */
    max?: number
    barClassName?: string
    className?: string
}

/**
 * Horizontal labelled bars. Each row is readable on its own (label and value
 * are text), so the bar itself is decoration and hidden from screen readers.
 */
export default function BarList({ items, max, barClassName = 'bg-brand-500', className }: BarListProps) {
    const top = max ?? Math.max(0, ...items.map((i) => i.value))
    return (
        <ul className={cn('space-y-2', className)}>
            {items.map((item) => {
                const width = top > 0 ? Math.max(0, Math.min(100, (item.value / top) * 100)) : 0
                return (
                    <li key={item.label} className="text-xs">
                        <div className="mb-1 flex items-baseline justify-between gap-2">
                            <span className="min-w-0 truncate text-foreground">{item.label}</span>
                            <span className="shrink-0 font-semibold tabular-nums text-foreground">
                                {item.display ?? item.value}
                            </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary" aria-hidden>
                            <div
                                className={cn(
                                    'h-full rounded-full transition-all duration-500',
                                    item.barClassName || barClassName,
                                )}
                                style={{ width: `${width}%` }}
                            />
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}
