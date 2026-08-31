'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    CheckCircle2,
    Clock,
    Loader2,
    Search,
    ShieldCheck,
    ShieldX,
    XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { mentorService } from '@/services/mentorService'
import type { Mentor, VerificationStatus } from '@/types/mentor.types'
import { cn, getInitials } from '@/lib/utils'

const apiRoot = () => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    return base.replace(/\/api\/?$/, '')
}
const resolveImage = (url?: string | null) =>
    !url ? undefined : url.startsWith('http') ? url : `${apiRoot()}${url}`

const TABS: Array<{ value: VerificationStatus | 'all'; label: string }> = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
]

const LIMIT = 20

export default function AdminMentorsPage() {
    useRoleProtection({ allowedRoles: ['admin'] })

    const [activeTab, setActiveTab] = useState<VerificationStatus | 'all'>('pending')
    const [search, setSearch] = useState('')
    const [mentors, setMentors] = useState<Mentor[]>([])
    const [statusCounts, setStatusCounts] = useState<Record<VerificationStatus, number>>({
        pending: 0,
        approved: 0,
        rejected: 0,
    })
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalMentors, setTotalMentors] = useState(0)

    const [reviewTarget, setReviewTarget] = useState<{
        mentor: Mentor
        decision: 'approved' | 'rejected'
    } | null>(null)
    const [note, setNote] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const fetchMentors = useCallback(async () => {
        try {
            setLoading(true)
            const res = await mentorService.getMentorsForAdmin(
                currentPage,
                LIMIT,
                activeTab,
                search,
            )
            setMentors(res.mentors)
            setStatusCounts(res.statusCounts)
            setTotalPages(res.pagination.totalPages)
            setTotalMentors(res.pagination.totalMentors)
        } catch {
            toast.error('Failed to load mentors')
        } finally {
            setLoading(false)
        }
    }, [activeTab, currentPage, search])

    useEffect(() => {
        const t = setTimeout(fetchMentors, search ? 350 : 0)
        return () => clearTimeout(t)
    }, [fetchMentors, search])

    const handleTabChange = (tab: VerificationStatus | 'all') => {
        setActiveTab(tab)
        setCurrentPage(1)
    }

    const openReview = (mentor: Mentor, decision: 'approved' | 'rejected') => {
        setReviewTarget({ mentor, decision })
        setNote('')
    }

    const submitReview = async () => {
        if (!reviewTarget) return
        try {
            setSubmitting(true)
            const updated = await mentorService.reviewVerification(reviewTarget.mentor.id, {
                status: reviewTarget.decision,
                note: note.trim() || undefined,
            })
            toast.success(
                reviewTarget.decision === 'approved' ? 'Mentor approved' : 'Mentor rejected',
            )
            setMentors((prev) =>
                activeTab === 'all'
                    ? prev.map((m) => (m.id === updated.id ? updated : m))
                    : prev.filter((m) => m.id !== updated.id),
            )
            setTotalMentors((n) => Math.max(0, n - (activeTab === 'all' ? 0 : 1)))
            setReviewTarget(null)
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Could not submit the review')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <AppShell>
            <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    Mentor verification
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Approve mentors before companies can assign them to students.
                </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <Card className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs font-medium">Pending</span>
                    </div>
                    <p className="mt-1 text-xl font-bold text-foreground">
                        {statusCounts.pending}
                    </p>
                </Card>
                <Card className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-medium">Approved</span>
                    </div>
                    <p className="mt-1 text-xl font-bold text-foreground">
                        {statusCounts.approved}
                    </p>
                </Card>
                <Card className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <XCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">Rejected</span>
                    </div>
                    <p className="mt-1 text-xl font-bold text-foreground">
                        {statusCounts.rejected}
                    </p>
                </Card>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="overflow-x-auto">
                    <div className="flex gap-1.5 border-b border-border pb-1 sm:border-0 sm:pb-0">
                        {TABS.map((tab) => (
                            <button
                                key={tab.value}
                                onClick={() => handleTabChange(tab.value)}
                                className={cn(
                                    'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                                    activeTab === tab.value
                                        ? 'bg-brand-50 text-brand-700'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="relative sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setCurrentPage(1)
                        }}
                        placeholder="Search mentors…"
                        className="pl-9"
                    />
                </div>
            </div>

            <p className="text-xs text-muted-foreground">
                {loading
                    ? 'Loading…'
                    : `${totalMentors.toLocaleString()} mentor${totalMentors === 1 ? '' : 's'}`}
            </p>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </div>
            ) : mentors.length === 0 ? (
                <Card className="p-10 text-center">
                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">
                        Nothing here
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {activeTab === 'pending'
                            ? 'No mentors are awaiting review right now.'
                            : 'No mentors match this filter.'}
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {mentors.map((m) => {
                        const name = `${m.firstName} ${m.lastName}`
                        return (
                            <Card key={m.id} className="p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <Avatar className="h-11 w-11 shrink-0">
                                            <AvatarImage
                                                src={resolveImage(m.profilePicture)}
                                                alt={name}
                                            />
                                            <AvatarFallback>{getInitials(name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-semibold text-foreground">
                                                    {name}
                                                </p>
                                                <span
                                                    className={cn(
                                                        'rounded-full px-2 py-0.5 text-xs font-semibold',
                                                        mentorService.getVerificationColor(
                                                            m.verification.status,
                                                        ),
                                                    )}
                                                >
                                                    {mentorService.getVerificationLabel(
                                                        m.verification.status,
                                                    )}
                                                </span>
                                            </div>
                                            {m.headline && (
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {m.headline}
                                                </p>
                                            )}
                                            {m.currentPosition && m.currentCompany && (
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {m.currentPosition} at {m.currentCompany} ·{' '}
                                                    {m.yearsOfExperience}y experience
                                                </p>
                                            )}
                                            {m.email && (
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {m.email}
                                                </p>
                                            )}
                                            {m.expertise && m.expertise.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {m.expertise.map((e) => (
                                                        <span
                                                            key={e.id}
                                                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                                        >
                                                            {e.name} · {e.level}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {m.bio && (
                                                <p className="mt-2 text-xs text-muted-foreground">
                                                    {m.bio}
                                                </p>
                                            )}
                                            {m.verification.note && (
                                                <p className="mt-2 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                                                    <span className="font-medium text-foreground">
                                                        Previous note:
                                                    </span>{' '}
                                                    {m.verification.note}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 gap-2">
                                        {m.verification.status !== 'approved' && (
                                            <Button
                                                size="sm"
                                                onClick={() => openReview(m, 'approved')}
                                            >
                                                <ShieldCheck className="h-3.5 w-3.5" /> Approve
                                            </Button>
                                        )}
                                        {m.verification.status !== 'rejected' && (
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => openReview(m, 'rejected')}
                                            >
                                                <ShieldX className="h-3.5 w-3.5" /> Reject
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}

            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2 text-sm">
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                        Previous
                    </Button>
                    <span className="text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </Button>
                </div>
            )}

            <Dialog
                open={!!reviewTarget}
                onOpenChange={(open) => {
                    if (!open && !submitting) setReviewTarget(null)
                }}
            >
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>
                            {reviewTarget?.decision === 'approved'
                                ? 'Approve this mentor?'
                                : 'Reject this mentor?'}
                        </DialogTitle>
                        <DialogCloseButton />
                    </DialogHeader>
                    <DialogBody className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            {reviewTarget?.mentor.firstName} {reviewTarget?.mentor.lastName}
                        </p>
                        <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            maxLength={500}
                            placeholder={
                                reviewTarget?.decision === 'rejected'
                                    ? 'Reason for rejection (shared with the mentor)'
                                    : 'Optional note'
                            }
                        />
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            variant="secondary"
                            onClick={() => setReviewTarget(null)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={reviewTarget?.decision === 'rejected' ? 'destructive' : 'default'}
                            onClick={submitReview}
                            disabled={submitting}
                        >
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {submitting
                                ? 'Submitting…'
                                : reviewTarget?.decision === 'approved'
                                  ? 'Approve'
                                  : 'Reject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppShell>
    )
}
