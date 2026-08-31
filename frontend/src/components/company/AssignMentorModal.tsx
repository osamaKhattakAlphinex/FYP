'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, Loader2, Search, Users } from 'lucide-react'
import toast from 'react-hot-toast'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogTitle,
    DialogCloseButton,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import MatchScoreBadge from '@/components/match/MatchScoreBadge'
import { mentorAssignmentService } from '@/services/mentorAssignmentService'
import type { MentorAssignment, MentorSuggestion } from '@/types/mentor.types'
import { cn, getInitials } from '@/lib/utils'

const apiRoot = () => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    return base.replace(/\/api\/?$/, '')
}
const resolveImage = (url?: string | null) =>
    !url ? undefined : url.startsWith('http') ? url : `${apiRoot()}${url}`

interface AssignMentorModalProps {
    applicationId: string
    studentName?: string
    isOpen: boolean
    onClose: () => void
    onAssigned: (assignment: MentorAssignment) => void
}

export default function AssignMentorModal({
    applicationId,
    studentName,
    isOpen,
    onClose,
    onAssigned,
}: AssignMentorModalProps) {
    const [loading, setLoading] = useState(true)
    const [mentors, setMentors] = useState<MentorSuggestion[]>([])
    const [aiRanked, setAiRanked] = useState(true)
    const [taskTitle, setTaskTitle] = useState('')
    const [search, setSearch] = useState('')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [note, setNote] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const fetchSuggestions = useCallback(async () => {
        try {
            setLoading(true)
            const res = await mentorAssignmentService.getSuggestions(applicationId)
            setMentors(res.mentors)
            setAiRanked(res.aiRanked)
            setTaskTitle(res.taskTitle)
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || 'Failed to load mentor suggestions',
            )
        } finally {
            setLoading(false)
        }
    }, [applicationId])

    useEffect(() => {
        if (isOpen) fetchSuggestions()
    }, [isOpen, fetchSuggestions])

    const filtered = mentors.filter((m) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
            `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
            (m.headline || '').toLowerCase().includes(q) ||
            (m.expertise || []).some((e) => e.name.toLowerCase().includes(q))
        )
    })

    const handleAssign = async () => {
        if (!selectedId) {
            toast.error('Select a mentor first')
            return
        }
        const chosen = mentors.find((m) => String(m.id) === String(selectedId))
        try {
            setSubmitting(true)
            const assignment = await mentorAssignmentService.assignMentor(applicationId, {
                mentorId: selectedId,
                matchScore: chosen?.matchScore ?? null,
                assignmentNote: note.trim() || undefined,
            })
            toast.success('Mentor assigned — waiting for them to accept')
            onAssigned(assignment)
            onClose()
        } catch (err: any) {
            const message =
                err?.response?.data?.errors?.[0]?.message ||
                err?.response?.data?.message ||
                'Could not assign the mentor'
            toast.error(message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    if (submitting) return
                    onClose()
                }
            }}
        >
            <DialogContent size="lg">
                <DialogHeader>
                    <div>
                        <DialogTitle>Assign a mentor</DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {studentName ? `${studentName} · ` : ''}
                            {taskTitle || 'Loading…'}
                        </p>
                    </div>
                    <DialogCloseButton />
                </DialogHeader>

                <DialogBody className="space-y-4">
                    {!loading && !aiRanked && mentors.length > 0 && (
                        <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            The AI matching service is unreachable, so mentors are ordered by
                            skill overlap and seniority instead of a match score.
                        </p>
                    )}

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, headline or expertise"
                            className="pl-9"
                        />
                    </div>

                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-20 w-full" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="rounded-md border border-border p-8 text-center">
                            <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                                <Users className="h-5 w-5" />
                            </div>
                            <p className="mt-3 text-sm font-semibold text-foreground">
                                {mentors.length === 0
                                    ? 'No available mentors'
                                    : 'No mentors match that search'}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {mentors.length === 0
                                    ? 'Only administrator-verified mentors with free capacity can be assigned.'
                                    : 'Try a different name or skill.'}
                            </p>
                        </div>
                    ) : (
                        <div className="max-h-72 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                            {filtered.map((m) => {
                                const selected = String(selectedId) === String(m.id)
                                const free =
                                    m.availability.maxActiveMentees -
                                    m.availability.activeMenteeCount
                                return (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => setSelectedId(String(m.id))}
                                        className={cn(
                                            'flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors',
                                            selected
                                                ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-600/20'
                                                : 'border-input hover:border-muted-foreground/40',
                                        )}
                                    >
                                        <Avatar className="h-10 w-10 shrink-0">
                                            <AvatarImage
                                                src={resolveImage(m.profilePicture)}
                                                alt={`${m.firstName} ${m.lastName}`}
                                            />
                                            <AvatarFallback>
                                                {getInitials(`${m.firstName} ${m.lastName}`)}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="truncate text-sm font-semibold text-foreground">
                                                    {m.firstName} {m.lastName}
                                                </span>
                                                {m.matchScore != null && (
                                                    <MatchScoreBadge
                                                        score={m.matchScore}
                                                        reasons={m.matchReasons}
                                                        size="sm"
                                                    />
                                                )}
                                                {selected && (
                                                    <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-600 text-white">
                                                        <Check className="h-3 w-3" strokeWidth={3} />
                                                    </span>
                                                )}
                                            </div>
                                            {m.headline && (
                                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                    {m.headline}
                                                </p>
                                            )}
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {(m.expertise || []).slice(0, 4).map((e) => (
                                                    <span
                                                        key={e.id}
                                                        className={cn(
                                                            'rounded px-1.5 py-0.5 text-[10px] font-medium',
                                                            m.matchedSkills?.some(
                                                                (s) =>
                                                                    s.toLowerCase() ===
                                                                    e.name.toLowerCase(),
                                                            )
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : 'bg-muted text-muted-foreground',
                                                        )}
                                                    >
                                                        {e.name}
                                                    </span>
                                                ))}
                                            </div>
                                            <p className="mt-1 text-[11px] text-muted-foreground">
                                                {m.yearsOfExperience}y experience &middot; {free}{' '}
                                                slot{free === 1 ? '' : 's'} free
                                                {m.stats.totalRatings > 0 &&
                                                    ` · ${m.stats.averageRating.toFixed(1)}★ (${m.stats.totalRatings})`}
                                            </p>
                                            {m.matchReasons?.[0] && (
                                                <p className="mt-1 text-[11px] italic text-muted-foreground">
                                                    {m.matchReasons[0]}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    <div>
                        <Label htmlFor="assignmentNote">
                            Note to the mentor{' '}
                            <span className="font-normal text-muted-foreground">(optional)</span>
                        </Label>
                        <Textarea
                            id="assignmentNote"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder="Anything they should know before accepting?"
                            className="mt-1.5"
                        />
                    </div>
                </DialogBody>

                <DialogFooter>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleAssign} disabled={submitting || !selectedId}>
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {submitting ? 'Assigning…' : 'Send request'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
