'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

import {
    Dialog,
    DialogBody,
    DialogCloseButton,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { EVALUATION_METRICS, evaluationService } from '@/services/evaluationService'
import { apiErrorMessage } from '@/lib/apiError'
import type { EvaluationCriterion, EvaluationMetric } from '@/types/evaluation.types'

const MAX_CRITERIA = 8

interface Row {
    key: string
    name: string
    description: string
    metric: EvaluationMetric
    weight: number
}

let rowSeq = 0
const toRow = (c: EvaluationCriterion): Row => ({
    key: `row-${(rowSeq += 1)}`,
    name: c.name,
    description: c.description ?? '',
    metric: c.metric,
    weight: c.weight,
})

interface EvaluationCriteriaModalProps {
    taskId: string
    isOpen: boolean
    onClose: () => void
}

/**
 * Editor for a task's evaluation rubric — the "predefined criteria" every
 * completed internship on the task is scored against. Saving replaces the
 * whole rubric; evaluations that already exist keep the rubric they were
 * generated with.
 */
export default function EvaluationCriteriaModal({ taskId, isOpen, onClose }: EvaluationCriteriaModalProps) {
    const [rows, setRows] = useState<Row[]>([])
    const [isDefault, setIsDefault] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    // Held in a ref so a parent passing an inline callback does not re-trigger the load.
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    useEffect(() => {
        if (!isOpen) return
        ;(async () => {
            try {
                setLoading(true)
                const data = await evaluationService.getTaskCriteria(taskId)
                setRows(data.criteria.map(toRow))
                setIsDefault(data.isDefault)
            } catch (err) {
                toast.error(apiErrorMessage(err, 'Could not load the evaluation rubric'))
                onCloseRef.current()
            } finally {
                setLoading(false)
            }
        })()
    }, [isOpen, taskId])

    const update = (key: string, patch: Partial<Row>) =>
        setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))

    const move = (index: number, delta: number) =>
        setRows((prev) => {
            const next = [...prev]
            const target = index + delta
            if (target < 0 || target >= next.length) return prev
            ;[next[index], next[target]] = [next[target], next[index]]
            return next
        })

    const totalWeight = rows.reduce((sum, r) => sum + (Number(r.weight) || 0), 0)

    const handleSave = async () => {
        // The server re-checks all of this; these are just early, clear messages.
        const names = rows.map((r) => r.name.trim().toLowerCase())
        if (rows.length === 0) return toast.error('Add at least one criterion')
        if (rows.some((r) => r.name.trim().length < 2)) return toast.error('Every criterion needs a name')
        if (new Set(names).size !== names.length) return toast.error('Criterion names must be unique')

        try {
            setSaving(true)
            const data = await evaluationService.replaceTaskCriteria(
                taskId,
                rows.map((r) => ({
                    name: r.name.trim(),
                    description: r.description.trim() || null,
                    metric: r.metric,
                    weight: Number(r.weight),
                })),
            )
            setRows(data.criteria.map(toRow))
            setIsDefault(data.isDefault)
            toast.success('Evaluation rubric saved')
            onClose()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not save the rubric'))
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open && !saving) onClose()
            }}
        >
            <DialogContent size="lg">
                <DialogHeader>
                    <div>
                        <DialogTitle>Evaluation rubric</DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Completed internships on this task are scored automatically against these
                            criteria. Reviewers can still adjust each score before releasing it.
                        </p>
                    </div>
                    <DialogCloseButton />
                </DialogHeader>

                <DialogBody className="max-h-[65vh] space-y-3">
                    {loading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : (
                        <>
                            {isDefault && (
                                <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                                    This task uses the platform&rsquo;s default rubric. Save to make it
                                    your own.
                                </p>
                            )}

                            {rows.map((row, i) => (
                                <div key={row.key} className="rounded-md border border-border p-3">
                                    <div className="grid gap-2.5 sm:grid-cols-[1fr_160px_84px]">
                                        <div>
                                            <Label htmlFor={`${row.key}-name`}>Criterion</Label>
                                            <Input
                                                id={`${row.key}-name`}
                                                value={row.name}
                                                maxLength={100}
                                                onChange={(e) => update(row.key, { name: e.target.value })}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor={`${row.key}-metric`}>Measured by</Label>
                                            <select
                                                id={`${row.key}-metric`}
                                                value={row.metric}
                                                onChange={(e) =>
                                                    update(row.key, { metric: e.target.value as EvaluationMetric })
                                                }
                                                className="mt-1 flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                                            >
                                                {EVALUATION_METRICS.map((m) => (
                                                    <option key={m} value={m}>
                                                        {evaluationService.getMetricLabel(m)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <Label htmlFor={`${row.key}-weight`}>Weight</Label>
                                            <Input
                                                id={`${row.key}-weight`}
                                                type="number"
                                                min={1}
                                                max={10}
                                                value={row.weight}
                                                onChange={(e) =>
                                                    update(row.key, {
                                                        weight: Math.max(1, Math.min(10, Number(e.target.value) || 1)),
                                                    })
                                                }
                                                className="mt-1"
                                            />
                                        </div>
                                    </div>
                                    <Input
                                        value={row.description}
                                        maxLength={500}
                                        placeholder="What good looks like (optional)"
                                        onChange={(e) => update(row.key, { description: e.target.value })}
                                        className="mt-2"
                                    />
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <p className="text-xs text-muted-foreground">
                                            {evaluationService.getMetricHint(row.metric)}
                                            {totalWeight > 0 &&
                                                ` · ${Math.round((row.weight / totalWeight) * 100)}% of the total`}
                                        </p>
                                        <div className="flex shrink-0 gap-1">
                                            <Button
                                                size="icon-sm"
                                                variant="ghost"
                                                aria-label="Move up"
                                                disabled={i === 0}
                                                onClick={() => move(i, -1)}
                                            >
                                                <ArrowUp className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon-sm"
                                                variant="ghost"
                                                aria-label="Move down"
                                                disabled={i === rows.length - 1}
                                                onClick={() => move(i, 1)}
                                            >
                                                <ArrowDown className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon-sm"
                                                variant="ghost"
                                                aria-label="Remove criterion"
                                                disabled={rows.length <= 1}
                                                onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={rows.length >= MAX_CRITERIA}
                                onClick={() =>
                                    setRows((prev) => [
                                        ...prev,
                                        toRow({ name: '', description: '', metric: 'quality', weight: 1 }),
                                    ])
                                }
                            >
                                <Plus className="h-4 w-4" /> Add criterion
                                {rows.length >= MAX_CRITERIA && ` (max ${MAX_CRITERIA})`}
                            </Button>

                            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                                Changing the rubric only affects internships evaluated from now on.
                                Existing evaluations keep the criteria they were scored with.
                            </p>
                        </>
                    )}
                </DialogBody>

                <DialogFooter>
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving || loading}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {saving ? 'Saving…' : 'Save rubric'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
