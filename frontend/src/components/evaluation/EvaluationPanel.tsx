'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
    Award,
    CheckCircle2,
    ClipboardCheck,
    Lightbulb,
    Loader2,
    Lock,
    Pencil,
    RefreshCw,
    RotateCcw,
    ShieldCheck,
    Sparkles,
    ThumbsUp,
    WifiOff,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogBody,
    DialogCloseButton,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import ProgressRing from '@/components/progress/ProgressRing'
import { evaluationService } from '@/services/evaluationService'
import { apiErrorMessage } from '@/lib/apiError'
import type { InternshipProgress, ProgressPerspective } from '@/types/progress.types'
import type {
    EvaluationCriterionScore,
    EvaluationEvidence,
    InternshipEvaluation,
} from '@/types/evaluation.types'
import { cn } from '@/lib/utils'

const formatDate = (iso?: string | null) =>
    !iso
        ? '—'
        : new Date(iso).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
          })

const pct = (rate: number | null | undefined) =>
    rate == null ? '—' : `${Math.round(rate * 100)}%`

const statusOf = (error: unknown) =>
    (error as { response?: { status?: number } })?.response?.status

// The evidence fields worth showing a reviewer, with how to render each.
const EVIDENCE_ROWS: Array<{
    key: keyof EvaluationEvidence
    label: string
    render: (e: EvaluationEvidence) => string
}> = [
    { key: 'weighted_completion', label: 'Weighted completion', render: (e) => `${e.weighted_completion}%` },
    {
        key: 'completed_milestones',
        label: 'Milestones approved',
        render: (e) => `${e.completed_milestones}/${e.milestone_count}`,
    },
    { key: 'on_time_submission_rate', label: 'On-time submissions', render: (e) => pct(e.on_time_submission_rate) },
    { key: 'first_time_approval_rate', label: 'Approved first time', render: (e) => pct(e.first_time_approval_rate) },
    {
        key: 'average_review_score',
        label: 'Avg. review score',
        render: (e) => (e.average_review_score == null ? '—' : `${e.average_review_score}/5`),
    },
    {
        key: 'supervisor_rating',
        label: 'Closing rating',
        render: (e) => (e.supervisor_rating == null ? '—' : `${e.supervisor_rating}/5`),
    },
    {
        key: 'hours_logged',
        label: 'Hours logged',
        render: (e) =>
            `${e.hours_logged}h${
                e.expected_hours ? ` / ${e.expected_hours}h expected` : e.estimated_hours ? ` / ${e.estimated_hours}h est.` : ''
            }`,
    },
    { key: 'checkin_count', label: 'Check-ins', render: (e) => `${e.checkin_count} in ${e.active_weeks} wk` },
    {
        key: 'finished_on_time',
        label: 'Finished on time',
        render: (e) =>
            e.finished_on_time == null ? '—' : e.finished_on_time ? 'Yes' : `${e.days_late} day(s) late`,
    },
]

interface CriterionRowProps {
    criterion: EvaluationCriterionScore
    canEdit: boolean
    onSave: (criterion: EvaluationCriterionScore, score: number, note: string) => Promise<boolean>
}

