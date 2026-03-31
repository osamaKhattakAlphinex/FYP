"use client";

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface ResetPasswordFormProps {
    onSubmit: (password: string, token: string) => Promise<void>;
}

export default function ResetPasswordForm({ onSubmit }: ResetPasswordFormProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

    // Check if token is valid
    if (!token) {
        return (
            <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FEE2E2] rounded-full">
                    <AlertCircle className="w-8 h-8 text-[#EF4444]" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-[#0F172A] mb-2">
                        Invalid Reset Link
                    </h3>
                    <p className="text-[#64748B] leading-relaxed">
                        This password reset link is invalid or has expired.
                    </p>
                </div>
                <Link
                    href="/forgot-password"
                    className="block w-full py-3 bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] text-white font-semibold rounded-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-center"
                >
                    Request New Link
                </Link>
            </div>
        );
    }

    const validateForm = (): boolean => {
        const newErrors: { password?: string; confirmPassword?: string } = {};

        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            newErrors.password = 'Password must contain uppercase, lowercase, and number';
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        try {
            await onSubmit(password, token);
            setIsSuccess(true);

            // Redirect to login after 2 seconds
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch (error) {
            setErrors({ password: 'Failed to reset password. Please try again.' });
            console.error('Reset password error:', error);
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
                        Password Reset Successful
                    </h3>
                    <p className="text-[#64748B] leading-relaxed">
                        Your password has been reset successfully. Redirecting to login...
                    </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-[#4F46E5]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Redirecting...</span>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
                <p className="text-[#64748B] leading-relaxed">
                    Please enter your new password below.
                </p>
            </div>

            {/* Password Strength Indicator */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4">
                <p className="text-xs font-semibold text-[#0F172A] mb-2">Password must contain:</p>
                <ul className="space-y-1 text-xs text-[#64748B]">
                    <li className={password.length >= 8 ? 'text-[#10B981]' : ''}>
                        • At least 8 characters
                    </li>
                    <li className={/[A-Z]/.test(password) ? 'text-[#10B981]' : ''}>
                        • One uppercase letter
                    </li>
                    <li className={/[a-z]/.test(password) ? 'text-[#10B981]' : ''}>
                        • One lowercase letter
                    </li>
                    <li className={/\d/.test(password) ? 'text-[#10B981]' : ''}>
                        • One number
                    </li>
                </ul>
            </div>

            {/* New Password Input */}
            <div>
                <label htmlFor="password" className="block text-sm font-semibold text-[#0F172A] mb-2">
                    New Password
                </label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                    <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`
                            w-full pl-12 pr-12 py-3 bg-[#F8FAFC] border rounded-lg
                            text-[#0F172A] placeholder:text-[#94A3B8]
                            focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent
                            transition-all duration-200
                            ${errors.password ? 'border-[#EF4444]' : 'border-[#E2E8F0]'}
                        `}
                        placeholder="Create a strong password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] transition-colors duration-200"
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                {errors.password && (
                    <p className="mt-1.5 text-xs text-[#EF4444]">{errors.password}</p>
                )}
            </div>

            {/* Confirm Password Input */}
            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[#0F172A] mb-2">
                    Confirm New Password
                </label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                    <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`
                            w-full pl-12 pr-12 py-3 bg-[#F8FAFC] border rounded-lg
                            text-[#0F172A] placeholder:text-[#94A3B8]
                            focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent
                            transition-all duration-200
                            ${errors.confirmPassword ? 'border-[#EF4444]' : 'border-[#E2E8F0]'}
                        `}
                        placeholder="Confirm your password"
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] transition-colors duration-200"
                    >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs text-[#EF4444]">{errors.confirmPassword}</p>
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
                        Resetting...
                    </>
                ) : (
                    'Reset Password'
                )}
            </button>

            {/* Back to Login */}
            <p className="text-center text-sm text-[#64748B]">
                Remember your password?{' '}
                <Link
                    href="/login"
                    className="font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors duration-200"
                >
                    Sign in
                </Link>
            </p>
        </form>
    );
}
