'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import OtpInput from './OtpInput'
import { Button } from '@/components/ui/button'

interface EmailVerificationFormProps {
    onResend: (email: string) => Promise<void>
    onVerify: (email: string, otp: string) => Promise<void>
}

export default function EmailVerificationForm({
    onResend,
    onVerify,
}: EmailVerificationFormProps) {
    const searchParams = useSearchParams()
    const email = searchParams.get('email') || ''

    const [isResending, setIsResending] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [resendSuccess, setResendSuccess] = useState(false)
    const [verificationStatus, setVerificationStatus] = useState<
        'pending' | 'success' | 'error'
    >('pending')
    const [errorMessage, setErrorMessage] = useState('')
    const [countdown, setCountdown] = useState(0)
    const [canResend, setCanResend] = useState(true)

    useEffect(() => {
        if (countdown > 0 && !canResend) {
            const t = setTimeout(() => setCountdown(countdown - 1), 1000)
            return () => clearTimeout(t)
        } else if (countdown === 0) {
            setCanResend(true)
        }
    }, [countdown, canResend])

    const handleOtpComplete = async (otp: string) => {
        if (!email) return
        setIsVerifying(true)
        setErrorMessage('')
        try {
            await onVerify(email, otp)
            setVerificationStatus('success')
        } catch {
            setVerificationStatus('error')
            setErrorMessage('Invalid or expired code. Please try again.')
        } finally {
            setIsVerifying(false)
        }
    }

    const handleResend = async () => {
        if (!email) {
            setErrorMessage('Email address is required')
            return
        }
        if (!canResend) return
        setIsResending(true)
        setErrorMessage('')
        setResendSuccess(false)
        try {
            await onResend(email)
            setResendSuccess(true)
            setCanResend(false)
            setCountdown(30)
            setTimeout(() => setResendSuccess(false), 3000)
        } catch (error: any) {
            setErrorMessage(error.message || 'Failed to resend code.')
        } finally {
            setIsResending(false)
        }
    }

    if (verificationStatus === 'success') {
        return (
            <div className="space-y-6 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success/10 text-success">
                    <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-foreground">Email verified</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        You're in. Redirecting to your dashboard…
                    </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-brand-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting…
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-700">
                    <Mail className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted-foreground">
                    {email ? (
                        <>
                            We've sent a 6-digit code to{' '}
                            <span className="font-semibold text-foreground">{email}</span>
                        </>
                    ) : (
                        'Check your email for the verification code.'
                    )}
                </p>
            </div>

            <OtpInput length={6} onComplete={handleOtpComplete} disabled={isVerifying} />

            {errorMessage && (
                <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-destructive" />
                    <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
            )}

            {isVerifying && (
                <div className="flex items-center gap-3 rounded-md border border-brand-200 bg-brand-50 px-3 py-2.5">
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-brand-600" />
                    <p className="text-sm text-brand-700">Verifying your code…</p>
                </div>
            )}

            {resendSuccess && (
                <div className="flex items-center gap-3 rounded-md border border-success/30 bg-success/5 px-3 py-2.5">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" />
                    <p className="text-sm text-success">Verification code sent.</p>
                </div>
            )}

            <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleResend}
                disabled={!canResend || isResending || !email}
            >
                {isResending ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                    </>
                ) : canResend ? (
                    <>
                        <RefreshCw className="h-4 w-4" /> Resend code
                    </>
                ) : (
                    <>
                        <RefreshCw className="h-4 w-4" /> Resend in {countdown}s
                    </>
                )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="font-medium text-brand-600 hover:underline">
                    Back to sign in
                </Link>
            </div>
        </div>
    )
}
