"use client";

import { Briefcase, Users, CheckCircle, Star, BarChart2 } from 'lucide-react';
import Link from 'next/link';

interface CompanyStatsPanelProps {
    totalTasksPosted: number;
    totalInterns: number;
    activeTasks: number;
    avgRating: number;
    isEditMode?: boolean;
}

export default function CompanyStatsPanel({
    totalTasksPosted,
    totalInterns,
    activeTasks,
    avgRating,
    isEditMode = false
}: CompanyStatsPanelProps) {
    const stats = [
        { icon: Briefcase, label: 'Tasks Posted', value: totalTasksPosted },
        { icon: Users, label: 'Total Interns', value: totalInterns },
        { icon: CheckCircle, label: 'Active Tasks', value: activeTasks },
        { icon: Star, label: 'Avg Rating', value: `${avgRating.toFixed(1)}/5` }
    ];

    return (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
            <h3 className="text-[13px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-5">
                Company Stats
            </h3>

            <div className="space-y-4">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-[#EEF2FF] rounded-full flex items-center justify-center">
                                    <Icon className="w-4 h-4 text-[#4F46E5]" />
                                </div>
                                <span className="text-sm text-[#475569]">{stat.label}</span>
                            </div>
                            <span className="text-lg font-bold text-[#0F172A]">{stat.value}</span>
                        </div>
                    );
                })}
            </div>

            <div className="mt-5 pt-5 border-t border-[#E2E8F0]">
                {isEditMode && (
                    <Link
                        href="/company/analytics"
                        className="flex items-center justify-center gap-2 text-[13px] font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors duration-200"
                    >
                        <BarChart2 className="w-4 h-4" />
                        <span>View Full Analytics</span>
                    </Link>
                )}
            </div>
        </div>
    );
}
