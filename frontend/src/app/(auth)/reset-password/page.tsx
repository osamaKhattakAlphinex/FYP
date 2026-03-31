"use client";

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/auth/AuthLayout';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { authService } from '@/services/authService';

function ResetPasswordContent() {
    const router = useRouter();

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
            title="Reset Password"
            subtitle="Create a new password for your account"
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
