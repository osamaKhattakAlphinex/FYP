'use client'

import { Card } from '@/components/ui/card'
import { formatMoney } from '@/services/paymentService'
import type { Compensation } from '@/types/payment.types'

/**
 * What was agreed for the internship and how much of it has been paid. The
 * numbers come from the API (suggestCompensation + the payments ledger); this
 * component only lays them out.
 */
export default function CompensationSummary({ compensation }: { compensation: Compensation }) {
    const c = compensation
    const basis =
        c.budgetType === 'hourly'
            ? c.hourlyRate != null
                ? `${formatMoney(c.hourlyRate, c.currency)}/h × ${c.hoursLogged} h logged`
                : 'Hourly rate not set'
            : c.budgetType === 'fixed'
              ? 'Fixed price (the student’s proposed rate, else the task budget)'
              : 'This task is unpaid'

    const rows: Array<{ label: string; value: string; strong?: boolean }> = [
        { label: 'Agreed compensation', value: formatMoney(c.agreedAmount, c.currency) },
        { label: 'Paid to date', value: formatMoney(c.paidToDate, c.currency) },
        { label: 'Outstanding', value: formatMoney(c.outstanding, c.currency), strong: true },
    ]

    return (
        <Card className="p-4">
            <h3 className="text-sm font-semibold text-foreground">Compensation</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{basis}</p>
            <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {rows.map((r) => (
                    <div key={r.label} className="rounded-md bg-muted/50 px-3 py-2">
                        <dt className="text-[11px] font-medium text-muted-foreground">{r.label}</dt>
                        <dd className={r.strong ? 'text-base font-bold text-foreground' : 'text-sm font-semibold text-foreground'}>
                            {r.value}
                        </dd>
                    </div>
                ))}
            </dl>
            <p className="mt-2 text-[11px] text-muted-foreground">
                A {c.feePercent}% platform fee is deducted from each payout. Bonuses are paid on top of the agreed amount.
            </p>
        </Card>
    )
}
