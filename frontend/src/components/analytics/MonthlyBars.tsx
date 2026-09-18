'use client'

import { monthLabel } from '@/services/analyticsService'
import { cn } from '@/lib/utils'

export interface MonthlySeries {
    key: string
    label: string
    /** Tailwind background class. */
    className: string
}

interface MonthlyBarsProps {
    data: Array<{ month: string }>
    series: MonthlySeries[]
    /** Suffix for values, e.g. "h". */
    unit?: string
    height?: number
}

const valueOf = (row: { month: string }, key: string): number =>
    Number((row as unknown as Record<string, unknown>)[key]) || 0

/**
 * Vertical bars per month, grouped side by side for up to three series.
 * Plain divs so it shrinks to a 360px screen: with twelve months every other
 * label is dropped. A visually hidden table carries the numbers for screen
 * readers; the bars themselves are aria-hidden.
 */
export default function MonthlyBars({ data, series, unit = '', height = 140 }: MonthlyBarsProps) {
    const max = Math.max(0, ...data.flatMap((d) => series.map((s) => valueOf(d, s.key))))
    const dense = data.length > 6

    return (
        <div>
            {series.length > 1 && (
                <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground" aria-hidden>
                    {series.map((s) => (
                        <span key={s.key} className="inline-flex items-center gap-1.5">
                            <span className={cn('h-2 w-2 rounded-sm', s.className)} />
                            {s.label}
                        </span>
                    ))}
                </div>
            )}
            <div className="flex items-end gap-1 sm:gap-2" style={{ height }} aria-hidden>
                {data.map((d) => (
                    <div key={d.month} className="flex h-full min-w-0 flex-1 items-end justify-center gap-px">
                        {series.map((s) => {
                            const v = valueOf(d, s.key)
                            const h = max > 0 ? (v / max) * 100 : 0
                            return (
                                <div
                                    key={s.key}
                                    title={`${monthLabel(d.month, true)} · ${s.label}: ${v}${unit}`}
                                    className={cn(
                                        'w-full max-w-[18px] rounded-t-sm',
                                        s.className,
                                        v === 0 && 'opacity-30',
                                    )}
                                    style={{ height: v > 0 ? `${Math.max(h, 3)}%` : '2px' }}
                                />
                            )
                        })}
                    </div>
                ))}
            </div>
            <div className="mt-1 flex gap-1 border-t border-border pt-1 sm:gap-2" aria-hidden>
                {data.map((d, i) => (
                    <span
                        key={d.month}
                        className="min-w-0 flex-1 truncate text-center text-[10px] text-muted-foreground"
                    >
                        {dense && i % 2 === 1 && i !== data.length - 1 ? '' : monthLabel(d.month)}
                    </span>
                ))}
            </div>
            <table className="sr-only">
                <caption>Values per month</caption>
                <thead>
                    <tr>
                        <th scope="col">Month</th>
                        {series.map((s) => (
                            <th key={s.key} scope="col">
                                {s.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((d) => (
                        <tr key={d.month}>
                            <th scope="row">{monthLabel(d.month, true)}</th>
                            {series.map((s) => (
                                <td key={s.key}>{`${valueOf(d, s.key)}${unit}`}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
