'use client'

import { useState } from 'react'
import { Loader2, Lock, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PAYOUT_METHOD_LABELS, paymentService } from '@/services/paymentService'
import { apiErrorMessage } from '@/lib/apiError'
import type { PayoutMethod, PayoutMethodType } from '@/types/payment.types'

interface PayoutMethodFormProps {
    current: PayoutMethod | null
    onSaved: (method: PayoutMethod | null) => void
}

const ACCOUNT_HINT: Record<PayoutMethodType, { label: string; placeholder: string }> = {
    bank_transfer: { label: 'Account number or IBAN', placeholder: 'PK36 SCBL 0000 0011 2345 6702' },
    jazzcash: { label: 'JazzCash mobile number', placeholder: '03XX-XXXXXXX' },
    easypaisa: { label: 'Easypaisa mobile number', placeholder: '03XX-XXXXXXX' },
    paypal: { label: 'PayPal email', placeholder: 'you@example.com' },
}

/**
 * Where the student gets paid. After saving, only the masked form comes back
 * from the server (the full account is validated and then discarded), so the
 * form clears the account field and shows the masked value.
 */
export default function PayoutMethodForm({ current, onSaved }: PayoutMethodFormProps) {
    const [editing, setEditing] = useState(!current)
    const [method, setMethod] = useState<PayoutMethodType>(current?.method ?? 'bank_transfer')
    const [accountTitle, setAccountTitle] = useState(current?.accountTitle ?? '')
    const [account, setAccount] = useState('')
    const [bankName, setBankName] = useState(current?.bankName ?? '')
    const [saving, setSaving] = useState(false)

    const save = async () => {
        try {
            setSaving(true)
            const saved = await paymentService.savePayoutMethod({
                method,
                accountTitle: accountTitle.trim(),
                account: account.trim(),
                bankName: method === 'bank_transfer' ? bankName.trim() : undefined,
            })
            setAccount('')
            setEditing(false)
            toast.success('Payout details saved')
            onSaved(saved)
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not save your payout details'))
        } finally {
            setSaving(false)
        }
    }

    const remove = async () => {
        if (!window.confirm('Remove your payout details? Companies will not be able to pay you until you add them again.')) return
        try {
            setSaving(true)
            await paymentService.deletePayoutMethod()
            toast.success('Payout details removed')
            setEditing(true)
            onSaved(null)
        } catch (err) {
            toast.error(apiErrorMessage(err, 'Could not remove your payout details'))
        } finally {
            setSaving(false)
        }
    }

    if (current && !editing) {
        return (
            <Card className="p-4">
                <h2 className="text-sm font-semibold text-foreground">Payout details</h2>
                <dl className="mt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Method</dt>
                        <dd className="font-medium">{current.methodLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Account</dt>
                        <dd className="font-mono">{current.accountMasked}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Account title</dt>
                        <dd>{current.accountTitle}</dd>
                    </div>
                    {current.bankName && (
                        <div className="flex justify-between gap-2">
                            <dt className="text-muted-foreground">Bank</dt>
                            <dd>{current.bankName}</dd>
                        </div>
                    )}
                </dl>
                <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                        Change
                    </Button>
                    <Button size="sm" variant="ghost" onClick={remove} disabled={saving}>
                        <Trash2 className="h-4 w-4" /> Remove
                    </Button>
                </div>
            </Card>
        )
    }

    const hint = ACCOUNT_HINT[method]
    return (
        <Card className="p-4">
            <h2 className="text-sm font-semibold text-foreground">
                {current ? 'Change payout details' : 'Add payout details'}
            </h2>
            <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                We check the account format and keep only a masked version (e.g. •••• 4821). The full
                number is never stored.
            </p>
            <div className="mt-4 space-y-3">
                <div>
                    <Label htmlFor="payout-method">Method</Label>
                    <Select value={method} onValueChange={(v) => setMethod(v as PayoutMethodType)}>
                        <SelectTrigger id="payout-method" className="mt-1.5">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(Object.keys(PAYOUT_METHOD_LABELS) as PayoutMethodType[]).map((m) => (
                                <SelectItem key={m} value={m}>
                                    {PAYOUT_METHOD_LABELS[m]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="payout-title">Account title</Label>
                    <Input
                        id="payout-title"
                        value={accountTitle}
                        maxLength={150}
                        onChange={(e) => setAccountTitle(e.target.value)}
                        placeholder="Name on the account"
                        className="mt-1.5"
                    />
                </div>
                <div>
                    <Label htmlFor="payout-account">{hint.label}</Label>
                    <Input
                        id="payout-account"
                        value={account}
                        maxLength={320}
                        autoComplete="off"
                        onChange={(e) => setAccount(e.target.value)}
                        placeholder={hint.placeholder}
                        className="mt-1.5"
                    />
                </div>
                {method === 'bank_transfer' && (
                    <div>
                        <Label htmlFor="payout-bank">Bank name</Label>
                        <Input
                            id="payout-bank"
                            value={bankName}
                            maxLength={150}
                            onChange={(e) => setBankName(e.target.value)}
                            className="mt-1.5"
                        />
                    </div>
                )}
            </div>
            <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={save} disabled={saving || !account.trim() || accountTitle.trim().length < 2}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save
                </Button>
                {current && (
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                        Cancel
                    </Button>
                )}
            </div>
        </Card>
    )
}
