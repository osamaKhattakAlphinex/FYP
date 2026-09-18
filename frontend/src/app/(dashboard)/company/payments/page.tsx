'use client'

import { useCallback, useEffect, useState } from 'react'
import { Banknote, Clock, Percent, RotateCcw } from 'lucide-react'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import StatTile from '@/components/analytics/StatTile'
import PaymentsTable from '@/components/payments/PaymentsTable'
import { usePaymentActions } from '@/components/payments/usePaymentActions'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { formatMoney, PAYMENT_STATUS_LABELS, PAYMENT_STATUSES, paymentService } from '@/services/paymentService'
import { apiErrorMessage } from '@/lib/apiError'
import type { CompanyPaymentSummary, PaymentList, PaymentStatus } from '@/types/payment.types'

export default function CompanyPaymentsPage() {
    useRoleProtection({ allowedRoles: ['company'] })
    const [data, setData] = useState<PaymentList<CompanyPaymentSummary> | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState<PaymentStatus | 'all'>('all')
    const [page, setPage] = useState(1)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            setData(await paymentService.listForCompany({ status: status === 'all' ? '' : status, page }))
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not load payments'))
        } finally {
            setLoading(false)
        }
    }, [status, page])

    useEffect(() => {
        load()
    }, [load])

    const { busyId, handleAction, refundDialog } = usePaymentActions(load)
    const s = data?.summary
    const cur = s?.currency ?? undefined

    return (
        <AppShell>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Payments</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Everything you have paid your interns. To pay someone, open their internship&apos;s
                        Payments tab.
                    </p>
                </div>
                <Select
                    value={status}
                    onValueChange={(v) => {
                        setPage(1)
                        setStatus(v as PaymentStatus | 'all')
                    }}
                >
                    <SelectTrigger className="w-44" aria-label="Filter by status">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {PAYMENT_STATUSES.map((st) => (
                            <SelectItem key={st} value={st}>
                                {PAYMENT_STATUS_LABELS[st]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {loading && !data ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
                    </div>
                    <Skeleton className="h-48" />
                </div>
            ) : error && !data ? (
                <Card className="p-6 text-center text-sm">
                    <p className="text-destructive">{error}</p>
                    <Button className="mt-3" size="sm" variant="outline" onClick={load}>
                        Try again
                    </Button>
                </Card>
            ) : data && s ? (
                <>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <StatTile label="Paid" value={formatMoney(s.totalPaid, cur)} hint="Succeeded payments" icon={Banknote} />
                        <StatTile label="Platform fees" value={formatMoney(s.totalFees, cur)} hint="Deducted from payouts" icon={Percent} />
                        <StatTile label="Refunded" value={formatMoney(s.refunded, cur)} hint="Returned to you" icon={RotateCcw} />
                        <StatTile label="Open" value={s.open} hint="Awaiting checkout or processing" icon={Clock} />
                    </div>
                    <Card className="p-4">
                        <PaymentsTable
                            payments={data.records}
                            show="student"
                            onAction={handleAction}
                            busyId={busyId}
                            emptyText="No payments yet."
                        />
                        {data.pagination.totalPages > 1 && (
                            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                                <Button size="xs" variant="secondary" disabled={!data.pagination.hasPrevPage} onClick={() => setPage((p) => p - 1)}>
                                    Previous
                                </Button>
                                Page {data.pagination.currentPage} of {data.pagination.totalPages}
                                <Button size="xs" variant="secondary" disabled={!data.pagination.hasNextPage} onClick={() => setPage((p) => p + 1)}>
                                    Next
                                </Button>
                            </div>
                        )}
                    </Card>
                    {refundDialog}
                </>
            ) : null}
        </AppShell>
    )
}
