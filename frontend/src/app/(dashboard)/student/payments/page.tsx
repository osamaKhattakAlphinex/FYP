'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock, RotateCcw, Wallet } from 'lucide-react'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import StatTile from '@/components/analytics/StatTile'
import PaymentsTable from '@/components/payments/PaymentsTable'
import PayoutMethodForm from '@/components/payments/PayoutMethodForm'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { formatMoney, paymentService } from '@/services/paymentService'
import { apiErrorMessage } from '@/lib/apiError'
import type { PayoutMethod, StudentPaymentList } from '@/types/payment.types'

export default function StudentPaymentsPage() {
    useRoleProtection({ allowedRoles: ['student'] })
    const [data, setData] = useState<StudentPaymentList | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            setData(await paymentService.listForStudent({ page }))
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not load your payments'))
        } finally {
            setLoading(false)
        }
    }, [page])

    useEffect(() => {
        load()
    }, [load])

    const onPayoutSaved = (method: PayoutMethod | null) =>
        setData((d) => (d ? { ...d, payoutMethod: method } : d))

    const s = data?.summary
    const others = s ? s.byCurrency.filter((c) => c.currency !== s.currency) : []

    return (
        <AppShell
            rightRail={
                data ? <PayoutMethodForm key={data.payoutMethod?.id ?? 'none'} current={data.payoutMethod} onSaved={onPayoutSaved} /> : undefined
            }
        >
            <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Payments</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    What companies have paid you for your internships, after the platform fee.
                </p>
            </div>

            {loading && !data ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <StatTile label="Received" value={formatMoney(s.totalReceivedNet, s.currency ?? undefined)} hint="Net of the platform fee" icon={Wallet} />
                        <StatTile label="In progress" value={formatMoney(s.pending, s.currency ?? undefined)} hint="Payments not yet completed" icon={Clock} />
                        <StatTile label="Refunded" value={formatMoney(s.totalRefunded, s.currency ?? undefined)} hint="Returned to the company" icon={RotateCcw} />
                    </div>
                    {others.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            Also received:{' '}
                            {others.map((c) => formatMoney(c.receivedNet, c.currency)).join(' · ')}
                        </p>
                    )}

                    {/* On small screens the right rail is hidden, so the form goes inline. */}
                    <div className="md:hidden">
                        <PayoutMethodForm key={data.payoutMethod?.id ?? 'none'} current={data.payoutMethod} onSaved={onPayoutSaved} />
                    </div>

                    <Card className="p-4">
                        <h2 className="mb-3 text-sm font-semibold text-foreground">History</h2>
                        <PaymentsTable
                            payments={data.records}
                            show="company"
                            emptyText="No payments yet. They appear here when a company pays you for an internship."
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
                </>
            ) : null}
        </AppShell>
    )
}
