"use client";

import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { authService } from '@/services/authService';

export default function UnauthorizedPage() {
    const router = useRouter();

    const handleGoBack = () => {
        const user = authService.getStoredUser();

        if (user) {
            const roleRoutes: Record<string, string> = {
                student: '/student/dashboard',
                company: '/company/dashboard',
                mentor: '/mentor/students',
                admin: '/admin/analytics'
            };
            router.push(roleRoutes[user.role] || '/');
        } else {
            router.push('/login');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#EEF2FF] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="w-20 h-20 bg-[#FEF2F2] rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="w-10 h-10 text-[#EF4444]" />
                </div>

                <h1 className="text-2xl font-bold text-[#0F172A] mb-3">
                    Access Denied
                </h1>

                <p className="text-[#64748B] mb-8">
                    You don't have permission to access this page. This area is restricted to specific user roles.
                </p>

                <button
                    onClick={handleGoBack}
                    className="w-full py-3 bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] text-white font-semibold rounded-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                    Go to Dashboard
                </button>

                <button
                    onClick={() => router.back()}
                    className="w-full mt-3 py-3 bg-[#F8FAFC] text-[#475569] font-medium rounded-lg hover:bg-[#EEF2FF] transition-all duration-200"
                >
                    Go Back
                </button>
            </div>
        </div>
    );
}
