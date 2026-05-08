"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AuthLayout from '@/components/auth/AuthLayout';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { authService } from '@/services/authService';

export default function ForgotPasswordPage() {
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

    const handleForgotPassword = async (email: string) => {
        try {
            await authService.forgotPassword(email);
        } catch (err: any) {
            throw new Error(err.response?.data?.error || 'Failed to send reset email');
        }
    };

    return (
        <AuthLayout
            title="Forgot password?"
            subtitle="We'll email you a reset link"
        >
            <ForgotPasswordForm onSubmit={handleForgotPassword} />
        </AuthLayout>
    );
}
