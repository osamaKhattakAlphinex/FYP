'use client'

import TrendBadge from './TrendBadge'
import type { SkillGrowth } from '@/types/analytics.types'

interface SkillGrowthTableProps {
    skills: SkillGrowth[]
}

const changeText = (change: number | null) =>
    change == null ? undefined : `${change > 0 ? '+' : ''}${change}`

/**
 * "Skill improvements over time": each skill with the evaluation scores of the
 * completed internships that used it, first → latest. Scrolls sideways inside
 * its card on a narrow screen instead of widening the page.
 */
export default function SkillGrowthTable({ skills }: SkillGrowthTableProps) {
    return (
        <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[480px] text-left text-xs">
                <thead>
                    <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th scope="col" className="py-2 pr-2 font-semibold">Skill</th>
                        <th scope="col" className="py-2 pr-2 font-semibold">Profile level</th>
                        <th scope="col" className="py-2 pr-2 text-right font-semibold">Internships</th>
                        <th scope="col" className="py-2 pr-2 font-semibold">Scores (oldest → latest)</th>
                        <th scope="col" className="py-2 font-semibold">Trend</th>
                    </tr>
                </thead>
                <tbody>
                    {skills.map((s) => (
                        <tr key={s.name} className="border-b border-border/60 last:border-0">
                            <th scope="row" className="py-2 pr-2 font-medium text-foreground">{s.name}</th>
                            <td className="py-2 pr-2 text-muted-foreground">{s.profileLevel || '—'}</td>
                            <td className="py-2 pr-2 text-right tabular-nums">{s.internships}</td>
                            <td className="py-2 pr-2 tabular-nums text-foreground">
                                {s.scores.length > 0
                                    ? s.scores.map((x) => Math.round(x.finalScore)).join(' → ')
                                    : <span className="text-muted-foreground">Not evaluated yet</span>}
                            </td>
                            <td className="py-2">
                                <TrendBadge trend={s.trend} detail={changeText(s.change)} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
