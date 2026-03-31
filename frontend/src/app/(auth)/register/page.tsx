"use client";

import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/auth/AuthLayout';
import RegisterForm from '@/components/auth/RegisterForm';
import { RegisterData } from '@/types/auth.types';
import { authService } from '@/services/authService';
import toast from 'react-hot-toast';

export default function RegisterPage() {
    const router = useRouter();

    const handleRegister = async (data: RegisterData): Promise<void> => {
        try {
            await authService.register({
                email: data.email,
                password: data.password,
                role: data.role,
                name: data.name,
                companyName: data.companyName,
                industry: data.industry,
                companySize: data.companySize,
                website: data.website,
                phone: data.phone
            });

            toast.success('Registration successful! Please check your email for verification code.');

            // Redirect to email verification
            router.push('/verify-email?email=' + encodeURIComponent(data.email));
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Registration failed. Please try again.';
            toast.error(errorMessage);
            console.error('Registration error:', err);
            return;
        }
    };

    return (
        <AuthLayout
            title="Create Account"
            subtitle="Start your journey with NexIntern"
        >
            <RegisterForm onSubmit={handleRegister} />
        </AuthLayout>
    );
}
