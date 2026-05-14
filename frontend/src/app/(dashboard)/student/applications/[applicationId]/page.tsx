'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft,
    Building2,
    Calendar,
    Clock,
    DollarSign,
    FileText,
    Globe,
    Paperclip,
    XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogTitle,
    DialogCloseButton,
} from '@/components/ui/dialog'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { applicationService } from '@/services/applicationService'
import type { Application } from '@/types/application.types'
import { cn, getInitials } from '@/lib/utils'

const formatDateTime = (iso?: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    })
}

const formatDate = (iso?: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

const resolveFileUrl = (url?: string) => {
    if (!url) return '#'
    if (/^https?:\/\//i.test(url)) return url
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    const root = apiBase.replace(/\/api\/?$/, '')
    return `${root}${url.startsWith('/') ? '' : '/'}${url}`
}

export default function StudentApplicationDetailPage() {
    useRoleProtection({ allowedRoles: ['student'] })
    const params = useParams()
    const router = useRouter()
    const applicationId = params.applicationId as string

    const [application, setApplication] = useState<Application | null>(null)
    const [loading, setLoading] = useState(true)
    const [withdrawOpen, setWithdrawOpen] = useState(false)
    const [withdrawing, setWithdrawing] = useState(false)

    const fetchApplication = async () => {
        try {
            setLoading(true)
            const data = await applicationService.getMyApplication(applicationId)
            setApplication(data)
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || 'Failed to load application',
            )
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (applicationId) fetchApplication()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applicationId])

    const handleWithdraw = async () => {
        try {
            setWithdrawing(true)
            await applicationService.withdrawMyApplication(applicationId)
            toast.success('Application withdrawn')
            setWithdrawOpen(false)
            fetchApplication()
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message || 'Failed to withdraw application',
            )
        } finally {
            setWithdrawing(false)
        }
    }

    if (loading) {
        return (
            <AppShell>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </AppShell>
        )
    }

    if (!application) {
        return (
            <AppShell>
                <Card className="p-10 text-center">
                    <h3 className="text-sm font-semibold text-foreground">
                        Application not found
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        It may have been removed or you don't have access.
                    </p>
                    <Button asChild size="sm" className="mt-4">
                        <Link href="/student/applications">Back to applications</Link>
                    </Button>
                </Card>
            </AppShell>
        )
    }

    const task = application.task
    const company = task?.company
    const canWithdraw = applicationService.canStudentWithdraw(application.status)
    const history = application.statusHistory ?? []

    return (
        <AppShell
            rightRail={
                <Card className="p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Timeline
                    </h3>
                    {history.length === 0 ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                            No status changes yet.
                        </p>
                    ) : (
                        <ol className="mt-3 space-y-3">
                            {history.map((h) => (
                                <li key={h._id} className="flex gap-3">
                                    <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-600" />
                                    <div className="min-w-0 flex-1 text-xs">
                                        <p className="font-medium text-foreground">
                                            {h.fromStatus
                                                ? `${applicationService.getStatusLabel(h.fromStatus)} → ${applicationService.getStatusLabel(h.toStatus)}`
                                                : applicationService.getStatusLabel(h.toStatus)}
                                        </p>
                                        <p className="text-muted-foreground">
                                            {formatDateTime(h.createdAt)}
                                        </p>
                                        {h.reason && (
                                            <p className="mt-1 italic text-muted-foreground">
                                                "{h.reason}"
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </Card>
            }
        >
            <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" /> Back
            </button>

            {/* Header */}
            <Card className="p-5">
                <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 rounded-md">
                        {company?.logo && (
                            <AvatarImage
                                src={company.logo}
                                alt={company.companyName}
                                className="rounded-md object-cover"
                            />
                        )}
                        <AvatarFallback className="rounded-md">
                            {getInitials(company?.companyName || 'CO')}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        {task?._id ? (
                            <Link
                                href={`/tasks/${task._id}`}
                                className="line-clamp-1 text-lg font-semibold text-foreground hover:text-brand-700"
                            >
                                {task.title}
                            </Link>
                        ) : (
                            <p className="text-lg font-semibold text-foreground">Task</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                            <Building2 className="mr-1 inline h-3.5 w-3.5" />
                            {company?.companyName || '—'}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                                className={cn(
                                    'rounded-full px-2 py-0.5 text-xs font-medium',
                                    applicationService.getStatusColor(application.status),
                                )}
                            >
                                {applicationService.getStatusLabel(application.status)}
                            </span>
                            {task?.workType && (
                                <Badge variant="muted" className="capitalize">
                                    {task.workType}
                                </Badge>
                            )}
                            {task?.budgetDisplay && (
                                <Badge variant="muted">{task.budgetDisplay}</Badge>
                            )}
                        </div>
                    </div>
                </div>

                {canWithdraw && (
                    <div className="mt-4 flex justify-end">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setWithdrawOpen(true)}
                        >
                            <XCircle className="h-3.5 w-3.5" /> Withdraw application
                        </Button>
                    </div>
                )}

                {application.status === 'rejected' && application.rejectionReason && (
                    <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
                        <strong>Reason: </strong>
                        {application.rejectionReason}
                    </div>
                )}
            </Card>

            {/* Application details */}
            <Card className="p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <FileText className="h-4 w-4 text-brand-600" /> Cover letter
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                    {application.coverLetter}
                </p>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
                <Card className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Proposed rate
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <DollarSign className="h-4 w-4 text-success" />
                        {application.proposed?.rate != null
                            ? `${application.proposed.rate} ${application.proposed.currency || 'USD'}`
                            : '—'}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Availability
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Clock className="h-4 w-4 text-brand-600" />
                        {application.availabilityHoursPerWeek
                            ? `${application.availabilityHoursPerWeek} hrs / week`
                            : '—'}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Expected start date
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Calendar className="h-4 w-4 text-brand-600" />
                        {formatDate(application.expectedStartDate)}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Portfolio
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                        <Globe className="h-4 w-4 text-brand-600" />
                        {application.portfolioUrl ? (
                            <a
                                href={application.portfolioUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate text-brand-700 hover:underline"
                            >
                                {application.portfolioUrl}
                            </a>
                        ) : (
                            <span className="text-foreground">—</span>
                        )}
                    </p>
                </Card>
            </div>

            {/* Attachments */}
            {application.attachments?.length > 0 && (
                <Card className="p-5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Paperclip className="h-4 w-4 text-brand-600" /> Attachments
                    </h2>
                    <ul className="mt-3 space-y-2">
                        {application.attachments.map((a) => (
                            <li
                                key={a._id}
                                className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                            >
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-foreground">
                                        {a.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                        {a.type}
                                    </p>
                                </div>
                                <Button asChild size="sm" variant="ghost">
                                    <a
                                        href={resolveFileUrl(a.url)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Open
                                    </a>
                                </Button>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            <p className="text-xs text-muted-foreground">
                Submitted {formatDateTime(application.submittedAt)}
            </p>

            {/* Withdraw confirm */}
            <Dialog
                open={withdrawOpen}
                onOpenChange={(o) => !withdrawing && setWithdrawOpen(o)}
            >
                <DialogContent size="sm">
                    <DialogHeader>
                        <div>
                            <DialogTitle>Withdraw application?</DialogTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                This cannot be undone. You won't be able to re-apply to
                                the same task.
                            </p>
                        </div>
                        <DialogCloseButton />
                    </DialogHeader>
                    <DialogBody>
                        <p className="text-sm text-foreground/80">
                            Are you sure you want to withdraw your application for{' '}
                            <span className="font-semibold">{task?.title}</span>?
                        </p>
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() => setWithdrawOpen(false)}
                            disabled={withdrawing}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleWithdraw}
                            disabled={withdrawing}
                        >
                            {withdrawing ? 'Withdrawing…' : 'Withdraw'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppShell>
    )
}
