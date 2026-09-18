'use client'

import { Star } from 'lucide-react'

import { cn } from '@/lib/utils'

interface StarsProps {
    value: number | null | undefined
    size?: 'sm' | 'md'
    className?: string
}

/** Read-only 1-5 stars. */
export function Stars({ value, size = 'sm', className }: StarsProps) {
    const dim = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'
    return (
        <span
            className={cn('inline-flex items-center gap-0.5', className)}
            aria-label={value != null ? `${value} out of 5` : 'Not rated'}
        >
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    className={cn(
                        dim,
                        value != null && n <= value
                            ? 'fill-accent-500 text-accent-500'
                            : 'text-muted-foreground/40',
                    )}
                />
            ))}
        </span>
    )
}

interface StarPickerProps {
    value: number | null
    onChange: (value: number | null) => void
    /** Clicking the current value again clears it (optional ratings only). */
    clearable?: boolean
    size?: 'sm' | 'lg'
    label: string
}

/** Clickable 1-5 stars, same look as the Module 8 closing-rating picker. */
export function StarPicker({ value, onChange, clearable = false, size = 'lg', label }: StarPickerProps) {
    const dim = size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'
    return (
        <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={value === n}
                    aria-label={`${label}: ${n} out of 5`}
                    onClick={() => onChange(clearable && value === n ? null : n)}
                    className="rounded p-0.5 transition-transform hover:scale-110"
                >
                    <Star
                        className={cn(
                            dim,
                            value != null && n <= value
                                ? 'fill-accent-500 text-accent-500'
                                : 'text-muted-foreground',
                        )}
                    />
                </button>
            ))}
        </div>
    )
}
