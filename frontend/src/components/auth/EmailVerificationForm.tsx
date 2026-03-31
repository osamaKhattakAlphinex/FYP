"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import OtpInput from './OtpInput';

interface EmailVerificationFormProps {
    onResend: (email: string) => Promise<void>;
    onVerify: (email: string, otp: string) => Promise<void>;
}

export default function EmailVerificationForm({ onResend, onVerify }: EmailVerificationFormProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const email = searchParams.get('email') || '';

    const [isResending, setIsResending] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');
    const [errorMessage, setErrorMessage] = useState('');
    const [countdown, setCountdown] = useState(0); // Start at 0 to allow immediate resend
    const [canResend, setCanResend] = useState(true); // Allow resend initially

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0 && !canResend) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0) {
            setCanResend(true);
        }
    }, [countdown, canResend]);

    const handleOtpComplete = async (otp: string) => {
        if (!email) return;

        setIsVerifying(true);
        setErrorMessage('');

        try {
            await onVerify(email, otp);
            setVerificationStatus('success');
            // Don't redirect here - parent component handles redirect to dashboard
        } catch (error) {
            setVerificationStatus('error');
            setErrorMessage('Invalid or expired OTP. Please try again.');
            console.error('Verification error:', error);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResend = async () => {
        if (!email) {
            setErrorMessage('Email address is required');
            return;
        }

        if (!canResend) return;

        setIsResending(true);
        setErrorMessage('');
        setResendSuccess(false);

        try {
            await onResend(email);
            setResendSuccess(true);
            setCanResend(false);
            setCountdown(30); // Reset to 30 seconds

            setTimeout(() => setResendSuccess(false), 3000);
        } catch (error: any) {
            setErrorMessage(error.message || 'Failed to resend OTP. Please try again.');
            console.error('Resend error:', error);
        } finally {
            setIsResending(false);
        }
    };

    // Verification success
    if (verificationStatus === 'success') {
        return (
            <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#DCFCE7] rounded-full">
                    <CheckCircle className="w-8 h-8 text-[#16A34A]" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-[#0F172A] mb-2">
                        Email Verified Successfully
                    </h3>
                    <p className="text-[#64748B] leading-relaxed">
                        Your email has been verified. Redirecting to your dashboard...
                    </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-[#4F46E5]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Redirecting...</span>
                </div>
            </div>
        );
    }

    // Default verification pending state with OTP input
    return (
        <div className="space-y-6">
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#EEF2FF] rounded-full mb-4">
                    <Mail className="w-8 h-8 text-[#4F46E5]" />
                </div>
                <p className="text-[#64748B] leading-relaxed mb-2">
                    {email ? (
                        <>
                            We've sent a 6-digit verification code to{' '}
                            <span className="font-semibold text-[#0F172A]">{email}</span>
                        </>
                    ) : (
                        'Please check your email for the verification code.'
                    )}
                </p>
                <p className="text-sm text-[#94A3B8]">
                    Enter the code below to verify your email
                </p>
            </div>

            {/* OTP Input */}
            <div className="py-4">
                <OtpInput
                    length={6}
                    onComplete={handleOtpComplete}
                    disabled={isVerifying}
                />
            </div>

            {/* Error Message */}
            {errorMessage && (
                <div className="bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0" />
                    <p className="text-sm text-[#991B1B]">{errorMessage}</p>
                </div>
            )}

            {/* Verifying State */}
            {isVerifying && (
                <div className="bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg p-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-[#4F46E5] animate-spin flex-shrink-0" />
                    <p className="text-sm text-[#4338CA]">Verifying your code...</p>
                </div>
            )}

            {/* Resend Success Message */}
            {resendSuccess && (
                <div className="bg-[#DCFCE7] border border-[#86EFAC] rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-[#16A34A] flex-shrink-0" />
                    <p className="text-sm text-[#166534]">
                        Verification code sent successfully!
                    </p>
                </div>
            )}

            {/* Instructions */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4">
                <p className="text-sm font-semibold text-[#0F172A] mb-2">Didn't receive the code?</p>
                <ul className="space-y-1.5 text-sm text-[#64748B] list-disc list-inside">
                    <li>Check your spam or junk folder</li>
                    <li>Make sure the email address is correct</li>
                    {!canResend && <li>Wait {countdown}s before requesting a new code</li>}
                </ul>
            </div>

            {/* Resend Button */}
            <div className="space-y-3">
                <button
                    onClick={handleResend}
                    disabled={!canResend || isResending || !email}
                    className="w-full py-3 bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] font-semibold rounded-lg hover:bg-[#F1F5F9] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isResending ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Sending...
                        </>
                    ) : canResend ? (
                        <>
                            <RefreshCw className="w-5 h-5" />
                            Resend Code
                        </>
                    ) : (
                        <>
                            <RefreshCw className="w-5 h-5" />
                            Resend in {countdown}s
                        </>
                    )}
                </button>
            </div>

            {/* Back to Login */}
            <div className="pt-4 border-t border-[#E2E8F0]">
                <Link
                    href="/login"
                    className="block w-full py-3 bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] text-white font-semibold rounded-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-center"
                >
                    Back to Sign In
                </Link>
            </div>
        </div>
    );
}
