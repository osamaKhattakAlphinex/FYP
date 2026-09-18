'use client'

import { Sparkles, WifiOff } from 'lucide-react'
import { Card } from '@/components/ui/card'
import TrendBadge from './TrendBadge'
import { BAND_LABELS } from '@/services/analyticsService'
import type { PerformanceBand, PerformanceInsight } from '@/types/analytics.types'
import { cn } from '@/lib/utils'

export const BAND_STYLE: Record<PerformanceBand, { stroke: string; badge: string }> = {
    excellent: { stroke: '#059669', badge: 'bg-emerald-50 text-emerald-700' },
    strong: { stroke: '#0a66c2', badge: 'bg-brand-50 text-brand-700' },
    developing: { stroke: '#d97706', badge: 'bg-amber-50 text-amber-800' },
    needs_support: { stroke: '#dc2626', badge: 'bg-red-50 text-red-700' },
    insufficient_data: { stroke: '#94a3b8', badge: 'bg-muted text-muted-foreground' },
}

interface IndexRingProps {
    value: number
    band: PerformanceBand
    size?: number
}

/**
 * The 0-100 performance index as a ring. Deliberately not ProgressRing: that
 * one renders "%" and announces "complete", which would misdescribe an index.
 */
export function IndexRing({ value, band, size = 76 }: IndexRingProps) {
    const stroke = 7
    const r = (size - stroke) / 2
    const c = 2 * Math.PI * r
    const v = band === 'insufficient_data' ? 0 : Math.max(0, Math.min(100, value))
    const dash = (v / 100) * c
    return (
        <div
            className="relative shrink-0"
            style={{ width: size, height: size }}
            role="img"
            aria-label={
                band === 'insufficient_data'
                    ? 'Performance index: not enough data'
                    : `Performance index ${v} out of 100 — ${BAND_LABELS[band]}`
            }
        >
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-secondary" />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    strokeWidth={stroke}
                    stroke={BAND_STYLE[band].stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${c - dash}`}
                    className="transition-all duration-500"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className="font-bold text-foreground" style={{ fontSize: size * 0.27 }}>
                    {band === 'insufficient_data' ? '—' : Math.round(v)}
                </span>
                <span className="mt-0.5 text-muted-foreground" style={{ fontSize: Math.max(9, size * 0.13) }}>
                    /100
                </span>
            </div>
        </div>
    )
}

const slopeText = (slope: number | null) =>
    slope == null ? undefined : `${slope > 0 ? '+' : ''}${slope} pts/eval`

interface InsightCardProps {
    insight: PerformanceInsight | null
    aiGenerated: boolean
    title?: string
    className?: string
}

/**
 * Performance index, trend, projection and the plain-language reasons behind
 * them (§2.3.2.5: automated judgements come with clear reasons).
 */
export default function InsightCard({ insight, aiGenerated, title = 'Performance insight', className }: InsightCardProps) {
    if (!insight) return null
    const band = insight.band
    const noData = band === 'insufficient_data'

    return (
        <Card className={cn('p-4', className)}>
            <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-600" aria-hidden />
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4">
                <IndexRing value={insight.performance_index} band={band} />
                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', BAND_STYLE[band].badge)}>
                            {BAND_LABELS[band]}
                        </span>
                        <TrendBadge trend={insight.trend} detail={slopeText(insight.trend_slope)} />
                    </div>
                    {!noData && (
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                            <dt className="text-muted-foreground">Projected next score</dt>
                            <dd className="font-medium text-foreground">
                                {insight.predicted_next_score != null ? `${insight.predicted_next_score}/100` : 'Needs 3 evaluations'}
                            </dd>
                            <dt className="text-muted-foreground">Confidence</dt>
                            <dd className="font-medium text-foreground">{Math.round(insight.confidence * 100)}%</dd>
                        </dl>
                    )}
                </div>
            </div>

            {(insight.strengths.length > 0 || insight.focus_areas.length > 0) && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {insight.strengths.length > 0 && (
                        <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Strengths</p>
                            <div className="flex flex-wrap gap-1">
                                {insight.strengths.map((s) => (
                                    <span key={s} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800">
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {insight.focus_areas.length > 0 && (
                        <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Focus areas</p>
                            <div className="flex flex-wrap gap-1">
                                {insight.focus_areas.map((s) => (
                                    <span key={s} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">
                                        {s}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {insight.insights.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-foreground/90">
                    {insight.insights.map((line) => (
                        <li key={line}>{line}</li>
                    ))}
                </ul>
            )}

            <p className="mt-3 text-[11px] text-muted-foreground">
                Based only on finalized evaluations, feedback and closed internships. Recent work counts more.
            </p>

            {!aiGenerated && (
                <p className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    The AI service is unreachable, so this insight was produced by the platform&rsquo;s own
                    rules. The numbers are unaffected — they are computed from recorded data either way.
                </p>
            )}
        </Card>
    )
}
