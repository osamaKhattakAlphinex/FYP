"use client";

import { Briefcase, Plus } from 'lucide-react';
import Link from 'next/link';

interface CompanyWelcomeBannerProps {
    companyName: string;
    activeTasks: number;
}

export default function CompanyWelcomeBanner({ companyName, activeTasks }: CompanyWelcomeBannerProps) {
    return (
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#06B6D4]/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#4F46E5]/20 rounded-full blur-3xl"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="w-5 h-5" />
                    <span className="text-sm font-semibold">Company Dashboard</span>
                </div>
                <h1 className="text-3xl font-extrabold mb-2">
                    Welcome, {companyName}! 🚀
                </h1>
                <p className="text-white/90 mb-6 max-w-2xl">
                    Manage your tasks, review applications, and find the perfect talent for your projects.
                </p>

                <div className="flex flex-wrap gap-4">
                    <Link
                        href="/company/post-task"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4F46E5] to-[#06B6D4] rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
                    >
                        <Plus className="w-5 h-5" />
                        Post New Task
                    </Link>
                    <div className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                        <span className="text-2xl font-bold">{activeTasks}</span>
                        <span className="text-sm">Active Tasks</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
