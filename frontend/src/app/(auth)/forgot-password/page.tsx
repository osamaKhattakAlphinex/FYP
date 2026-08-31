"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AuthLayout from '@/components/auth/AuthLayout';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { authService } from '@/services/authService';
import { homeForRole } from '@/lib/roleRoutes'

export default function ForgotPasswordPage() {
    const router = useRouter();

    // Redirect if already logged in
    useEffect(() => {
        if (authService.isAuthenticated()) {
            const user = authService.getStoredUser();
            if (user) {
                
                router.push(homeForRole(user.role));
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
