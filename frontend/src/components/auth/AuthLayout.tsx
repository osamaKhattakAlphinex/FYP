"use client";

import { ReactNode } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

interface AuthLayoutProps {
    children: ReactNode;
    title: string;
    subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#EEF2FF] via-[#F8FAFC] to-[#E0F2FE] flex items-center justify-center p-4">
            <div className="w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                {/* Left Side - Branding */}
                <div className="hidden lg:block">
                    <div className="space-y-6">
                        <Link href="/" className="inline-flex items-center gap-2 group">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-2xl font-extrabold text-[#0F172A]">NexIntern</span>
                        </Link>

                        <div className="space-y-4">
                            <h1 className="text-4xl font-extrabold text-[#0F172A] leading-tight">
                                Bridge the Gap Between
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#4F46E5] to-[#06B6D4]">
                                    Learning & Industry
                                </span>
                            </h1>
                            <p className="text-lg text-[#475569] leading-relaxed">
                                Join thousands of students gaining real-world experience through micro-internships,
                                or find talented individuals for your next project.
                            </p>
                        </div>

                        {/* Features */}
                        <div className="space-y-3">
                            {[
                                'AI-powered task matching',
                                'Verified certificates upon completion',
                                'Build your professional portfolio',
                                'Connect with top companies'
                            ].map((feature, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-[#DCFCE7] rounded-full flex items-center justify-center flex-shrink-0">
                                        <svg className="w-4 h-4 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-[#475569]">{feature}</span>
                                </div>
                            ))}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 pt-6">
                            {[
                                { value: '10K+', label: 'Students' },
                                { value: '500+', label: 'Companies' },
                                { value: '5K+', label: 'Tasks Completed' }
                            ].map((stat, index) => (
                                <div key={index} className="text-center">
                                    <div className="text-2xl font-extrabold text-[#4F46E5]">{stat.value}</div>
                                    <div className="text-sm text-[#64748B]">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side - Auth Form */}
                <div className="w-full">
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xl p-8 md:p-10">
                        {/* Mobile Logo */}
                        <Link href="/" className="lg:hidden flex items-center gap-2 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] rounded-xl flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-extrabold text-[#0F172A]">NexIntern</span>
                        </Link>

                        <div className="mb-8">
                            <h2 className="text-3xl font-extrabold text-[#0F172A] mb-2">{title}</h2>
                            <p className="text-[#64748B]">{subtitle}</p>
                        </div>

                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
