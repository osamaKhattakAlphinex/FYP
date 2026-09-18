'use client'

import Link from 'next/link'
import { CreditCard, Receipt, Undo2, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import PaymentStatusBadge from './PaymentStatusBadge'
import { formatMoney } from '@/services/paymentService'
import type { Payment } from '@/types/payment.types'

export type PaymentAction = 'checkout' | 'cancel' | 'refund'

interface PaymentsTableProps {
    payments: Payment[]
    /** Which counterpart column to show. */
    show?: 'student' | 'company' | 'both' | 'none'
    /** Omit to render read-only. Buttons follow each payment's `permissions`. */
    onAction?: (action: PaymentAction, payment: Payment) => void
    busyId?: string | null
    emptyText?: string
}

const formatDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

/**
 * A ledger of payments. Plain markup (no table library) that collapses to
 * stacked rows on small screens. Actions render only when the API says the
 * viewer may take them.
 */
export default function PaymentsTable({
    payments,
    show = 'none',
    onAction,
    busyId,
    emptyText = 'No payments yet.',
}: PaymentsTableProps) {
    if (payments.length === 0) {
        return (
            <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
                {emptyText}
            </p>
        )
    }

    return (
        <ul className="divide-y divide-border rounded-md border border-border">
            {payments.map((p) => {
                const busy = busyId === String(p.id)
                const counterpart =
                    show === 'student'
                        ? p.studentName
                        : show === 'company'
                          ? p.companyName
                          : show === 'both'
                            ? `${p.companyName ?? '—'} → ${p.studentName ?? '—'}`
                            : null
                return (
                    <li key={p.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">
                                    {formatMoney(p.amount, p.currency)}
                                </span>
                                <PaymentStatusBadge status={p.status} />
                                <span className="text-xs capitalize text-muted-foreground">{p.kind}</span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {p.reference}
                                {counterpart ? ` · ${counterpart}` : ''}
                                {p.taskTitle ? ` · ${p.taskTitle}` : ''}
                                {` · ${formatDate(p.paidAt || p.createdAt)}`}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                Fee {formatMoney(p.platformFee, p.currency)} · student receives{' '}
                                {formatMoney(p.netAmount, p.currency)}
                                {p.cardLast4 ? ` · ${p.cardBrand} •••• ${p.cardLast4}` : ''}
                            </p>
                            {p.description && (
                                <p className="mt-0.5 text-xs text-foreground">{p.description}</p>
                            )}
                            {p.status === 'failed' && p.failureReason && (
                                <p className="mt-0.5 text-xs text-destructive">{p.failureReason}</p>
                            )}
                            {p.status === 'refunded' && p.refundReason && (
                                <p className="mt-0.5 text-xs text-amber-700">Refunded: {p.refundReason}</p>
                            )}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1.5">
                            {onAction && p.permissions?.canCheckout && (
                                <Button size="xs" disabled={busy} onClick={() => onAction('checkout', p)}>
                                    <CreditCard /> {p.status === 'processing' ? 'Resume checkout' : 'Pay now'}
                                </Button>
                            )}
                            {onAction && p.permissions?.canCancel && (
                                <Button size="xs" variant="ghost" disabled={busy} onClick={() => onAction('cancel', p)}>
                                    <XCircle /> Cancel
                                </Button>
                            )}
                            {onAction && p.permissions?.canRefund && (
                                <Button size="xs" variant="secondary" disabled={busy} onClick={() => onAction('refund', p)}>
                                    <Undo2 /> Refund
                                </Button>
                            )}
                            {p.permissions?.canViewReceipt && (
                                <Button asChild size="xs" variant="ghost">
                                    <Link href={`/payments/receipt/${p.id}`}>
                                        <Receipt /> Receipt
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}
