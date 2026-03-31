'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authService } from '@/services/authService';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
            router.push('/login?error=' + error);
            return;
        }

        if (token) {
            localStorage.setItem('token', token);

            // Fetch user data
            authService.getCurrentUser()
                .then((user) => {
                    localStorage.setItem('user', JSON.stringify(user));

                    // Redirect based on role
                    const roleRoutes = {
                        student: '/student/dashboard',
                        company: '/company/dashboard',
                        admin: '/admin/analytics'
                    };

                    router.push(roleRoutes[user.role] || '/student/dashboard');
                })
                .catch(() => {
                    router.push('/login?error=authentication_failed');
                });
        } else {
            router.push('/login');
        }
    }, [router, searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F8FAFC] to-[#EFF6FF]">
            <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-[#4F46E5] mx-auto mb-4" />
                <p className="text-[#64748B] text-lg">Authenticating...</p>
            </div>
        </div>
    );
}

export default function AuthCallback() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-[#4F46E5]" />
            </div>
        }>
            <CallbackContent />
        </Suspense>
    );
}
