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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatMoney, paymentService, previewFee } from '@/services/paymentService'
import { apiErrorMessage } from '@/lib/apiError'
import type { Compensation, Payment, PaymentKind } from '@/types/payment.types'

interface CreatePaymentModalProps {
    progressId: string
    studentName: string | null
    compensation: Compensation
    isOpen: boolean
    onClose: () => void
    onCreated: (payment: Payment) => void
}

/**
 * Creates a pending payment. The amount starts at what is still outstanding
 * under the agreement; the server re-checks the cap, the limits and the
 * one-open-payment rule, so this form only guides.
 */
export default function CreatePaymentModal({
    progressId,
    studentName,
    compensation,
    isOpen,
    onClose,
    onCreated,
}: CreatePaymentModalProps) {
    const outstanding = compensation.outstanding
    const [kind, setKind] = useState<PaymentKind>(outstanding === 0 ? 'bonus' : 'stipend')
    const [amount, setAmount] = useState(outstanding && outstanding > 0 ? String(outstanding) : '')
    const [description, setDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const value = Number(amount)
    const valid = amount !== '' && !Number.isNaN(value) && value >= 1 && value <= 1_000_000
    const fee = valid ? previewFee(value, compensation.feePercent) : null
    const overCap = kind === 'stipend' && outstanding != null && valid && value > outstanding

    const handleSubmit = async () => {
        if (!valid) {
            toast.error('Enter an amount between 1 and 1,000,000')
            return
        }
        try {
            setSubmitting(true)
            const payment = await paymentService.create(progressId, {
                amount: value,
                kind,
                description: description.trim() || undefined,
            })
            toast.success('Payment created')
            onCreated(payment)
            onClose()
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not create the payment'))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !submitting) onClose() }}>
            <DialogContent size="md">
                <DialogHeader>
                    <div>
                        <DialogTitle>Pay {studentName || 'the student'}</DialogTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Outstanding under the agreement:{' '}
                            {formatMoney(outstanding, compensation.currency)}
                        </p>
                    </div>
                    <DialogCloseButton />
                </DialogHeader>

                <DialogBody className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="pay-kind">Type</Label>
                            <Select value={kind} onValueChange={(v) => setKind(v as PaymentKind)}>
                                <SelectTrigger id="pay-kind" className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="stipend">Stipend</SelectItem>
                                    <SelectItem value="bonus">Bonus</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="pay-amount">Amount ({compensation.currency})</Label>
                            <Input
                                id="pay-amount"
                                type="number"
                                inputMode="decimal"
                                min={1}
                                max={1000000}
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                    {overCap && (
                        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            This is more than the outstanding stipend. Pay the rest as a bonus instead.
                        </p>
                    )}

                    <div>
                        <Label htmlFor="pay-desc">
                            Note <span className="font-normal text-muted-foreground">(optional, shown on the receipt)</span>
                        </Label>
                        <Textarea
                            id="pay-desc"
                            rows={2}
                            maxLength={500}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g. First two milestones"
                            className="mt-1.5"
                        />
                    </div>

                    {fee && (
                        <dl className="space-y-1 rounded-md bg-muted px-3 py-2 text-xs">
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">You pay</dt>
                                <dd className="font-medium">{formatMoney(value, compensation.currency)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-muted-foreground">Platform fee ({compensation.feePercent}%)</dt>
                                <dd>{formatMoney(fee.platformFee, compensation.currency)}</dd>
                            </div>
                            <div className="flex justify-between font-semibold">
                                <dt>Student receives</dt>
                                <dd>{formatMoney(fee.netAmount, compensation.currency)}</dd>
                            </div>
                        </dl>
                    )}
                </DialogBody>

                <DialogFooter>
                    <Button variant="secondary" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || !valid}>
                        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Create payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
