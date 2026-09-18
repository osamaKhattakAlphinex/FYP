'use client'

import { useState } from 'react'
import {
    AlertTriangle,
    CheckCircle2,
    ClipboardCheck,
    Info,
    Loader2,
    Plus,
    ThumbsDown,
    ThumbsUp,
    Wand2,
    WifiOff,
    X,
} from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { StarPicker } from './FeedbackStars'
import {
    FEEDBACK_DIMENSIONS,
    MAX_SUGGESTIONS,
    MIN_COMBINED_TEXT,
    feedbackService,
} from '@/services/feedbackService'
import { apiErrorMessage } from '@/lib/apiError'
import type {
    Feedback,
    FeedbackAssistResult,
    FeedbackContext,
    FeedbackDimension,
    FeedbackRatings,
} from '@/types/feedback.types'
import { cn } from '@/lib/utils'

interface FeedbackFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSaved: (feedback: Feedback) => void
    context: FeedbackContext
    /** progressId for an internship, interviewId for an interview. */
    targetId: string
    /** Editing an existing record. */
    existing?: Feedback | null
    /** Prefill for a new record (the company's private closing rating). */
    defaultOverallRating?: number | null
    studentName?: string
    taskTitle?: string
}

const IssueIcon = ({ severity }: { severity: string }) =>
    severity === 'info' ? (
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
    ) : (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
    )

/**
 * Create / edit structured feedback (Module 10). "Draft with AI" fills only
 * the fields that are still empty, so it never overwrites what the author
 * wrote; "Check my feedback" runs the same review the server uses as its tone
 * guard, so a critical issue shown here is exactly what would be refused.
 */
