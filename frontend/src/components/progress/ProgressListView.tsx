'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ClipboardList, Clock3, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ProgressCard from './ProgressCard'
import { progressService } from '@/services/progressService'
import { apiErrorMessage } from '@/lib/apiError'
import type {
    HealthStatus,
    InternshipProgress,
    ProgressOverview,
    ProgressPerspective,
    ProgressScope,
} from '@/types/progress.types'
import { cn } from '@/lib/utils'

const TABS: Array<{ value: ProgressScope; label: string }> = [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'all', label: 'All' },
]

const HEALTH_FILTERS: Array<{ value: HealthStatus | ''; label: string }> = [
    { value: '', label: 'Any health' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'at_risk', label: 'At risk' },
    { value: 'on_track', label: 'On track' },
]

const LIMIT = 10

interface ProgressListViewProps {
    perspective: ProgressPerspective
    title: string
    subtitle: string
    /** Builds the link to a single internship for this role. */
    hrefFor: (progress: InternshipProgress) => string
    emptyTitle: string
    emptyBody: string
    rightRail?: React.ReactNode
}

/**
 * The internships list, shared by the student, company and mentor routes.
 * Which records come back is decided entirely server-side by the caller's
 * role, so the only thing that varies here is the copy and the link target.
 */
export default function ProgressListView({
    perspective,
    title,
    subtitle,
    hrefFor,
    emptyTitle,
    emptyBody,
    rightRail,
}: ProgressListViewProps) {
    const [records, setRecords] = useState<InternshipProgress[]>([])
    const [overview, setOverview] = useState<ProgressOverview | null>(null)
    const [scope, setScope] = useState<ProgressScope>('active')
    const [health, setHealth] = useState<HealthStatus | ''>('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)

    const fetchList = useCallback(async () => {
        const fetcher =
            perspective === 'company'
                ? progressService.getCompanyProgress
                : perspective === 'mentor'
                  ? progressService.getMentorProgress
                  : progressService.getStudentProgress

        try {
            setLoading(true)
            const res = await fetcher(scope, page, LIMIT, health || undefined)
            setRecords(res.records)
            setTotalPages(res.pagination.totalPages)
            setTotal(res.pagination.totalRecords)
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not load your internships'))
        } finally {
            setLoading(false)
        }
    }, [perspective, scope, page, health])

    useEffect(() => {
        fetchList()
    }, [fetchList])

    useEffect(() => {
        progressService
            .getOverview()
            .then(setOverview)
            // The overview is a nicety; a failure here must not break the list.
            .catch(() => setOverview(null))
    }, [])

    const changeScope = (next: ProgressScope) => {
        setScope(next)
        setPage(1)
    }

    const changeHealth = (next: HealthStatus | '') => {
        setHealth(next)
        setPage(1)
    }

    return (
        <AppShell rightRail={rightRail}>
            <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {title}
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            </div>

            {overview && overview.total > 0 && (
                <div className="grid gap-3 sm:grid-cols-4">
                    <Card className="p-3.5">
                        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ClipboardList className="h-3.5 w-3.5" /> Internships
                        </p>
                        <p className="mt-1 text-xl font-bold text-foreground">
                            {overview.total}
                        </p>
                    </Card>
                    <Card className="p-3.5">
                        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <TrendingUp className="h-3.5 w-3.5" /> Avg. progress
                        </p>
                        <p className="mt-1 text-xl font-bold text-foreground">
                            {overview.averageProgress}%
                        </p>
                    </Card>
                    <Card className="p-3.5">
                        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" /> Hours logged
                        </p>
                        <p className="mt-1 text-xl font-bold text-foreground">
                            {overview.totalHoursLogged}
                        </p>
                    </Card>
                    <Card
                        className={cn(
                            'p-3.5',
                            overview.needsAttention > 0 && 'border-amber-200 bg-amber-50',
                        )}
                    >
                        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <AlertTriangle className="h-3.5 w-3.5" /> Needs attention
                        </p>
                        <p
                            className={cn(
                                'mt-1 text-xl font-bold',
                                overview.needsAttention > 0
                                    ? 'text-amber-800'
                                    : 'text-foreground',
                            )}
                        >
                            {overview.needsAttention}
                        </p>
                    </Card>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1.5 border-b border-border pb-1">
                    {TABS.map((t) => (
                        <button
                            key={t.value}
                            onClick={() => changeScope(t.value)}
                            className={cn(
                                'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                                scope === t.value
                                    ? 'bg-brand-50 text-brand-700'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <select
                    value={health}
                    onChange={(e) => changeHealth(e.target.value as HealthStatus | '')}
                    aria-label="Filter by health"
                    className="h-9 rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    {HEALTH_FILTERS.map((f) => (
                        <option key={f.value} value={f.value}>
                            {f.label}
                        </option>
                    ))}
                </select>
            </div>

            <p className="text-xs text-muted-foreground">
                {loading
                    ? 'Loading…'
                    : `${total.toLocaleString()} internship${total === 1 ? '' : 's'}`}
            </p>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full" />
                    ))}
                </div>
            ) : records.length === 0 ? (
                <Card className="p-10 text-center">
                    <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted text-muted-foreground">
                        <ClipboardList className="h-5 w-5" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-foreground">{emptyTitle}</h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                        {emptyBody}
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {records.map((r) => (
                        <ProgressCard
                            key={r.id}
                            progress={r}
                            perspective={perspective}
                            href={hrefFor(r)}
                        />
                    ))}
                </div>
            )}

            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2 text-sm">
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Previous
                    </Button>
                    <span className="text-muted-foreground">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                        Next
                    </Button>
                </div>
            )}
        </AppShell>
    )
}
