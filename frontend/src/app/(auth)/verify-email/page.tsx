"use client";

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/auth/AuthLayout';
import EmailVerificationForm from '@/components/auth/EmailVerificationForm';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

function EmailVerificationContent() {
    const router = useRouter();
    const { refreshUser } = useAuth();

    // Redirect if already logged in and verified
    useEffect(() => {
        if (authService.isAuthenticated()) {
            const user = authService.getStoredUser();
            if (user && user.isEmailVerified) {
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

    const handleResendEmail = async (email: string): Promise<void> => {
        try {
            await authService.sendOTP(email);
            toast.success('Verification code sent to your email');
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || 'Failed to resend OTP';
            toast.error(errorMessage);
            console.error('Resend OTP error:', err);
            return;
        }
    };

    const handleVerifyEmail = async (email: string, otp: string): Promise<void> => {
        try {
            const data = await authService.verifyOTP(email, otp);

            // Update AuthContext with the new user data
            await refreshUser();

            toast.success('Email verified successfully!');

            // Redirect based on role
            const roleRoutes: Record<string, string> = {
                student: '/student/dashboard',
                company: '/company/dashboard',
                admin: '/admin/analytics'
            };

            router.push(roleRoutes[data.user.role] || '/student/dashboard');
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || 'Invalid OTP';
            toast.error(errorMessage);
            console.error('Verify OTP error:', err);
            return;
        }
    };

    return (
        <AuthLayout
            title="Verify your email"
            subtitle="One last step before you're in"
        >
            <EmailVerificationForm
                onResend={handleResendEmail}
                onVerify={handleVerifyEmail}
            />
        </AuthLayout>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <EmailVerificationContent />
        </Suspense>
    );
}
