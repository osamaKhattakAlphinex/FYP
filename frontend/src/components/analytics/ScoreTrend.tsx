'use client'

import type { ScoreHistoryPoint } from '@/types/analytics.types'

interface ScoreTrendProps {
    points: ScoreHistoryPoint[]
}

// Drawing box. The SVG scales proportionally (no distortion of text), so a
// 360px screen simply gets a smaller chart.
const W = 320
const H = 170
const PAD = { left: 26, right: 12, top: 18, bottom: 24 }
// Module 9 grade boundaries, drawn as faint guide lines.
const GUIDES = [40, 55, 70, 85, 100]

const shortDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

/**
 * Finalized evaluation scores over time: a polyline with a point and grade
 * label per evaluation. Only finalized results are ever passed in — a draft is
 * not a fact yet.
 */
export default function ScoreTrend({ points }: ScoreTrendProps) {
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const x = (i: number) =>
        points.length === 1 ? PAD.left + innerW / 2 : PAD.left + (i * innerW) / (points.length - 1)
    const y = (score: number) => PAD.top + (1 - Math.max(0, Math.min(100, score)) / 100) * innerH
    const labelEvery = points.length > 8 ? Math.ceil(points.length / 6) : 1

    const summary = points
        .map((p) => `${Math.round(p.finalScore)} (${p.grade ?? '—'}) on ${p.taskTitle || 'an internship'}`)
        .join('; ')

    return (
        <figure>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="h-auto w-full"
                role="img"
                aria-label={`Evaluation scores, oldest first: ${summary}`}
            >
                {GUIDES.map((g) => (
                    <g key={g}>
                        <line
                            x1={PAD.left}
                            x2={W - PAD.right}
                            y1={y(g)}
                            y2={y(g)}
                            className="stroke-border"
                            strokeDasharray={g === 100 ? undefined : '2 3'}
                            strokeWidth={0.75}
                        />
                        <text
                            x={PAD.left - 4}
                            y={y(g) + 3}
                            textAnchor="end"
                            className="fill-muted-foreground"
                            fontSize={8}
                        >
                            {g}
                        </text>
                    </g>
                ))}
                {points.length > 1 && (
                    <polyline
                        fill="none"
                        stroke="#0a66c2"
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={points.map((p, i) => `${x(i)},${y(p.finalScore)}`).join(' ')}
                    />
                )}
                {points.map((p, i) => (
                    <g key={p.evaluationId}>
                        <title>{`${p.taskTitle || 'Internship'} — ${p.finalScore}/100, grade ${p.grade ?? '—'}`}</title>
                        <circle cx={x(i)} cy={y(p.finalScore)} r={4} fill="#fff" stroke="#0a66c2" strokeWidth={2} />
                        <text
                            x={x(i)}
                            y={y(p.finalScore) - 8}
                            textAnchor="middle"
                            fontSize={9}
                            fontWeight={700}
                            className="fill-foreground"
                        >
                            {p.grade ?? ''}
                        </text>
                        {i % labelEvery === 0 && (
                            <text
                                x={x(i)}
                                y={H - 8}
                                textAnchor="middle"
                                fontSize={8}
                                className="fill-muted-foreground"
                            >
                                {shortDate(p.finalizedAt)}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </figure>
    )
}
