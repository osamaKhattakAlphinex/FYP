'use client'

import { useCallback, useEffect, useState } from 'react'
import { Banknote, Percent, RotateCcw, ShieldCheck } from 'lucide-react'

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
import type { AdminPaymentSummary, PaymentList, PaymentProviderName, PaymentStatus } from '@/types/payment.types'

export default function AdminPaymentsPage() {
    useRoleProtection({ allowedRoles: ['admin'] })
    const [data, setData] = useState<PaymentList<AdminPaymentSummary> | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState<PaymentStatus | 'all'>('all')
    const [provider, setProvider] = useState<PaymentProviderName | 'all'>('all')
    const [page, setPage] = useState(1)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            setData(
                await paymentService.listForAdmin({
                    status: status === 'all' ? '' : status,
                    provider: provider === 'all' ? '' : provider,
                    page,
                }),
            )
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not load payments'))
        } finally {
            setLoading(false)
        }
    }, [status, provider, page])

    useEffect(() => {
        load()
    }, [load])

    // Admins can refund (e.g. to settle a dispute) but never pay on a company's behalf.
    const { busyId, handleAction, refundDialog } = usePaymentActions(load)
    const s = data?.summary
    const cur = s?.currency ?? undefined

    return (
        <AppShell>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Payments</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Every transaction on the platform, its status history and the fees earned.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v as PaymentStatus | 'all') }}>
                        <SelectTrigger className="w-40" aria-label="Filter by status">
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
                    <Select value={provider} onValueChange={(v) => { setPage(1); setProvider(v as PaymentProviderName | 'all') }}>
                        <SelectTrigger className="w-32" aria-label="Filter by gateway">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All gateways</SelectItem>
                            <SelectItem value="sandbox">Sandbox</SelectItem>
                            <SelectItem value="stripe">Stripe</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
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
                        <StatTile label="Volume" value={formatMoney(s.volume, cur)} hint="Succeeded payments" icon={Banknote} />
                        <StatTile label="Platform fees" value={formatMoney(s.fees, cur)} icon={Percent} />
                        <StatTile label="Refunded" value={formatMoney(s.refunded, cur)} icon={RotateCcw} />
                        <StatTile
                            label="Gateway"
                            value={s.activeProvider === 'stripe' ? 'Stripe' : 'Sandbox'}
                            hint={s.activeProvider === 'sandbox' && !s.sandboxEnabled ? 'Sandbox disabled — checkouts refused' : `${s.open} open payments`}
                            icon={ShieldCheck}
                        />
                    </div>
                    {s.byCurrency.length > 1 && (
                        <p className="text-xs text-muted-foreground">
                            By currency:{' '}
                            {s.byCurrency.map((c) => `${formatMoney(c.volume, c.currency)} (fees ${formatMoney(c.fees, c.currency)})`).join(' · ')}
                        </p>
                    )}
                    <Card className="p-4">
                        <PaymentsTable
                            payments={data.records}
                            show="both"
                            onAction={handleAction}
                            busyId={busyId}
                            emptyText="No payments match these filters."
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