function CriterionRow({ criterion, canEdit, onSave }: CriterionRowProps) {
    const [editing, setEditing] = useState(false)
    const [score, setScore] = useState(String(criterion.finalScore ?? ''))
    const [note, setNote] = useState(criterion.adjustmentNote ?? '')
    const [saving, setSaving] = useState(false)

    const value = criterion.finalScore ?? 0
    const parsed = Number(score)
    const differs = score !== '' && Math.abs(parsed - (criterion.autoScore ?? 0)) >= 0.005

    const save = async (nextScore: number, nextNote: string) => {
        setSaving(true)
        const ok = await onSave(criterion, nextScore, nextNote)
        setSaving(false)
        if (ok) setEditing(false)
    }

    return (
        <li className="rounded-md border border-border p-3.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{criterion.name}</p>
                    <p className="text-xs text-muted-foreground">
                        {evaluationService.getMetricLabel(criterion.metric)} · weight ×{criterion.weight}
                        {!criterion.hasEvidence && (
                            <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 font-medium">
                                insufficient evidence
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold leading-none text-foreground">
                        {Math.round(value)}
                        <span className="text-xs font-normal text-muted-foreground">/100</span>
                    </span>
                    {canEdit && !editing && (
                        <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => {
                                setScore(String(criterion.finalScore ?? ''))
                                setNote(criterion.adjustmentNote ?? '')
                                setEditing(true)
                            }}
                        >
                            <Pencil className="h-3.5 w-3.5" /> Adjust
                        </Button>
                    )}
                </div>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                    className={cn('h-full rounded-full', evaluationService.getScoreBarColor(value))}
                    style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                />
            </div>

            {criterion.adjusted && (
                <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">
                    Adjusted by a reviewer from the automated {criterion.autoScore}.{' '}
                    {criterion.adjustmentNote && <span className="italic">“{criterion.adjustmentNote}”</span>}
                </p>
            )}

            {criterion.rationale && (
                <p className="mt-2 text-sm text-muted-foreground">{criterion.rationale}</p>
            )}
            {criterion.evidence.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                    {criterion.evidence.map((line) => (
                        <li key={line} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                            {line}
                        </li>
                    ))}
                </ul>
            )}

            {editing && (
                <div className="mt-3 space-y-2.5 rounded-md bg-muted/60 p-3">
                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            <Label htmlFor={`score-${criterion.id}`}>Score (0–100)</Label>
                            <Input
                                id={`score-${criterion.id}`}
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={score}
                                onChange={(e) => setScore(e.target.value)}
                                className="mt-1 w-28"
                            />
                        </div>
                        <p className="pb-2 text-xs text-muted-foreground">
                            Automated: {criterion.autoScore}
                        </p>
                    </div>
                    {differs && (
                        <div>
                            <Label htmlFor={`note-${criterion.id}`}>
                                Why are you changing it?{' '}
                                <span className="font-normal text-muted-foreground">
                                    (required, shared with the student)
                                </span>
                            </Label>
                            <Textarea
                                id={`note-${criterion.id}`}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={2}
                                maxLength={500}
                                className="mt-1"
                                placeholder="e.g. The final delivery was stronger than the review scores suggest."
                            />
                        </div>
                    )}
                    <div className="flex flex-wrap justify-end gap-2">
                        {criterion.adjusted && (
                            <Button
                                size="xs"
                                variant="ghost"
                                disabled={saving}
                                onClick={() => save(criterion.autoScore ?? 0, '')}
                            >
                                <RotateCcw className="h-3.5 w-3.5" /> Use automated score
                            </Button>
                        )}
                        <Button size="xs" variant="secondary" disabled={saving} onClick={() => setEditing(false)}>
                            Cancel
                        </Button>
                        <Button
                            size="xs"
                            disabled={saving || score === '' || Number.isNaN(parsed) || parsed < 0 || parsed > 100}
                            onClick={() => {
                                if (differs && note.trim().length < 5) {
                                    toast.error('Add a short note (5+ characters) explaining the change')
                                    return
                                }
                                save(parsed, note.trim())
                            }}
                        >
                            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
                        </Button>
                    </div>
                </div>
            )}
        </li>
    )
}

interface EvaluationPanelProps {
    progress: InternshipProgress
    perspective: ProgressPerspective
    /** Bumped by the workspace whenever something changes, to force a refetch. */
    refreshKey?: number
}

/**
 * The Evaluation tab of the internship workspace (Module 9). Rubric-based
 * scores with their reasons; supervisors adjust and finalize, the student sees
 * the result once it is released. Like the rest of the workspace it renders
 * only the actions `evaluation.permissions` says exist.
 */
