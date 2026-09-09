'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock3, Loader2, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { progressService } from '@/services/progressService'
import { apiErrorMessage } from '@/lib/apiError'
import type {
    InternshipProgress,
    ProgressMilestone,
    ProgressTimeLog,
    TimeLogsResponse,
} from '@/types/progress.types'
import { cn } from '@/lib/utils'

const today = () => new Date().toISOString().slice(0, 10)

const formatDate = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    })

/** Simple bar chart of daily hours — no chart library, no extra bundle. */
function HoursChart({ series }: { series: Array<{ date: string; hours: number }> }) {
    if (series.length === 0) return null
    const max = Math.max(...series.map((s) => s.hours), 1)
    const recent = series.slice(-21)

    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Daily hours (last {recent.length} logged days)
            </p>
            <div className="mt-2 flex h-24 items-end gap-1" role="img" aria-label="Daily hours logged">
                {recent.map((s) => (
                    <div key={s.date} className="group relative flex-1" title={`${formatDate(s.date)}: ${s.hours}h`}>
                        <div
                            className="w-full rounded-t bg-brand-500/80 transition-colors group-hover:bg-brand-600"
                            style={{ height: `${Math.max(4, (s.hours / max) * 96)}px` }}
                        />
                    </div>
                ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>{formatDate(recent[0].date)}</span>
                <span>{formatDate(recent[recent.length - 1].date)}</span>
            </div>
        </div>
    )
}

interface TimeLogPanelProps {
    progress: InternshipProgress
    milestones: ProgressMilestone[]
    onLogged: () => void
}

export default function TimeLogPanel({
    progress,
    milestones,
    onLogged,
}: TimeLogPanelProps) {
    const [data, setData] = useState<TimeLogsResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [saving, setSaving] = useState(false)

    const [hours, setHours] = useState('2')
    const [workDate, setWorkDate] = useState(today())
    const [milestoneId, setMilestoneId] = useState('')
    const [description, setDescription] = useState('')

    const canWork = !!progress.permissions?.canWork

    const load = useCallback(async () => {
        try {
            setLoading(true)
            setData(await progressService.getTimeLogs(progress.id))
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not load the time log'))
        } finally {
            setLoading(false)
        }
    }, [progress.id])

    useEffect(() => {
        load()
    }, [load])

    const handleAdd = async () => {
        const value = Number(hours)
        if (!Number.isFinite(value) || value < 0.25) {
            toast.error('Log at least 0.25 hours')
            return
        }

        try {
            setSaving(true)
            await progressService.createTimeLog(progress.id, {
                hours: value,
                workDate,
                milestoneId: milestoneId || null,
                description: description.trim() || undefined,
            })
            toast.success('Time logged')
            setAdding(false)
            setHours('2')
            setDescription('')
            setWorkDate(today())
            await load()
            onLogged()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not log that time'))
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (log: ProgressTimeLog) => {
        if (!window.confirm(`Delete the ${log.hours}h entry for ${formatDate(log.workDate)}?`)) {
            return
        }
        try {
            await progressService.deleteTimeLog(progress.id, log.id)
            toast.success('Entry deleted')
            await load()
            onLogged()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not delete that entry'))
        }
    }

    // Only milestones that can still absorb work are offered.
    const selectable = milestones.filter(
        (m) => m.status !== 'cancelled' && m.status !== 'completed',
    )

    return (
        <div className="space-y-3">
            <Card className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700">
                            <Clock3 className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-lg font-bold leading-none text-foreground">
                                {data ? data.totalHours : progress.metrics.totalHoursLogged}h
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                logged across {data ? data.count : 0} entr
                                {(data?.count ?? 0) === 1 ? 'y' : 'ies'}
                                {progress.expectedHoursPerWeek
                                    ? ` · target ${progress.expectedHoursPerWeek}h/week`
                                    : ''}
                            </p>
                        </div>
                    </div>

                    {canWork && !adding && (
                        <Button size="sm" onClick={() => setAdding(true)}>
                            <Plus className="h-4 w-4" /> Log time
                        </Button>
                    )}
                </div>

                {adding && (
                    <div className="mt-4 space-y-3 border-t border-border pt-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                                <Label htmlFor="tl-hours">Hours</Label>
                                <Input
                                    id="tl-hours"
                                    type="number"
                                    min={0.25}
                                    max={16}
                                    step="0.25"
                                    value={hours}
                                    onChange={(e) => setHours(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="tl-date">Date</Label>
                                <Input
                                    id="tl-date"
                                    type="date"
                                    max={today()}
                                    value={workDate}
                                    onChange={(e) => setWorkDate(e.target.value)}
                                    className="mt-1.5"
                                />
                            </div>
                            <div>
                                <Label htmlFor="tl-milestone">Milestone</Label>
                                <select
                                    id="tl-milestone"
                                    value={milestoneId}
                                    onChange={(e) => setMilestoneId(e.target.value)}
                                    className="mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    <option value="">General / no milestone</option>
                                    {selectable.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="tl-desc">
                                What did you work on?{' '}
                                <span className="font-normal text-muted-foreground">(optional)</span>
                            </Label>
                            <Input
                                id="tl-desc"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                maxLength={500}
                                placeholder="e.g. Wired the chart components to the API"
                                className="mt-1.5"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setAdding(false)}
                                disabled={saving}
                            >
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleAdd} disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {saving ? 'Saving…' : 'Save entry'}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {loading ? (
                <Skeleton className="h-40 w-full" />
            ) : (
                <>
                    {data && data.series.length > 0 && (
                        <Card className="p-4">
                            <HoursChart series={data.series} />
                        </Card>
                    )}

                    <Card className="divide-y divide-border">
                        {!data || data.timeLogs.length === 0 ? (
                            <p className="p-6 text-center text-sm text-muted-foreground">
                                No time has been logged on this internship yet.
                            </p>
                        ) : (
                            data.timeLogs.map((log) => (
                                <div
                                    key={log.id}
                                    className="flex items-start gap-3 px-4 py-3"
                                >
                                    <span
                                        className={cn(
                                            'mt-0.5 shrink-0 rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700',
                                        )}
                                    >
                                        {log.hours}h
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-foreground">
                                            {log.description || 'No description'}
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {formatDate(log.workDate)}
                                            {log.milestone ? ` · ${log.milestone.title}` : ' · general'}
                                        </p>
                                    </div>
                                    {canWork && (
                                        <Button
                                            size="icon-sm"
                                            variant="ghost"
                                            aria-label="Delete entry"
                                            onClick={() => handleDelete(log)}
                                        >
                                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    )}
                                </div>
                            ))
                        )}
                    </Card>
                </>
            )}
        </div>
    )
}
