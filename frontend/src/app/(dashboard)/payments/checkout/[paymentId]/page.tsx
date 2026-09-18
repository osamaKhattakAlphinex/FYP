'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, CheckCircle2, CreditCard, Loader2, Lock, Receipt, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

import AppShell from '@/components/shared/AppShell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import PaymentStatusBadge from '@/components/payments/PaymentStatusBadge'
import { useRoleProtection } from '@/hooks/useRoleProtection'
import { formatMoney, paymentService, SANDBOX_TEST_CARDS } from '@/services/paymentService'
import { apiErrorMessage } from '@/lib/apiError'
import type { Payment } from '@/types/payment.types'

const EMPTY_CARD = { cardNumber: '', expMonth: '', expYear: '', cvc: '', cardholderName: '' }

// "4242424242424242" → "4242 4242 4242 4242" while typing.
const groupDigits = (value: string) =>
    value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ')

/**
 * The sandbox "hosted checkout" page. It stands in for Stripe's hosted page in
 * development and demos: the card goes once to POST /payments/:id/sandbox/confirm,
 * where it is checked in memory and only the brand and last four digits are
 * kept. The card is cleared from this page's state as soon as it is sent.
 */
export default function SandboxCheckoutPage() {
    useRoleProtection({ allowedRoles: ['company'] })
    const params = useParams()
    const paymentId = String(params.paymentId)

    const [payment, setPayment] = useState<Payment | null>(null)
    const [loading, setLoading] = useState(true)
    const [card, setCard] = useState(EMPTY_CARD)
    const [submitting, setSubmitting] = useState(false)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            setPayment(await paymentService.get(paymentId))
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not load this payment'))
        } finally {
            setLoading(false)
        }
    }, [paymentId])

    useEffect(() => {
        load()
    }, [load])

    const backHref = payment?.progressId
        ? `/company/progress/${payment.progressId}?tab=payments`
        : '/company/payments'

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        const sent = { ...card, cardNumber: card.cardNumber.replace(/\s/g, '') }
        try {
            setSubmitting(true)
            const result = await paymentService.confirmSandbox(paymentId, sent)
            setCard(EMPTY_CARD)
            setPayment(result)
            if (result.status === 'succeeded') toast.success('Payment successful')
            else toast.error(result.failureReason || 'Payment failed')
        } catch (err) {
            // Invalid card data: the payment is unchanged, so let them fix it.
            toast.error(apiErrorMessage(err, 'The card could not be charged'))
            setCard((c) => ({ ...c, cvc: '' }))
        } finally {
            setSubmitting(false)
        }
    }

    const set = (key: keyof typeof EMPTY_CARD) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setCard((c) => ({ ...c, [key]: key === 'cardNumber' ? groupDigits(e.target.value) : e.target.value }))

    if (loading) {
        return (
            <AppShell>
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-80 w-full" />
            </AppShell>
        )
    }

    if (!payment) {
        return (
            <AppShell>
                <Card className="p-8 text-center text-sm text-muted-foreground">
                    This payment could not be found.
                    <div className="mt-3">
                        <Button asChild size="sm" variant="secondary">
                            <Link href="/company/payments">Back to payments</Link>
                        </Button>
                    </div>
                </Card>
            </AppShell>
        )
    }

    const canPay = payment.status === 'processing' && payment.provider === 'sandbox' && payment.permissions.canConfirmSandbox

    return (
        <AppShell>
            <Button asChild variant="ghost" size="sm" className="self-start">
                <Link href={backHref}>
                    <ArrowLeft className="h-4 w-4" /> Back to the internship
                </Link>
            </Button>

            <div className="mx-auto w-full max-w-lg space-y-3">
                {payment.provider === 'sandbox' && (
                    <div className="flex items-start gap-2 rounded-md border-2 border-dashed border-amber-400 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>
                            <span className="font-semibold">Sandbox — no real money moves.</span> Use one of the test
                            cards below. Never enter a real card here.
                        </p>
                    </div>
                )}

                <Card className="p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">{payment.reference}</p>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                {formatMoney(payment.amount, payment.currency)}
                            </h1>
                            <p className="mt-0.5 truncate text-sm text-muted-foreground">
                                {payment.kind === 'bonus' ? 'Bonus' : 'Stipend'} to {payment.studentName ?? 'the student'}
                                {payment.taskTitle ? ` · ${payment.taskTitle}` : ''}
                            </p>
                        </div>
                        <PaymentStatusBadge status={payment.status} />
                    </div>

                    {payment.status === 'succeeded' && (
                        <div className="mt-4 rounded-md bg-emerald-50 p-4 text-sm text-emerald-900">
                            <p className="flex items-center gap-1.5 font-semibold">
                                <CheckCircle2 className="h-4 w-4" /> Payment successful
                            </p>
                            <p className="mt-1">
                                {payment.cardBrand} •••• {payment.cardLast4} was charged. The student receives{' '}
                                {formatMoney(payment.netAmount, payment.currency)} after the platform fee.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button asChild size="sm">
                                    <Link href={`/payments/receipt/${payment.id}`}>
                                        <Receipt className="h-4 w-4" /> View receipt
                                    </Link>
                                </Button>
                                <Button asChild size="sm" variant="secondary">
                                    <Link href={backHref}>Back to the internship</Link>
                                </Button>
                            </div>
                        </div>
                    )}

                    {payment.status === 'failed' && (
                        <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-900">
                            <p className="flex items-center gap-1.5 font-semibold">
                                <XCircle className="h-4 w-4" /> Payment failed
                            </p>
                            <p className="mt-1">{payment.failureReason}</p>
                            <p className="mt-1 text-xs">No money was taken. Create a new payment to try another card.</p>
                            <Button asChild size="sm" variant="secondary" className="mt-3">
                                <Link href={backHref}>Back to the internship</Link>
                            </Button>
                        </div>
                    )}

                    {payment.status === 'processing' && payment.provider === 'stripe' && payment.checkoutUrl && (
                        <Button asChild className="mt-4 w-full">
                            <a href={payment.checkoutUrl}>Continue to Stripe checkout</a>
                        </Button>
                    )}

                    {!canPay && !['succeeded', 'failed'].includes(payment.status) && payment.provider !== 'stripe' && (
                        <p className="mt-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                            This payment is {payment.status} and cannot be paid here.
                        </p>
                    )}

                    {canPay && (
                        <form onSubmit={submit} className="mt-5 space-y-3" autoComplete="off">
                            <div>
                                <Label htmlFor="cc-number">Card number</Label>
                                <Input
                                    id="cc-number"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    value={card.cardNumber}
                                    onChange={set('cardNumber')}
                                    placeholder="4242 4242 4242 4242"
                                    className="mt-1.5 font-mono"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <Label htmlFor="cc-month">Month</Label>
                                    <Input id="cc-month" inputMode="numeric" maxLength={2} autoComplete="off" value={card.expMonth} onChange={set('expMonth')} placeholder="MM" className="mt-1.5" />
                                </div>
                                <div>
                                    <Label htmlFor="cc-year">Year</Label>
                                    <Input id="cc-year" inputMode="numeric" maxLength={4} autoComplete="off" value={card.expYear} onChange={set('expYear')} placeholder="YY" className="mt-1.5" />
                                </div>
                                <div>
                                    <Label htmlFor="cc-cvc">CVC</Label>
                                    <Input id="cc-cvc" inputMode="numeric" maxLength={4} autoComplete="off" type="password" value={card.cvc} onChange={set('cvc')} placeholder="123" className="mt-1.5" />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="cc-name">Name on card</Label>
                                <Input id="cc-name" autoComplete="off" value={card.cardholderName} onChange={set('cardholderName')} className="mt-1.5" />
                            </div>
                            <Button type="submit" className="w-full" disabled={submitting}>
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                                Pay {formatMoney(payment.amount, payment.currency)}
                            </Button>
                            <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                                <Lock className="h-3 w-3" /> Only the card brand and last four digits are kept.
                            </p>
                        </form>
                    )}
                </Card>

                {canPay && (
                    <Card className="p-4">
                        <h2 className="text-sm font-semibold text-foreground">Test cards</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Any future expiry date, any 3-digit CVC and any name. Any other valid card number succeeds.
                        </p>
                        <ul className="mt-2 space-y-1 text-sm">
                            {SANDBOX_TEST_CARDS.map((c) => (
                                <li key={c.number} className="flex items-center justify-between gap-2">
                                    <button
                                        type="button"
                                        className="font-mono text-brand-700 hover:underline"
                                        onClick={() => setCard((prev) => ({ ...prev, cardNumber: c.number }))}
                                    >
                                        {c.number}
                                    </button>
                                    <span className="text-xs text-muted-foreground">{c.outcome}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}
            </div>
        </AppShell>
    )
}
