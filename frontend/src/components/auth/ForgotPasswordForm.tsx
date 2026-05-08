'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface ForgotPasswordFormProps {
    onSubmit: (email: string) => Promise<void>
}

export default function ForgotPasswordForm({ onSubmit }: ForgotPasswordFormProps) {
    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState('')

    const validate = (): boolean => {
        if (!email) return setError('Email is required'), false
        if (!/\S+@\S+\.\S+/.test(email)) return setError('Email is invalid'), false
        setError('')
        return true
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setIsLoading(true)
        try {
            await onSubmit(email)
            setIsSuccess(true)
        } catch {
            setError('Failed to send reset email. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="space-y-6 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/10 text-success">
                    <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-foreground">Check your email</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        We sent a password reset link to{' '}
                        <span className="font-semibold text-foreground">{email}</span>
                    </p>
                </div>
                <div className="space-y-2">
                    <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => {
                            setIsSuccess(false)
                            setEmail('')
                        }}
                    >
                        Try another email
                    </Button>
                    <Button asChild className="w-full">
                        <Link href="/login">Back to sign in</Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm text-muted-foreground">
                Enter your email address and we'll send you a link to reset your password.
            </p>

            <div>
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={error ? 'mt-1.5 border-destructive' : 'mt-1.5'}
                />
                {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full" size="lg">
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                    </>
                ) : (
                    'Send reset link'
                )}
            </Button>

            <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
            >
                <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
        </form>
    )
}
