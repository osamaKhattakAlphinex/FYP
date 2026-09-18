'use client'

import { useState } from 'react'
import {
    Building2,
    CheckCircle2,
    GraduationCap,
    Lightbulb,
    Loader2,
    Pencil,
    Reply,
    Sparkles,
    ThumbsDown,
    ThumbsUp,
    Trash2,
    Wand2,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Stars } from './FeedbackStars'
import { FEEDBACK_DIMENSIONS, feedbackService } from '@/services/feedbackService'
import { apiErrorMessage } from '@/lib/apiError'
import type { Feedback } from '@/types/feedback.types'
import { cn } from '@/lib/utils'

const formatDate = (iso?: string | null) =>
    !iso
        ? '—'
        : new Date(iso).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
          })

interface FeedbackCardProps {
    feedback: Feedback
    /** Show the task title and context (lists that mix internships). */
    showTask?: boolean
    onEdit?: (feedback: Feedback) => void
    /** Called with the updated record, or null when it was deleted. */
    onChanged?: (feedback: Feedback | null) => void
}

/**
 * One feedback record (Module 10). Renders only the actions its
 * `permissions` allow: the author edits or deletes until the student has
 * acknowledged it; the student acknowledges once, optionally with a reply.
 */
export default function FeedbackCard({ feedback, showTask = false, onEdit, onChanged }: FeedbackCardProps) {
    const [replying, setReplying] = useState(false)
    const [reply, setReply] = useState('')
    const [busy, setBusy] = useState(false)

    const permissions = feedback.permissions
    const dims = FEEDBACK_DIMENSIONS.filter((d) => feedback.ratings?.[d] != null)
    const AuthorIcon = feedback.authorRole === 'mentor' ? GraduationCap : Building2

    const handleAcknowledge = async (withReply: boolean) => {
        try {
            setBusy(true)
            const updated = await feedbackService.acknowledge(
                feedback.id,
                withReply ? reply.trim() || undefined : undefined,
            )
            toast.success(withReply && reply.trim() ? 'Reply sent' : 'Feedback acknowledged')
            setReplying(false)
            onChanged?.(updated)
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not acknowledge this feedback'))
        } finally {
            setBusy(false)
        }
    }

    const handleDelete = async () => {
        if (!window.confirm('Delete this feedback? The student will no longer see it.')) return
        try {
            setBusy(true)
            await feedbackService.remove(feedback.id)
            toast.success('Feedback deleted')
            onChanged?.(null)
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not delete this feedback'))
        } finally {
            setBusy(false)
        }
    }

    return (
        <Card className="p-4">
            {/* Header ------------------------------------------------------------ */}
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <AuthorIcon className="h-4 w-4 text-muted-foreground" />
                        {feedback.authorName || 'Former user'}
                        <span className="text-xs font-normal text-muted-foreground">
                            · {feedback.authorRole === 'mentor' ? 'Mentor' : 'Company'}
                        </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {showTask && (
                            <>
                                {feedbackService.getContextLabel(feedback.context)} ·{' '}
                                {feedback.task?.title || 'Task'} ·{' '}
                            </>
                        )}
                        {formatDate(feedback.createdAt)}
                        {feedback.editedAt && ' · edited'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Stars value={feedback.overallRating} size="md" />
                    <span className="text-sm font-semibold text-foreground">
                        {feedback.overallRating}/5
                    </span>
                </div>
            </div>

            {/* Badges ------------------------------------------------------------ */}
            {(dims.length > 0 || feedback.wouldRecommend != null || feedback.aiAssisted) && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {dims.map((d) => (
                        <span
                            key={d}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                            {feedbackService.getDimensionLabel(d)}{' '}
                            <span className="font-semibold text-foreground">{feedback.ratings[d]}/5</span>
                        </span>
                    ))}
                    {feedback.wouldRecommend === true && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            <ThumbsUp className="h-3 w-3" /> Would recommend
                        </span>
                    )}
                    {feedback.wouldRecommend === false && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            <ThumbsDown className="h-3 w-3" /> Would not recommend yet
                        </span>
                    )}
                    {feedback.aiAssisted && (
                        <span
                            className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700"
                            title="The author started from a draft suggested by the assistant and reviewed it"
                        >
                            <Wand2 className="h-3 w-3" /> AI-assisted draft
                        </span>
                    )}
                </div>
            )}

            {/* Body -------------------------------------------------------------- */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {feedback.strengths && (
                    <div>
                        <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                            <ThumbsUp className="h-3.5 w-3.5" /> Strengths
                        </h4>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{feedback.strengths}</p>
                    </div>
                )}
                {feedback.improvements && (
                    <div>
                        <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
                            <Sparkles className="h-3.5 w-3.5" /> To develop
                        </h4>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
                            {feedback.improvements}
                        </p>
                    </div>
                )}
            </div>

            {feedback.suggestions.length > 0 && (
                <div className="mt-3">
                    <h4 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent-700">
                        <Lightbulb className="h-3.5 w-3.5" /> Suggestions
                    </h4>
                    <ul className="mt-1 space-y-1">
                        {feedback.suggestions.map((s, i) => (
                            <li key={`${i}-${s}`} className="flex items-start gap-2 text-sm text-foreground/90">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Student response ---------------------------------------------------- */}
            {feedback.studentAcknowledgedAt && (
                <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Acknowledged by the student {formatDate(feedback.studentAcknowledgedAt)}
                    </p>
                    {feedback.studentResponse && (
                        <p className="mt-1 whitespace-pre-wrap">&ldquo;{feedback.studentResponse}&rdquo;</p>
                    )}
                </div>
            )}

            {replying && (
                <div className="mt-3 space-y-2">
                    <Textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder="Optional: thank them, ask a question, or say what you will do next."
                    />
                    <p className="text-right text-xs text-muted-foreground">{reply.length}/2000</p>
                </div>
            )}

            {/* Actions ------------------------------------------------------------- */}
            {(permissions?.canAcknowledge || permissions?.canEdit || permissions?.canDelete) && (
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {permissions?.canDelete && (
                        <Button size="xs" variant="ghost" disabled={busy} onClick={handleDelete}>
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                    )}
                    {permissions?.canEdit && onEdit && (
                        <Button size="xs" variant="secondary" disabled={busy} onClick={() => onEdit(feedback)}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                    )}
                    {permissions?.canAcknowledge && !replying && (
                        <>
                            <Button size="xs" variant="secondary" disabled={busy} onClick={() => setReplying(true)}>
                                <Reply className="h-3.5 w-3.5" /> Reply
                            </Button>
                            <Button size="xs" disabled={busy} onClick={() => handleAcknowledge(false)}>
                                {busy ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                Acknowledge
                            </Button>
                        </>
                    )}
                    {permissions?.canAcknowledge && replying && (
                        <>
                            <Button size="xs" variant="ghost" disabled={busy} onClick={() => setReplying(false)}>
                                Cancel
                            </Button>
                            <Button
                                size="xs"
                                disabled={busy}
                                className={cn(busy && 'opacity-80')}
                                onClick={() => handleAcknowledge(true)}
                            >
                                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                {reply.trim() ? 'Send reply & acknowledge' : 'Acknowledge'}
                            </Button>
                        </>
                    )}
                </div>
            )}
            {permissions?.canAcknowledge && (
                <p className="mt-2 text-right text-[11px] text-muted-foreground">
                    Acknowledging tells the author you have read it and locks it from further edits.
                </p>
            )}
        </Card>
    )
}
