'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Pin, PinOff, Send, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { mentorAssignmentService } from '@/services/mentorAssignmentService'
import type { MentorNote, NoteAuthorRole } from '@/types/mentor.types'
import { cn, getInitials } from '@/lib/utils'

const MAX = 4000

const formatWhen = (iso: string) => {
    const d = new Date(iso)
    const diffMs = Date.now() - d.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

interface GuidanceNotesPanelProps {
    assignmentId: string
    /** The viewer's role — decides bubble alignment and who may pin. */
    viewerRole: NoteAuthorRole
    viewerUserId?: string
    /** Notes are read-only once the mentorship is not active/completed. */
    canPost: boolean
}

export default function GuidanceNotesPanel({
    assignmentId,
    viewerRole,
    viewerUserId,
    canPost,
}: GuidanceNotesPanelProps) {
    const [notes, setNotes] = useState<MentorNote[]>([])
    const [loading, setLoading] = useState(true)
    const [body, setBody] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const endRef = useRef<HTMLDivElement>(null)

    const fetchNotes = useCallback(async () => {
        try {
            setLoading(true)
            const res = await mentorAssignmentService.getNotes(assignmentId)
            setNotes(res.notes)
        } catch {
            toast.error('Failed to load the guidance thread')
        } finally {
            setLoading(false)
        }
    }, [assignmentId])

    // Fetched on mount and after each post — deliberately not polled, the API
    // is rate limited to 100 requests / 15 min in production.
    useEffect(() => {
        fetchNotes()
    }, [fetchNotes])

    const handlePost = async () => {
        const text = body.trim()
        if (!text) {
            toast.error('Write something first')
            return
        }
        if (text.length > MAX) {
            toast.error(`Notes are limited to ${MAX} characters`)
            return
        }
        try {
            setSubmitting(true)
            await mentorAssignmentService.addNote(assignmentId, text)
            setBody('')
            await fetchNotes()
            endRef.current?.scrollIntoView({ behavior: 'smooth' })
        } catch (err: any) {
            const message =
                err?.response?.data?.errors?.[0]?.message ||
                err?.response?.data?.message ||
                'Failed to post the note'
            toast.error(message)
        } finally {
            setSubmitting(false)
        }
    }

    const togglePin = async (note: MentorNote) => {
        try {
            await mentorAssignmentService.updateNote(assignmentId, note.id, {
                isPinned: !note.isPinned,
            })
            await fetchNotes()
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not update the note')
        }
    }

    const remove = async (note: MentorNote) => {
        if (!window.confirm('Delete this note? This cannot be undone.')) return
        try {
            await mentorAssignmentService.deleteNote(assignmentId, note.id)
            await fetchNotes()
            toast.success('Note deleted')
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not delete the note')
        }
    }

    return (
        <Card className="flex flex-col">
            <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Guidance notes</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    {viewerRole === 'mentor'
                        ? 'Share advice and answer questions. Pin the notes your mentee should keep coming back to.'
                        : 'Ask your mentor questions and share progress updates.'}
                </p>
            </div>

            <div className="max-h-[26rem] space-y-3 overflow-y-auto px-4 py-4 scrollbar-thin">
                {loading ? (
                    <>
                        <Skeleton className="h-16 w-3/4" />
                        <Skeleton className="ml-auto h-16 w-3/4" />
                        <Skeleton className="h-16 w-2/3" />
                    </>
                ) : notes.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                        No notes yet. {canPost ? 'Start the conversation below.' : ''}
                    </p>
                ) : (
                    notes.map((note) => {
                        const mine = note.authorRole === viewerRole
                        const canEdit =
                            viewerUserId != null &&
                            note.authorUserId != null &&
                            String(note.authorUserId) === String(viewerUserId)
                        return (
                            <div
                                key={note.id}
                                className={cn('flex gap-2', mine && 'flex-row-reverse')}
                            >
                                <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarFallback className="text-[10px]">
                                        {getInitials(note.authorName || note.authorRole)}
                                    </AvatarFallback>
                                </Avatar>
                                <div
                                    className={cn(
                                        'min-w-0 max-w-[80%] rounded-lg px-3 py-2',
                                        mine
                                            ? 'bg-brand-50 text-foreground'
                                            : 'bg-muted text-foreground',
                                        note.isPinned && 'ring-1 ring-accent-500/50',
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold">
                                            {note.authorName || 'Unknown'}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                            {note.authorRole}
                                        </span>
                                        {note.isPinned && (
                                            <span className="inline-flex items-center gap-0.5 rounded-full bg-accent-50 px-1.5 py-0.5 text-[10px] font-semibold text-accent-700">
                                                <Pin className="h-2.5 w-2.5" /> Pinned
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                                        {note.body}
                                    </p>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground">
                                            {formatWhen(note.createdAt)}
                                        </span>
                                        {viewerRole === 'mentor' && (
                                            <button
                                                type="button"
                                                onClick={() => togglePin(note)}
                                                className="text-[10px] text-muted-foreground hover:text-foreground"
                                            >
                                                {note.isPinned ? (
                                                    <span className="inline-flex items-center gap-0.5">
                                                        <PinOff className="h-2.5 w-2.5" /> Unpin
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-0.5">
                                                        <Pin className="h-2.5 w-2.5" /> Pin
                                                    </span>
                                                )}
                                            </button>
                                        )}
                                        {canEdit && (
                                            <button
                                                type="button"
                                                onClick={() => remove(note)}
                                                className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-destructive"
                                            >
                                                <Trash2 className="h-2.5 w-2.5" /> Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={endRef} />
            </div>

            {canPost && (
                <div className="border-t border-border p-3">
                    <Textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={3}
                        maxLength={MAX}
                        placeholder={
                            viewerRole === 'mentor'
                                ? 'Share guidance, review feedback or next steps…'
                                : 'Ask a question or post a progress update…'
                        }
                    />
                    <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                            {body.length}/{MAX}
                        </span>
                        <Button size="sm" onClick={handlePost} disabled={submitting || !body.trim()}>
                            {submitting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Send className="h-3.5 w-3.5" />
                            )}
                            {submitting ? 'Posting…' : 'Post note'}
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    )
}
