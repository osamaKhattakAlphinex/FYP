'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { authService } from '@/services/authService'

function LoadingScreen({ label }: { label: string }) {
    return (
        <div className="surface-canvas grid min-h-screen place-items-center">
            <div className="text-center">
                <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-brand-600" />
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
            </div>
        </div>
    )
}

function CallbackContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const token = searchParams.get('token')
        const error = searchParams.get('error')

        if (error) {
            router.push('/login?error=' + error)
            return
        }

        if (token) {
            localStorage.setItem('token', token)
            authService
                .getCurrentUser()
                .then((user) => {
                    localStorage.setItem('user', JSON.stringify(user))
                    const routes = {
                        student: '/student/dashboard',
                        company: '/company/dashboard',
                        admin: '/admin/analytics',
                    } as Record<string, string>
                    router.push(routes[user.role] || '/student/dashboard')
                })
                .catch(() => router.push('/login?error=authentication_failed'))
        } else {
            router.push('/login')
        }
    }, [router, searchParams])

    return <LoadingScreen label="Signing you in…" />
}

export default function AuthCallback() {
    return (
        <Suspense fallback={<LoadingScreen label="Loading…" />}>
            <CallbackContent />
        </Suspense>
    )
}
