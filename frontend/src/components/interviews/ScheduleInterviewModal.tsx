'use client'

import { useMemo, useState } from 'react'
import { Loader2, Video, Phone, MapPin } from 'lucide-react'
import { toast } from 'react-hot-toast'

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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { interviewService } from '@/services/interviewService'
import type { Application } from '@/types/application.types'
import type { Interview, InterviewMode } from '@/types/interview.types'
import { cn } from '@/lib/utils'

interface ScheduleInterviewModalProps {
    application: Application
    isOpen: boolean
    onClose: () => void
    onScheduled: (interview: Interview) => void
}

const DURATIONS = [15, 30, 45, 60, 90]

const MODES: Array<{ value: InterviewMode; label: string; icon: typeof Video }> = [
    { value: 'video', label: 'Video', icon: Video },
    { value: 'phone', label: 'Phone', icon: Phone },
    { value: 'onsite', label: 'On-site', icon: MapPin },
]

// Format a Date as the value a datetime-local input expects.
const toLocalInputValue = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours(),
    )}:${pad(d.getMinutes())}`
}

export default function ScheduleInterviewModal({
    application,
    isOpen,
    onClose,
    onScheduled,
}: ScheduleInterviewModalProps) {
    const browserTz = useMemo(
        () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        [],
    )

    // now + 30 minutes is the earliest selectable slot
    const minDateTime = useMemo(
        () => toLocalInputValue(new Date(Date.now() + 30 * 60 * 1000)),
        [],
    )

    const timezoneOptions = useMemo(() => {
        const base = [
            browserTz,
            'UTC',
            'America/New_York',
            'Europe/London',
            'Asia/Karachi',
            'Asia/Dubai',
        ]
        return Array.from(new Set(base))
    }, [browserTz])

    const [scheduledAt, setScheduledAt] = useState('')
    const [durationMinutes, setDurationMinutes] = useState('30')
    const [mode, setMode] = useState<InterviewMode>('video')
    const [meetingLink, setMeetingLink] = useState('')
    const [meetingPhoneNumber, setMeetingPhoneNumber] = useState('')
    const [meetingLocation, setMeetingLocation] = useState('')
    const [agenda, setAgenda] = useState('')
    const [timezone, setTimezone] = useState(browserTz)
    const [submitting, setSubmitting] = useState(false)

    const reset = () => {
        setScheduledAt('')
        setDurationMinutes('30')
        setMode('video')
        setMeetingLink('')
        setMeetingPhoneNumber('')
        setMeetingLocation('')
        setAgenda('')
        setTimezone(browserTz)
    }

    const handleSubmit = async () => {
        if (!scheduledAt) {
            toast.error('Pick a date and time')
            return
        }
        if (new Date(scheduledAt).getTime() <= Date.now()) {
            toast.error('The interview time must be in the future')
            return
        }
        if (mode === 'video' && !meetingLink.trim()) {
            toast.error('Add a meeting link for a video interview')
            return
        }
        if (mode === 'phone' && !meetingPhoneNumber.trim()) {
            toast.error('Add a phone number for a phone interview')
            return
        }
        if (mode === 'onsite' && !meetingLocation.trim()) {
            toast.error('Add a location for an on-site interview')
            return
        }

        const meeting =
            mode === 'video'
                ? { link: meetingLink.trim() }
                : mode === 'phone'
                  ? { phoneNumber: meetingPhoneNumber.trim() }
                  : { location: meetingLocation.trim() }

        try {
            setSubmitting(true)
            const interview = await interviewService.schedule(application._id, {
                scheduledAt: new Date(scheduledAt).toISOString(),
                durationMinutes: Number(durationMinutes),
                mode,
                meeting,
                ...(agenda.trim() ? { agenda: agenda.trim() } : {}),
                timezone,
            })
            toast.success('Interview scheduled')
            reset()
            onScheduled(interview)
            onClose()
        } catch (err: any) {
            const message =
                err?.response?.data?.errors?.[0]?.msg ||
                err?.response?.data?.message ||
                'Failed to schedule interview'
            toast.error(message)
        } finally {
            setSubmitting(false)
        }
    }

    const candidateName = [
        application.student?.firstName,
        application.student?.lastName,
    ]
        .filter(Boolean)
        .join(' ')

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
                        <DialogTitle>Schedule interview</DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {candidateName
                                ? `With ${candidateName}`
                                : 'With this candidate'}
                            {application.task?.title
                                ? ` · ${application.task.title}`
                                : ''}
                        </p>
                    </div>
                    <DialogCloseButton />
                </DialogHeader>

                <DialogBody className="space-y-5">
                    {/* Date + duration */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="scheduled-at">
                                Date & time <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="scheduled-at"
                                type="datetime-local"
                                min={minDateTime}
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                className="mt-1.5"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                Earliest slot is 30 minutes from now.
                            </p>
                        </div>
                        <div>
                            <Label>Duration</Label>
                            <Select
                                value={durationMinutes}
                                onValueChange={setDurationMinutes}
                            >
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DURATIONS.map((d) => (
                                        <SelectItem key={d} value={String(d)}>
                                            {d} minutes
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Mode */}
                    <div>
                        <Label>Mode</Label>
                        <div className="mt-1.5 grid grid-cols-3 gap-2">
                            {MODES.map((m) => {
                                const Icon = m.icon
                                const active = mode === m.value
                                return (
                                    <button
                                        key={m.value}
                                        type="button"
                                        onClick={() => setMode(m.value)}
                                        className={cn(
                                            'flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                                            active
                                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                                : 'border-border text-muted-foreground hover:bg-muted',
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {m.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Mode-specific field */}
                    {mode === 'video' && (
                        <div>
                            <Label htmlFor="meeting-link">
                                Meeting link <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="meeting-link"
                                type="url"
                                value={meetingLink}
                                onChange={(e) => setMeetingLink(e.target.value)}
                                placeholder="https://meet.google.com/… or Zoom/Teams URL"
                                className="mt-1.5"
                            />
                        </div>
                    )}
                    {mode === 'phone' && (
                        <div>
                            <Label htmlFor="meeting-phone">
                                Phone number <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="meeting-phone"
                                type="tel"
                                value={meetingPhoneNumber}
                                onChange={(e) => setMeetingPhoneNumber(e.target.value)}
                                placeholder="+1 555 000 0000"
                                className="mt-1.5"
                            />
                        </div>
                    )}
                    {mode === 'onsite' && (
                        <div>
                            <Label htmlFor="meeting-location">
                                Location <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="meeting-location"
                                value={meetingLocation}
                                onChange={(e) => setMeetingLocation(e.target.value)}
                                placeholder="Office address / room"
                                className="mt-1.5"
                            />
                        </div>
                    )}

                    {/* Timezone */}
                    <div>
                        <Label>Timezone</Label>
                        <Select value={timezone} onValueChange={setTimezone}>
                            <SelectTrigger className="mt-1.5">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {timezoneOptions.map((tz) => (
                                    <SelectItem key={tz} value={tz}>
                                        {tz}
                                        {tz === browserTz ? ' (your timezone)' : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Agenda */}
                    <div>
                        <Label htmlFor="agenda">Agenda</Label>
                        <Textarea
                            id="agenda"
                            value={agenda}
                            onChange={(e) => setAgenda(e.target.value)}
                            placeholder="What you'll cover, what the candidate should prepare…"
                            rows={4}
                            className="mt-1.5"
                        />
                    </div>
                </DialogBody>

                <DialogFooter>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        {submitting ? 'Scheduling…' : 'Schedule interview'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
