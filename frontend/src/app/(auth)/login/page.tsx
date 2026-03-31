"use client";

import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/auth/AuthLayout';
import LoginForm from '@/components/auth/LoginForm';
import { LoginCredentials } from '@/types/auth.types';
import { authService } from '@/services/authService';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const router = useRouter();

    const handleLogin = async (credentials: LoginCredentials): Promise<void> => {
        try {
            const data = await authService.login({
                email: credentials.email,
                password: credentials.password,
                role: credentials.role as 'student' | 'company' | 'admin'
            });

            // Check if email is verified
            if (!data.user.isEmailVerified) {
                toast.error('Please verify your email before logging in');
                router.push(`/verify-email?email=${encodeURIComponent(credentials.email)}`);
                return;
            }

            toast.success('Login successful!');

            // Redirect based on role
            const roleRoutes: Record<string, string> = {
                student: '/student/dashboard',
                company: '/company/dashboard',
                mentor: '/mentor/students',
                admin: '/admin/analytics'
            };

            router.push(roleRoutes[data.user.role] || '/student/dashboard');
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Login failed. Please try again.';
            toast.error(errorMessage);
            // Don't throw error - this prevents page refresh
            console.error('Login error:', err);
            // Return to prevent any further execution
            return;
        }
    };

    return (
        <AuthLayout
            title="Welcome Back"
            subtitle="Sign in to continue your journey"
        >
            <LoginForm onSubmit={handleLogin} />
        </AuthLayout>
    );
}
