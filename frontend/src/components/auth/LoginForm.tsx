"use client";

import React from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { LoginCredentials } from '@/types/auth.types';
import SocialAuthButtons from './SocialAuthButtons';

interface LoginFormProps {
    onSubmit: (credentials: LoginCredentials) => Promise<void>;
}

const loginSchema = Yup.object().shape({
    email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
    password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required')
});

export default function LoginForm({ onSubmit }: LoginFormProps) {
    const [showPassword, setShowPassword] = React.useState(false);

    const initialValues: Omit<LoginCredentials, 'role'> = {
        email: '',
        password: ''
    };

    // Handler for form submission
    const handleFormSubmit = async (
        values: Omit<LoginCredentials, 'role'>,
        { setSubmitting, setErrors }: FormikHelpers<Omit<LoginCredentials, 'role'>>
    ): Promise<void> => {
        try {
            await onSubmit(values as LoginCredentials);
        } catch (error: any) {
            console.error('Login error:', error);
            if (error.message) {
                setErrors({ email: error.message });
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Formik
            initialValues={initialValues}
            validationSchema={loginSchema}
            onSubmit={handleFormSubmit}
        >
            {({ isSubmitting, errors, touched }) => (
                <Form className="space-y-6">
                    {/* Email Input */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-semibold text-[#0F172A] mb-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                            <Field
                                id="email"
                                name="email"
                                type="email"
                                className={`
                                    w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border rounded-lg
                                    text-[#0F172A] placeholder:text-[#94A3B8]
                                    focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent
                                    transition-all duration-200
                                    ${errors.email && touched.email ? 'border-[#EF4444]' : 'border-[#E2E8F0]'}
                                `}
                                placeholder="you@example.com"
                            />
                        </div>
                        <ErrorMessage name="email" component="p" className="mt-1.5 text-xs text-[#EF4444]" />
                    </div>

                    {/* Password Input */}
                    <div>
                        <label htmlFor="password" className="block text-sm font-semibold text-[#0F172A] mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                            <Field
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                className={`
                                    w-full pl-12 pr-12 py-3 bg-[#F8FAFC] border rounded-lg
                                    text-[#0F172A] placeholder:text-[#94A3B8]
                                    focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent
                                    transition-all duration-200
                                    ${errors.password && touched.password ? 'border-[#EF4444]' : 'border-[#E2E8F0]'}
                                `}
                                placeholder="Enter your password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569] transition-colors duration-200"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <ErrorMessage name="password" component="p" className="mt-1.5 text-xs text-[#EF4444]" />
                    </div>

                    {/* Forgot Password Link */}
                    <div className="flex justify-end">
                        <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors duration-200"
                        >
                            Forgot password?
                        </Link>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] text-white font-semibold rounded-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>

                    {/* Social Auth Buttons
                    <SocialAuthButtons mode="login" /> */}

                    {/* Sign Up Link */}
                    <p className="text-center text-sm text-[#64748B]">
                        Don't have an account?{' '}
                        <Link
                            href="/register"
                            className="font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors duration-200"
                        >
                            Sign up
                        </Link>
                    </p>
                </Form>
            )}
        </Formik>
    );
}
