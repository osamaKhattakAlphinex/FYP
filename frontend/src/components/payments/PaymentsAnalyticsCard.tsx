'use client'

import Link from 'next/link'

import AnalyticsCard from '@/components/analytics/AnalyticsCard'
import MonthlyBars from '@/components/analytics/MonthlyBars'
import { formatMoney } from '@/services/paymentService'
import type { AdminPaymentsAnalytics, CompanySpend, StudentEarnings } from '@/types/analytics.types'

type Props =
    | { variant: 'student'; data: StudentEarnings }
    | { variant: 'company'; data: CompanySpend }
    | { variant: 'admin'; data: AdminPaymentsAnalytics }

const Tile = ({ label, value }: { label: string; value: string | number }) => (
    <div className="rounded-md bg-muted/50 px-3 py-2">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
)

/**
 * Module 12's addition to the Module 11 dashboards: earnings (student), spend
 * (company) or platform payment volume (admin). Figures are in the primary
 * currency; other currencies are listed underneath, never summed together.
 */
export default function PaymentsAnalyticsCard(props: Props) {
    if (props.variant === 'student') {
        const d = props.data
        const cur = d.currency ?? undefined
        return (
            <AnalyticsCard
                title="Earnings"
                description="Net of the platform fee, from payments that went through."
                action={<Link href="/student/payments" className="text-xs font-medium text-brand-700 hover:underline">Payments</Link>}
                empty={d.payments === 0 && d.refunded === 0 && d.pending === 0}
                emptyText="Payments from companies for your internships will show up here."
            >
                <div className="grid grid-cols-3 gap-2">
                    <Tile label="Received" value={formatMoney(d.totalNet, cur)} />
                    <Tile label="In progress" value={formatMoney(d.pending, cur)} />
                    <Tile label="Refunded" value={formatMoney(d.refunded, cur)} />
                </div>
                <div className="mt-3">
                    <MonthlyBars data={d.byMonth} series={[{ key: 'net', label: `Received (${cur ?? ''})`, className: 'bg-emerald-500' }]} />
                </div>
                <OtherCurrencies items={d.byCurrency.filter((c) => c.currency !== d.currency).map((c) => formatMoney(c.totalNet, c.currency))} />
            </AnalyticsCard>
        )
    }

    if (props.variant === 'company') {
        const d = props.data
        const cur = d.currency ?? undefined
        return (
            <AnalyticsCard
                title="Intern payments"
                description="What you have paid your interns (gross), the platform fees and refunds."
                action={<Link href="/company/payments" className="text-xs font-medium text-brand-700 hover:underline">Payments</Link>}
                empty={d.payments === 0 && d.refunded === 0 && d.open === 0}
                emptyText="Pay an intern from their internship's Payments tab and the totals appear here."
            >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Tile label="Paid" value={formatMoney(d.totalPaid, cur)} />
                    <Tile label="Fees" value={formatMoney(d.totalFees, cur)} />
                    <Tile label="Refunded" value={formatMoney(d.refunded, cur)} />
                    <Tile label="Open" value={d.open} />
                </div>
                <div className="mt-3">
                    <MonthlyBars data={d.byMonth} series={[{ key: 'paid', label: `Paid (${cur ?? ''})`, className: 'bg-brand-500' }]} />
                </div>
                <OtherCurrencies items={d.byCurrency.filter((c) => c.currency !== d.currency).map((c) => formatMoney(c.totalPaid, c.currency))} />
            </AnalyticsCard>
        )
    }

    const d = props.data
    const cur = d.currency ?? undefined
    return (
        <AnalyticsCard
            title="Payments"
            description="Volume through the payment gateway and the platform fees earned."
            action={<Link href="/admin/payments" className="text-xs font-medium text-brand-700 hover:underline">All payments</Link>}
            empty={d.total === 0}
            emptyText="No payments have been made on the platform yet."
        >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Tile label="Volume" value={formatMoney(d.volume, cur)} />
                <Tile label="Fees" value={formatMoney(d.fees, cur)} />
                <Tile label="Refunded" value={formatMoney(d.refunded, cur)} />
                <Tile label="Payments" value={d.total} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
                {Object.entries(d.byStatus)
                    .filter(([, n]) => n > 0)
                    .map(([status, n]) => `${status} ${n}`)
                    .join(' · ') || 'No payments yet'}
                {Object.keys(d.byProvider).length > 0 &&
                    ` — via ${Object.entries(d.byProvider).map(([p, n]) => `${p} ${n}`).join(', ')}`}
            </p>
            <OtherCurrencies items={d.byCurrency.filter((c) => c.currency !== d.currency).map((c) => formatMoney(c.volume, c.currency))} />
        </AnalyticsCard>
    )
}

function OtherCurrencies({ items }: { items: string[] }) {
    if (items.length === 0) return null
    return <p className="mt-2 text-[11px] text-muted-foreground">Other currencies: {items.join(' · ')}</p>
}
