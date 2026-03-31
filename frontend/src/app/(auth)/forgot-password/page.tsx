"use client";

import AuthLayout from '@/components/auth/AuthLayout';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import { authService } from '@/services/authService';

export default function ForgotPasswordPage() {
    const handleForgotPassword = async (email: string) => {
        try {
            await authService.forgotPassword(email);
        } catch (err: any) {
            throw new Error(err.response?.data?.error || 'Failed to send reset email');
        }
    };

    return (
        <AuthLayout
            title="Forgot Password?"
            subtitle="No worries, we'll help you reset it"
        >
            <ForgotPasswordForm onSubmit={handleForgotPassword} />
        </AuthLayout>
    );
}
