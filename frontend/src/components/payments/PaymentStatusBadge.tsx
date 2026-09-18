'use client'

import { Badge } from '@/components/ui/badge'
import { PAYMENT_STATUS_LABELS } from '@/services/paymentService'
import type { PaymentStatus } from '@/types/payment.types'

const VARIANT: Record<PaymentStatus, 'muted' | 'soft' | 'success' | 'destructive' | 'warning' | 'outline'> = {
    pending: 'muted',
    processing: 'soft',
    succeeded: 'success',
    failed: 'destructive',
    cancelled: 'outline',
    refunded: 'warning',
}

export default function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
    return <Badge variant={VARIANT[status] ?? 'muted'}>{PAYMENT_STATUS_LABELS[status] ?? status}</Badge>
}