export default function EvaluationPanel({
    progress,
    perspective,
    refreshKey = 0,
}: EvaluationPanelProps) {
    const completed = progress.status === 'completed'
    const [evaluation, setEvaluation] = useState<InternshipEvaluation | null>(null)
    const [loading, setLoading] = useState(completed)
    const [notReleased, setNotReleased] = useState(false)
    const [busy, setBusy] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [reviewerNote, setReviewerNote] = useState('')
    const [editingNote, setEditingNote] = useState(false)

    const load = useCallback(async () => {
        if (!completed) return
        try {
            setLoading(true)
            const record = await evaluationService.getForProgress(progress.id)
            setEvaluation(record)
            setReviewerNote(record.reviewerNote ?? '')
            setNotReleased(false)
        } catch (err) {
            setEvaluation(null)
            if (statusOf(err) === 404 && perspective === 'student') {
                setNotReleased(true)
            } else {
                toast.error(apiErrorMessage(err, 'Could not load the evaluation'))
            }
        } finally {
            setLoading(false)
        }
    }, [completed, progress.id, perspective])

    useEffect(() => {
        load()
    }, [load, refreshKey])

    if (!completed) {
        return (
            <Card className="p-8 text-center">
                <ClipboardCheck className="mx-auto h-8 w-8 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-foreground">
                    Evaluation becomes available once the internship is completed
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                    When the internship is marked complete, it is scored automatically against the
                    task&rsquo;s evaluation criteria using the milestones, reviews, time and
                    check-ins recorded here.{' '}
                    {perspective === 'student'
                        ? 'Your supervisor reviews it before it is released to you.'
                        : 'You can then review, adjust and finalize it.'}
                </p>
            </Card>
        )
    }

    if (loading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (notReleased) {
        return (
            <Card className="p-8 text-center">
                <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-foreground">
                    Your evaluation has not been released yet
                </h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                    Your supervisor is reviewing the automated evaluation. You will get an email
                    as soon as it is finalized.
                </p>
            </Card>
        )
    }

    if (!evaluation) {
        return (
            <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">The evaluation could not be loaded.</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={load}>
                    <RefreshCw className="h-4 w-4" /> Try again
                </Button>
            </Card>
        )
    }

    const permissions = evaluation.permissions
    const canEdit = !!permissions?.canEdit
    const finalized = evaluation.status === 'finalized'
    const criteria = evaluation.criteria ?? []
    const backed = criteria.filter((c) => c.hasEvidence).length
    const adjustedCount = criteria.filter((c) => c.adjusted).length

    const apply = (record: InternshipEvaluation) => {
        setEvaluation(record)
        setReviewerNote(record.reviewerNote ?? '')
    }

    const handleSaveCriterion = async (
        criterion: EvaluationCriterionScore,
        score: number,
        note: string,
    ) => {
        try {
            apply(
                await evaluationService.update(evaluation.id, {
                    criteria: [{ id: criterion.id, finalScore: score, adjustmentNote: note || null }],
                }),
            )
            toast.success('Score updated')
            return true
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not update the score'))
            return false
        }
    }

    const handleSaveNote = async () => {
        try {
            setBusy(true)
            apply(await evaluationService.update(evaluation.id, { reviewerNote: reviewerNote.trim() || null }))
            setEditingNote(false)
            toast.success('Reviewer note saved')
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not save the note'))
        } finally {
            setBusy(false)
        }
    }

    const handleRegenerate = async () => {
        try {
            setBusy(true)
            apply(await evaluationService.regenerate(progress.id))
            toast.success('Evaluation regenerated from the latest data')
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not regenerate the evaluation'))
        } finally {
            setBusy(false)
        }
    }

    const handleFinalize = async () => {
        try {
            setBusy(true)
            apply(await evaluationService.finalize(evaluation.id))
            setConfirming(false)
            toast.success('Evaluation finalized and released to the student')
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not finalize the evaluation'))
        } finally {
            setBusy(false)
        }
    }

    const handleReopen = async () => {
        const reason = window.prompt(
            'Reopening withdraws the verification code and hides the result from the student until it is finalized again. Why is it being reopened?',
        )
        if (reason === null) return
        if (reason.trim().length < 5) {
            toast.error('A reason of at least 5 characters is required')
            return
        }
        try {
            setBusy(true)
            apply(await evaluationService.reopen(evaluation.id, reason.trim()))
            toast.success('Evaluation reopened')
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not reopen the evaluation'))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-3">
            {/* Overall ----------------------------------------------------------- */}
            <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-brand-600" />
                        <h3 className="text-sm font-semibold text-foreground">Evaluation</h3>
                        <span
                            className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                                finalized ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
                            )}
                        >
                            {finalized ? <CheckCircle2 className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                            {finalized ? 'Finalized' : 'Draft'}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {permissions?.canRegenerate && (
                            <Button size="xs" variant="ghost" disabled={busy} onClick={handleRegenerate}>
                                <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                            </Button>
                        )}
                        {permissions?.canReopen && (
                            <Button size="xs" variant="secondary" disabled={busy} onClick={handleReopen}>
                                <RotateCcw className="h-3.5 w-3.5" /> Reopen
                            </Button>
                        )}
                        {permissions?.canFinalize && (
                            <Button size="xs" disabled={busy} onClick={() => setConfirming(true)}>
                                <ShieldCheck className="h-3.5 w-3.5" /> Finalize &amp; release
                            </Button>
                        )}
                    </div>
                </div>

                {!evaluation.aiGenerated && (
                    <p className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        The AI service was unreachable, so these scores were produced by the
                        platform&rsquo;s own copy of the evaluation rules. The criteria, formulas and
                        evidence are the same either way.
                    </p>
                )}

                {!finalized && perspective !== 'student' && (
                    <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                        This is a draft and is not visible to the student. Check each criterion,
                        adjust anything that does not match what you saw, then finalize to release it.
                    </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-5">
                    <ProgressRing
                        value={evaluation.finalScore ?? 0}
                        size={84}
                        strokeWidth={8}
                        tone={evaluationService.getRingTone(evaluation.finalScore)}
                        label="final score"
                    />
                    <div className="space-y-1">
                        <p className="flex items-center gap-2">
                            <span
                                className={cn(
                                    'rounded-md px-2.5 py-1 text-xl font-bold',
                                    evaluationService.getGradeColor(evaluation.grade),
                                )}
                            >
                                {evaluation.grade ?? '—'}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {evaluation.finalScore ?? '—'}/100 final score
                            </span>
                        </p>
                        {adjustedCount > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Automated score {evaluation.autoScore}/100 · {adjustedCount}{' '}
                                {adjustedCount === 1 ? 'criterion' : 'criteria'} adjusted by a reviewer
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            <Sparkles className="mr-1 inline h-3 w-3" />
                            {backed} of {criteria.length} criteria backed by recorded evidence
                            {evaluation.confidence != null &&
                                ` (confidence ${Math.round(evaluation.confidence * 100)}%)`}
                        </p>
                    </div>
                </div>

                {evaluation.summary && <p className="mt-4 text-sm text-foreground">{evaluation.summary}</p>}

                {finalized && (
                    <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
                        <p className="inline-flex items-center gap-1.5 font-semibold">
                            <ShieldCheck className="h-4 w-4" />
                            Finalized {formatDate(evaluation.finalizedAt)}
                            {evaluation.finalizedByName && ` by ${evaluation.finalizedByName}`}
                        </p>
                        {evaluation.verificationCode && (
                            <p className="mt-1 text-xs">
                                Verification code{' '}
                                <span className="font-mono font-semibold">{evaluation.verificationCode}</span>{' '}
                                ·{' '}
                                <Link
                                    href={evaluationService.verifyPath(evaluation.verificationCode)}
                                    className="underline underline-offset-2"
                                    target="_blank"
                                >
                                    public verification page
                                </Link>
                            </p>
                        )}
                    </div>
                )}

                {!finalized && evaluation.reopenReason && perspective !== 'student' && (
                    <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Reopened {formatDate(evaluation.reopenedAt)}: {evaluation.reopenReason}
                    </p>
                )}
            </Card>

            {/* Criteria ---------------------------------------------------------- */}
            <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground">Scores by criterion</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    Each criterion is scored 0–100 from the recorded evidence; the overall score is
                    their weighted average.
                </p>
                <ul className="mt-3 space-y-2.5">
                    {criteria.map((c) => (
                        <CriterionRow
                            key={`${c.id}-${c.finalScore}-${c.adjusted}`}
                            criterion={c}
                            canEdit={canEdit}
                            onSave={handleSaveCriterion}
                        />
                    ))}
                </ul>
            </Card>

            {/* Feedback ---------------------------------------------------------- */}
            {(evaluation.strengths.length > 0 || evaluation.improvements.length > 0) && (
                <div className="grid gap-3 sm:grid-cols-2">
                    {evaluation.strengths.length > 0 && (
                        <Card className="p-5">
                            <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                <ThumbsUp className="h-4 w-4 text-emerald-600" /> Strengths
                            </h3>
                            <ul className="mt-2 space-y-1.5">
                                {evaluation.strengths.map((s) => (
                                    <li key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                        {s}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                    {evaluation.improvements.length > 0 && (
                        <Card className="p-5">
                            <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                <Lightbulb className="h-4 w-4 text-accent-500" /> To work on
                            </h3>
                            <ul className="mt-2 space-y-1.5">
                                {evaluation.improvements.map((s) => (
                                    <li key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                                        {s}
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                </div>
            )}

            {/* Reviewer note ----------------------------------------------------- */}
            {(evaluation.reviewerNote || canEdit) && (
                <Card className="p-5">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground">Reviewer note</h3>
                        {canEdit && !editingNote && (
                            <Button size="xs" variant="ghost" onClick={() => setEditingNote(true)}>
                                <Pencil className="h-3.5 w-3.5" /> {evaluation.reviewerNote ? 'Edit' : 'Add'}
                            </Button>
                        )}
                    </div>
                    {editingNote ? (
                        <div className="mt-2 space-y-2">
                            <Textarea
                                value={reviewerNote}
                                onChange={(e) => setReviewerNote(e.target.value)}
                                rows={4}
                                maxLength={4000}
                                placeholder="Anything the scores do not capture. Shared with the student once finalized."
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    size="xs"
                                    variant="secondary"
                                    disabled={busy}
                                    onClick={() => {
                                        setReviewerNote(evaluation.reviewerNote ?? '')
                                        setEditingNote(false)
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button size="xs" disabled={busy} onClick={handleSaveNote}>
                                    Save note
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">
                            {evaluation.reviewerNote || 'No note yet.'}
                        </p>
                    )}
                </Card>
            )}

            {/* Evidence ---------------------------------------------------------- */}
            {evaluation.evidence && (
                <Card className="p-5">
                    <h3 className="text-sm font-semibold text-foreground">Evidence used</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        The exact figures the scores were computed from
                        {evaluation.generatedAt ? `, captured ${formatDate(evaluation.generatedAt)}` : ''}.
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                        {EVIDENCE_ROWS.filter((row) => evaluation.evidence?.[row.key] !== undefined).map((row) => (
                            <div key={row.key}>
                                <dt className="text-xs text-muted-foreground">{row.label}</dt>
                                <dd className="text-sm font-semibold text-foreground">
                                    {row.render(evaluation.evidence as EvaluationEvidence)}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </Card>
            )}

            {/* Finalize confirmation --------------------------------------------- */}
            {confirming && (
                <Dialog
                    open
                    onOpenChange={(open) => {
                        if (!open && !busy) setConfirming(false)
                    }}
                >
                    <DialogContent size="sm">
                        <DialogHeader>
                            <DialogTitle>Finalize and release?</DialogTitle>
                            <DialogCloseButton />
                        </DialogHeader>
                        <DialogBody className="space-y-2 text-sm text-muted-foreground">
                            <p>
                                The student will see grade{' '}
                                <strong className="text-foreground">{evaluation.grade}</strong> (
                                {evaluation.finalScore}/100) with every criterion, reason and note,
                                and will be emailed a verification code.
                            </p>
                            <p>
                                After this the evaluation is locked. Only a platform admin can reopen it.
                            </p>
                        </DialogBody>
                        <DialogFooter>
                            <Button variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>
                                Cancel
                            </Button>
                            <Button disabled={busy} onClick={handleFinalize}>
                                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                                Finalize &amp; release
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
