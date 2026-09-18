'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Plus, RefreshCw, ShieldCheck, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import CompensationSummary from './CompensationSummary'
import CreatePaymentModal from './CreatePaymentModal'
import PaymentsTable from './PaymentsTable'
import { usePaymentActions } from './usePaymentActions'
import { paymentService } from '@/services/paymentService'
import { apiErrorMessage } from '@/lib/apiError'
import type { InternshipPayments } from '@/types/payment.types'
import type { InternshipProgress, ProgressPerspective } from '@/types/progress.types'

interface PaymentsPanelProps {
    progress: InternshipProgress
    perspective: ProgressPerspective
    refreshKey?: number
}

/**
 * The Payments tab of the internship workspace (Module 12). Rendered only for
 * the company and the student — mentors never see compensation (the API
 * refuses them too). What each viewer can do comes from the API.
 */
export default function PaymentsPanel({ progress, perspective, refreshKey = 0 }: PaymentsPanelProps) {
    const [data, setData] = useState<InternshipPayments | null>(null)
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            setData(await paymentService.getForProgress(progress.id))
        } catch (err) {
            setData(null)
            toast.error(apiErrorMessage(err, 'Could not load payments'))
        } finally {
            setLoading(false)
        }
    }, [progress.id])

    useEffect(() => {
        load()
    }, [load, refreshKey])

    // Returning from a gateway: ?checkout=success|cancelled
    useEffect(() => {
        const outcome = new URLSearchParams(window.location.search).get('checkout')
        if (outcome === 'success') toast.success('Payment submitted — it will show as paid once the gateway confirms it')
        if (outcome === 'cancelled') toast('Checkout was cancelled — the payment is still open')
    }, [])

    const { busyId, handleAction, refundDialog } = usePaymentActions(load)

    if (loading && !data) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        )
    }

    if (!data) {
        return (
            <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">Payments could not be loaded.</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={load}>
                    <RefreshCw className="h-4 w-4" /> Try again
                </Button>
            </Card>
        )
    }

    const isCompany = perspective === 'company'
    const unpaid = data.compensation.budgetType === 'unpaid'
    const canCreate = data.permissions.canPay && !data.hasOpenPayment

    return (
        <div className="space-y-3">
            {unpaid ? (
                <Card className="p-5 text-sm text-muted-foreground">
                    This task is unpaid, so there is nothing to pay or receive on this internship.
                </Card>
            ) : (
                <CompensationSummary compensation={data.compensation} />
            )}

            {isCompany && !unpaid && !data.payoutMethodOnFile && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                        {data.studentName || 'The student'} has not added payout details yet. You can create a payment
                        now; checkout opens once they have, and we email them a reminder when you try.
                    </p>
                </div>
            )}

            {!isCompany && !unpaid && !data.payoutMethodOnFile && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <span>Add your payout details so the company can pay you.</span>
                    <Button asChild size="xs">
                        <Link href="/student/payments">
                            <Wallet /> Add payout details
                        </Link>
                    </Button>
                </div>
            )}

            <Card className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Payments</h3>
                        <p className="text-xs text-muted-foreground">
                            Every payment and status change is recorded for both of you.
                        </p>
                    </div>
                    {isCompany && !unpaid && (
                        <Button
                            size="sm"
                            onClick={() => setCreating(true)}
                            disabled={!canCreate}
                            title={
                                data.hasOpenPayment
                                    ? 'Finish or cancel the open payment first'
                                    : !data.permissions.canPay
                                      ? 'Payments open once the internship has started'
                                      : undefined
                            }
                        >
                            <Plus className="h-4 w-4" /> New payment
                        </Button>
                    )}
                </div>
                <PaymentsTable
                    payments={data.payments}
                    onAction={isCompany ? handleAction : undefined}
                    busyId={busyId}
                    emptyText={isCompany ? 'No payments yet. Create one to pay the student.' : 'No payments yet.'}
                />
                {isCompany && (
                    <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {data.provider === 'stripe'
                            ? 'Card details are entered on Stripe’s secure page and never reach this platform.'
                            : 'Sandbox mode: payments are simulated with test cards — no real money moves.'}
                    </p>
                )}
            </Card>

            {creating && (
                <CreatePaymentModal
                    progressId={progress.id}
                    studentName={data.studentName}
                    compensation={data.compensation}
                    isOpen
                    onClose={() => setCreating(false)}
                    onCreated={() => load()}
                />
            )}
            {refundDialog}
        </div>
    )
}
