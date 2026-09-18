'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

import {
    Dialog,
    DialogBody,
    DialogCloseButton,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatMoney, paymentService } from '@/services/paymentService'
import { apiErrorMessage } from '@/lib/apiError'
import type { Payment } from '@/types/payment.types'

interface RefundPaymentModalProps {
    payment: Payment
    isOpen: boolean
    onClose: () => void
    onDone: (payment: Payment) => void
}

/** A refund always needs a reason: it is emailed to both parties and kept on the record. */
export default function RefundPaymentModal({ payment, isOpen, onClose, onDone }: RefundPaymentModalProps) {
    const [reason, setReason] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const valid = reason.trim().length >= 5

    const handleSubmit = async () => {
        try {
            setSubmitting(true)
            const updated = await paymentService.refund(payment.id, reason.trim())
            toast.success('Payment refunded')
            onDone(updated)
            onClose()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not refund this payment'))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !submitting) onClose() }}>
            <DialogContent size="md">
                <DialogHeader>
                    <div>
                        <DialogTitle>Refund {formatMoney(payment.amount, payment.currency)}</DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {payment.reference} · {payment.studentName ?? 'student'}
                        </p>
                    </div>
                    <DialogCloseButton />
                </DialogHeader>
                <DialogBody className="space-y-2">
                    <Label htmlFor="refund-reason">Reason</Label>
                    <Textarea
                        id="refund-reason"
                        rows={3}
                        maxLength={500}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Why is this payment being returned?"
                    />
                    <p className="text-xs text-muted-foreground">
                        The full amount goes back to the company. The student and the company are both emailed
                        this reason.
                    </p>
                </DialogBody>
                <DialogFooter>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Keep payment
                    </Button>
                    <Button variant="destructive" onClick={handleSubmit} disabled={submitting || !valid}>
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Refund
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
