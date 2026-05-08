"use client";

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/auth/AuthLayout';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { authService } from '@/services/authService';

function ResetPasswordContent() {
    const router = useRouter();

    // Redirect if already logged in
    useEffect(() => {
        if (authService.isAuthenticated()) {
            const user = authService.getStoredUser();
            if (user) {
                const roleRoutes: Record<string, string> = {
                    student: '/student/dashboard',
                    company: '/company/dashboard',
                    mentor: '/mentor/students',
                    admin: '/admin/analytics'
                };
                router.push(roleRoutes[user.role] || '/student/dashboard');
            }
        }
    }, [router]);

    const handleResetPassword = async (password: string, token: string) => {
        try {
            await authService.resetPassword(token, password, password);
            router.push('/login?reset=success');
        } catch (err: any) {
            throw new Error(err.response?.data?.error || 'Failed to reset password');
        }
    };

    return (
        <AuthLayout
            title="Set a new password"
            subtitle="Choose a strong password to secure your account"
        >
            <ResetPasswordForm onSubmit={handleResetPassword} />
        </AuthLayout>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordContent />
        </Suspense>
    );
}