export default function FeedbackFormModal({
    isOpen,
    onClose,
    onSaved,
    context,
    targetId,
    existing = null,
    defaultOverallRating = null,
    studentName,
    taskTitle,
}: FeedbackFormModalProps) {
    const editing = !!existing
    const [overall, setOverall] = useState<number | null>(
        existing?.overallRating ?? defaultOverallRating ?? null,
    )
    const [ratings, setRatings] = useState<FeedbackRatings>(existing?.ratings ?? {})
    const [strengths, setStrengths] = useState(existing?.strengths ?? '')
    const [improvements, setImprovements] = useState(existing?.improvements ?? '')
    const [suggestions, setSuggestions] = useState<string[]>(existing?.suggestions ?? [])
    const [newSuggestion, setNewSuggestion] = useState('')
    const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(existing?.wouldRecommend ?? null)
    const [aiAssisted, setAiAssisted] = useState(existing?.aiAssisted ?? false)

    const [assist, setAssist] = useState<FeedbackAssistResult | null>(null)
    const [assistMode, setAssistMode] = useState<'draft' | 'check' | null>(null)
    const [assisting, setAssisting] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const combined = strengths.trim().length + improvements.trim().length
    const hasCritical = assist?.review.issues.some((i) => i.severity === 'critical') ?? false

    const setDimension = (d: FeedbackDimension, value: number | null) =>
        setRatings((prev) => {
            const next = { ...prev }
            if (value == null) delete next[d]
            else next[d] = value
            return next
        })

    const addSuggestion = () => {
        const text = newSuggestion.trim()
        if (text.length < 5) {
            toast.error('A suggestion needs at least 5 characters')
            return
        }
        if (suggestions.length >= MAX_SUGGESTIONS) return
        setSuggestions((s) => [...s, text.slice(0, 300)])
        setNewSuggestion('')
    }

    const runAssist = async (mode: 'draft' | 'check') => {
        try {
            setAssisting(true)
            setAssistMode(mode)
            const result = await feedbackService.assist({
                context,
                ...(context === 'interview' ? { interviewId: targetId } : { progressId: targetId }),
                draft: {
                    strengths,
                    improvements,
                    suggestions,
                    overallRating: overall,
                },
            })
            setAssist(result)

            if (mode === 'draft') {
                let filled = false
                if (overall == null && result.suggested_overall_rating != null) {
                    setOverall(result.suggested_overall_rating)
                    filled = true
                }
                if (!strengths.trim() && result.suggested_strengths.length > 0) {
                    setStrengths(feedbackService.toParagraph(result.suggested_strengths))
                    filled = true
                }
                if (!improvements.trim() && result.suggested_improvements.length > 0) {
                    setImprovements(feedbackService.toParagraph(result.suggested_improvements))
                    filled = true
                }
                if (suggestions.length === 0 && result.suggested_suggestions.length > 0) {
                    setSuggestions(result.suggested_suggestions.slice(0, MAX_SUGGESTIONS))
                    filled = true
                }
                if (filled) {
                    setAiAssisted(true)
                    toast.success('Draft added to the empty fields. Review and personalise it before sharing.')
                } else {
                    toast('Every field already has content, so nothing was replaced.')
                }
            }
        } catch (err) {
            toast.error(apiErrorMessage(err, 'The assistant could not help right now'))
        } finally {
            setAssisting(false)
        }
    }

    const handleSubmit = async () => {
        if (overall == null) {
            toast.error('Choose an overall rating')
            return
        }
        if (combined < MIN_COMBINED_TEXT) {
            toast.error(`Write at least ${MIN_COMBINED_TEXT} characters across strengths and improvements`)
            return
        }
        const payload = {
            overallRating: overall,
            ratings: Object.keys(ratings).length ? ratings : null,
            strengths: strengths.trim() || null,
            improvements: improvements.trim() || null,
            suggestions,
            wouldRecommend,
            aiAssisted,
        }
        try {
            setSubmitting(true)
            const saved = existing
                ? await feedbackService.update(existing.id, payload)
                : await feedbackService.create({
                      context,
                      ...(context === 'interview' ? { interviewId: targetId } : { progressId: targetId }),
                      ...payload,
                  })
            toast.success(existing ? 'Feedback updated' : 'Feedback shared with the student')
            onSaved(saved)
            onClose()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not save the feedback'))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open && !submitting) onClose()
            }}
        >
            <DialogContent size="lg">
                <DialogHeader>
                    <div>
                        <DialogTitle>{editing ? 'Edit feedback' : 'Give feedback'}</DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {context === 'interview' ? 'Interview' : 'Internship'}
                            {taskTitle ? ` · ${taskTitle}` : ''}
                            {studentName ? ` · ${studentName}` : ''}
                        </p>
                    </div>
                    <DialogCloseButton />
                </DialogHeader>

                <DialogBody className="max-h-[68vh] space-y-5">
                    {/* Assistant ------------------------------------------------ */}
                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 p-3">
                        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                            {context === 'interview'
                                ? 'The assistant offers templates for interview feedback, and can check your wording.'
                                : 'The assistant drafts from the recorded evaluation and progress evidence, and can check your wording.'}
                        </p>
                        <Button
                            size="xs"
                            variant="soft"
                            disabled={assisting}
                            onClick={() => runAssist('draft')}
                        >
                            {assisting && assistMode === 'draft' ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Wand2 className="h-3.5 w-3.5" />
                            )}
                            Draft with AI
                        </Button>
                        <Button
                            size="xs"
                            variant="secondary"
                            disabled={assisting}
                            onClick={() => runAssist('check')}
                        >
                            {assisting && assistMode === 'check' ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <ClipboardCheck className="h-3.5 w-3.5" />
                            )}
                            Check my feedback
                        </Button>
                    </div>

                    {assist && (
                        <div className="space-y-2">
                            {!assist.aiGenerated && (
                                <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                    <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    The AI service was unreachable, so the platform&rsquo;s own copy of the
                                    same rules produced this. The suggestions and checks are identical either way.
                                </p>
                            )}
                            {assistMode === 'check' && (
                                <div className="rounded-md border border-border p-3">
                                    <p className="flex items-center justify-between text-sm font-semibold text-foreground">
                                        Feedback check
                                        <span
                                            className={cn(
                                                'rounded-full px-2 py-0.5 text-xs',
                                                assist.review.quality_score >= 80
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : assist.review.quality_score >= 50
                                                      ? 'bg-amber-100 text-amber-800'
                                                      : 'bg-red-100 text-red-800',
                                            )}
                                        >
                                            {assist.review.quality_score}/100
                                        </span>
                                    </p>
                                    {assist.review.issues.length === 0 ? (
                                        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-emerald-700">
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Balanced, specific and
                                            respectful. Nothing to fix.
                                        </p>
                                    ) : (
                                        <ul className="mt-2 space-y-1.5">
                                            {assist.review.issues.map((issue) => (
                                                <li
                                                    key={issue.code}
                                                    className={cn(
                                                        'flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-xs',
                                                        feedbackService.getSeverityColor(issue.severity),
                                                    )}
                                                >
                                                    <IssueIcon severity={issue.severity} />
                                                    {issue.message}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {hasCritical && (
                                        <p className="mt-2 text-xs font-medium text-red-700">
                                            Feedback with a critical issue cannot be shared.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Ratings -------------------------------------------------- */}
                    <div>
                        <Label>
                            Overall rating <span className="text-red-600">*</span>
                        </Label>
                        <div className="mt-1.5">
                            <StarPicker value={overall} onChange={setOverall} label="Overall rating" />
                        </div>
                        {!editing && defaultOverallRating != null && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                Prefilled from the closing rating you gave. That rating stays private; this
                                one is shared with the student.
                            </p>
                        )}
                    </div>

                    <div>
                        <Label>
                            Ratings by area{' '}
                            <span className="font-normal text-muted-foreground">(optional)</span>
                        </Label>
                        <div className="mt-1.5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                            {FEEDBACK_DIMENSIONS.map((d) => (
                                <div key={d} className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-foreground">
                                        {feedbackService.getDimensionLabel(d)}
                                    </span>
                                    <StarPicker
                                        value={ratings[d] ?? null}
                                        onChange={(v) => setDimension(d, v)}
                                        clearable
                                        size="sm"
                                        label={feedbackService.getDimensionLabel(d)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Text ----------------------------------------------------- */}
                    <div>
                        <Label htmlFor="fb-strengths">Strengths</Label>
                        <Textarea
                            id="fb-strengths"
                            value={strengths}
                            onChange={(e) => setStrengths(e.target.value)}
                            rows={4}
                            maxLength={4000}
                            placeholder="What went well? Be specific about the work, e.g. which deliverable and why it stood out."
                            className="mt-1.5"
                        />
                    </div>
                    <div>
                        <Label htmlFor="fb-improvements">Areas to develop</Label>
                        <Textarea
                            id="fb-improvements"
                            value={improvements}
                            onChange={(e) => setImprovements(e.target.value)}
                            rows={4}
                            maxLength={4000}
                            placeholder="What should they work on? Start with an action, e.g. “Plan…”, “Ask for…”, “Test…”."
                            className="mt-1.5"
                        />
                        <p
                            className={cn(
                                'mt-1 text-xs',
                                combined < MIN_COMBINED_TEXT ? 'text-amber-700' : 'text-muted-foreground',
                            )}
                        >
                            {combined} characters across strengths and improvements (at least{' '}
                            {MIN_COMBINED_TEXT})
                        </p>
                    </div>

                    <div>
                        <Label>
                            Specific suggestions{' '}
                            <span className="font-normal text-muted-foreground">
                                ({suggestions.length}/{MAX_SUGGESTIONS})
                            </span>
                        </Label>
                        {suggestions.length > 0 && (
                            <ul className="mt-1.5 space-y-1.5">
                                {suggestions.map((s, i) => (
                                    <li
                                        key={`${i}-${s}`}
                                        className="flex items-start gap-2 rounded-md bg-muted px-2.5 py-1.5 text-sm"
                                    >
                                        <span className="min-w-0 flex-1">{s}</span>
                                        <button
                                            type="button"
                                            aria-label="Remove suggestion"
                                            onClick={() => setSuggestions((list) => list.filter((_, j) => j !== i))}
                                            className="text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {suggestions.length < MAX_SUGGESTIONS && (
                            <div className="mt-1.5 flex gap-2">
                                <Input
                                    value={newSuggestion}
                                    onChange={(e) => setNewSuggestion(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            addSuggestion()
                                        }
                                    }}
                                    maxLength={300}
                                    placeholder="e.g. Set an internal deadline two days before each due date."
                                />
                                <Button size="sm" variant="secondary" onClick={addSuggestion}>
                                    <Plus className="h-4 w-4" /> Add
                                </Button>
                            </div>
                        )}
                    </div>

                    <div>
                        <Label>
                            Would you recommend them?{' '}
                            <span className="font-normal text-muted-foreground">(optional)</span>
                        </Label>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                            {[
                                { value: true, label: 'Yes', icon: ThumbsUp },
                                { value: false, label: 'Not yet', icon: ThumbsDown },
                            ].map((opt) => {
                                const Icon = opt.icon
                                const active = wouldRecommend === opt.value
                                return (
                                    <Button
                                        key={opt.label}
                                        size="xs"
                                        variant={active ? 'soft' : 'secondary'}
                                        onClick={() => setWouldRecommend(active ? null : opt.value)}
                                        aria-pressed={active}
                                    >
                                        <Icon className="h-3.5 w-3.5" /> {opt.label}
                                    </Button>
                                )
                            })}
                        </div>
                    </div>

                    <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                        The student is emailed and can read, acknowledge and reply. You can edit or
                        delete it until they acknowledge it; after that it is locked. Personal or
                        insulting language is refused.
                    </p>
                </DialogBody>

                <DialogFooter>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {editing ? 'Save changes' : 'Share feedback'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
