"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

interface ForgotPasswordFormProps {
    onSubmit: (email: string) => Promise<void>;
}

export default function ForgotPasswordForm({ onSubmit }: ForgotPasswordFormProps) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const validateEmail = (email: string): boolean => {
        if (!email) {
            setError('Email is required');
            return false;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Email is invalid');
            return false;
        }
        setError('');
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateEmail(email)) return;

        setIsLoading(true);
        try {
            await onSubmit(email);
            setIsSuccess(true);
        } catch (error) {
            setError('Failed to send reset email. Please try again.');
            console.error('Forgot password error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#DCFCE7] rounded-full">
                    <CheckCircle className="w-8 h-8 text-[#16A34A]" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-[#0F172A] mb-2">
                        Check Your Email
                    </h3>
                    <p className="text-[#64748B] leading-relaxed">
                        We've sent a password reset link to <span className="font-semibold text-[#0F172A]">{email}</span>
                    </p>
                    <p className="text-sm text-[#94A3B8] mt-2">
                        Didn't receive the email? Check your spam folder or try again.
                    </p>
                </div>
                <div className="space-y-3">
                    <button
                        onClick={() => {
                            setIsSuccess(false);
                            setEmail('');
                        }}
                        className="w-full py-3 bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] font-semibold rounded-lg hover:bg-[#F1F5F9] transition-all duration-200"
                    >
                        Try Another Email
                    </button>
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

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
                <p className="text-[#64748B] leading-relaxed">
                    Enter your email address and we'll send you a link to reset your password.
                </p>
            </div>

            {/* Email Input */}
            <div>
                <label htmlFor="email" className="block text-sm font-semibold text-[#0F172A] mb-2">
                    Email Address
                </label>
                <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`
                            w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border rounded-lg
                            text-[#0F172A] placeholder:text-[#94A3B8]
                            focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent
                            transition-all duration-200
                            ${error ? 'border-[#EF4444]' : 'border-[#E2E8F0]'}
                        `}
                        placeholder="you@example.com"
                    />
                </div>
                {error && (
                    <p className="mt-1.5 text-xs text-[#EF4444]">{error}</p>
                )}
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] text-white font-semibold rounded-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                    </>
                ) : (
                    'Send Reset Link'
                )}
            </button>

            {/* Back to Login */}
            <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors duration-200"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
            </Link>
        </form>
    );
}
