'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import PaymentStatusBadge from '@/components/payments/PaymentStatusBadge'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { formatMoney, paymentService } from '@/services/paymentService'
import { apiErrorMessage } from '@/lib/apiError'
import type { PaymentReceipt } from '@/types/payment.types'

const formatDateTime = (iso?: string | null) =>
    iso
        ? new Date(iso).toLocaleString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '—'

/** A printable receipt, readable by the company, the student and an admin. */
export default function PaymentReceiptPage() {
    useRoleProtection({ allowedRoles: ['company', 'student', 'admin'] })
    const params = useParams()
    const router = useRouter()
    const paymentId = String(params.paymentId)
    const [receipt, setReceipt] = useState<PaymentReceipt | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            setReceipt(await paymentService.getReceipt(paymentId))
        } catch (err) {
            const message = apiErrorMessage(err, 'Could not load this receipt')
            setError(message)
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }, [paymentId])

    useEffect(() => {
        load()
    }, [load])

    if (loading) {
        return (
            <AppShell>
                <Skeleton className="h-96 w-full" />
            </AppShell>
        )
    }

    if (!receipt) {
        return (
            <AppShell>
                <Card className="p-8 text-center text-sm text-muted-foreground">{error || 'Receipt not found.'}</Card>
            </AppShell>
        )
    }

    const r = receipt
    const rows: Array<[string, string]> = [
        ['Paid by', r.company.name || '—'],
        ['Paid to', r.student.name || '—'],
        ['For', r.task.title || '—'],
        ['Type', r.kind === 'bonus' ? 'Bonus' : 'Stipend'],
        ['Date paid', formatDateTime(r.paidAt)],
        ['Payment method', r.card || (r.provider === 'stripe' ? 'Card via Stripe' : '—')],
        ['Gateway', r.provider === 'stripe' ? 'Stripe' : 'Sandbox (test mode — no real money)'],
    ]

    return (
        <AppShell>
            <div className="flex items-center justify-between gap-2 print:hidden">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button size="sm" variant="secondary" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" /> Print
                </Button>
            </div>

            <Card className="mx-auto w-full max-w-xl p-6 print:border-0 print:shadow-none">
                <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
                    <div>
                        <p className="text-lg font-bold">
                            <span className="text-brand-700">Nex</span>Intern
                        </p>
                        <p className="text-xs text-muted-foreground">Payment receipt</p>
                    </div>
                    <div className="text-right">
                        <p className="font-mono text-sm font-semibold">{r.reference}</p>
                        <PaymentStatusBadge status={r.status} />
                    </div>
                </div>

                <dl className="mt-4 space-y-2 text-sm">
                    {rows.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">{label}</dt>
                            <dd className="text-right font-medium text-foreground">{value}</dd>
                        </div>
                    ))}
                </dl>

                {r.description && <p className="mt-3 text-sm text-foreground">{r.description}</p>}

                <dl className="mt-5 space-y-1.5 border-t border-border pt-4 text-sm">
                    <div className="flex justify-between">
                        <dt>Amount</dt>
                        <dd className="font-semibold">{formatMoney(r.amount, r.currency)}</dd>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                        <dt>Platform fee ({r.feePercent}%)</dt>
                        <dd>− {formatMoney(r.platformFee, r.currency)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5 text-base font-bold">
                        <dt>Student receives</dt>
                        <dd>{formatMoney(r.netAmount, r.currency)}</dd>
                    </div>
                </dl>

                {r.status === 'refunded' && (
                    <div className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        Refunded to the company on {formatDateTime(r.refundedAt)}
                        {r.refundReason ? ` — ${r.refundReason}` : ''}
                    </div>
                )}

                <p className="mt-6 text-center text-[11px] text-muted-foreground">
                    Issued {formatDateTime(r.issuedAt)}. Card details are never stored by the platform.
                </p>
            </Card>
        </AppShell>
    )
}
