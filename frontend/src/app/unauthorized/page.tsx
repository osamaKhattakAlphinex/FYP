'use client'

import { useRouter } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { authService } from '@/services/authService'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function UnauthorizedPage() {
    const router = useRouter()

    const handleGoBack = () => {
        const user = authService.getStoredUser()
        if (user) {
            const routes: Record<string, string> = {
                student: '/student/dashboard',
                company: '/company/dashboard',
                admin: '/admin/analytics',
            }
            router.push(routes[user.role] || '/')
        } else {
            router.push('/login')
        }
    }

    return (
        <div className="surface-canvas grid min-h-screen place-items-center px-4">
            <Card className="w-full max-w-md p-8 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive">
                    <ShieldAlert className="h-6 w-6" />
                </div>
                <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground">
                    Access denied
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                    You don't have permission to access this page. This area is restricted to
                    specific user roles.
                </p>
                <div className="mt-6 space-y-2">
                    <Button onClick={handleGoBack} className="w-full" size="lg">
                        Go to dashboard
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => router.back()}
                        className="w-full"
                    >
                        Back
                    </Button>
                </div>
            </Card>
        </div>
    )
}
