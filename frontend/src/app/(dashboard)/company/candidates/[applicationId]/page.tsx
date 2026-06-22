'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
    ArrowLeft,
    Loader2,
    Mail,
    MapPin,
    GraduationCap,
    Briefcase,
    Sparkles,
    Paperclip,
    Download,
    CalendarClock,
    CalendarPlus,
    DollarSign,
    Clock,
    Globe,
    History,
    Save,
    AlertCircle,
    RotateCcw,
    XCircle,
    CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogCloseButton,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

import { useRoleProtection } from '@/hooks/useRoleProtection'
import { applicationService } from '@/services/applicationService'
import { interviewService } from '@/services/interviewService'
import type {
    Application,
    ApplicationStatus,
} from '@/types/application.types'
import type { Interview } from '@/types/interview.types'
import ScheduleInterviewModal from '@/components/interviews/ScheduleInterviewModal'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Format a Date as the value a datetime-local input expects.
const toLocalInputValue = (iso: string) => {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours(),
    )}:${pad(d.getMinutes())}`
}

const VALID_TRANSITIONS: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
    submitted: ['under_review', 'shortlisted', 'rejected'],
    under_review: ['shortlisted', 'rejected'],
    shortlisted: ['interview_scheduled', 'rejected', 'accepted'],
    interview_scheduled: ['accepted', 'rejected'],
}

const formatDate = (iso?: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })
}

const resolveFileUrl = (url?: string) => {
    if (!url) return '#'
    if (/^https?:\/\//i.test(url)) return url
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    const root = apiBase.replace(/\/api\/?$/, '')
    return `${root}${url.startsWith('/') ? '' : '/'}${url}`
}

const formatDateTime = (iso?: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

const initials = (first?: string, last?: string) =>
    `${(first || '').charAt(0)}${(last || '').charAt(0)}`.toUpperCase() || '?'

export default function CandidateDetailPage() {
    useRoleProtection({ allowedRoles: ['company'] })
    const router = useRouter()
    const params = useParams<{ applicationId: string }>()
    const searchParams = useSearchParams()
    const applicationId = params?.applicationId
    const initialTab =
        searchParams.get('tab') === 'interview' ? 'interview' : 'application'

    const [application, setApplication] = useState<Application | null>(null)
    const [loading, setLoading] = useState(true)
    const [notes, setNotes] = useState('')
    const [savingNotes, setSavingNotes] = useState(false)

    const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(null)
    const [reason, setReason] = useState('')
    const [submittingStatus, setSubmittingStatus] = useState(false)

    // Module 5 — Interview
    const [interview, setInterview] = useState<Interview | null>(null)
    const [scheduleOpen, setScheduleOpen] = useState(false)
    const [rescheduleOpen, setRescheduleOpen] = useState(false)
    const [cancelOpen, setCancelOpen] = useState(false)
    const [completeOpen, setCompleteOpen] = useState(false)
    const [rescheduleAt, setRescheduleAt] = useState('')
    const [rescheduleReason, setRescheduleReason] = useState('')
    const [cancelReason, setCancelReason] = useState('')
    const [completeFeedback, setCompleteFeedback] = useState('')
    const [completeRating, setCompleteRating] = useState('')
    const [interviewBusy, setInterviewBusy] = useState(false)

    const fetchApplication = useCallback(async () => {
        if (!applicationId) return
        try {
            setLoading(true)
            const data = await applicationService.getApplication(applicationId)
            setApplication(data)
            setInterview(data.interview ?? null)
            setNotes(data.companyNotes ?? '')
        } catch {
            toast.error('Failed to load application')
            router.push('/company/candidates')
        } finally {
            setLoading(false)
        }
    }, [applicationId, router])

    useEffect(() => {
        fetchApplication()
    }, [fetchApplication])

    const allowedNextStatuses = useMemo(() => {
        if (!application) return []
        return VALID_TRANSITIONS[application.status] || []
    }, [application])

    const handleStatusSelect = (value: string) => {
        const next = value as ApplicationStatus
        if (!application || next === application.status) return
        setPendingStatus(next)
        setReason('')
    }

    const confirmStatusChange = async () => {
        if (!application || !pendingStatus) return
        try {
            setSubmittingStatus(true)
            const updated = await applicationService.updateStatus(application._id, {
                status: pendingStatus,
                reason: reason.trim() || undefined,
            })
            setApplication(updated)
            toast.success(
                `Status set to ${applicationService.getStatusLabel(pendingStatus)}`,
            )
            setPendingStatus(null)
            setReason('')
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message || 'Failed to update status',
            )
        } finally {
            setSubmittingStatus(false)
        }
    }

    const handleSaveNotes = async () => {
        if (!application) return
        try {
            setSavingNotes(true)
            const updated = await applicationService.updateNotes(
                application._id,
                notes,
            )
            setApplication({
                ...application,
                companyNotes: updated.companyNotes ?? notes,
            })
            toast.success('Notes saved')
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to save notes')
        } finally {
            setSavingNotes(false)
        }
    }

    const openReschedule = () => {
        if (interview) setRescheduleAt(toLocalInputValue(interview.scheduledAt))
        setRescheduleReason('')
        setRescheduleOpen(true)
    }

    const handleReschedule = async () => {
        if (!interview) return
        if (!rescheduleAt) {
            toast.error('Pick a new date and time')
            return
        }
        if (new Date(rescheduleAt).getTime() <= Date.now()) {
            toast.error('The new time must be in the future')
            return
        }
        try {
            setInterviewBusy(true)
            await interviewService.reschedule(interview._id, {
                scheduledAt: new Date(rescheduleAt).toISOString(),
                reason: rescheduleReason.trim() || undefined,
            })
            toast.success('Interview rescheduled')
            setRescheduleOpen(false)
            setRescheduleReason('')
            fetchApplication()
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to reschedule')
        } finally {
            setInterviewBusy(false)
        }
    }

    const handleCancelInterview = async () => {
        if (!interview) return
        if (!cancelReason.trim()) {
            toast.error('A cancellation reason is required')
            return
        }
        try {
            setInterviewBusy(true)
            await interviewService.cancel(interview._id, {
                reason: cancelReason.trim(),
            })
            toast.success('Interview cancelled')
            setCancelOpen(false)
            setCancelReason('')
            fetchApplication()
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to cancel')
        } finally {
            setInterviewBusy(false)
        }
    }

    const handleCompleteInterview = async () => {
        if (!interview) return
        try {
            setInterviewBusy(true)
            await interviewService.complete(interview._id, {
                companyFeedback: completeFeedback.trim() || undefined,
                companyRating: completeRating ? Number(completeRating) : undefined,
            })
            toast.success('Interview marked as completed')
            setCompleteOpen(false)
            setCompleteFeedback('')
            setCompleteRating('')
            fetchApplication()
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to complete')
        } finally {
            setInterviewBusy(false)
        }
    }

    if (loading || !application) {
        return (
            <AppShell>
                <div className="space-y-3">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-72 w-full" />
                </div>
            </AppShell>
        )
    }

    const s = application.student
    const t = application.task
    const proposedRate = application.proposed?.rate
    const proposedCurrency = application.proposed?.currency || 'USD'

    return (
        <>
            <AppShell>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/company/candidates">
                                <ArrowLeft className="h-4 w-4" /> Back
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                                {s?.firstName} {s?.lastName}
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                Applied to{' '}
                                <Link
                                    href={t?._id ? `/tasks/${t._id}` : '#'}
                                    className="text-brand-700 hover:underline"
                                >
                                    {t?.title || 'task'}
                                </Link>{' '}
                                · {formatDate(application.submittedAt)}
                            </p>
                        </div>
                    </div>

                    {/* Status action */}
                    <div className="flex items-center gap-2">
                        <span
                            className={cn(
                                'rounded-full px-2.5 py-1 text-xs font-medium',
                                applicationService.getStatusColor(application.status),
                            )}
                        >
                            {applicationService.getStatusLabel(application.status)}
                        </span>
                        {allowedNextStatuses.length > 0 ? (
                            <Select onValueChange={handleStatusSelect} value="">
                                <SelectTrigger className="h-9 w-52">
                                    <SelectValue placeholder="Change status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allowedNextStatuses.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {applicationService.getStatusLabel(status)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Badge variant="muted">No further actions</Badge>
                        )}
                    </div>
                </div>

                {application.status === 'interview_scheduled' && !interview && (
                    <Card className="flex items-start gap-3 border-purple-200 bg-purple-50/50 p-4 text-purple-900">
                        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="text-sm">
                            <p className="font-semibold">Interview not scheduled yet</p>
                            <p className="text-purple-800/80">
                                Open the Interview tab to set a date, mode, and meeting
                                details.
                            </p>
                        </div>
                    </Card>
                )}

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
                    {/* Left: student snapshot */}
                    <Card className="h-fit p-4">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-14 w-14">
                                {s?.profilePicture && (
                                    <AvatarImage src={s.profilePicture} alt="" />
                                )}
                                <AvatarFallback className="text-base">
                                    {initials(s?.firstName, s?.lastName)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="line-clamp-1 text-sm font-semibold text-foreground">
                                    {s?.firstName} {s?.lastName}
                                </p>
                                {s?.headline && (
                                    <p className="line-clamp-2 text-xs text-muted-foreground">
                                        {s.headline}
                                    </p>
                                )}
                            </div>
                        </div>

                        <Separator className="my-3" />

                        <dl className="space-y-2 text-xs">
                            {(s?.locationCity || s?.locationCountry) && (
                                <div className="flex items-start gap-2">
                                    <MapPin className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <span>
                                        {[s?.locationCity, s?.locationCountry]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </span>
                                </div>
                            )}
                            {application.resumeUrl && (
                                <div className="flex items-start gap-2">
                                    <Paperclip className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <a
                                        href={application.resumeUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-brand-700 hover:underline"
                                    >
                                        Resume
                                    </a>
                                </div>
                            )}
                            {application.portfolioUrl && (
                                <div className="flex items-start gap-2">
                                    <Globe className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <a
                                        href={application.portfolioUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-brand-700 hover:underline"
                                    >
                                        Portfolio
                                    </a>
                                </div>
                            )}
                            {s?.profileCompletion != null && (
                                <div className="flex items-start gap-2">
                                    <Sparkles className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <span>
                                        Profile {s.profileCompletion}% complete
                                    </span>
                                </div>
                            )}
                        </dl>

                        {s?.bio && (
                            <>
                                <Separator className="my-3" />
                                <p className="text-xs leading-relaxed text-foreground/80">
                                    {s.bio}
                                </p>
                            </>
                        )}

                        {Array.isArray(s?.skills) && s.skills.length > 0 && (
                            <>
                                <Separator className="my-3" />
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Skills
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {s.skills.map((sk) => (
                                        <Badge
                                            key={sk._id}
                                            variant="soft"
                                            className="text-[11px]"
                                        >
                                            {sk.name}
                                            {sk.level ? (
                                                <span className="ml-1 opacity-70">
                                                    · {sk.level}
                                                </span>
                                            ) : null}
                                        </Badge>
                                    ))}
                                </div>
                            </>
                        )}

                        {Array.isArray(s?.education) && s.education.length > 0 && (
                            <>
                                <Separator className="my-3" />
                                <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <GraduationCap className="h-3.5 w-3.5" /> Education
                                </p>
                                <ul className="space-y-2 text-xs">
                                    {s.education.map((ed: any) => (
                                        <li key={ed._id || ed.id}>
                                            <p className="font-medium text-foreground">
                                                {ed.degree || ed.fieldOfStudy || 'Degree'}
                                            </p>
                                            <p className="text-muted-foreground">
                                                {ed.institution || ed.school || ''}
                                                {ed.startYear || ed.endYear
                                                    ? ` · ${ed.startYear ?? ''}${ed.endYear ? `–${ed.endYear}` : ''}`
                                                    : ''}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {application.matchScore != null && (
                            <>
                                <Separator className="my-3" />
                                <div className="rounded-md bg-muted/40 p-3 text-center">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                        Match score
                                    </p>
                                    <p
                                        className={cn(
                                            'mt-0.5 text-2xl font-bold',
                                            application.matchScore >= 80
                                                ? 'text-success'
                                                : application.matchScore >= 50
                                                  ? 'text-warning'
                                                  : 'text-destructive',
                                        )}
                                    >
                                        {application.matchScore}%
                                    </p>
                                </div>
                            </>
                        )}
                    </Card>

                    {/* Right: tabs */}
                    <Card className="p-4">
                        <Tabs defaultValue={initialTab}>
                            <TabsList>
                                <TabsTrigger value="application">Application</TabsTrigger>
                                <TabsTrigger value="interview">
                                    Interview
                                    {interview && (
                                        <span className="ml-1 h-1.5 w-1.5 rounded-full bg-brand-600" />
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="attachments">
                                    Attachments
                                    {application.attachments.length > 0 && (
                                        <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                                            {application.attachments.length}
                                        </span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="notes">Notes</TabsTrigger>
                                <TabsTrigger value="history">History</TabsTrigger>
                            </TabsList>

                            <TabsContent value="application" className="space-y-4">
                                <section>
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Cover letter
                                    </p>
                                    <p className="whitespace-pre-wrap break-words rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed text-foreground/90">
                                        {application.coverLetter}
                                    </p>
                                </section>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <Card className="p-3">
                                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <DollarSign className="h-3.5 w-3.5" /> Proposed rate
                                        </p>
                                        <p className="mt-0.5 text-sm font-semibold text-foreground">
                                            {proposedRate != null
                                                ? `${proposedCurrency} ${proposedRate.toLocaleString()}`
                                                : 'Not specified'}
                                        </p>
                                    </Card>
                                    <Card className="p-3">
                                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Clock className="h-3.5 w-3.5" /> Availability
                                        </p>
                                        <p className="mt-0.5 text-sm font-semibold text-foreground">
                                            {application.availabilityHoursPerWeek
                                                ? `${application.availabilityHoursPerWeek} hrs / week`
                                                : 'Not specified'}
                                        </p>
                                    </Card>
                                    <Card className="p-3">
                                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <CalendarClock className="h-3.5 w-3.5" /> Expected start
                                        </p>
                                        <p className="mt-0.5 text-sm font-semibold text-foreground">
                                            {formatDate(application.expectedStartDate)}
                                        </p>
                                    </Card>
                                    <Card className="p-3">
                                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Briefcase className="h-3.5 w-3.5" /> Task
                                        </p>
                                        <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-foreground">
                                            {t?.title || '—'}
                                        </p>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="interview" className="space-y-4">
                                {!interview ? (
                                    <div className="rounded-md border border-dashed border-border bg-muted/30 p-8 text-center">
                                        <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                                            <CalendarPlus className="h-4 w-4" />
                                        </div>
                                        <p className="mt-3 text-sm font-medium text-foreground">
                                            No interview scheduled
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Schedule an interview with this candidate to
                                            move the process forward.
                                        </p>
                                        <Button
                                            size="sm"
                                            className="mt-4"
                                            onClick={() => setScheduleOpen(true)}
                                        >
                                            <CalendarPlus className="h-3.5 w-3.5" />
                                            Schedule interview
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={cn(
                                                    'rounded-full px-2.5 py-1 text-xs font-medium',
                                                    interviewService.getStatusColor(
                                                        interview.status,
                                                    ),
                                                )}
                                            >
                                                {interviewService.getStatusLabel(
                                                    interview.status,
                                                )}
                                            </span>
                                            {interview.rescheduleCount > 0 && (
                                                <Badge variant="muted">
                                                    Rescheduled ×
                                                    {interview.rescheduleCount}
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <Card className="p-3">
                                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <CalendarClock className="h-3.5 w-3.5" />{' '}
                                                    When
                                                </p>
                                                <p className="mt-0.5 text-sm font-semibold text-foreground">
                                                    {interviewService.formatScheduledAt(
                                                        interview.scheduledAt,
                                                        interview.timezone,
                                                    )}
                                                </p>
                                            </Card>
                                            <Card className="p-3">
                                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Clock className="h-3.5 w-3.5" />{' '}
                                                    Duration & mode
                                                </p>
                                                <p className="mt-0.5 text-sm font-semibold text-foreground">
                                                    {interview.durationMinutes} min ·{' '}
                                                    {interviewService.getModeLabel(
                                                        interview.mode,
                                                    )}
                                                </p>
                                            </Card>
                                        </div>

                                        {(interview.meeting.link ||
                                            interview.meeting.phoneNumber ||
                                            interview.meeting.location) && (
                                            <Card className="p-3">
                                                <p className="text-xs text-muted-foreground">
                                                    Meeting details
                                                </p>
                                                {interview.meeting.link && (
                                                    <a
                                                        href={interview.meeting.link}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-0.5 block break-all text-sm font-medium text-brand-700 hover:underline"
                                                    >
                                                        {interview.meeting.link}
                                                    </a>
                                                )}
                                                {interview.meeting.phoneNumber && (
                                                    <p className="mt-0.5 text-sm font-medium text-foreground">
                                                        {interview.meeting.phoneNumber}
                                                    </p>
                                                )}
                                                {interview.meeting.location && (
                                                    <p className="mt-0.5 text-sm font-medium text-foreground">
                                                        {interview.meeting.location}
                                                    </p>
                                                )}
                                            </Card>
                                        )}

                                        {interview.agenda && (
                                            <section>
                                                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                    Agenda
                                                </p>
                                                <p className="whitespace-pre-wrap break-words rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed text-foreground/90">
                                                    {interview.agenda}
                                                </p>
                                            </section>
                                        )}

                                        {interview.status === 'cancelled' &&
                                            interview.cancellationReason && (
                                                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
                                                    <strong>
                                                        Cancellation reason:{' '}
                                                    </strong>
                                                    {interview.cancellationReason}
                                                </div>
                                            )}

                                        {interview.status === 'completed' && (
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <Card className="p-3">
                                                    <p className="text-xs text-muted-foreground">
                                                        Your feedback
                                                    </p>
                                                    <p className="mt-0.5 text-sm text-foreground/90">
                                                        {interview.companyFeedback ||
                                                            '—'}
                                                    </p>
                                                    {interview.ratings.company !=
                                                        null && (
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            Rating:{' '}
                                                            {interview.ratings.company}/5
                                                        </p>
                                                    )}
                                                </Card>
                                                <Card className="p-3">
                                                    <p className="text-xs text-muted-foreground">
                                                        Student feedback
                                                    </p>
                                                    <p className="mt-0.5 text-sm text-foreground/90">
                                                        {interview.studentFeedback ||
                                                            'Not submitted yet'}
                                                    </p>
                                                    {interview.ratings.student !=
                                                        null && (
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            Rating:{' '}
                                                            {interview.ratings.student}/5
                                                        </p>
                                                    )}
                                                </Card>
                                            </div>
                                        )}

                                        {['scheduled', 'rescheduled'].includes(
                                            interview.status,
                                        ) && (
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={openReschedule}
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                    Reschedule
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => {
                                                        setCancelReason('')
                                                        setCancelOpen(true)
                                                    }}
                                                >
                                                    <XCircle className="h-3.5 w-3.5" />
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setCompleteFeedback('')
                                                        setCompleteRating('')
                                                        setCompleteOpen(true)
                                                    }}
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Mark complete
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="attachments">
                                {application.attachments.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No attachments uploaded.
                                    </p>
                                ) : (
                                    <ul className="space-y-2">
                                        {application.attachments.map((a) => (
                                            <li
                                                key={a._id}
                                                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                                            >
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                                                    <div className="min-w-0">
                                                        <p className="line-clamp-1 text-sm font-medium text-foreground">
                                                            {a.name || 'attachment'}
                                                        </p>
                                                        {a.type && (
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {a.type}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button asChild size="sm" variant="secondary">
                                                    <a
                                                        href={resolveFileUrl(a.url)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        download
                                                    >
                                                        <Download className="h-3.5 w-3.5" /> Open
                                                    </a>
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </TabsContent>

                            <TabsContent value="notes" className="space-y-2">
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <AlertCircle className="h-3.5 w-3.5" /> Private to your
                                    team — students never see these notes.
                                </p>
                                <Textarea
                                    rows={6}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add a note about this candidate…"
                                />
                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleSaveNotes}
                                        disabled={savingNotes}
                                        size="sm"
                                    >
                                        {savingNotes ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4" /> Save notes
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="history">
                                {!application.statusHistory ||
                                application.statusHistory.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No history yet.
                                    </p>
                                ) : (
                                    <ol className="relative space-y-4 border-l border-border pl-4">
                                        {application.statusHistory.map((h) => (
                                            <li key={h._id} className="relative">
                                                <span className="absolute -left-[21px] top-1 grid h-3 w-3 place-items-center rounded-full bg-brand-600 ring-2 ring-card" />
                                                <p className="text-sm font-medium text-foreground">
                                                    {h.fromStatus
                                                        ? `${applicationService.getStatusLabel(h.fromStatus)} → ${applicationService.getStatusLabel(h.toStatus)}`
                                                        : `Created as ${applicationService.getStatusLabel(h.toStatus)}`}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    <History className="mr-1 inline h-3 w-3" />
                                                    {formatDateTime(h.createdAt)}
                                                </p>
                                                {h.reason && (
                                                    <p className="mt-1 rounded-md bg-muted/40 p-2 text-xs text-foreground/80">
                                                        {h.reason}
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </TabsContent>
                        </Tabs>
                    </Card>
                </div>
            </AppShell>

            {/* Status change confirm dialog */}
            <Dialog
                open={!!pendingStatus}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingStatus(null)
                        setReason('')
                    }
                }}
            >
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>
                            Move to{' '}
                            {pendingStatus
                                ? applicationService.getStatusLabel(pendingStatus)
                                : ''}
                            ?
                        </DialogTitle>
                        <DialogCloseButton />
                    </DialogHeader>
                    <DialogBody className="space-y-3">
                        <p className="text-sm text-foreground/80">
                            This will update the candidate's status and notify them.
                        </p>
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-muted-foreground">
                                Reason (optional)
                                {pendingStatus === 'rejected' && (
                                    <span className="ml-1 text-muted-foreground">
                                        — shared with the candidate
                                    </span>
                                )}
                            </span>
                            <Textarea
                                rows={3}
                                maxLength={500}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Add context for the candidate or your team…"
                            />
                        </label>
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setPendingStatus(null)
                                setReason('')
                            }}
                            disabled={submittingStatus}
                        >
                            Cancel
                        </Button>
                        <Button onClick={confirmStatusChange} disabled={submittingStatus}>
                            {submittingStatus ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Updating…
                                </>
                            ) : (
                                'Confirm'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Schedule interview modal */}
            <ScheduleInterviewModal
                application={application}
                isOpen={scheduleOpen}
                onClose={() => setScheduleOpen(false)}
                onScheduled={() => {
                    // Re-fetch to pick up the embedded interview + updated status
                    fetchApplication()
                }}
            />

            {/* Reschedule dialog */}
            <Dialog
                open={rescheduleOpen}
                onOpenChange={(open) => {
                    if (!open && !interviewBusy) setRescheduleOpen(false)
                }}
            >
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>Reschedule interview</DialogTitle>
                        <DialogCloseButton />
                    </DialogHeader>
                    <DialogBody className="space-y-3">
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-muted-foreground">
                                New date & time
                            </span>
                            <Input
                                type="datetime-local"
                                value={rescheduleAt}
                                onChange={(e) => setRescheduleAt(e.target.value)}
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-muted-foreground">
                                Reason (optional)
                            </span>
                            <Textarea
                                rows={3}
                                maxLength={500}
                                value={rescheduleReason}
                                onChange={(e) => setRescheduleReason(e.target.value)}
                                placeholder="Let the candidate know why the time changed…"
                            />
                        </label>
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() => setRescheduleOpen(false)}
                            disabled={interviewBusy}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleReschedule} disabled={interviewBusy}>
                            {interviewBusy ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                                </>
                            ) : (
                                'Reschedule'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel dialog */}
            <Dialog
                open={cancelOpen}
                onOpenChange={(open) => {
                    if (!open && !interviewBusy) setCancelOpen(false)
                }}
            >
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>Cancel interview?</DialogTitle>
                        <DialogCloseButton />
                    </DialogHeader>
                    <DialogBody className="space-y-3">
                        <p className="text-sm text-foreground/80">
                            The candidate will be notified. You can schedule a new
                            interview afterwards if needed.
                        </p>
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-muted-foreground">
                                Reason <span className="text-destructive">*</span>
                            </span>
                            <Textarea
                                rows={3}
                                maxLength={500}
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Why is this interview being cancelled?"
                            />
                        </label>
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() => setCancelOpen(false)}
                            disabled={interviewBusy}
                        >
                            Keep interview
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancelInterview}
                            disabled={interviewBusy}
                        >
                            {interviewBusy ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Cancelling…
                                </>
                            ) : (
                                'Cancel interview'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mark complete dialog */}
            <Dialog
                open={completeOpen}
                onOpenChange={(open) => {
                    if (!open && !interviewBusy) setCompleteOpen(false)
                }}
            >
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>Mark interview as completed</DialogTitle>
                        <DialogCloseButton />
                    </DialogHeader>
                    <DialogBody className="space-y-3">
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-muted-foreground">
                                Your feedback (optional)
                            </span>
                            <Textarea
                                rows={3}
                                value={completeFeedback}
                                onChange={(e) => setCompleteFeedback(e.target.value)}
                                placeholder="How did the interview go?"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-medium text-muted-foreground">
                                Rating (optional)
                            </span>
                            <Select
                                value={completeRating}
                                onValueChange={setCompleteRating}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="No rating" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5].map((r) => (
                                        <SelectItem key={r} value={String(r)}>
                                            {r} / 5
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </label>
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() => setCompleteOpen(false)}
                            disabled={interviewBusy}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleCompleteInterview} disabled={interviewBusy}>
                            {interviewBusy ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                                </>
                            ) : (
                                'Mark complete'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
