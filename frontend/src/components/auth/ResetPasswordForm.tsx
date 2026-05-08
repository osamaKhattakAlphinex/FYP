'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Check } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ResetPasswordFormProps {
    onSubmit: (password: string, token: string) => Promise<void>
}

export default function ResetPasswordForm({ onSubmit }: ResetPasswordFormProps) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get('token') || ''

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({})

    if (!token) {
        return (
            <div className="space-y-6 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
                    <AlertCircle className="h-7 w-7" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-foreground">Invalid reset link</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        This password reset link is invalid or has expired.
                    </p>
                </div>
                <Button asChild className="w-full">
                    <Link href="/forgot-password">Request a new link</Link>
                </Button>
            </div>
        )
    }

    const validate = (): boolean => {
        const newErrors: { password?: string; confirmPassword?: string } = {}
        if (!password) newErrors.password = 'Password is required'
        else if (password.length < 8) newErrors.password = 'At least 8 characters'
        else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
            newErrors.password = 'Must contain uppercase, lowercase, and number'
        if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password'
        else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        setIsLoading(true)
        try {
            await onSubmit(password, token)
            setIsSuccess(true)
            setTimeout(() => router.push('/login'), 1800)
        } catch {
            setErrors({ password: 'Failed to reset password. Please try again.' })
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
                    <h3 className="text-xl font-semibold text-foreground">Password updated</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Redirecting to sign in…
                    </p>
                </div>
            </div>
        )
    }

    const requirements = [
        { ok: password.length >= 8, label: 'At least 8 characters' },
        { ok: /[A-Z]/.test(password), label: 'One uppercase letter' },
        { ok: /[a-z]/.test(password), label: 'One lowercase letter' },
        { ok: /\d/.test(password), label: 'One number' },
    ]

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <Label htmlFor="password">New password</Label>
                <div className="relative mt-1.5">
                    <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a strong password"
                        className={cn(errors.password ? 'border-destructive' : '', 'pr-10')}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                {errors.password && (
                    <p className="mt-1 text-xs text-destructive">{errors.password}</p>
                )}
            </div>

            <ul className="space-y-1 rounded-md border border-border bg-muted/40 p-3 text-xs">
                {requirements.map((r) => (
                    <li
                        key={r.label}
                        className={cn(
                            'flex items-center gap-2',
                            r.ok ? 'text-success' : 'text-muted-foreground'
                        )}
                    >
                        <Check className={cn('h-3.5 w-3.5', r.ok ? 'opacity-100' : 'opacity-30')} />
                        {r.label}
                    </li>
                ))}
            </ul>

            <div>
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <div className="relative mt-1.5">
                    <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className={cn(errors.confirmPassword ? 'border-destructive' : '', 'pr-10')}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                    >
                        {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                </div>
                {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-destructive">{errors.confirmPassword}</p>
                )}
            </div>

            <Button type="submit" disabled={isLoading} className="w-full" size="lg">
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Resetting…
                    </>
                ) : (
                    'Reset password'
                )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link href="/login" className="font-semibold text-brand-600 hover:underline">
                    Sign in
                </Link>
            </p>
        </form>
    )
}
