"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AuthLayout from '@/components/auth/AuthLayout';
import LoginForm from '@/components/auth/LoginForm';
import { LoginCredentials } from '@/types/auth.types';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { homeForRole } from '@/lib/roleRoutes'

export default function LoginPage() {
    const router = useRouter();
    const { login, logout } = useAuth();

    // Redirect if already logged in
    useEffect(() => {
        if (authService.isAuthenticated()) {
            const user = authService.getStoredUser();
            if (user) {
                
                router.push(homeForRole(user.role));
            }
        }
    }, [router]);

    const handleLogin = async (credentials: LoginCredentials): Promise<void> => {
        try {
            // Go through the auth context so the app (navbar, guards) reacts
            // to the new session immediately — no hard reload needed.
            const user = await login(credentials.email, credentials.password);

            // Check if email is verified
            if (!user.isEmailVerified) {
                await logout(); // undo the session we just created
                toast.error('Please verify your email before logging in');
                router.push(`/verify-email?email=${encodeURIComponent(credentials.email)}`);
                return;
            }

            toast.success('Login successful!');

            // Redirect based on role from backend
            

            router.push(homeForRole(user.role));
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Login failed. Please try again.';
            toast.error(errorMessage);
            console.error('Login error:', err);
            return;
        }
    };

    return (
        <AuthLayout
            title="Sign in"
            subtitle="Stay updated on your professional world"
        >
            <LoginForm onSubmit={handleLogin} />
        </AuthLayout>
    );
}
