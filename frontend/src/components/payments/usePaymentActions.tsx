'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

import RefundPaymentModal from './RefundPaymentModal'
import { paymentService } from '@/services/paymentService'
import { apiErrorMessage } from '@/lib/apiError'
import type { Payment } from '@/types/payment.types'
import type { PaymentAction } from './PaymentsTable'

/**
 * Checkout / cancel / refund, shared by the internship Payments tab and the
 * company and admin payment pages. Returns the handler for PaymentsTable and
 * the refund dialog to render.
 */
export function usePaymentActions(onChanged: () => void) {
    const router = useRouter()
    const [busyId, setBusyId] = useState<string | null>(null)
    const [refundTarget, setRefundTarget] = useState<Payment | null>(null)

    const handleAction = useCallback(
        async (action: PaymentAction, payment: Payment) => {
            if (action === 'refund') {
                setRefundTarget(payment)
                return
            }
            if (action === 'cancel' && !window.confirm(`Cancel payment ${payment.reference}?`)) return

            try {
                setBusyId(String(payment.id))
                if (action === 'checkout') {
                    const result = await paymentService.checkout(payment.id)
                    if (result.provider === 'sandbox') {
                        router.push(`/payments/checkout/${payment.id}`)
                    } else if (/^https:\/\//.test(result.checkoutUrl)) {
                        // Stripe's hosted page: card details are typed there, never here.
                        window.location.assign(result.checkoutUrl)
                    } else {
                        toast.error('The payment gateway returned an invalid checkout link')
                    }
                    return
                }
                await paymentService.cancel(payment.id)
                toast.success('Payment cancelled')
                onChanged()
            } catch (err) {
                toast.error(apiErrorMessage(err, action === 'checkout' ? 'Could not start checkout' : 'Could not cancel'))
                onChanged()
            } finally {
                setBusyId(null)
            }
        },
        [onChanged, router],
    )

    const refundDialog = refundTarget ? (
        <RefundPaymentModal
            payment={refundTarget}
            isOpen
            onClose={() => setRefundTarget(null)}
            onDone={() => onChanged()}
        />
    ) : null

    return { busyId, handleAction, refundDialog }
}
