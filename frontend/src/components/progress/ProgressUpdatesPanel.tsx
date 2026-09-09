'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    AlertOctagon,
    CheckCircle2,
    Loader2,
    MessageSquare,
    Send,
    ShieldAlert,
    Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { progressService } from '@/services/progressService'
import { apiErrorMessage } from '@/lib/apiError'
import type {
    InternshipProgress,
    ProgressUpdateEntry,
    ProgressUpdateType,
} from '@/types/progress.types'
import { cn } from '@/lib/utils'

const TYPE_STYLE: Record<ProgressUpdateType, { chip: string; icon: React.ElementType }> = {
    checkin: { chip: 'bg-brand-50 text-brand-700', icon: MessageSquare },
    note: { chip: 'bg-secondary text-muted-foreground', icon: MessageSquare },
    blocker: { chip: 'bg-red-100 text-red-800', icon: AlertOctagon },
    risk_flag: { chip: 'bg-amber-100 text-amber-800', icon: ShieldAlert },
}

const formatWhen = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })

interface ProgressUpdatesPanelProps {
    progress: InternshipProgress
    currentUserId?: string
    onChanged: () => void
}

export default function ProgressUpdatesPanel({
    progress,
    currentUserId,
    onChanged,
}: ProgressUpdatesPanelProps) {
    const [updates, setUpdates] = useState<ProgressUpdateEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [body, setBody] = useState('')
    const [type, setType] = useState<ProgressUpdateType>('checkin')
    const [posting, setPosting] = useState(false)

    const canWork = !!progress.permissions?.canWork
    const canSupervise = !!progress.permissions?.canSupervise
    const canPost = canWork || canSupervise

    // A student raises blockers; only a supervisor raises a risk flag. This
    // mirrors the rule the controller enforces.
    const availableTypes: ProgressUpdateType[] = canSupervise
        ? ['note', 'risk_flag']
        : ['checkin', 'blocker', 'note']

    const load = useCallback(async () => {
        try {
            setLoading(true)
            const res = await progressService.getUpdates(progress.id)
            setUpdates(res.updates)
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not load the timeline'))
        } finally {
            setLoading(false)
        }
    }, [progress.id])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        // Keep the selected type valid if the perspective changes.
        if (!availableTypes.includes(type)) setType(availableTypes[0])
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canSupervise])

    const handlePost = async () => {
        if (body.trim().length === 0) {
            toast.error('Write something first')
            return
        }
        try {
            setPosting(true)
            await progressService.createUpdate(progress.id, {
                body: body.trim(),
                type,
            })
            toast.success('Posted')
            setBody('')
            await load()
            onChanged()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not post that update'))
        } finally {
            setPosting(false)
        }
    }

    const handleResolve = async (update: ProgressUpdateEntry) => {
        const note = window.prompt('How was this resolved? (optional)') ?? undefined
        try {
            await progressService.resolveUpdate(progress.id, update.id, note || undefined)
            toast.success('Marked resolved')
            await load()
            onChanged()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not resolve that'))
        }
    }

    const handleDelete = async (update: ProgressUpdateEntry) => {
        if (!window.confirm('Delete this update?')) return
        try {
            await progressService.deleteUpdate(progress.id, update.id)
            toast.success('Deleted')
            await load()
            onChanged()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not delete that update'))
        }
    }

    const open = updates.filter((u) => u.isOpen)

    return (
        <div className="space-y-3">
            {open.length > 0 && (
                <Card className="border-red-200 bg-red-50/50 p-4">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-800">
                        <AlertOctagon className="h-4 w-4" />
                        {open.length} open item{open.length === 1 ? '' : 's'} needing attention
                    </p>
                    <p className="mt-1 text-xs text-red-700">
                        Blockers and risk flags stay open until someone marks them resolved, and
                        they hold the internship at &ldquo;at risk&rdquo; while they do.
                    </p>
                </Card>
            )}

            {canPost && progress.permissions && (canWork || canSupervise) && (
                <Card className="p-4">
                    <Label htmlFor="update-body">Post an update</Label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {availableTypes.map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={cn(
                                    'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                                    type === t
                                        ? TYPE_STYLE[t].chip
                                        : 'bg-secondary text-muted-foreground hover:bg-muted',
                                )}
                            >
                                {progressService.getUpdateLabel(t)}
                            </button>
                        ))}
                    </div>
                    <Textarea
                        id="update-body"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={3}
                        maxLength={4000}
                        placeholder={
                            type === 'blocker'
                                ? 'What is stopping you from making progress?'
                                : type === 'risk_flag'
                                  ? 'What concerns you about how this internship is tracking?'
                                  : type === 'checkin'
                                    ? 'Where are you up to, and what is next?'
                                    : 'Anything the others should know.'
                        }
                        className="mt-2"
                    />
                    <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            {type === 'blocker' || type === 'risk_flag'
                                ? 'Stays open until someone resolves it.'
                                : 'Everyone on this internship is notified.'}
                        </p>
                        <Button size="sm" onClick={handlePost} disabled={posting}>
                            {posting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            {posting ? 'Posting…' : 'Post'}
                        </Button>
                    </div>
                </Card>
            )}

            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </div>
            ) : updates.length === 0 ? (
                <Card className="p-8 text-center">
                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                        Nothing posted yet
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Regular check-ins are what make progress visible between milestones.
                    </p>
                </Card>
            ) : (
                <div className="space-y-2.5">
                    {updates.map((u) => {
                        const style = TYPE_STYLE[u.type] ?? TYPE_STYLE.note
                        const Icon = style.icon
                        const mine = currentUserId && String(u.authorUserId) === String(currentUserId)

                        return (
                            <Card
                                key={u.id}
                                className={cn('p-4', u.isOpen && 'border-red-200')}
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className={cn(
                                            'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full',
                                            style.chip,
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-semibold text-foreground">
                                                {u.authorName || 'Someone'}
                                            </span>
                                            <span
                                                className={cn(
                                                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                                                    style.chip,
                                                )}
                                            >
                                                {progressService.getUpdateLabel(u.type)}
                                            </span>
                                            {u.needsResolution &&
                                                (u.isOpen ? (
                                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                                                        Open
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                                        <CheckCircle2 className="h-3 w-3" /> Resolved
                                                    </span>
                                                ))}
                                        </div>

                                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground">
                                            {u.body}
                                        </p>

                                        {u.percentSelfReported != null && (
                                            <p className="mt-1.5 text-xs text-muted-foreground">
                                                Self-reported progress: {u.percentSelfReported}%
                                            </p>
                                        )}

                                        {u.milestone && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                On &ldquo;{u.milestone.title}&rdquo;
                                            </p>
                                        )}

                                        {u.resolutionNote && (
                                            <p className="mt-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-900">
                                                <span className="font-semibold">Resolution:</span>{' '}
                                                {u.resolutionNote}
                                            </p>
                                        )}

                                        <p className="mt-1.5 text-xs text-muted-foreground">
                                            {formatWhen(u.createdAt)}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1.5">
                                        {u.isOpen && (canSupervise || mine) && (
                                            <Button
                                                size="xs"
                                                variant="secondary"
                                                onClick={() => handleResolve(u)}
                                            >
                                                Resolve
                                            </Button>
                                        )}
                                        {mine && (
                                            <Button
                                                size="icon-sm"
                                                variant="ghost"
                                                aria-label="Delete update"
                                                onClick={() => handleDelete(u)}
                                            >
                                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
